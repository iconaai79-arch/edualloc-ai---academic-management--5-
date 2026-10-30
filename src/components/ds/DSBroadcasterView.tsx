import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon } from '../icons/PlusIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { BellIcon } from '../icons/BellIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { MegaphoneIcon, SignalIcon } from '../his/HealthIcons';
import { TruckIcon, CalendarDaysIcon, AcademicCapIcon, TrashIcon, CheckCircleIcon, ArchiveBoxIcon, PaperAirplaneIcon, CheckIcon, ClockIcon } from '../icons';
import { apiService } from '../../services/apiService';
import { useToast } from '../../services/ToastContext';
import type { DSLead } from '../../types';

interface Broadcast {
    id: string;
    title: string;
    message: string;
    type: 'Lesson' | 'Fleet' | 'Emergency' | 'Info';
    priority: 'Critical' | 'High' | 'Medium';
    timestamp: string;
}

interface DSBroadcasterViewProps {
    onNewBroadcast?: () => void;
    onBuySms?: () => void;
    currentInstitution?: any;
    leads?: DSLead[];
    students?: any[];
    instructors?: any[];
    onRefreshData?: () => Promise<void>;
}

const MOCK_MESSAGES: Broadcast[] = [
    { id: 'b1', title: 'Lesson Commencement', message: 'Practical Lesson #DS-042 (Class C1) starting at Training Ground A', type: 'Lesson', priority: 'Medium', timestamp: '2 mins ago' },
    { id: 'b2', title: 'Fleet Alert', message: 'Vehicle KCC 789Y reported mechanical issue on Thika Road. Instructor support dispatched.', type: 'Fleet', priority: 'High', timestamp: '15 mins ago' },
    { id: 'b3', title: 'Emergency Drill', message: 'Safety evacuation drill starting in 10 mins. All students to gather at assembly point.', type: 'Emergency', priority: 'Critical', timestamp: '5 mins ago' },
    { id: 'b4', title: 'Theory Session', message: 'Defensive Driving theory session for Group B starts in 20 mins at Room 2.', type: 'Info', priority: 'Medium', timestamp: '1 hour ago' },
];

const extractUrl = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
};

