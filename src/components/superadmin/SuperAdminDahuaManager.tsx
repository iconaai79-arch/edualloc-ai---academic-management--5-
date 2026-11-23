import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Institution } from '../../types';
import { 
    FingerPrintIcon as Fingerprint, 
    ArrowPathIcon as RefreshCw, 
    CheckCircleIcon as CheckCircle, 
    ExclamationTriangleIcon as AlertTriangle,
    MagnifyingGlassIcon as Search,
    XIcon as X,
    BuildingOfficeIcon as Building,
    ClockIcon,
    ShieldCheckIcon as ShieldCheck,
    InformationCircleIcon as Info,
    EyeIcon as Eye
} from '../icons';

interface SuperAdminDahuaManagerProps {
    institutions: Institution[];
    onRefreshData?: () => void;
}

interface BiometricDeviceRecord {
    id: string;
    institution_id?: string;
    institutionId?: string;
    institution_name?: string;
    serial_number: string;
    serialNumber?: string;
    device_name?: string;
    deviceName?: string;
    device_model?: string;
    protocol?: string;
    ip_address?: string;
    last_sync_at?: string;
    is_active?: boolean;
}

interface StaffAttendanceLogRecord {
    id: string;
    institution_id?: string;
    institutionId?: string;
    institution_name?: string;
    staff_id?: string;
    staffId?: string;
    staff_name?: string;
    device_id?: string;
    deviceId?: string;
    device_pin?: string;
    devicePin?: string;
    punch_time: string;
    punchTime?: string;
    verification_method?: number;
    raw_data?: any;
    is_processed?: boolean;
    created_at?: string;
}

