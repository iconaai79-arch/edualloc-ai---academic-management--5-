import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { CompanyDetails, Institution, User, WhatsAppConfig } from '../../types';
import { whatsappService, WhatsAppStatusResponse, WhatsAppLog } from '../../services/whatsappService';
import { supabase } from '../../lib/supabase';
import {
    ChatBubbleBottomCenterTextIcon,
    QrCodeIcon,
    SmartphoneIcon,
    ShieldCheckIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    XCircleIcon,
    PaperAirplaneIcon,
    BuildingOfficeIcon,
    CheckBadgeIcon,
    ExclamationTriangleIcon,
    LockClosedIcon,
    SignalIcon,
    MagnifyingGlassIcon,
    Cog8ToothIcon
} from '../icons';

// ─── Platform-level Evolution API endpoint ─────────────────────────────────
// Set VITE_PLATFORM_GATEWAY_URL in your environment or enter your VPS URL below.
const PLATFORM_GATEWAY_URL = (import.meta as any).env?.VITE_PLATFORM_GATEWAY_URL || '';
// ───────────────────────────────────────────────────────────────────────────

/** Generates a cryptographically-secure 64-char hex token */
const generateSecureToken = (): string => {
    const buf = new Uint8Array(32);
    crypto.getRandomValues(buf);
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
};

interface SuperAdminWhatsAppSettingsProps {
    companyDetails?: CompanyDetails;
    onUpdateCompanyDetails?: (details: CompanyDetails) => Promise<void> | void;
    institutions?: Institution[];
    currentUser?: User;
}