const CampaignLinkChecker: React.FC<{ url: string }> = ({ url }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [result, setResult] = useState<{ ok?: boolean; status?: number; message?: string } | null>(null);

    const handleCheck = async () => {
        setStatus('loading');
        try {
            const res = await apiService.checkUrl(url);
            if (res.success) {
                setStatus('success');
                setResult({ ok: res.ok, status: res.status, message: res.finalUrl });
            } else {
                setStatus('error');
                setResult({ message: res.message });
            }
        } catch (err: any) {
            setStatus('error');
            setResult({ message: err.message || 'Failed to check link' });
        }
    };

    return (
        <div className="mt-4 ml-0 sm:ml-16 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Shortened Campaign Link</p>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[200px] sm:max-w-md mt-0.5">{url}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {status === 'success' && result?.ok && (
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-lg text-[9px] font-black uppercase tracking-wider">
                        ✓ Link Active (200 OK)
                    </span>
                )}
                {status === 'success' && !result?.ok && (
                    <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 rounded-lg text-[9px] font-black uppercase tracking-wider">
                        ⚠️ Code {result?.status || 'Unknown'}
                    </span>
                )}
                {status === 'error' && (
                    <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 rounded-lg text-[9px] font-black uppercase tracking-wider" title={result?.message}>
                        ⚠️ Unreachable
                    </span>
                )}
                
                <button
                    type="button"
                    onClick={handleCheck}
                    disabled={status === 'loading'}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-205 dark:hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                    {status === 'loading' ? (
                        <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    Verify Link
                </button>

                <a 
                    href={url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Test Link
                </a>
            </div>
        </div>
    );
};

export const DSBroadcasterView: React.FC<DSBroadcasterViewProps> = ({ 
    onNewBroadcast, 
    onBuySms,
    currentInstitution, 
    leads = [], 
    students = [], 
    instructors = [],
    onRefreshData
}) => {
    const { success: toastSuccess, error: toastError, warning: toastWarning, info: toastInfo } = useToast();
    const [activeTab, setActiveTab] = useState<'Live Feed' | 'Sent' | 'SMS Logs' | 'Outbox'>('Sent');
    const [sentBroadcasts, setSentBroadcasts] = useState<any[]>([]);
    const [smsLogs, setSmsLogs] = useState<any[]>([]);
    const [outboxMessages, setOutboxMessages] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingSent, setLoadingSent] = useState(false);
    const [dispatchingId, setDispatchingId] = useState<string | null>(null);
    const [isDispatchingAll, setIsDispatchingAll] = useState(false);

    const fetchHistory = useCallback(async () => {
        if (!currentInstitution?.id) return;
        setLoadingSent(true);
        try {
            // Fetch broadcaster messages, SMS delivery logs, and SMS outbox queue
            const [bRes, smsRes, obRes] = await Promise.all([
                apiService.fetchModuleRecords<any>('broadcaster_messages', currentInstitution.id, undefined, { limit: 100000 }).catch(() => []),
                apiService.fetchModuleRecords<any>('sms_logs', currentInstitution.id, undefined, { limit: 100000 }).catch(() => []),
                apiService.fetchSmsOutbox(currentInstitution.id).catch(() => [])
            ]);

            // Sort broadcaster messages by date descending
            const sortedBroadcasts = (bRes || []).sort((a: any, b: any) => {
                const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
                const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
                return timeB - timeA;
            });

            // Sort SMS logs by date descending
            const sortedSms = (smsRes || []).sort((a: any, b: any) => {
                const timeA = new Date(a.created_at || a.createdAt || a.sentAt || a.sent_at || 0).getTime();
                const timeB = new Date(b.created_at || b.createdAt || b.sentAt || b.sent_at || 0).getTime();
                return timeB - timeA;
            });
            setSmsLogs(sortedSms);

            // Sort Outbox messages by date descending
            const sortedOutbox = (obRes || []).sort((a: any, b: any) => {
                const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
                const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
                return timeB - timeA;
            });
            setOutboxMessages(sortedOutbox);

            // Synthesize broadcasts from sms_logs if broadcaster_messages is empty or to complement individual/bulk logs
            let combinedBroadcasts = [...sortedBroadcasts];
            if (sortedBroadcasts.length === 0 && sortedSms.length > 0) {
                const fromSms = sortedSms.map((log: any) => ({
                    id: log.id,
                    institutionId: log.institution_id || log.institutionId || currentInstitution.id,
                    target: log.recipient?.includes('recipients') ? log.recipient : (log.recipient || 'Direct Recipient'),
                    channel: log.provider || 'SMS Gateway',
                    subject: log.message?.length > 40 ? log.message.substring(0, 40) + '...' : (log.subject || 'SMS Transmission'),
                    body: log.message || '',
                    recipientsCount: log.units || 1,
                    recipients_count: log.units || 1,
                    createdAt: log.created_at || log.createdAt || log.sentAt || log.sent_at || new Date().toISOString(),
                    created_at: log.created_at || log.createdAt || log.sentAt || log.sent_at || new Date().toISOString(),
                    fromSmsLog: true
                }));
                combinedBroadcasts = fromSms;
            } else if (sortedSms.length > 0) {
                const existingMsgTexts = new Set(sortedBroadcasts.map((b: any) => (b.body || '').trim()));
                const extraSms = sortedSms
                    .filter((log: any) => log.message && !existingMsgTexts.has((log.message || '').trim()))
                    .map((log: any) => ({
                        id: log.id,
                        institutionId: log.institution_id || log.institutionId || currentInstitution.id,
                        target: log.recipient?.includes('recipients') ? log.recipient : (log.recipient || 'Direct Recipient'),
                        channel: log.provider || 'SMS Gateway',
                        subject: log.message?.length > 40 ? log.message.substring(0, 40) + '...' : 'SMS Transmission',
                        body: log.message || '',
                        recipientsCount: log.units || 1,
                        recipients_count: log.units || 1,
                        createdAt: log.created_at || log.createdAt || log.sentAt || log.sent_at || new Date().toISOString(),
                        created_at: log.created_at || log.createdAt || log.sentAt || log.sent_at || new Date().toISOString(),
                        fromSmsLog: true
                    }));
                combinedBroadcasts = [...combinedBroadcasts, ...extraSms].sort((a: any, b: any) => {
                    const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
                    const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
                    return timeB - timeA;
                });
            }

            setSentBroadcasts(combinedBroadcasts);
        } catch (e) {
            console.error("Failed to load sent messages, SMS logs, and Outbox:", e);
        } finally {
            setLoadingSent(false);
        }
    }, [currentInstitution?.id]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const getResponseCount = (msgId: string) => {
        return leads.filter(l => 
            l.broadcastId === msgId || 
            (l.notes && l.notes.includes(`[Campaign Ref: ${msgId}]`))
        ).length;
    };

    const currentSmsBalance = currentInstitution?.smsBalance ?? currentInstitution?.sms_balance ?? 0;
    const totalOutboxUnits = outboxMessages.reduce((sum, m) => sum + (Number(m.units) || 1), 0);

    const handleDispatchSingle = async (item: any) => {
        const units = Number(item.units) || 1;
        if (currentSmsBalance < units) {
            toastError(`Insufficient SMS Units! Required: ${units}, Available: ${currentSmsBalance}. Please top up.`);
            if (onBuySms) onBuySms();
            return;
        }

        setDispatchingId(item.id);
        try {
            const billableId = currentInstitution?.parentInstitutionId || currentInstitution?.id;
            const res = await apiService.sendSms(
                item.recipient,
                item.message,
                currentInstitution?.smsConfig,
                units,
                billableId
            );

            if (res?.success !== false) {
                await apiService.removeFromSmsOutbox(item.id);
                setOutboxMessages(prev => prev.filter(m => m.id !== item.id));

                if (billableId) {
                    const newBal = Math.max(0, currentSmsBalance - units);
                    if (currentInstitution) {
                        currentInstitution.smsBalance = newBal;
                        currentInstitution.sms_balance = newBal;
                    }
                    await apiService.saveModuleRecord('institutions', {
                        id: billableId,
                        smsBalance: newBal,
                        sms_balance: newBal
                    }).catch(() => {});
                }

                toastSuccess(`Message dispatched to ${item.recipientName || item.recipient}!`);
                await fetchHistory();
                if (onRefreshData) await onRefreshData();
            } else {
                toastError(`SMS Gateway error: ${res?.message || 'Failed to dispatch'}`);
            }
        } catch (err: any) {
            console.error('Failed to dispatch outbox message:', err);
            toastError(err?.message || 'Failed to dispatch message.');
        } finally {
            setDispatchingId(null);
        }
    };

    const handleDispatchAllOutbox = async () => {
        if (outboxMessages.length === 0) return;
        if (currentSmsBalance < 1) {
            toastError(`Available SMS balance is 0 units. Please top up before dispatching.`);
            if (onBuySms) onBuySms();
            return;
        }

        if (currentSmsBalance < totalOutboxUnits) {
            if (!window.confirm(`Current balance (${currentSmsBalance} units) is less than required (${totalOutboxUnits} units). Proceed to dispatch as many messages as the balance allows?`)) {
                return;
            }
        }

        setIsDispatchingAll(true);
        let sentCount = 0;
        let failedCount = 0;
        let currentRemaining = currentSmsBalance;
        const billableId = currentInstitution?.parentInstitutionId || currentInstitution?.id;

        try {
            for (const msg of outboxMessages) {
                const units = Number(msg.units) || 1;
                if (currentRemaining < units) {
                    break;
                }

                try {
                    const res = await apiService.sendSms(
                        msg.recipient,
                        msg.message,
                        currentInstitution?.smsConfig,
                        units,
                        billableId
                    );

                    if (res?.success !== false) {
                        await apiService.removeFromSmsOutbox(msg.id);
                        currentRemaining = Math.max(0, currentRemaining - units);
                        sentCount++;
                    } else {
                        failedCount++;
                    }
                } catch (sendErr) {
                    failedCount++;
                }
            }

            if (billableId && sentCount > 0) {
                if (currentInstitution) {
                    currentInstitution.smsBalance = currentRemaining;
                    currentInstitution.sms_balance = currentRemaining;
                }
                await apiService.saveModuleRecord('institutions', {
                    id: billableId,
                    smsBalance: currentRemaining,
                    sms_balance: currentRemaining
                }).catch(() => {});
            }

            if (sentCount > 0) {
                toastSuccess(`Dispatched ${sentCount} queued message${sentCount > 1 ? 's' : ''}! Remaining balance: ${currentRemaining} units.`);
            }
            if (failedCount > 0) {
                toastWarning(`${failedCount} message${failedCount > 1 ? 's' : ''} could not be dispatched.`);
            }
            if (sentCount === 0 && failedCount === 0 && currentRemaining < 1) {
                toastError("Insufficient balance to send any messages. Please top up units.");
            }

            await fetchHistory();
            if (onRefreshData) await onRefreshData();
        } catch (err: any) {
            toastError("Bulk dispatch error: " + (err?.message || err));
        } finally {
            setIsDispatchingAll(false);
        }
    };

    const handleDeleteOutbox = async (id: string) => {
        if (!window.confirm("Remove this message from Outbox?")) return;
        try {
            await apiService.removeFromSmsOutbox(id);
            setOutboxMessages(prev => prev.filter(m => m.id !== id));
            toastSuccess("Message removed from Outbox.");
        } catch (err: any) {
            toastError("Failed to delete message: " + (err?.message || err));
        }
    };

    const handleClearAllOutbox = async () => {
        if (outboxMessages.length === 0) return;
        if (!window.confirm(`Discard all ${outboxMessages.length} message(s) in Outbox?`)) return;
        try {
            await apiService.clearSmsOutbox(currentInstitution.id);
            setOutboxMessages([]);
            toastSuccess("Outbox cleared successfully.");
        } catch (err: any) {
            toastError("Failed to clear outbox: " + (err?.message || err));
        }
    };

    const filteredBroadcasts = sentBroadcasts.filter(msg => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (msg.subject || '').toLowerCase().includes(q) ||
            (msg.body || '').toLowerCase().includes(q) ||
            (msg.target || '').toLowerCase().includes(q) ||
            (msg.channel || '').toLowerCase().includes(q)
        );
    });

    const filteredSmsLogs = smsLogs.filter(log => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (log.recipient || log.recipients || '').toLowerCase().includes(q) ||
            (log.message || '').toLowerCase().includes(q) ||
            (log.status || '').toLowerCase().includes(q) ||
            (log.provider || '').toLowerCase().includes(q)
        );
    });

    const filteredOutboxMessages = outboxMessages.filter(msg => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (msg.recipient || '').toLowerCase().includes(q) ||
            (msg.recipientName || '').toLowerCase().includes(q) ||
            (msg.message || '').toLowerCase().includes(q) ||
            (msg.source || '').toLowerCase().includes(q) ||
            (msg.reason || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="animate-fade-in-up space-y-8">
            {/* Header with Title and Quick Triggers */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Institutional <span className="text-indigo-600">Broadcaster</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Unified paging & school-wide priority messaging system</p>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-4 w-full md:w-auto">
                    <button 
                        onClick={onNewBroadcast}
                        className="flex-1 md:flex-none bg-rose-600 text-white px-6 md:px-8 py-3 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-rose-600/20"
                    >
                        <ExclamationTriangleIcon className="w-5 h-5" /> Trigger Alert
                    </button>
                    <button 
                        onClick={onNewBroadcast}
                        className="flex-1 md:flex-none bg-indigo-600 text-white px-6 md:px-8 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-600/20"
                    >
                        <PlusIcon className="w-4 h-4" /> New Broadcast
                    </button>
                </div>
            </div>

            {/* Real-time SMS Units & Transmission Status Card */}
            <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-[2.5rem] border border-indigo-900/50 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2 z-10">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Live SMS & Dispatch Transmission Node</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl md:text-4xl font-black tracking-tight">{currentSmsBalance.toLocaleString()}</span>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-200">SMS Units Available</span>
                    </div>
                    <p className="text-xs text-slate-300">Each SMS page is 160 characters (70 for Unicode). Units are auto-deducted per recipient upon dispatch.</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap z-10">
                    <button
                        type="button"
                        onClick={async () => {
                            await fetchHistory();
                            if (onRefreshData) await onRefreshData();
                        }}
                        disabled={loadingSent}
                        className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-white/10 backdrop-blur-sm"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${loadingSent ? 'animate-spin' : ''}`} />
                        Refresh Logs
                    </button>

                    {onBuySms && (
                        <button
                            type="button"
                            onClick={onBuySms}
                            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 font-bold"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            Top Up Units
                        </button>
                    )}
                </div>
            </div>

            {/* Outbox Pending Alert Banner */}
            {outboxMessages.length > 0 && (
                <div className="p-5 md:p-6 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                            <ArchiveBoxIcon className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                                <p className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                                    {outboxMessages.length} SMS Message{outboxMessages.length > 1 ? 's' : ''} Held in Outbox
                                </p>
                            </div>
                            <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-1">
                                Messages moved to Outbox because SMS balance was insufficient. Total units required: <span className="font-black text-amber-900 dark:text-amber-100">{totalOutboxUnits}</span> (Available: <span className="font-black text-amber-900 dark:text-amber-100">{currentSmsBalance}</span>).
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                        {activeTab !== 'Outbox' && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('Outbox')}
                                className="flex-1 md:flex-none px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                            >
                                Open Outbox ({outboxMessages.length})
                            </button>
                        )}
                        {onBuySms && currentSmsBalance < totalOutboxUnits && (
                            <button
                                type="button"
                                onClick={onBuySms}
                                className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-1.5"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" /> Top Up Units
                            </button>
                        )}
                        {currentSmsBalance >= totalOutboxUnits && (
                            <button
                                type="button"
                                onClick={handleDispatchAllOutbox}
                                disabled={isDispatchingAll}
                                className="flex-1 md:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                {isDispatchingAll ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <PaperAirplaneIcon className="w-3.5 h-3.5" />
                                )}
                                Dispatch All Outbox
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Visual Signal Mixer / Live Feed */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 text-slate-900 dark:text-white">
                                <SignalIcon className="w-6 h-6 text-indigo-600 animate-pulse" /> Transmission <span className="text-indigo-600">Feed</span>
                            </h3>
                            
                            {/* Search bar */}
                            <div className="relative w-full sm:w-64">
                                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search transmissions..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex gap-2 mb-8 border-b border-slate-100 dark:border-slate-800 pb-4 overflow-x-auto scrollbar-hide">
                            {[
                                { id: 'Sent', label: `Sent Broadcasts (${sentBroadcasts.length})` },
                                { id: 'SMS Logs', label: `SMS Delivery Logs (${smsLogs.length})` },
                                { id: 'Live Feed', label: 'Live Monitoring' },
                                { id: 'Outbox', label: `Outbox (${outboxMessages.length})`, count: outboxMessages.length }
                            ].map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                                        activeTab === tab.id 
                                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900/50' 
                                        : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {tab.id === 'Outbox' && outboxMessages.length > 0 && (
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {activeTab === 'Outbox' ? (
                                <div className="space-y-4">
                                    {/* Outbox Header / Action Bar */}
                                    {outboxMessages.length > 0 && (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <div className="text-xs text-slate-600 dark:text-slate-300">
                                                <span className="font-black text-slate-900 dark:text-white">{filteredOutboxMessages.length}</span> queued message{filteredOutboxMessages.length !== 1 ? 's' : ''} • Required: <span className="font-bold text-indigo-600">{totalOutboxUnits} Units</span> • Available: <span className="font-bold text-emerald-600">{currentSmsBalance} Units</span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                                                {onBuySms && currentSmsBalance < totalOutboxUnits && (
                                                    <button
                                                        type="button"
                                                        onClick={onBuySms}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                    >
                                                        + Top Up
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={handleDispatchAllOutbox}
                                                    disabled={isDispatchingAll || outboxMessages.length === 0}
                                                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                                                >
                                                    {isDispatchingAll ? (
                                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <PaperAirplaneIcon className="w-3.5 h-3.5" />
                                                    )}
                                                    Dispatch All
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleClearAllOutbox}
                                                    disabled={isDispatchingAll || outboxMessages.length === 0}
                                                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                >
                                                    Clear All
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {filteredOutboxMessages.length === 0 ? (
                                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-emerald-500">
                                                <CheckCircleIcon className="w-8 h-8 opacity-80" />
                                            </div>
                                            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                                                {outboxMessages.length === 0 ? 'Outbox is Empty' : 'No Outbox Messages Match Filter'}
                                            </h4>
                                            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                                                {outboxMessages.length === 0 
                                                    ? 'All scheduled and queued broadcasts have been dispatched. Whenever SMS credits are insufficient, messages are automatically saved here for one-click release once topped up.'
                                                    : 'Try clearing your search query to see all queued outbox messages.'
                                                }
                                            </p>
                                        </div>
                                    ) : (
                                        filteredOutboxMessages.map((msg, idx) => {
                                            const units = Number(msg.units) || 1;
                                            const isDispatching = dispatchingId === msg.id;
                                            const canSend = currentSmsBalance >= units;
                                            const dateStr = new Date(msg.created_at || msg.createdAt || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

                                            return (
                                                <div 
                                                    key={msg.id || idx} 
                                                    className="p-5 md:p-6 rounded-[2rem] border bg-slate-50 dark:bg-slate-800/60 border-amber-200/60 dark:border-amber-900/40 hover:shadow-md transition-all space-y-4"
                                                >
                                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                        <div className="flex items-start gap-3.5">
                                                            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200 dark:border-amber-800/50">
                                                                <ArchiveBoxIcon className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                                                        {msg.recipientName ? `${msg.recipientName} (${msg.recipient})` : msg.recipient}
                                                                    </h4>
                                                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                                                        Queued (Low SMS)
                                                                    </span>
                                                                    {msg.source && (
                                                                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                                                            {msg.source}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                                    <span>{dateStr}</span>
                                                                    <span>•</span>
                                                                    <span className="text-indigo-600 dark:text-indigo-400 font-black">{units} SMS Unit{units > 1 ? 's' : ''}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Actions per item */}
                                                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDispatchSingle(msg)}
                                                                disabled={isDispatching || isDispatchingAll}
                                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm ${
                                                                    canSend 
                                                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                                                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-800'
                                                                }`}
                                                                title={canSend ? 'Send now with available credits' : `Requires ${units} units (Available: ${currentSmsBalance})`}
                                                            >
                                                                {isDispatching ? (
                                                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <PaperAirplaneIcon className="w-3.5 h-3.5" />
                                                                )}
                                                                {canSend ? 'Send Now' : 'Retry (Low Units)'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteOutbox(msg.id)}
                                                                disabled={isDispatching || isDispatchingAll}
                                                                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                                                                title="Delete from Outbox"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Message Content */}
                                                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                                                        {msg.message}
                                                    </div>

                                                    {/* Reason Banner */}
                                                    {msg.reason && (
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                                            <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                                                            <span>Reason: {msg.reason}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            ) : activeTab === 'SMS Logs' ? (
                                loadingSent ? (
                                    <div className="text-center py-12">
                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Fetching SMS Dispatch Logs...</p>
                                    </div>
                                ) : filteredSmsLogs.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <BellIcon className="w-8 h-8 opacity-50" />
                                        </div>
                                        <h4 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">No SMS Logs Found</h4>
                                        <p className="text-xs text-slate-400 mt-2">Dispatched lesson alerts, payment notifications, and candidate reminders will show here.</p>
                                    </div>
                                ) : (
                                    filteredSmsLogs.map((log, i) => {
                                        const dateStr = new Date(log.created_at || log.createdAt || log.sentAt || log.sent_at || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                                        return (
                                            <div key={log.id || i} className="p-5 rounded-[1.8rem] border bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:shadow-md transition-all">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                                                            <BellIcon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                                                {log.recipient || log.recipients || 'Recipient'}
                                                            </h4>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{dateStr}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                            {log.units || 1} Unit{(log.units || 1) > 1 ? 's' : ''}
                                                        </span>
                                                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                            ✓ {log.status || 'Sent'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 pl-0 sm:pl-13 whitespace-pre-line leading-relaxed">{log.message}</p>
                                            </div>
                                        );
                                    })
                                )
                            ) : activeTab === 'Sent' ? (
                                loadingSent ? (
                                    <div className="text-center py-12">
                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Fetching Sent Archive...</p>
                                    </div>
                                ) : filteredBroadcasts.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <MegaphoneIcon className="w-8 h-8 opacity-50" />
                                        </div>
                                        <h4 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">No Sent Broadcasts</h4>
                                        <p className="text-xs text-slate-400 mt-2">Any promotional messages or priority alerts you send will appear here.</p>
                                    </div>
                                ) : (
                                    filteredBroadcasts.map((msg, i) => {
                                        const responses = getResponseCount(msg.id);
                                        const dateStr = new Date(msg.created_at || msg.createdAt || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                                        return (
                                            <div key={msg.id || i} className="p-6 rounded-[2rem] border bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:shadow-md transition-all">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                                    <div className="flex gap-4">
                                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-600">
                                                            <MegaphoneIcon className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">{msg.subject || 'Institutional Broadcast'}</h4>
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{dateStr}</span>
                                                                <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md uppercase tracking-wider">{msg.channel || 'SMS'}</span>
                                                                {msg.target && (
                                                                    <span className="text-[9px] font-black text-slate-500 bg-slate-200/50 dark:bg-slate-700 px-2 py-0.5 rounded-md uppercase tracking-wider">🎯 {msg.target}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                                            👥 {msg.recipientsCount || msg.recipients_count || 0} Sent
                                                        </span>
                                                        <span className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                                            📈 {responses} responses
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 pl-0 sm:pl-16 whitespace-pre-line leading-relaxed">{msg.body}</p>
                                                {(() => {
                                                    const url = extractUrl(msg.body || '');
                                                    return url ? <CampaignLinkChecker url={url} /> : null;
                                                })()}
                                            </div>
                                        );
                                    })
                                )
                            ) : (
                                MOCK_MESSAGES.map((msg, i) => (
                                    <div key={i} className={`p-6 rounded-[2rem] border transition-all ${
                                        msg.type === 'Emergency' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                                    }`}>
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                            <div className="flex gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                                    msg.type === 'Emergency' ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-600'
                                                }`}>
                                                    {msg.type === 'Lesson' ? <CalendarDaysIcon className="w-6 h-6" /> : 
                                                     msg.type === 'Fleet' ? <TruckIcon className="w-6 h-6" /> : 
                                                     msg.type === 'Info' ? <AcademicCapIcon className="w-6 h-6" /> :
                                                     <MegaphoneIcon className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">{msg.title}</h4>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{msg.timestamp}</p>
                                                </div>
                                            </div>
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                msg.priority === 'Critical' ? 'bg-rose-600 text-white' : 
                                                msg.priority === 'High' ? 'bg-amber-100 text-amber-600' :
                                                'bg-white/50 text-slate-400'
                                            }`}>
                                                {msg.priority} Priority
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300 pl-0 sm:pl-16">{msg.message}</p>
                                        {(() => {
                                            const url = extractUrl(msg.message || '');
                                            return url ? <CampaignLinkChecker url={url} /> : null;
                                        })()}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Control Hub */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic text-slate-900 dark:text-white">Transmission <span className="text-indigo-600">Nodes</span></h3>
                        
                        <div className="space-y-6">
                            {[
                                { label: 'Main Office PA', status: 'Casting', icon: MegaphoneIcon },
                                { label: 'Theory Room 1', status: 'Silent', icon: AcademicCapIcon },
                                { label: 'Theory Room 2', status: 'Casting', icon: AcademicCapIcon },
                                { label: 'Training Grounds', status: 'Casting', icon: SignalIcon },
                                { label: 'Instructor Mobile', status: 'Silent', icon: UsersIcon },
                                { label: 'Student Portal', status: 'Casting', icon: BellIcon }
                            ].map((node, i) => (
                                <div key={i} className="flex justify-between items-center group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl transition-all">
                                    <div className="flex items-center gap-3">
                                        <node.icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{node.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${node.status === 'Casting' ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {node.status}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full ${node.status === 'Casting' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 h-px bg-slate-100 dark:bg-slate-800"></div>

                        <div className="mt-8 flex flex-col items-center gap-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Broadcaster active</p>
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                                <MegaphoneIcon className="w-8 h-8 text-indigo-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic text-slate-900 dark:text-white">Audience <span className="text-indigo-600">Reach</span></h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <UsersIcon className="w-5 h-5 text-indigo-600" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Driving Students</p>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-450 mt-0.5">Active Learners</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{students.length}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <UsersIcon className="w-5 h-5 text-purple-600" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Instructors</p>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-450 mt-0.5">Active Trainers</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{instructors.length}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                <div className="flex items-center gap-3">
                                    <SparklesIcon className="w-5 h-5 text-rose-600 animate-pulse" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Enquiry Leads</p>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-450 mt-0.5">Marketing Prospects</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-rose-600 animate-pulse">{leads.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