export const SuperAdminDahuaManager: React.FC<SuperAdminDahuaManagerProps> = ({
    institutions = [],
    onRefreshData
}) => {
    const [devices, setDevices] = useState<BiometricDeviceRecord[]>([]);
    const [logs, setLogs] = useState<StaffAttendanceLogRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Selected device mapping states
    const [selectedDeviceSn, setSelectedDeviceSn] = useState<string>('Door1');
    const [selectedInstId, setSelectedInstId] = useState<string>('');
    const [reassignHistoricalLogs, setReassignHistoricalLogs] = useState(true);

    // Webhook generator states
    const [webhookInstId, setWebhookInstId] = useState<string>('');
    const [webhookDevName, setWebhookDevName] = useState<string>('Door1');
    const [copiedUrl, setCopiedUrl] = useState(false);

    // Filter states
    const [logSearchQuery, setLogSearchQuery] = useState('');
    const [logTypeFilter, setLogTypeFilter] = useState<'all' | 'verified' | 'stranger' | 'relay'>('all');

    // Raw JSON modal state
    const [inspectingLog, setInspectingLog] = useState<StaffAttendanceLogRecord | null>(null);

    const institutionMap = useMemo(() => {
        const map = new Map<string, Institution>();
        institutions.forEach(i => {
            if (i?.id) map.set(i.id, i);
        });
        return map;
    }, [institutions]);

    const fetchTelemetry = useCallback(async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/system?action=get_biometric_telemetry');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setDevices(data.devices || []);
                    setLogs(data.logs || []);
                    if (data.debug) console.info('[SuperAdminDahuaManager] telemetry debug:', data.debug);
                }
            } else {
                console.warn('[SuperAdminDahuaManager] telemetry HTTP', res.status, await res.text().catch(() => ''));
            }
        } catch (err) {
            console.warn('[SuperAdminDahuaManager] Error loading telemetry:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchTelemetry();
    }, [fetchTelemetry]);

    // Discover unique devices inferred from logs even if not yet in biometric_devices table
    const allKnownDevices = useMemo(() => {
        const map = new Map<string, { sn: string; name: string; instId: string; lastSync: string; count: number }>();
        
        // Add known registered devices
        devices.forEach(d => {
            const sn = (d.serial_number || (d as any).serialNumber || d.id || '').trim();
            if (!sn) return;
            map.set(sn, {
                sn,
                name: d.device_name || (d as any).deviceName || `Dahua Terminal (${sn})`,
                instId: d.institution_id || (d as any).institutionId || '',
                lastSync: d.last_sync_at || '',
                count: 0
            });
        });

        // Add devices discovered from logs
        logs.forEach(l => {
            let sn = l.device_id || (l as any).deviceId || l.device_pin || '';
            let rawObj: any = null;
            if (typeof l.raw_data === 'string') {
                try { rawObj = JSON.parse(l.raw_data); } catch (_) {}
            } else if (typeof l.raw_data === 'object' && l.raw_data !== null) {
                rawObj = l.raw_data;
            }

            if (!sn && rawObj?.Name) sn = String(rawObj.Name);
            if (!sn) sn = 'Door1';

            const existing = map.get(sn) || {
                sn,
                name: rawObj?.DeviceName || rawObj?.Name ? `Dahua Face Terminal (${rawObj.Name || sn})` : `Dahua Terminal (${sn})`,
                instId: l.institution_id || (l as any).institutionId || '',
                lastSync: l.punch_time || '',
                count: 0
            };
            existing.count += 1;
            if (!existing.lastSync || (l.punch_time && new Date(l.punch_time) > new Date(existing.lastSync))) {
                existing.lastSync = l.punch_time;
            }
            if (!existing.instId && (l.institution_id || (l as any).institutionId)) {
                existing.instId = l.institution_id || (l as any).institutionId || '';
            }
            map.set(sn, existing);
        });

        return Array.from(map.values());
    }, [devices, logs]);

    // Set initial selected values when data arrives
    useEffect(() => {
        if (!selectedDeviceSn && allKnownDevices.length > 0) {
            setSelectedDeviceSn(allKnownDevices[0].sn);
            setSelectedInstId(allKnownDevices[0].instId || (institutions[0]?.id || ''));
        }
        if (!webhookInstId && institutions.length > 0) {
            setWebhookInstId(institutions[0].id);
        }
    }, [allKnownDevices, selectedDeviceSn, webhookInstId, institutions]);

    const handleAssignDevice = async () => {
        if (!selectedDeviceSn || !selectedInstId) {
            setStatusBanner({ type: 'error', message: 'Please select both a device and a destination institution.' });
            return;
        }

        setIsSaving(true);
        setStatusBanner(null);

        try {
            const res = await fetch('/api/system?action=reassign_biometric_device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceSn: selectedDeviceSn,
                    institutionId: selectedInstId,
                    deviceName: `Dahua Face Terminal (${selectedDeviceSn})`,
                    reassignLogs: reassignHistoricalLogs
                })
            });

            const result = await res.json();
            if (res.ok && result.success) {
                const instName = institutionMap.get(selectedInstId)?.name || selectedInstId;
                setStatusBanner({
                    type: 'success',
                    message: `🎉 Success! Device "${selectedDeviceSn}" is now assigned to "${instName}". Reassigned ${result.updatedLogsCount || 0} historical attendance log(s).`
                });
                await fetchTelemetry();
                if (onRefreshData) onRefreshData();
            } else {
                setStatusBanner({
                    type: 'error',
                    message: result.error || result.message || 'Failed to reassign device.'
                });
            }
        } catch (err: any) {
            setStatusBanner({ type: 'error', message: 'Network error: ' + (err?.message || err) });
        } finally {
            setIsSaving(false);
        }
    };

    // Filtered Logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            let parsedRaw: any = null;
            if (typeof log.raw_data === 'string') {
                try { parsedRaw = JSON.parse(log.raw_data); } catch (_) {}
            } else if (typeof log.raw_data === 'object') {
                parsedRaw = log.raw_data;
            }

            const cardName = String(parsedRaw?.CardName || log.staff_name || '').toLowerCase();
            const devName = String(parsedRaw?.Name || log.device_id || (log as any).deviceId || log.device_pin || '').toLowerCase();
            const instName = String(log.institution_name || institutionMap.get(log.institution_id || '')?.name || log.institution_id || '').toLowerCase();
            const statusStr = String(parsedRaw?.Status ?? '').toLowerCase();

            // Type filter
            if (logTypeFilter === 'verified' && parsedRaw?.Status !== 1 && !cardName) return false;
            if (logTypeFilter === 'stranger' && (parsedRaw?.Status === 1 || cardName)) return false;
            if (logTypeFilter === 'relay' && !parsedRaw?.Status && statusStr !== 'open' && statusStr !== 'close') return false;

            if (!logSearchQuery.trim()) return true;
            const q = logSearchQuery.toLowerCase().trim();

            return (
                cardName.includes(q) ||
                devName.includes(q) ||
                instName.includes(q) ||
                String(parsedRaw?.UserID || '').includes(q) ||
                String(log.punch_time || '').includes(q)
            );
        });
    }, [logs, logSearchQuery, logTypeFilter, institutionMap]);

    // Live Webhook URL
    const generatedWebhookUrl = useMemo(() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://portal.eduai.co.ke';
        const instParam = webhookInstId ? `institution_id=${encodeURIComponent(webhookInstId)}` : '';
        const devParam = webhookDevName ? `device_id=${encodeURIComponent(webhookDevName)}` : '';
        const query = [instParam, devParam].filter(Boolean).join('&');
        return `${origin}/api/dahua-webhook${query ? `?${query}` : ''}`;
    }, [webhookInstId, webhookDevName]);

    const handleCopyWebhook = () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(generatedWebhookUrl);
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 2500);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-12">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-violet-500/20">
                <div className="absolute right-0 top-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-bold uppercase tracking-wider">
                            <Fingerprint className="w-4 h-4 text-violet-400" />
                            Hardware IoT & Biometrics Hub
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                            Dahua Biometric Terminal & Attendance Manager
                        </h2>
                        <p className="text-sm text-slate-300 max-w-2xl">
                            Inspect live facial authentication logs, door relay telemetry, and assign physical Dahua terminals and historical attendance logs to any institution.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={fetchTelemetry}
                            disabled={refreshing}
                            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh Logs'}
                        </button>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-violet-300 block mb-1">Dahua Devices</span>
                        <span className="text-2xl font-black text-white">{allKnownDevices.length}</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 block mb-1">Total Punches Logged</span>
                        <span className="text-2xl font-black text-white">{logs.length}</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block mb-1">Verified Face Matches</span>
                        <span className="text-2xl font-black text-white">
                            {logs.filter(l => {
                                const raw = typeof l.raw_data === 'string' ? JSON.parse(l.raw_data || '{}') : (l.raw_data || {});
                                return raw?.Status === 1 || raw?.CardName;
                            }).length}
                        </span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-sky-300 block mb-1">Door Sensor Relays</span>
                        <span className="text-2xl font-black text-white">
                            {logs.filter(l => {
                                const raw = typeof l.raw_data === 'string' ? JSON.parse(l.raw_data || '{}') : (l.raw_data || {});
                                return raw?.Status === 'Open' || raw?.Status === 'Close';
                            }).length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Notification Banner */}
            {statusBanner && (
                <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-bold shadow-md animate-in fade-in slide-in-from-top-2 ${
                    statusBanner.type === 'success' 
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300' 
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300'
                }`}>
                    <div className="flex items-center gap-2.5">
                        {statusBanner.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />}
                        <span>{statusBanner.message}</span>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setStatusBanner(null)}
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Grid Layout: Device Assignment & Webhook Setup */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* 1. Device Assignment Card (7 Cols) */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <Building className="w-5 h-5 text-violet-600" />
                                Assign Dahua Device to Institution
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Link physical hardware terminals and automatically reassign all past logs.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Device Picker */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                                1. Select Detected Dahua Terminal
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {allKnownDevices.map(dev => {
                                    const isSelected = selectedDeviceSn === dev.sn;
                                    const currentInst = institutionMap.get(dev.instId);
                                    return (
                                        <button
                                            key={dev.sn}
                                            type="button"
                                            onClick={() => {
                                                setSelectedDeviceSn(dev.sn);
                                                setSelectedInstId(dev.instId || (institutions[0]?.id || ''));
                                            }}
                                            className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                                                isSelected
                                                    ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-950/30 text-violet-900 dark:text-violet-200 shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className="text-xs font-black text-slate-800 dark:text-white">
                                                    {dev.name}
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                                                    {dev.count} logs
                                                </span>
                                            </div>
                                            <div className="mt-2 text-[10px] text-slate-400 space-y-0.5">
                                                <p><span className="font-semibold">Identifier:</span> {dev.sn}</p>
                                                <p className="truncate">
                                                    <span className="font-semibold">Current Inst:</span>{' '}
                                                    <span className="text-slate-600 dark:text-slate-300 font-bold">
                                                        {currentInst?.name || dev.instId || 'Unassigned'}
                                                    </span>
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}

                                {allKnownDevices.length === 0 && (
                                    <div className="col-span-2 p-6 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-xs text-slate-500">
                                        No Dahua devices detected yet. Send a punch or configure the webhook below.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Destination Institution Picker */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                                2. Destination Institution
                            </label>
                            <select
                                value={selectedInstId}
                                onChange={e => setSelectedInstId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                                <option value="">-- Choose Target Institution --</option>
                                {institutions.map(inst => (
                                    <option key={inst.id} value={inst.id}>
                                        {inst.name} ({inst.institutionCode || inst.id.substring(0, 8)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Reassign Historical Logs Checkbox */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="reassignLogsCheck"
                                checked={reassignHistoricalLogs}
                                onChange={e => setReassignHistoricalLogs(e.target.checked)}
                                className="mt-1 w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                            />
                            <label htmlFor="reassignLogsCheck" className="text-xs cursor-pointer">
                                <span className="font-bold text-slate-800 dark:text-slate-100 block">
                                    Migrate all historical logs from this terminal
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                                    Automatically update all existing rows in <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">staff_attendance_logs</code> matching "{selectedDeviceSn}" to this institution.
                                </span>
                            </label>
                        </div>

                        {/* Action Button */}
                        <button
                            type="button"
                            onClick={handleAssignDevice}
                            disabled={isSaving || !selectedDeviceSn || !selectedInstId}
                            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            {isSaving ? 'Assigning & Migrating Logs...' : `Assign ${selectedDeviceSn} & Reassign Logs`}
                        </button>
                    </div>
                </div>

                {/* 2. Webhook Setup & Direct Push URL Generator (5 Cols) */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
                    <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <Fingerprint className="w-5 h-5 text-emerald-600" />
                            Dahua Direct Webhook URL
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Configure this URL inside the Dahua Terminal's Web GUI to guarantee automatic institution routing.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                                Select Institution
                            </label>
                            <select
                                value={webhookInstId}
                                onChange={e => setWebhookInstId(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {institutions.map(inst => (
                                    <option key={inst.id} value={inst.id}>
                                        {inst.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                                Terminal / Door Identifier
                            </label>
                            <input
                                type="text"
                                value={webhookDevName}
                                onChange={e => setWebhookDevName(e.target.value)}
                                placeholder="e.g. Door1, GateMain, AdminBlock"
                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {/* Generated URL Box */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                                Generated Push Webhook Endpoint
                            </label>
                            <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-slate-100 font-mono text-[11px] break-all select-all flex items-center justify-between gap-2">
                                <span>{generatedWebhookUrl}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleCopyWebhook}
                            className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                copiedUrl 
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white'
                            }`}
                        >
                            <CheckCircle className="w-4 h-4" />
                            {copiedUrl ? 'Copied to Clipboard!' : 'Copy Webhook URL'}
                        </button>

                        {/* Step by Step Setup Box */}
                        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-500/20 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 block">
                                Quick Setup on Dahua Web Terminal:
                            </span>
                            <ol className="list-decimal list-inside space-y-1 text-[11px]">
                                <li>Open device IP in browser (e.g. <code className="font-mono">192.168.1.108</code>).</li>
                                <li>Go to <strong>Setting ➔ Event ➔ Alarm Server / Event Push</strong>.</li>
                                <li>Paste the copied URL into <strong>Server URL</strong>.</li>
                                <li>Enable <strong>Access Controller Events</strong> & save.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Live Attendance Logs Inspector Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 text-indigo-600" />
                            Live Dahua Attendance Logs Stream
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Real-time facial authentications, stranger detections, and door relay triggers from all terminals.
                        </p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                        {(['all', 'verified', 'stranger', 'relay'] as const).map(tabKey => (
                            <button
                                key={tabKey}
                                type="button"
                                onClick={() => setLogTypeFilter(tabKey)}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                    logTypeFilter === tabKey 
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                {tabKey === 'all' ? 'All Logs' : tabKey === 'verified' ? 'Verified (Matches)' : tabKey === 'stranger' ? 'Strangers' : 'Door Relays'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={logSearchQuery}
                        onChange={e => setLogSearchQuery(e.target.value)}
                        placeholder="Search logs by staff name (e.g. Ojiambo Fidelis), device (Door1), PIN, or institution..."
                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    {logSearchQuery && (
                        <button
                            type="button"
                            onClick={() => setLogSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100 dark:border-slate-800">
                                <th className="pb-3 px-3">Timestamp (UTC / Local)</th>
                                <th className="pb-3 px-3">Device / Door</th>
                                <th className="pb-3 px-3">Staff / Person</th>
                                <th className="pb-3 px-3">Event Type</th>
                                <th className="pb-3 px-3">Assigned Institution</th>
                                <th className="pb-3 px-3 text-right">Telemetry</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            {filteredLogs.map(log => {
                                let rawObj: any = null;
                                if (typeof log.raw_data === 'string') {
                                    try { rawObj = JSON.parse(log.raw_data); } catch (_) {}
                                } else if (typeof log.raw_data === 'object') {
                                    rawObj = log.raw_data;
                                }

                                const isDoorRelay = rawObj?.Status === 'Open' || rawObj?.Status === 'Close';
                                const isVerified = rawObj?.Status === 1;
                                const isStranger = rawObj?.ErrorCode === 16;
                                const isWalkaway = rawObj?.ErrorCode === 186;
                                const personName = rawObj?.CardName || log.staff_name || (rawObj?.UserID ? `User ID ${rawObj.UserID}` : 'Unknown');
                                const devName = rawObj?.Name || log.device_id || (log as any).deviceId || log.device_pin || 'Door1';
                                const instName = log.institution_name || institutionMap.get(log.institution_id || '')?.name || log.institution_id || 'Unassigned';

                                return (
                                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-all group">
                                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {log.punch_time ? new Date(log.punch_time).toLocaleString() : '—'}
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                                <Fingerprint className="w-3.5 h-3.5 text-violet-500" />
                                                {devName}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3">
                                            {isDoorRelay ? (
                                                <span className="font-bold text-slate-400 italic">
                                                    Sensor Relay ({rawObj?.Status})
                                                </span>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className={`font-black ${isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {personName}
                                                    </span>
                                                    {rawObj?.Similarity > 0 && (
                                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                                            {rawObj.Similarity}% Face Match (Alive: {rawObj.Alive})
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            {isDoorRelay ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">
                                                    Door Relay ({rawObj?.Status})
                                                </span>
                                            ) : isVerified ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 w-fit">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Verified (Match)
                                                </span>
                                            ) : isStranger ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                                    Stranger (Unregistered)
                                                </span>
                                            ) : isWalkaway ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                                                    Walkaway (No Align)
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                    Face Scan
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-3">
                                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 block truncate max-w-[200px]" title={instName}>
                                                {instName}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => setInspectingLog(log)}
                                                className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg transition-all"
                                                title="View Raw Camera & Telemetry JSON"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredLogs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                                        {logSearchQuery ? `No logs found matching "${logSearchQuery}".` : 'No biometric attendance logs found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Raw JSON Inspection Modal */}
            {inspectingLog && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Info className="w-5 h-5 text-violet-400" />
                                <h4 className="font-bold text-base">Raw Dahua Hardware Telemetry</h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectingLog(null)}
                                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs">
                            <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-slate-800 text-slate-400">
                                <div><span className="text-slate-500">Log ID:</span> {inspectingLog.id}</div>
                                <div><span className="text-slate-500">Timestamp:</span> {inspectingLog.punch_time}</div>
                                <div><span className="text-slate-500">Institution ID:</span> {inspectingLog.institution_id || inspectingLog.institutionId || 'None'}</div>
                                <div><span className="text-slate-500">Device PIN:</span> {inspectingLog.device_pin || inspectingLog.devicePin || 'None'}</div>
                            </div>
                            <pre className="bg-slate-950 p-4 rounded-2xl overflow-x-auto text-emerald-400 text-xs">
                                {typeof inspectingLog.raw_data === 'string'
                                    ? JSON.stringify(JSON.parse(inspectingLog.raw_data), null, 2)
                                    : JSON.stringify(inspectingLog.raw_data, null, 2)}
                            </pre>
                        </div>
                        <div className="p-4 border-t border-slate-800 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setInspectingLog(null)}
                                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