export const SuperAdminWhatsAppSettings: React.FC<SuperAdminWhatsAppSettingsProps> = ({
    companyDetails,
    onUpdateCompanyDetails,
    institutions = [],
    currentUser
}) => {
    // ── 1. Configuration State ──
    const initialConfig: WhatsAppConfig = useMemo(() => {
        const raw = (companyDetails as any)?.whatsappConfig;
        const cleanUrl = (raw?.gateway_url || '').includes('wa.eduai.platform') ? '' : (raw?.gateway_url || '');
        return {
            institution_id: 'global',
            provider_type: 'gateway',
            gateway_url: cleanUrl,
            api_key: raw?.api_key || '',
            instance_name: raw?.instance_name || 'eduai_master',
            phone_number: raw?.phone_number || '',
            auto_send_receipts: raw?.auto_send_receipts ?? true,
            auto_send_fee_reminders: raw?.auto_send_fee_reminders ?? false,
            auto_send_academic_results: raw?.auto_send_academic_results ?? false,
            allow_institution_failover: raw?.allow_institution_failover ?? true,
            global_dispatch_enabled: raw?.global_dispatch_enabled ?? true
        };
    }, [(companyDetails as any)?.whatsappConfig]);

    const [config, setConfig] = useState<WhatsAppConfig>(initialConfig);
    const [activeSection, setActiveSection] = useState<'gateway' | 'policies' | 'sandbox' | 'institutions' | 'logs'>('gateway');

    // Platform Gateway toggle
    const [usePlatformGateway, setUsePlatformGateway] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [provisionResult, setProvisionResult] = useState<{ success: boolean; message: string } | null>(null);

    // ── 2. Live Status & Pairing State ──
    const [liveStatus, setLiveStatus] = useState<WhatsAppStatusResponse | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState('');
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [pollCountdown, setPollCountdown] = useState(15);

    // ── 3. Sandbox / Live Test Dispatch State ──
    const [testRecipient, setTestRecipient] = useState('');
    const [testRecipientName, setTestRecipientName] = useState('John Doe');
    const [testMessageType, setTestMessageType] = useState<'custom' | 'receipt' | 'fee_reminder' | 'academic_results'>('custom');
    const [testCustomMessage, setTestCustomMessage] = useState(
        '🌟 Hello! This is a test dispatch from the EDUAI Master WhatsApp Gateway. Your platform messaging integration is operational.'
    );
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // ── 4. Audit Logs State ──
    const [logs, setLogs] = useState<WhatsAppLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [logSearchQuery, setLogSearchQuery] = useState('');
    const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'sent' | 'failed' | 'queued'>('all');

    // ── 5. Institutions Overview Search ──
    const [instSearchQuery, setInstSearchQuery] = useState('');

    // Fetch live status from backend
    const checkLiveStatus = useCallback(async () => {
        setIsLoadingStatus(true);
        try {
            const res = await whatsappService.getStatus('global');
            setLiveStatus(res);
            if (res.phoneNumber) {
                setConfig(prev => ({
                    ...prev,
                    phone_number: res.phoneNumber,
                    is_connected: res.isConnected
                }));
            }
        } catch (err: any) {
            console.warn('[SuperAdmin WA] Status check error:', err);
        } finally {
            setIsLoadingStatus(false);
            setPollCountdown(15);
        }
    }, []);

    // Load logs from Supabase
    const fetchLogs = useCallback(async () => {
        setIsLoadingLogs(true);
        try {
            const res = await whatsappService.getLogs('all', 100);
            if (res.success && res.logs) {
                setLogs(res.logs);
            } else if (supabase) {
                const { data } = await supabase
                    .from('whatsapp_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(100);
                if (data) setLogs(data as WhatsAppLog[]);
            }
        } catch (err) {
            console.warn('[SuperAdmin WA] Logs fetch warning:', err);
        } finally {
            setIsLoadingLogs(false);
        }
    }, []);

    // Initial load: Fetch config from DB if present, and check status
    useEffect(() => {
        const init = async () => {
            if (supabase) {
                const { data: dbConfig } = await supabase
                    .from('whatsapp_configs')
                    .select('*')
                    .or('institution_id.eq.global,institution_id.eq.SYSTEM')
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (dbConfig) {
                    const cleanUrl = (dbConfig.gateway_url || '').includes('wa.eduai.platform') ? '' : (dbConfig.gateway_url || '');
                    setConfig(prev => ({
                        ...prev,
                        ...dbConfig,
                        gateway_url: cleanUrl,
                        provider_type: dbConfig.provider_type || 'gateway'
                    }));
                    // Detect if the saved URL matches the platform gateway
                    if (cleanUrl && cleanUrl === PLATFORM_GATEWAY_URL) {
                        setUsePlatformGateway(true);
                    }
                }
            }
            checkLiveStatus();
            fetchLogs();
        };
        init();
    }, [checkLiveStatus, fetchLogs]);

    // When platform gateway toggle changes, auto-fill / clear URL if configured
    useEffect(() => {
        if (usePlatformGateway && PLATFORM_GATEWAY_URL) {
            setConfig(prev => ({ ...prev, gateway_url: PLATFORM_GATEWAY_URL }));
        }
    }, [usePlatformGateway]);

    // Auto-provision instance on Evolution API via secure server proxy
    const handleAutoProvision = useCallback(async () => {
        const baseUrl = (config.gateway_url || PLATFORM_GATEWAY_URL || '').trim();
        const apiKey = (config.api_key || '').trim();
        const instanceName = (config.instance_name || 'eduai_master').trim();

        if (!baseUrl || !apiKey) {
            setProvisionResult({ success: false, message: 'Gateway URL and API Token are required before provisioning.' });
            return;
        }

        if (baseUrl.includes('wa.eduai.platform') || baseUrl.includes('example.com')) {
            setProvisionResult({
                success: false,
                message: 'Please enter your actual Evolution API server address (e.g. https://whatsapp.yourdomain.com or http://YOUR_VPS_IP:8080) instead of the placeholder domain.'
            });
            return;
        }

        setIsProvisioning(true);
        setProvisionResult(null);
        try {
            // Provision via serverless proxy (avoids CORS, browser network errors & Service Worker issues)
            const res = await whatsappService.provisionInstance({
                gatewayUrl: baseUrl,
                apiKey,
                instanceName,
                institutionId: 'global'
            });

            setProvisionResult({
                success: res.success,
                message: res.message
            });

            if (res.success) {
                setTimeout(() => checkLiveStatus(), 1500);
            }
        } catch (err: any) {
            setProvisionResult({ success: false, message: err.message || 'Provisioning failed. Check server URL and token.' });
        } finally {
            setIsProvisioning(false);
        }
    }, [config.gateway_url, config.api_key, config.instance_name, checkLiveStatus]);

    // Auto-poll QR code every 15s if waiting for connection
    useEffect(() => {
        if (liveStatus?.isConnected) return;
        const interval = setInterval(() => {
            setPollCountdown(prev => {
                if (prev <= 1) {
                    checkLiveStatus();
                    return 15;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [liveStatus?.isConnected, checkLiveStatus]);

    // Save configuration
    const handleSaveConfig = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        setSaveMessage('');
        try {
            const configId = 'wacfg_global';
            const payload: any = {
                id: configId,
                institution_id: 'global',
                provider_type: config.provider_type || 'gateway',
                gateway_url: config.gateway_url || null,
                api_key: config.api_key || null,
                instance_name: config.instance_name || 'eduai_master',
                phone_number: config.phone_number || null,
                meta_phone_number_id: config.meta_phone_number_id || null,
                meta_access_token: config.meta_access_token || null,
                meta_waba_id: config.meta_waba_id || null,
                auto_send_receipts: Boolean(config.auto_send_receipts),
                auto_send_fee_reminders: Boolean(config.auto_send_fee_reminders),
                auto_send_academic_results: Boolean(config.auto_send_academic_results),
                allow_institution_failover: config.allow_institution_failover ?? true,
                global_dispatch_enabled: config.global_dispatch_enabled ?? true,
                updated_at: new Date().toISOString()
            };

            if (supabase) {
                const { error: upsertErr } = await supabase
                    .from('whatsapp_configs')
                    .upsert(payload);
                if (upsertErr) throw upsertErr;
            }

            if (onUpdateCompanyDetails) {
                await onUpdateCompanyDetails({
                    ...companyDetails,
                    whatsappConfig: {
                        ...config,
                        ...payload
                    }
                } as CompanyDetails);
            }

            setSaveStatus('success');
            setSaveMessage('Super Admin WhatsApp settings saved & synchronized successfully.');
            setTimeout(() => setSaveStatus('idle'), 4000);
            await checkLiveStatus();
        } catch (err: any) {
            console.error('[SuperAdmin WA] Save error:', err);
            setSaveStatus('error');
            setSaveMessage(err.message || 'Failed to save WhatsApp settings.');
            setTimeout(() => setSaveStatus('idle'), 5000);
        } finally {
            setIsSaving(false);
        }
    };

    // Disconnect active session
    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect this master WhatsApp session? Outbound automated messages will fall back to simulation mode.')) {
            return;
        }
        setIsDisconnecting(true);
        try {
            await whatsappService.disconnect('global');
            if (supabase) {
                await supabase
                    .from('whatsapp_configs')
                    .update({ is_connected: false, qr_code_data: null, updated_at: new Date().toISOString() })
                    .eq('institution_id', 'global');
            }
            await checkLiveStatus();
        } catch (err: any) {
            alert('Failed to disconnect WhatsApp session: ' + err.message);
        } finally {
            setIsDisconnecting(false);
        }
    };

    // Send Test Sandbox Message
    const handleSendTest = async () => {
        if (!testRecipient) {
            alert('Please enter a recipient phone number (e.g. 254712345678 or 0712345678).');
            return;
        }
        setIsSendingTest(true);
        setTestResult(null);
        try {
            let messageBody = testCustomMessage;
            if (testMessageType === 'receipt') {
                messageBody = `🧾 *TEST PAYMENT RECEIPT: RCT-SA-9901*\n━━━━━━━━━━━━━━━━━━━━\n🏫 *EDUAI PLATFORM SYSTEM TEST*\n👤 *Recipient:* ${testRecipientName}\n💰 *Amount:* KES 15,000.00\n💳 *Method:* M-Pesa Express\n📅 *Status:* Verified\n\nThis is an automated receipt dispatch preview.\n━━━━━━━━━━━━━━━━━━━━`;
            } else if (testMessageType === 'fee_reminder') {
                messageBody = `📢 *FEE BALANCE NOTIFICATION*\n━━━━━━━━━━━━━━━━━━━━\n🏫 *EDUAI GLOBAL GATEWAY TEST*\nDear Parent,\nThis is a notification reminder regarding student *${testRecipientName}*.\n⚠️ *Outstanding Balance:* *KES 8,500*\n\nPayment via Paybill 4086655.\n━━━━━━━━━━━━━━━━━━━━`;
            } else if (testMessageType === 'academic_results') {
                messageBody = `🎓 *ACADEMIC REPORT CARD*\n━━━━━━━━━━━━━━━━━━━━\n🏫 *EDUAI ACADEMIC DISPATCH*\nLearner: *${testRecipientName}*\n⭐ *Mean Grade:* *A- (78 Points)*\n🏅 *Rank:* 3 / 85\n\nOfficial term progress report verified.\n━━━━━━━━━━━━━━━━━━━━`;
            }

            const res = await whatsappService.sendMessage({
                institutionId: 'global',
                recipient: testRecipient,
                recipientName: testRecipientName,
                message: messageBody,
                messageType: testMessageType === 'custom' ? 'text' : testMessageType
            });

            setTestResult({
                success: res.success,
                message: res.message || (res.success ? 'Message dispatched successfully!' : 'Dispatch reported failure.')
            });
            await fetchLogs();
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message || 'Error executing test dispatch.'
            });
        } finally {
            setIsSendingTest(false);
        }
    };

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesQuery =
                !logSearchQuery ||
                log.recipient.includes(logSearchQuery) ||
                (log.recipient_name && log.recipient_name.toLowerCase().includes(logSearchQuery.toLowerCase())) ||
                (log.content && log.content.toLowerCase().includes(logSearchQuery.toLowerCase())) ||
                log.institution_id.toLowerCase().includes(logSearchQuery.toLowerCase());

            const matchesStatus = logStatusFilter === 'all' || log.status === logStatusFilter;
            return matchesQuery && matchesStatus;
        });
    }, [logs, logSearchQuery, logStatusFilter]);

    // Multi-tenant institutions breakdown
    const institutionStats = useMemo(() => {
        let dedicatedCount = 0;
        const list = institutions.map(inst => {
            const hasDedicated = Boolean(inst.whatsappConfig?.gateway_url || inst.whatsappConfig?.meta_access_token);
            if (hasDedicated) dedicatedCount++;
            return {
                id: inst.id,
                name: inst.name,
                code: inst.institutionCode,
                hasDedicated,
                isConnected: inst.whatsappConfig?.is_connected || false,
                providerType: inst.whatsappConfig?.provider_type || 'gateway'
            };
        });

        const filtered = list.filter(i =>
            !instSearchQuery ||
            i.name.toLowerCase().includes(instSearchQuery.toLowerCase()) ||
            (i.code && i.code.toLowerCase().includes(instSearchQuery.toLowerCase()))
        );

        return {
            total: institutions.length,
            dedicatedCount,
            inheritedCount: institutions.length - dedicatedCount,
            list: filtered
        };
    }, [institutions, instSearchQuery]);

    const isLiveConnected = Boolean(liveStatus?.isConnected || config.is_connected);

    return (
        <div className="space-y-8 animate-fade-in text-slate-100">
            {/* ── 1. Hero Command Banner ── */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/80 border border-white/10 p-8 shadow-2xl">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-600/30">
                            <ChatBubbleBottomCenterTextIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white">
                                    Global WhatsApp <span className="text-emerald-400 italic">Command</span>
                                </h2>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    isLiveConnected
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                    <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                                    {isLiveConnected ? 'Session Active' : 'Pairing Required'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 max-w-2xl font-medium">
                                Super Admin centralized WhatsApp Gateway (Evolution API / Baileys & Meta Cloud API). Manages platform pairing, multi-tenant automated notifications, institutional failover, and audit logs.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <button
                            type="button"
                            onClick={checkLiveStatus}
                            disabled={isLoadingStatus}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                            {isLoadingStatus ? 'Syncing...' : 'Sync Gateway'}
                        </button>

                        {isLiveConnected && (
                            <button
                                type="button"
                                onClick={handleDisconnect}
                                disabled={isDisconnecting}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                <XCircleIcon className="w-4 h-4" />
                                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleSaveConfig}
                            disabled={isSaving}
                            className={`flex items-center gap-2 px-7 py-3 rounded-xl text-white text-xs font-black uppercase tracking-wider shadow-lg transition-all ${
                                saveStatus === 'success'
                                    ? 'bg-emerald-600 shadow-emerald-600/30'
                                    : saveStatus === 'error'
                                    ? 'bg-rose-600 shadow-rose-600/30'
                                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                            }`}
                        >
                            <ShieldCheckIcon className="w-4 h-4" />
                            {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved' : 'Save Config'}
                        </button>
                    </div>
                </div>

                {/* Status Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Connection</span>
                        <div className="text-base font-bold text-white mt-1 flex items-center gap-2">
                            {isLiveConnected ? (
                                <>
                                    <CheckBadgeIcon className="w-5 h-5 text-emerald-400" />
                                    <span>Online</span>
                                </>
                            ) : (
                                <>
                                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
                                    <span>Unpaired</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paired Number</span>
                        <div className="text-base font-mono font-bold text-white mt-1">
                            {config.phone_number || liveStatus?.phoneNumber || 'Not Paired'}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institutions Failover</span>
                        <div className="text-base font-bold text-emerald-400 mt-1">
                            {config.allow_institution_failover ?? true ? 'Active (All Tenants)' : 'Disabled'}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outbound Audit</span>
                        <div className="text-base font-bold text-white mt-1">
                            {logs.length} logged dispatches
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification alert banner */}
            {saveStatus !== 'idle' && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-fade-in ${
                    saveStatus === 'success'
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                }`}>
                    {saveStatus === 'success' ? (
                        <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                        <XCircleIcon className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    )}
                    <span className="text-xs font-bold">{saveMessage}</span>
                </div>
            )}

            {/* ── 2. Navigation Subtabs ── */}
            <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto no-scrollbar pb-3">
                {[
                    { id: 'gateway', label: 'Gateway & QR Pairing', icon: QrCodeIcon },
                    { id: 'policies', label: 'Multi-Tenant & Policies', icon: Cog8ToothIcon },
                    { id: 'sandbox', label: 'Dispatch Sandbox (Test)', icon: PaperAirplaneIcon },
                    { id: 'institutions', label: `Tenants Overview (${institutions.length})`, icon: BuildingOfficeIcon },
                    { id: 'logs', label: `Audit Trail (${logs.length})`, icon: SignalIcon }
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveSection(tab.id as any)}
                        className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                            activeSection === tab.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── 3. Section Content ── */}

            {/* SECTION 1: GATEWAY & QR PAIRING */}
            {activeSection === 'gateway' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                    {/* Left: Provider & Credentials */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-white">
                                        Gateway Provider Engine
                                    </h3>
                                    <p className="text-[11px] text-slate-400">Select protocol for platform WhatsApp messaging</p>
                                </div>
                                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-indigo-500/30">
                                    Global Master
                                </span>
                            </div>

                            {/* Provider Toggle */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setConfig({ ...config, provider_type: 'gateway' })}
                                    className={`p-5 rounded-2xl border text-left transition-all ${
                                        config.provider_type === 'gateway'
                                            ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <SmartphoneIcon className={`w-6 h-6 ${config.provider_type === 'gateway' ? 'text-emerald-400' : 'text-slate-500'}`} />
                                        {config.provider_type === 'gateway' && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                                    </div>
                                    <div className="font-black text-sm uppercase">Evolution / Baileys</div>
                                    <div className="text-[10px] text-slate-400 mt-1">Self-hosted Gateway with live QR code pairing (Recommended)</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setConfig({ ...config, provider_type: 'meta_cloud' })}
                                    className={`p-5 rounded-2xl border text-left transition-all ${
                                        config.provider_type === 'meta_cloud'
                                            ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-lg shadow-indigo-950/50'
                                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <LockClosedIcon className={`w-6 h-6 ${config.provider_type === 'meta_cloud' ? 'text-indigo-400' : 'text-slate-500'}`} />
                                        {config.provider_type === 'meta_cloud' && <span className="w-2 h-2 rounded-full bg-indigo-400" />}
                                    </div>
                                    <div className="font-black text-sm uppercase">Meta Cloud API</div>
                                    <div className="text-[10px] text-slate-400 mt-1">Official Meta WhatsApp Business Cloud API with Token</div>
                                </button>
                            </div>

                            {/* Credentials Fields */}
                            {config.provider_type === 'gateway' ? (
                                <div className="space-y-5 pt-4 border-t border-white/5">

                                    {/* ── Platform Gateway Toggle ── */}
                                    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                        usePlatformGateway
                                            ? 'bg-emerald-950/40 border-emerald-500/40'
                                            : 'bg-white/5 border-white/5'
                                    }`}>
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                                                🏗️ Use Platform-Hosted Gateway
                                                {usePlatformGateway && (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] border border-emerald-500/30">Active</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Auto-fills URL to the centrally-hosted Evolution API. All schools share one gateway.
                                            </p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={usePlatformGateway}
                                                onChange={e => setUsePlatformGateway(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-12 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                                        </label>
                                    </div>

                                    {/* ── Gateway Base URL ── */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                            Gateway Base URL <span className="text-rose-400">*</span>
                                            {usePlatformGateway && (
                                                <span className="ml-2 text-emerald-400 normal-case font-bold">↳ Platform Default</span>
                                            )}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="url"
                                                value={config.gateway_url || ''}
                                                onChange={e => setConfig({ ...config, gateway_url: e.target.value })}
                                                readOnly={usePlatformGateway && Boolean(PLATFORM_GATEWAY_URL)}
                                                placeholder="https://whatsapp.yourdomain.com or http://YOUR_VPS_IP:8080"
                                                className={`w-full px-4 h-12 border rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none transition-all ${
                                                    usePlatformGateway && Boolean(PLATFORM_GATEWAY_URL)
                                                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 cursor-not-allowed'
                                                        : 'bg-slate-950 border-white/10 focus:border-emerald-500'
                                                }`}
                                            />
                                            {usePlatformGateway && Boolean(PLATFORM_GATEWAY_URL) && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-emerald-500 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                                    🔒 Locked
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-500 mt-1 block">
                                            {usePlatformGateway && Boolean(PLATFORM_GATEWAY_URL)
                                                ? `Centrally managed platform URL: ${PLATFORM_GATEWAY_URL}`
                                                : 'Enter the HTTP(S) address and port of your Evolution API server (e.g. http://123.45.67.89:8080)'}
                                        </span>
                                    </div>

                                    {/* ── API Key / Token ── */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                                API Key / Global Token
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showToken ? 'text' : 'password'}
                                                    value={config.api_key || ''}
                                                    onChange={e => setConfig({ ...config, api_key: e.target.value })}
                                                    placeholder="Auto-generate or paste your token"
                                                    className="w-full px-4 pr-20 h-12 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowToken(v => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 hover:text-white font-bold uppercase tracking-wider"
                                                >
                                                    {showToken ? 'Hide' : 'Show'}
                                                </button>
                                            </div>
                                            {/* Generate Token Button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const token = generateSecureToken();
                                                    setConfig(prev => ({ ...prev, api_key: token }));
                                                    setShowToken(true);
                                                }}
                                                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider transition-all w-full justify-center"
                                            >
                                                🔑 Generate Secure Token
                                            </button>
                                            <p className="text-[9px] text-slate-500 mt-1">64-char cryptographically-secure key. Copy this to your Evolution API .env as AUTHENTICATION_API_KEY.</p>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                                Global Instance Name
                                            </label>
                                            <input
                                                type="text"
                                                value={config.instance_name || 'eduai_master'}
                                                onChange={e => setConfig({ ...config, instance_name: e.target.value })}
                                                placeholder="eduai_master"
                                                className="w-full px-4 h-12 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                                            />
                                            <p className="text-[9px] text-slate-500 mt-1">Unique identifier for this gateway instance in Evolution API.</p>
                                        </div>
                                    </div>

                                    {/* ── Auto-Provision Button ── */}
                                    <div className={`p-5 rounded-2xl border space-y-3 ${
                                        provisionResult?.success
                                            ? 'bg-emerald-950/30 border-emerald-500/30'
                                            : provisionResult && !provisionResult.success
                                            ? 'bg-rose-950/30 border-rose-500/30'
                                            : 'bg-indigo-950/30 border-indigo-500/20'
                                    }`}>
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest text-white">🚀 Auto-Provision Gateway Instance</div>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Automatically creates the WhatsApp instance on the Evolution API server using the URL and Token above. Skip manual SSH — just click and scan.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAutoProvision}
                                            disabled={isProvisioning || !config.gateway_url || !config.api_key}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20"
                                        >
                                            <ArrowPathIcon className={`w-4 h-4 ${isProvisioning ? 'animate-spin' : ''}`} />
                                            {isProvisioning ? 'Provisioning Instance...' : 'Auto-Provision & Sync'}
                                        </button>
                                        {provisionResult && (
                                            <div className={`flex items-start gap-2 text-xs font-medium p-3 rounded-xl ${
                                                provisionResult.success
                                                    ? 'text-emerald-300 bg-emerald-950/40'
                                                    : 'text-rose-300 bg-rose-950/40'
                                            }`}>
                                                {provisionResult.success
                                                    ? <CheckCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                    : <XCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                                                {provisionResult.message}
                                            </div>
                                        )}
                                        <div className="text-[9px] text-slate-500 font-medium">
                                            ⚡ <strong>3-step setup:</strong> 1) Toggle Platform Gateway ON → 2) Click Generate Token → 3) Click Auto-Provision & Sync → Scan QR
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                            Meta Phone Number ID <span className="text-rose-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={config.meta_phone_number_id || ''}
                                            onChange={e => setConfig({ ...config, meta_phone_number_id: e.target.value })}
                                            placeholder="e.g. 104829104810294"
                                            className="w-full px-4 h-12 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                            Meta Access Token (Bearer) <span className="text-rose-400">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={config.meta_access_token || ''}
                                            onChange={e => setConfig({ ...config, meta_access_token: e.target.value })}
                                            placeholder="EAABwz..."
                                            className="w-full px-4 h-12 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                            WhatsApp Business Account ID (WABA ID)
                                        </label>
                                        <input
                                            type="text"
                                            value={config.meta_waba_id || ''}
                                            onChange={e => setConfig({ ...config, meta_waba_id: e.target.value })}
                                            placeholder="e.g. 291048102948102"
                                            className="w-full px-4 h-12 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Live Pairing Station / QR Code */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-xl flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                                <QrCodeIcon className="w-6 h-6" />
                            </div>

                            <h3 className="text-lg font-black uppercase tracking-tight text-white mb-1">
                                {isLiveConnected ? 'Device Connected' : 'Device Pairing Station'}
                            </h3>
                            <p className="text-xs text-slate-400 max-w-sm mb-6">
                                {isLiveConnected
                                    ? `Master session active. Messages will dispatch directly from ${config.phone_number || liveStatus?.phoneNumber || 'handset'}.`
                                    : 'Scan this QR code with your master WhatsApp phone to link the platform gateway.'}
                            </p>

                            {/* QR Code Container */}
                            <div className="w-64 h-64 bg-white rounded-3xl p-4 flex items-center justify-center shadow-2xl relative overflow-hidden border border-slate-200">
                                {isLiveConnected ? (
                                    <div className="flex flex-col items-center justify-center text-emerald-600 space-y-3">
                                        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center border-4 border-emerald-500">
                                            <CheckCircleIcon className="w-12 h-12 text-emerald-600" />
                                        </div>
                                        <div className="font-black text-sm uppercase tracking-wider text-slate-900">Session Linked</div>
                                        <div className="text-[11px] font-mono text-slate-600 font-bold">
                                            {config.phone_number || liveStatus?.phoneNumber || 'Active'}
                                        </div>
                                    </div>
                                ) : liveStatus?.qrCode ? (
                                    <div className="flex flex-col items-center justify-center w-full h-full">
                                        {liveStatus.qrCode.startsWith('data:image') || liveStatus.qrCode.startsWith('http') ? (
                                            <img
                                                src={liveStatus.qrCode}
                                                alt="WhatsApp QR Code"
                                                className="w-full h-full object-contain rounded-xl"
                                            />
                                        ) : (
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(liveStatus.qrCode)}`}
                                                alt="WhatsApp QR Code"
                                                className="w-full h-full object-contain rounded-xl"
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-400 p-4">
                                        <SmartphoneIcon className="w-12 h-12 text-slate-300 mb-2 animate-pulse" />
                                        <span className="text-xs font-bold text-slate-600">No Active QR</span>
                                        <span className="text-[10px] text-slate-400 mt-1">Configure Gateway URL & click 'Sync Gateway' to generate QR</span>
                                    </div>
                                )}
                            </div>

                            {/* Countdown & Refresh Indicator */}
                            {!isLiveConnected && (
                                <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                                    <span>Auto-refresh in:</span>
                                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-emerald-400 font-bold">{pollCountdown}s</span>
                                    <button
                                        type="button"
                                        onClick={checkLiveStatus}
                                        className="text-indigo-400 hover:text-indigo-300 font-bold ml-2 underline"
                                    >
                                        Refresh Now
                                    </button>
                                </div>
                            )}

                            {/* Instructions */}
                            <div className="w-full mt-6 p-4 rounded-2xl bg-white/5 border border-white/5 text-left text-[11px] text-slate-400 space-y-2">
                                <div className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">How to Pair:</div>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Open WhatsApp on the institution's official phone.</li>
                                    <li>Tap <strong>Settings / Menu</strong> &gt; <strong>Linked Devices</strong>.</li>
                                    <li>Tap <strong>Link a Device</strong> and scan the code above.</li>
                                    <li>Once scanned, connection will update automatically.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 2: MULTI-TENANT & AUTOMATION POLICIES */}
            {activeSection === 'policies' && (
                <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-xl space-y-8 animate-fade-in">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-white">
                            Multi-Tenant Failover & Automation Policies
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Control system-wide routing fallback and default automated notifications across all institutions.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Failover Switch */}
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <BuildingOfficeIcon className="w-5 h-5 text-indigo-400" />
                                    <h4 className="font-bold text-sm text-white">Multi-Tenant Gateway Failover</h4>
                                </div>
                                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                    When enabled, institutions without a dedicated WhatsApp Gateway will automatically route their outbound receipts and messages through this Super Admin Master Gateway.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input
                                    type="checkbox"
                                    checked={config.allow_institution_failover ?? true}
                                    onChange={e => setConfig({ ...config, allow_institution_failover: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-12 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>

                        {/* Master Broadcast Switch */}
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <SignalIcon className="w-5 h-5 text-emerald-400" />
                                    <h4 className="font-bold text-sm text-white">Global WhatsApp Dispatch Enabled</h4>
                                </div>
                                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                    Master kill-switch for automated WhatsApp dispatches across the platform. If disabled, all outbound messages are queued without hitting the WhatsApp gateway.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input
                                    type="checkbox"
                                    checked={config.global_dispatch_enabled ?? true}
                                    onChange={e => setConfig({ ...config, global_dispatch_enabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-12 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Channel Automation Rules */}
                    <div className="pt-6 border-t border-white/5 space-y-4">
                        <h4 className="text-sm font-black uppercase tracking-wider text-slate-300">
                            Automated Event Triggers
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-white block">Official Payment Receipts</span>
                                    <span className="text-[10px] text-slate-400">Auto-send PDF receipt link on M-Pesa or Cash payment</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={Boolean(config.auto_send_receipts)}
                                    onChange={e => setConfig({ ...config, auto_send_receipts: e.target.checked })}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
                                />
                            </div>

                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-white block">Fee Balance Reminders</span>
                                    <span className="text-[10px] text-slate-400">Scheduled reminders with Paybill & student reference</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={Boolean(config.auto_send_fee_reminders)}
                                    onChange={e => setConfig({ ...config, auto_send_fee_reminders: e.target.checked })}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
                                />
                            </div>

                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-white block">Academic Report Cards</span>
                                    <span className="text-[10px] text-slate-400">Term exam results & grade summary dispatch</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={Boolean(config.auto_send_academic_results)}
                                    onChange={e => setConfig({ ...config, auto_send_academic_results: e.target.checked })}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 3: SANDBOX / TEST DISPATCH */}
            {activeSection === 'sandbox' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                    {/* Left: Input parameters */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-xl space-y-5">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-white">
                                    WhatsApp Sandbox Dispatcher
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Send a live test message to verify handset connectivity, gateway formatting, and speed.
                                </p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Recipient Phone Number <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={testRecipient}
                                    onChange={e => setTestRecipient(e.target.value)}
                                    placeholder="2547XXXXXXXX or 07XXXXXXXX"
                                    className="w-full px-4 h-12 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Recipient / Student Name
                                </label>
                                <input
                                    type="text"
                                    value={testRecipientName}
                                    onChange={e => setTestRecipientName(e.target.value)}
                                    placeholder="e.g. Kelvin Mutiso"
                                    className="w-full px-4 h-12 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Template Type
                                </label>
                                <select
                                    value={testMessageType}
                                    onChange={e => setTestMessageType(e.target.value as any)}
                                    className="w-full px-4 h-12 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="custom">Custom Text Message</option>
                                    <option value="receipt">Official Payment Receipt (Demo)</option>
                                    <option value="fee_reminder">Fee Balance Reminder (Demo)</option>
                                    <option value="academic_results">Academic Report Card (Demo)</option>
                                </select>
                            </div>

                            {testMessageType === 'custom' && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                        Message Body
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={testCustomMessage}
                                        onChange={e => setTestCustomMessage(e.target.value)}
                                        className="w-full p-4 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                                    />
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleSendTest}
                                disabled={isSendingTest}
                                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
                            >
                                <PaperAirplaneIcon className={`w-4 h-4 ${isSendingTest ? 'animate-bounce' : ''}`} />
                                {isSendingTest ? 'Dispatching...' : 'Send WhatsApp Test'}
                            </button>

                            {testResult && (
                                <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                                    testResult.success ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200' : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
                                }`}>
                                    {testResult.success ? <CheckCircleIcon className="w-4 h-4 text-emerald-400" /> : <XCircleIcon className="w-4 h-4 text-rose-400" />}
                                    <span>{testResult.message}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Handset Preview */}
                    <div className="lg:col-span-6 flex flex-col items-center">
                        <div className="w-full max-w-sm rounded-[3rem] border-[10px] border-slate-800 bg-[#0b141a] p-4 shadow-2xl relative overflow-hidden">
                            {/* Phone Speaker */}
                            <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-4" />

                            {/* WhatsApp Header Simulation */}
                            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                                <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-white font-black text-xs">
                                    EA
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-black text-white">EDUAI Master Dispatch</div>
                                    <div className="text-[9px] text-emerald-400 font-bold">online</div>
                                </div>
                            </div>

                            {/* Chat Bubble Preview */}
                            <div className="py-6 min-h-[280px] flex flex-col justify-end">
                                <div className="bg-[#005c4b] text-white p-4 rounded-2xl rounded-tr-none text-xs shadow-md space-y-2 whitespace-pre-wrap font-sans">
                                    {testMessageType === 'custom' && testCustomMessage}
                                    {testMessageType === 'receipt' && (
                                        <>
                                            <div className="font-bold">🧾 PAYMENT RECEIPT: RCT-SA-9901</div>
                                            <div>━━━━━━━━━━━━━━━━━━━━</div>
                                            <div>🏫 <strong>EDUAI PLATFORM TEST</strong></div>
                                            <div>👤 Student: {testRecipientName}</div>
                                            <div>💰 Amount: KES 15,000.00</div>
                                            <div>💳 Method: M-Pesa Express</div>
                                            <div className="text-[10px] text-emerald-200 underline">🔗 View Stamped Receipt PDF</div>
                                        </>
                                    )}
                                    {testMessageType === 'fee_reminder' && (
                                        <>
                                            <div className="font-bold">📢 FEE BALANCE NOTIFICATION</div>
                                            <div>━━━━━━━━━━━━━━━━━━━━</div>
                                            <div>Dear Parent,</div>
                                            <div>Reminder for {testRecipientName}.</div>
                                            <div>⚠️ Outstanding: KES 8,500</div>
                                            <div>Paybill: 4086655</div>
                                        </>
                                    )}
                                    {testMessageType === 'academic_results' && (
                                        <>
                                            <div className="font-bold">🎓 ACADEMIC PROGRESS REPORT</div>
                                            <div>━━━━━━━━━━━━━━━━━━━━</div>
                                            <div>Learner: {testRecipientName}</div>
                                            <div>⭐ Grade: A- (78 Points)</div>
                                            <div>🏅 Rank: 3 / 85</div>
                                            <div className="text-[10px] text-emerald-200 underline">🔗 View Full Term Report Card</div>
                                        </>
                                    )}
                                    <div className="text-[9px] text-slate-300 text-right">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 4: TENANTS OVERVIEW */}
            {activeSection === 'institutions' && (
                <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-white">
                                Multi-Tenant Institutions Gateway Status
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                {institutionStats.dedicatedCount} dedicated gateway{institutionStats.dedicatedCount === 1 ? '' : 's'} • {institutionStats.inheritedCount} inheriting global fallback
                            </p>
                        </div>

                        <div className="relative w-full sm:w-72">
                            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={instSearchQuery}
                                onChange={e => setInstSearchQuery(e.target.value)}
                                placeholder="Search institutions..."
                                className="w-full pl-9 pr-4 h-10 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-white/5">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase font-black tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Institution</th>
                                    <th className="py-3 px-4">Gateway Mode</th>
                                    <th className="py-3 px-4">Provider</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                                {institutionStats.list.map(inst => (
                                    <tr key={inst.id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-4 font-bold text-white">
                                            {inst.name}
                                            {inst.code && <span className="text-[10px] text-slate-500 font-mono ml-2">({inst.code})</span>}
                                        </td>
                                        <td className="py-3 px-4">
                                            {inst.hasDedicated ? (
                                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase">
                                                    Dedicated
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                                                    Global Master
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px] uppercase">
                                            {inst.hasDedicated ? inst.providerType : 'Inherited'}
                                        </td>
                                        <td className="py-3 px-4">
                                            {inst.hasDedicated ? (
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                                    inst.isConnected ? 'text-emerald-400' : 'text-amber-400'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${inst.isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                                    {inst.isConnected ? 'Connected' : 'Offline'}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-[11px]">
                                                    {isLiveConnected ? 'Online (via Master)' : 'Pending Master Pairing'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveSection('sandbox');
                                                    setTestCustomMessage(`Hello from ${inst.name}! This is a test dispatch via the platform WhatsApp gateway.`);
                                                }}
                                                className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-slate-200 transition-colors"
                                            >
                                                Send Test
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {institutionStats.list.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-500">
                                            No institutions matching search filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SECTION 5: AUDIT LOGS */}
            {activeSection === 'logs' && (
                <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-white">
                                WhatsApp Outbound Audit Trail
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                Real-time dispatch history of all receipts, reminders, reports, and broadcasts.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={fetchLogs}
                                disabled={isLoadingLogs}
                                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-all flex items-center gap-2"
                            >
                                <ArrowPathIcon className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                                Refresh Logs
                            </button>

                            <select
                                value={logStatusFilter}
                                onChange={e => setLogStatusFilter(e.target.value as any)}
                                className="px-3 h-10 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                            >
                                <option value="all">All Statuses</option>
                                <option value="sent">Sent</option>
                                <option value="failed">Failed</option>
                                <option value="queued">Queued</option>
                            </select>

                            <div className="relative">
                                <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={logSearchQuery}
                                    onChange={e => setLogSearchQuery(e.target.value)}
                                    placeholder="Search logs..."
                                    className="pl-9 pr-4 h-10 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-white/5">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase font-black tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Timestamp</th>
                                    <th className="py-3 px-4">Institution</th>
                                    <th className="py-3 px-4">Recipient</th>
                                    <th className="py-3 px-4">Type</th>
                                    <th className="py-3 px-4">Message Excerpt</th>
                                    <th className="py-3 px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                                            {new Date(log.created_at).toLocaleString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-300">
                                            {log.institution_id === 'global' ? 'Super Admin Master' : log.institution_id}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-white">
                                            {log.recipient}
                                            {log.recipient_name && <span className="text-slate-400 ml-1">({log.recipient_name})</span>}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-black uppercase text-slate-300">
                                                {log.message_type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 max-w-xs truncate text-slate-400">
                                            {log.content || 'Attachment / Document'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                log.status === 'sent'
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                    : log.status === 'failed'
                                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            }`}>
                                                {log.status}
                                            </span>
                                            {log.error_message && (
                                                <div className="text-[10px] text-rose-400 mt-0.5 truncate max-w-xs" title={log.error_message}>
                                                    {log.error_message}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-500">
                                            {isLoadingLogs ? 'Loading audit logs...' : 'No WhatsApp dispatch logs recorded yet.'}
                                        </td>
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
