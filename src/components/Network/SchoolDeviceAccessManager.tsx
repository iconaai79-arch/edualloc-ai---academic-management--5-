import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { SchoolAuthorizedDevice, SchoolRouterProfile, User, Institution } from '../../types';
import { apiService } from '../../services/apiService';
import { SignalIcon } from '../icons/SignalIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { Cog8ToothIcon } from '../icons/Cog8ToothIcon';
import { LockClosedIcon } from '../icons/LockClosedIcon';
import { SmartphoneIcon } from '../icons/SmartphoneIcon';

interface SchoolDeviceAccessManagerProps {
    currentUser: User;
    currentInstitution: Institution;
}

type TabType = 'directory' | 'tenda_export' | 'routers' | 'setup_guide';

export const SchoolDeviceAccessManager: React.FC<SchoolDeviceAccessManagerProps> = ({
    currentUser,
    currentInstitution
}) => {
    const institutionId = currentInstitution?.id || currentUser?.institutionId || '';

    const [activeTab, setActiveTab] = useState<TabType>('directory');
    const [devices, setDevices] = useState<SchoolAuthorizedDevice[]>([]);
    const [routers, setRouters] = useState<SchoolRouterProfile[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterOwnerType, setFilterOwnerType] = useState<string>('all');
    const [filterDeviceType, setFilterDeviceType] = useState<string>('all');

    // Modals
    const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);
    const [editingDevice, setEditingDevice] = useState<Partial<SchoolAuthorizedDevice> | null>(null);
    const [isRouterModalOpen, setIsRouterModalOpen] = useState<boolean>(false);
    const [editingRouter, setEditingRouter] = useState<Partial<SchoolRouterProfile> | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Export Options
    const [exportRouterId, setExportRouterId] = useState<string>('all');
    const [copiedToClipboard, setCopiedToClipboard] = useState<boolean>(false);

    const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
        setFeedbackMsg({ type, text });
        setTimeout(() => setFeedbackMsg(null), 4000);
    };

    const loadData = useCallback(async () => {
        if (!institutionId) return;
        try {
            setRefreshing(true);
            const [fetchedDevices, fetchedRouters] = await Promise.all([
                apiService.fetchSchoolAuthorizedDevices(institutionId),
                apiService.fetchSchoolRouterProfiles(institutionId)
            ]);
            setDevices(fetchedDevices || []);
            setRouters(fetchedRouters || []);
        } catch (err: any) {
            console.error('Failed to load school devices:', err);
            showToast('Failed to load devices and router profiles: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [institutionId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Format MAC address input automatically (e.g., AA:BB:CC:DD:EE:FF)
    const handleMacInputChange = (value: string) => {
        const clean = value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 12);
        const formatted = clean.match(/.{1,2}/g)?.join(':') || clean;
        setEditingDevice(prev => ({ ...prev, macAddress: formatted }));
    };

    const isMacValid = (mac?: string) => {
        if (!mac) return false;
        const macRegex = /^([0-9A-F]{2}[:]){5}([0-9A-F]{2})$/i;
        return macRegex.test(mac.trim());
    };

    const handleSaveDevice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDevice?.deviceName?.trim() || !editingDevice?.macAddress?.trim()) {
            showToast('Device Name and MAC Address are required.', 'error');
            return;
        }

        if (!isMacValid(editingDevice.macAddress)) {
            showToast('Invalid MAC Address format. Format must be XX:XX:XX:XX:XX:XX (e.g. C8:3A:35:12:34:56)', 'error');
            return;
        }

        try {
            setIsSaving(true);
            const payload: Partial<SchoolAuthorizedDevice> = {
                ...editingDevice,
                id: editingDevice.id || `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                institutionId,
                deviceName: editingDevice.deviceName.trim(),
                macAddress: editingDevice.macAddress.trim().toUpperCase(),
                deviceType: editingDevice.deviceType || 'laptop',
                ownerType: editingDevice.ownerType || 'teacher',
                accessStatus: editingDevice.accessStatus || 'authorized',
                bandwidthLimitMbps: editingDevice.bandwidthLimitMbps ? Number(editingDevice.bandwidthLimitMbps) : 0,
                updatedAt: new Date().toISOString()
            };

            await apiService.saveSchoolAuthorizedDevice(payload);
            showToast(`Device "${payload.deviceName}" saved successfully!`, 'success');
            setIsDeviceModalOpen(false);
            setEditingDevice(null);
            await loadData();
        } catch (err: any) {
            console.error('Failed to save device:', err);
            showToast('Failed to save device: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDevice = async (device: SchoolAuthorizedDevice) => {
        if (!window.confirm(`Are you sure you want to delete and revoke access for "${device.deviceName}" (${device.macAddress})?`)) {
            return;
        }
        try {
            await apiService.deleteSchoolAuthorizedDevice(device.id);
            showToast(`Device "${device.deviceName}" removed.`, 'info');
            await loadData();
        } catch (err: any) {
            console.error('Failed to delete device:', err);
            showToast('Error removing device: ' + (err.message || 'Unknown error'), 'error');
        }
    };

    const handleToggleStatus = async (device: SchoolAuthorizedDevice) => {
        const nextStatus = device.accessStatus === 'authorized' ? 'suspended' : 'authorized';
        try {
            await apiService.saveSchoolAuthorizedDevice({
                ...device,
                accessStatus: nextStatus,
                updatedAt: new Date().toISOString()
            });
            showToast(`Device "${device.deviceName}" set to ${nextStatus.toUpperCase()}.`, 'success');
            await loadData();
        } catch (err: any) {
            console.error('Failed to update status:', err);
            showToast('Failed to update device status.', 'error');
        }
    };

    const handleSaveRouter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRouter?.routerName?.trim()) {
            showToast('Router Name is required.', 'error');
            return;
        }

        try {
            setIsSaving(true);
            const payload: Partial<SchoolRouterProfile> = {
                ...editingRouter,
                id: editingRouter.id || `rtr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                institutionId,
                routerName: editingRouter.routerName.trim(),
                model: editingRouter.model?.trim() || 'Tenda F3',
                ipAddress: editingRouter.ipAddress?.trim() || '192.168.0.1',
                filterMode: editingRouter.filterMode || 'whitelist',
                updatedAt: new Date().toISOString()
            };

            await apiService.saveSchoolRouterProfile(payload);
            showToast(`Router profile "${payload.routerName}" saved!`, 'success');
            setIsRouterModalOpen(false);
            setEditingRouter(null);
            await loadData();
        } catch (err: any) {
            console.error('Failed to save router profile:', err);
            showToast('Failed to save router profile: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRouter = async (router: SchoolRouterProfile) => {
        if (!window.confirm(`Delete router profile "${router.routerName}"?`)) return;
        try {
            await apiService.deleteSchoolRouterProfile(router.id);
            showToast(`Router profile "${router.routerName}" deleted.`, 'info');
            await loadData();
        } catch (err: any) {
            console.error('Failed to delete router:', err);
            showToast('Failed to delete router: ' + (err.message || 'Unknown error'), 'error');
        }
    };

    // Filtered devices list
    const filteredDevices = useMemo(() => {
        return devices.filter(d => {
            const matchesSearch = !searchTerm ||
                d.deviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.macAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = filterStatus === 'all' || d.accessStatus === filterStatus;
            const matchesOwner = filterOwnerType === 'all' || d.ownerType === filterOwnerType;
            const matchesType = filterDeviceType === 'all' || d.deviceType === filterDeviceType;

            return matchesSearch && matchesStatus && matchesOwner && matchesType;
        });
    }, [devices, searchTerm, filterStatus, filterOwnerType, filterDeviceType]);

    // Active whitelisted devices for export
    const exportableDevices = useMemo(() => {
        return devices.filter(d => {
            const isAuthorized = d.accessStatus === 'authorized';
            const matchesRouter = exportRouterId === 'all' || d.routerProfileId === exportRouterId;
            return isAuthorized && matchesRouter;
        });
    }, [devices, exportRouterId]);

    const formattedMacExport = useMemo(() => {
        return exportableDevices.map(d => d.macAddress).join('\n');
    }, [exportableDevices]);

    const handleCopyExport = () => {
        if (!formattedMacExport) {
            showToast('No active authorized MAC addresses to copy.', 'info');
            return;
        }
        navigator.clipboard.writeText(formattedMacExport);
        setCopiedToClipboard(true);
        showToast(`Copied ${exportableDevices.length} MAC addresses to clipboard!`, 'success');
        setTimeout(() => setCopiedToClipboard(false), 3000);
    };

    // Metric counts
    const metrics = useMemo(() => {
        const total = devices.length;
        const authorized = devices.filter(d => d.accessStatus === 'authorized').length;
        const suspended = devices.filter(d => d.accessStatus === 'suspended').length;
        const routersCount = routers.length;
        const totalBandwidth = devices
            .filter(d => d.accessStatus === 'authorized')
            .reduce((acc, d) => acc + (d.bandwidthLimitMbps || 0), 0);

        return { total, authorized, suspended, routersCount, totalBandwidth };
    }, [devices, routers]);

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
            {/* Top Notification / Toast */}
            {feedbackMsg && (
                <div className={`p-4 rounded-xl flex items-center justify-between shadow-lg border transition-all animate-fade-in ${
                    feedbackMsg.type === 'success' ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-200' :
                    feedbackMsg.type === 'error' ? 'bg-rose-900/40 border-rose-500/40 text-rose-200' :
                    'bg-cyan-900/40 border-cyan-500/40 text-cyan-200'
                }`}>
                    <div className="flex items-center space-x-3">
                        {feedbackMsg.type === 'success' ? <CheckCircleIcon className="w-5 h-5 text-emerald-400" /> :
                         feedbackMsg.type === 'error' ? <ExclamationTriangleIcon className="w-5 h-5 text-rose-400" /> :
                         <SignalIcon className="w-5 h-5 text-cyan-400" />}
                        <span className="text-sm font-medium">{feedbackMsg.text}</span>
                    </div>
                    <button onClick={() => setFeedbackMsg(null)} className="text-xs opacity-75 hover:opacity-100">✕</button>
                </div>
            )}

            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 shadow-xl p-6">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                            <SignalIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">School WiFi & Device Access Manager</h1>
                                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                    Tenda F3 & F6 Ready
                                </span>
                            </div>
                            <p className="text-sm text-slate-400 mt-1">
                                Authorize teacher laptops, student tablets, lab PCs, and staff phones. Enforce MAC Address Whitelisting on school routers.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <a 
                            href="http://192.168.0.1" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition shadow-sm"
                            title="Open Tenda F3/F6 Default Gateway login"
                        >
                            <Cog8ToothIcon className="w-4 h-4 mr-1.5 text-cyan-400" />
                            Open Tenda Admin (192.168.0.1) ↗
                        </a>
                        <button
                            onClick={() => {
                                setEditingDevice({
                                    institutionId,
                                    deviceType: 'laptop',
                                    ownerType: 'teacher',
                                    accessStatus: 'authorized',
                                    bandwidthLimitMbps: 10
                                });
                                setIsDeviceModalOpen(true);
                            }}
                            className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-blue-500/20 transition"
                        >
                            <PlusIcon className="w-4 h-4 mr-1.5" />
                            Add Authorized Device
                        </button>
                        <button
                            onClick={loadData}
                            disabled={refreshing}
                            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition"
                            title="Refresh records"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Subtle decorative glow */}
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                        <span>Total Devices</span>
                        <SmartphoneIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mt-1">{metrics.total}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Registered in school</div>
                </div>

                <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
                        <span>Active Whitelisted</span>
                        <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">{metrics.authorized}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Permitted on WiFi</div>
                </div>

                <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center justify-between text-amber-400 text-xs font-medium">
                        <span>Suspended / Blocked</span>
                        <LockClosedIcon className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-amber-400 mt-1">{metrics.suspended}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Access disabled</div>
                </div>

                <div className="bg-slate-900/60 border border-indigo-500/20 rounded-xl p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center justify-between text-indigo-400 text-xs font-medium">
                        <span>Routers & APs</span>
                        <SignalIcon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-2xl font-bold text-indigo-400 mt-1">{metrics.routersCount}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Tenda AP profiles</div>
                </div>

                <div className="bg-slate-900/60 border border-cyan-500/20 rounded-xl p-4 shadow-sm backdrop-blur col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between text-cyan-400 text-xs font-medium">
                        <span>Total Bandwidth</span>
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">QoS</span>
                    </div>
                    <div className="text-2xl font-bold text-cyan-400 mt-1">{metrics.totalBandwidth} <span className="text-xs text-slate-400 font-normal">Mbps</span></div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Allocated limit</div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 space-x-1 sm:space-x-4 overflow-x-auto pb-px">
                <button
                    onClick={() => setActiveTab('directory')}
                    className={`py-2.5 px-4 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'directory'
                            ? 'border-cyan-400 text-cyan-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                >
                    <SmartphoneIcon className="w-4 h-4" />
                    Authorized Devices ({devices.length})
                </button>

                <button
                    onClick={() => setActiveTab('tenda_export')}
                    className={`py-2.5 px-4 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'tenda_export'
                            ? 'border-cyan-400 text-cyan-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                >
                    <ShieldCheckIcon className="w-4 h-4" />
                    Tenda F3/F6 Whitelist Exporter
                </button>

                <button
                    onClick={() => setActiveTab('routers')}
                    className={`py-2.5 px-4 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'routers'
                            ? 'border-cyan-400 text-cyan-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                >
                    <SignalIcon className="w-4 h-4" />
                    Routers & APs ({routers.length})
                </button>

                <button
                    onClick={() => setActiveTab('setup_guide')}
                    className={`py-2.5 px-4 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'setup_guide'
                            ? 'border-cyan-400 text-cyan-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                >
                    <Cog8ToothIcon className="w-4 h-4" />
                    Tenda F3/F6 Setup Guide
                </button>
            </div>

            {/* TAB 1: DIRECTORY */}
            {activeTab === 'directory' && (
                <div className="space-y-4">
                    {/* Search & Filters */}
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 sm:p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by Device name, MAC, owner, department..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 items-center">
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                            >
                                <option value="all">All Statuses</option>
                                <option value="authorized">Whitelisted (Authorized)</option>
                                <option value="suspended">Suspended</option>
                                <option value="revoked">Revoked</option>
                                <option value="pending">Pending</option>
                            </select>

                            <select
                                value={filterOwnerType}
                                onChange={e => setFilterOwnerType(e.target.value)}
                                className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                            >
                                <option value="all">All Owners</option>
                                <option value="teacher">Teachers</option>
                                <option value="student">Students</option>
                                <option value="staff">Admin Staff</option>
                                <option value="department">Labs & Depts</option>
                                <option value="infrastructure">Printers / CCTV</option>
                                <option value="visitor">Visitors / Guests</option>
                            </select>

                            <select
                                value={filterDeviceType}
                                onChange={e => setFilterDeviceType(e.target.value)}
                                className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                            >
                                <option value="all">All Device Types</option>
                                <option value="laptop">Laptops</option>
                                <option value="desktop">Desktops</option>
                                <option value="phone">Phones</option>
                                <option value="tablet">Tablets</option>
                                <option value="printer">Printers</option>
                                <option value="cctv">CCTV / Smart TV</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Devices Table */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        {loading ? (
                            <div className="p-12 text-center text-slate-400 space-y-2">
                                <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                                <p className="text-sm">Loading registered school devices...</p>
                            </div>
                        ) : filteredDevices.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 space-y-3">
                                <SignalIcon className="w-10 h-10 mx-auto text-slate-600" />
                                <h3 className="text-base font-semibold text-slate-200">No Authorized Devices Found</h3>
                                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                                    {searchTerm || filterStatus !== 'all' || filterOwnerType !== 'all'
                                        ? 'No devices matched your search criteria.'
                                        : 'Register teacher laptops, school tablets, and office PCs to prevent unauthorized devices from hogging your Tenda WiFi.'}
                                </p>
                                <button
                                    onClick={() => {
                                        setEditingDevice({
                                            institutionId,
                                            deviceType: 'laptop',
                                            ownerType: 'teacher',
                                            accessStatus: 'authorized',
                                            bandwidthLimitMbps: 10
                                        });
                                        setIsDeviceModalOpen(true);
                                    }}
                                    className="inline-flex items-center px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
                                >
                                    <PlusIcon className="w-3.5 h-3.5 mr-1" />
                                    Register First Device
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                    <thead>
                                        <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                            <th className="py-3.5 px-4">Device</th>
                                            <th className="py-3.5 px-4">MAC Address</th>
                                            <th className="py-3.5 px-4">Assigned Owner</th>
                                            <th className="py-3.5 px-4">Bandwidth (QoS)</th>
                                            <th className="py-3.5 px-4">Access Status</th>
                                            <th className="py-3.5 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {filteredDevices.map(device => {
                                            const isAuth = device.accessStatus === 'authorized';
                                            return (
                                                <tr key={device.id} className="hover:bg-slate-800/30 transition">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center space-x-2.5">
                                                            <div className={`p-1.5 rounded-lg ${
                                                                device.deviceType === 'laptop' ? 'bg-blue-500/10 text-blue-400' :
                                                                device.deviceType === 'phone' ? 'bg-purple-500/10 text-purple-400' :
                                                                device.deviceType === 'printer' ? 'bg-amber-500/10 text-amber-400' :
                                                                'bg-cyan-500/10 text-cyan-400'
                                                            }`}>
                                                                <SmartphoneIcon className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-white">{device.deviceName}</div>
                                                                <div className="text-[11px] text-slate-400 capitalize">
                                                                    {device.deviceType} {device.department ? `• ${device.department}` : ''}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="font-mono text-xs font-medium px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800 select-all">
                                                                {device.macAddress}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(device.macAddress);
                                                                    showToast(`Copied ${device.macAddress} to clipboard!`, 'info');
                                                                }}
                                                                className="text-slate-500 hover:text-cyan-400 text-[10px]"
                                                                title="Copy MAC address"
                                                            >
                                                                Copy
                                                            </button>
                                                        </div>
                                                        {device.ipAddress && (
                                                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">IP: {device.ipAddress}</span>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        <div className="text-slate-200 font-medium">{device.ownerName || 'Unassigned'}</div>
                                                        <div className="text-[11px] text-slate-400 capitalize flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                            {device.ownerType}
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        {device.bandwidthLimitMbps && device.bandwidthLimitMbps > 0 ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                                                                {device.bandwidthLimitMbps} Mbps
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-500">Unlimited</span>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                            device.accessStatus === 'authorized'
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                                : device.accessStatus === 'suspended'
                                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                                device.accessStatus === 'authorized' ? 'bg-emerald-400' :
                                                                device.accessStatus === 'suspended' ? 'bg-amber-400' : 'bg-rose-400'
                                                            }`} />
                                                            {device.accessStatus.toUpperCase()}
                                                        </span>
                                                    </td>

                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end space-x-1.5">
                                                            <button
                                                                onClick={() => handleToggleStatus(device)}
                                                                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                                                                    isAuth
                                                                        ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
                                                                        : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
                                                                }`}
                                                                title={isAuth ? "Suspend device from whitelist" : "Re-authorize device"}
                                                            >
                                                                {isAuth ? 'Suspend' : 'Authorize'}
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    setEditingDevice(device);
                                                                    setIsDeviceModalOpen(true);
                                                                }}
                                                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                                                title="Edit device details"
                                                            >
                                                                <Cog8ToothIcon className="w-4 h-4" />
                                                            </button>

                                                            <button
                                                                onClick={() => handleDeleteDevice(device)}
                                                                className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition"
                                                                title="Delete device"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
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
                </div>
            )}

            {/* TAB 2: TENDA WHITELIST EXPORTER */}
            {activeTab === 'tenda_export' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Export Action & Code Box */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="bg-slate-900/80 border border-indigo-500/20 rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        <ShieldCheckIcon className="w-5 h-5 text-cyan-400" />
                                        Tenda F3 & F6 MAC Whitelist Output
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Ready-to-paste MAC addresses formatted for Tenda F3/F6 White List filter.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={exportRouterId}
                                        onChange={e => setExportRouterId(e.target.value)}
                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                                    >
                                        <option value="all">All Routers ({exportableDevices.length})</option>
                                        {routers.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.routerName} ({r.model || 'Tenda'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Export codebox */}
                            <div className="relative">
                                <textarea
                                    readOnly
                                    rows={10}
                                    value={formattedMacExport || 'No authorized devices found to export. Please register devices and set access status to AUTHORIZED.'}
                                    className="w-full bg-slate-950 font-mono text-xs sm:text-sm text-cyan-300 p-4 rounded-xl border border-slate-800 focus:outline-none resize-none leading-relaxed"
                                />

                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                    <button
                                        onClick={handleCopyExport}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium shadow transition flex items-center gap-1.5 ${
                                            copiedToClipboard
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                        }`}
                                    >
                                        {copiedToClipboard ? (
                                            <>
                                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheckIcon className="w-3.5 h-3.5" />
                                                Copy All ({exportableDevices.length})
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                                <span>Total Whitelisted MACs: <strong className="text-white">{exportableDevices.length}</strong></span>
                                <a 
                                    href="http://192.168.0.1" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-cyan-400 hover:text-cyan-300 underline font-medium"
                                >
                                    Go to Tenda 192.168.0.1 ↗
                                </a>
                            </div>
                        </div>

                        {/* Audit Roster */}
                        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Exported Device Audit Summary</h4>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {exportableDevices.map(d => (
                                    <div key={d.id} className="flex items-center justify-between py-1 px-2 rounded bg-slate-950/40 text-xs border border-slate-800/40">
                                        <span className="text-white font-medium">{d.deviceName}</span>
                                        <span className="font-mono text-cyan-300">{d.macAddress}</span>
                                        <span className="text-slate-400">{d.ownerName || d.ownerType}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Quick Instructions on How to Paste into Tenda */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/20 rounded-xl p-5 space-y-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Cog8ToothIcon className="w-4 h-4 text-cyan-400" />
                                How to Apply on Tenda F3 / F6
                            </h3>

                            <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside">
                                <li className="leading-relaxed">
                                    <strong className="text-white">Open Tenda Admin:</strong> Connect to the school WiFi, open <a href="http://192.168.0.1" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">http://192.168.0.1</a> in your browser.
                                </li>
                                <li className="leading-relaxed">
                                    <strong className="text-white">Navigate to MAC Filter:</strong>
                                    <div className="mt-1 ml-4 p-2 bg-slate-950/80 rounded border border-slate-800 text-[11px] font-mono text-slate-300">
                                        • Tenda F3: Advanced Settings → MAC Address Filter<br/>
                                        • Tenda F6: Access Control / MAC Address Filter
                                    </div>
                                </li>
                                <li className="leading-relaxed">
                                    <strong className="text-white">Select "White List":</strong> Change filter mode from <em>Black List</em> to <span className="text-emerald-400 font-semibold">White List</span>.
                                    <p className="text-[11px] text-slate-400 mt-0.5 ml-4">
                                        ⚠️ In White List mode, <strong>only registered devices</strong> can connect. All unauthorized devices are permanently blocked, even if they guess the WiFi password!
                                    </p>
                                </li>
                                <li className="leading-relaxed">
                                    <strong className="text-white">Add Addresses:</strong> Click <strong>"Add New"</strong>, paste the MAC address, give it the teacher or lab name, and click <strong>Save</strong>.
                                </li>
                            </ol>

                            <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-lg text-[11px] text-cyan-200">
                                💡 <strong>Tip for Administrators:</strong> Keep the router admin password strictly private to the Principal and School IT Admin so students cannot reset the filter.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: ROUTERS & AP PROFILES */}
            {activeTab === 'routers' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-white">School Routers & Access Points</h3>
                            <p className="text-xs text-slate-400">Manage Tenda F3, F6, and secondary APs distributed across classrooms, staffrooms, and labs.</p>
                        </div>
                        <button
                            onClick={() => {
                                setEditingRouter({
                                    institutionId,
                                    model: 'Tenda F3',
                                    ipAddress: '192.168.0.1',
                                    filterMode: 'whitelist'
                                });
                                setIsRouterModalOpen(true);
                            }}
                            className="inline-flex items-center px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition"
                        >
                            <PlusIcon className="w-3.5 h-3.5 mr-1" />
                            Add Router Profile
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {routers.length === 0 ? (
                            <div className="col-span-full p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                                <SignalIcon className="w-8 h-8 mx-auto text-slate-600" />
                                <p className="text-sm text-slate-300">No router profiles saved yet.</p>
                                <button
                                    onClick={() => {
                                        setEditingRouter({
                                            institutionId,
                                            routerName: 'Main School Tenda F3',
                                            model: 'Tenda F3',
                                            ipAddress: '192.168.0.1',
                                            location: 'Staffroom',
                                            wifiSsid: 'School_Staff_WiFi',
                                            filterMode: 'whitelist'
                                        });
                                        setIsRouterModalOpen(true);
                                    }}
                                    className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
                                >
                                    + Add Default Tenda F3 Profile
                                </button>
                            </div>
                        ) : (
                            routers.map(router => (
                                <div key={router.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm hover:border-slate-700 transition">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                <SignalIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-white text-sm">{router.routerName}</h4>
                                                <span className="text-[11px] text-cyan-400 font-mono">{router.model || 'Tenda Router'}</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            {router.filterMode || 'whitelist'}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Gateway IP:</span>
                                            <span className="font-mono text-cyan-300">{router.ipAddress || '192.168.0.1'}</span>
                                        </div>
                                        {router.wifiSsid && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">WiFi SSID:</span>
                                                <span className="font-medium text-white">{router.wifiSsid}</span>
                                            </div>
                                        )}
                                        {router.location && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Location:</span>
                                                <span className="text-slate-300">{router.location}</span>
                                            </div>
                                        )}
                                    </div>

                                    {router.notes && (
                                        <p className="text-[11px] text-slate-400 italic">
                                            {router.notes}
                                        </p>
                                    )}

                                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                                        <a
                                            href={`http://${router.ipAddress || '192.168.0.1'}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                                        >
                                            Login (Web GUI) ↗
                                        </a>

                                        <div className="flex items-center space-x-1">
                                            <button
                                                onClick={() => {
                                                    setEditingRouter(router);
                                                    setIsRouterModalOpen(true);
                                                }}
                                                className="p-1 rounded text-slate-400 hover:text-white"
                                            >
                                                <Cog8ToothIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRouter(router)}
                                                className="p-1 rounded text-rose-400 hover:text-rose-300"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: SETUP GUIDE */}
            {activeTab === 'setup_guide' && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Cog8ToothIcon className="w-5 h-5 text-cyan-400" />
                            Comprehensive Tenda F3 & F6 School Access Control Guide
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1">
                            Follow these 4 practical steps to lock down school WiFi using your existing Tenda routers.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Step 1 */}
                        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                                <h3 className="font-semibold text-white text-sm">Access Router Admin Portal</h3>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Connect your laptop or phone to the Tenda WiFi or plug an Ethernet LAN cable from the router into your PC.
                            </p>
                            <div className="p-3 bg-slate-900 rounded-lg text-xs space-y-1 font-mono text-cyan-300 border border-slate-800">
                                <div>URL: http://192.168.0.1</div>
                                <div>Default Login: admin (or leave blank if fresh setup)</div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                                <h3 className="font-semibold text-white text-sm">Locate MAC Address Filtering</h3>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                In the Tenda management sidebar:
                            </p>
                            <div className="p-3 bg-slate-900 rounded-lg text-xs space-y-1 text-slate-200 border border-slate-800">
                                <div>• <strong>Tenda F3:</strong> Click <strong>Advanced Settings</strong> → <strong>MAC Address Filter</strong>.</div>
                                <div>• <strong>Tenda F6:</strong> Click <strong>Access Control</strong> or <strong>Security Settings</strong>.</div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                                <h3 className="font-semibold text-white text-sm">Switch Mode to "White List"</h3>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                By default, Tenda routers operate on "Black List" mode (allow all except blocked).
                            </p>
                            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-200">
                                <strong>Change to "White List":</strong> Only MAC addresses entered in the table can connect to WiFi or obtain an IP address. Any rogue phone is immediately dropped!
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">4</span>
                                <h3 className="font-semibold text-white text-sm">Bandwidth Management (QoS)</h3>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Both Tenda F3 & F6 feature built-in <strong>Bandwidth Control</strong>:
                            </p>
                            <div className="p-3 bg-slate-900 rounded-lg text-xs space-y-1 text-slate-200 border border-slate-800">
                                <div>• Go to <strong>Bandwidth Control</strong> tab in Tenda.</div>
                                <div>• Cap student devices at <strong>1 Mbps or 2 Mbps</strong>.</div>
                                <div>• Reserve <strong>10 Mbps+</strong> for Teacher Laptops and Computer Lab.</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: ADD / EDIT AUTHORIZED DEVICE */}
            {isDeviceModalOpen && editingDevice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <SignalIcon className="w-5 h-5 text-cyan-400" />
                                {editingDevice.id ? 'Edit Authorized Device' : 'Register New School Device'}
                            </h3>
                            <button
                                onClick={() => setIsDeviceModalOpen(false)}
                                className="text-slate-400 hover:text-white text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveDevice} className="space-y-4 text-xs sm:text-sm">
                            <div>
                                <label className="block text-slate-300 font-medium mb-1">
                                    Device Name <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Science Lab HP Laptop #04, Tr. Peter Phone"
                                    value={editingDevice.deviceName || ''}
                                    onChange={e => setEditingDevice({ ...editingDevice, deviceName: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">
                                        MAC Address <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="AA:BB:CC:DD:EE:FF"
                                        value={editingDevice.macAddress || ''}
                                        onChange={e => handleMacInputChange(e.target.value)}
                                        className={`w-full bg-slate-950 border rounded-lg px-3 py-2 font-mono text-cyan-300 placeholder-slate-500 focus:outline-none ${
                                            editingDevice.macAddress && !isMacValid(editingDevice.macAddress)
                                                ? 'border-rose-500 focus:border-rose-400'
                                                : 'border-slate-700 focus:border-cyan-400'
                                        }`}
                                    />
                                    {editingDevice.macAddress && !isMacValid(editingDevice.macAddress) && (
                                        <p className="text-[10px] text-rose-400 mt-1">Must be 12 hex characters: XX:XX:XX:XX:XX:XX</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Device Type</label>
                                    <select
                                        value={editingDevice.deviceType || 'laptop'}
                                        onChange={e => setEditingDevice({ ...editingDevice, deviceType: e.target.value as any })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                                    >
                                        <option value="laptop">Laptop</option>
                                        <option value="desktop">Desktop PC</option>
                                        <option value="phone">Smartphone</option>
                                        <option value="tablet">Tablet / iPad</option>
                                        <option value="printer">Network Printer</option>
                                        <option value="cctv">CCTV / Camera</option>
                                        <option value="smart_tv">Smart TV / Projector</option>
                                        <option value="other">Other Device</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Owner Category</label>
                                    <select
                                        value={editingDevice.ownerType || 'teacher'}
                                        onChange={e => setEditingDevice({ ...editingDevice, ownerType: e.target.value as any })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                                    >
                                        <option value="teacher">Teacher</option>
                                        <option value="staff">Admin / Support Staff</option>
                                        <option value="student">Student</option>
                                        <option value="department">Department / Lab</option>
                                        <option value="infrastructure">School Infrastructure</option>
                                        <option value="visitor">Visitor / Temporary</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Owner Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Mrs. Jane Mwangi"
                                        value={editingDevice.ownerName || ''}
                                        onChange={e => setEditingDevice({ ...editingDevice, ownerName: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                                    >
                                    </input>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Department</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Sciences, Principal Office, Library"
                                        value={editingDevice.department || ''}
                                        onChange={e => setEditingDevice({ ...editingDevice, department: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Bandwidth Limit (Mbps)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="1000"
                                        placeholder="e.g. 5, 10, or 0 for unlimited"
                                        value={editingDevice.bandwidthLimitMbps ?? 10}
                                        onChange={e => setEditingDevice({ ...editingDevice, bandwidthLimitMbps: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Access Status</label>
                                    <select
                                        value={editingDevice.accessStatus || 'authorized'}
                                        onChange={e => setEditingDevice({ ...editingDevice, accessStatus: e.target.value as any })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                                    >
                                        <option value="authorized">Whitelisted (Authorized)</option>
                                        <option value="suspended">Suspended</option>
                                        <option value="revoked">Revoked</option>
                                        <option value="pending">Pending Approval</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Target Router AP</label>
                                    <select
                                        value={editingDevice.routerProfileId || ''}
                                        onChange={e => setEditingDevice({ ...editingDevice, routerProfileId: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                                    >
                                        <option value="">All School Routers</option>
                                        {routers.map(r => (
                                            <option key={r.id} value={r.id}>{r.routerName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Notes / Remarks</label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Dell Latitude provided under school ICT project..."
                                    value={editingDevice.notes || ''}
                                    onChange={e => setEditingDevice({ ...editingDevice, notes: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                                />
                            </div>

                            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsDeviceModalOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-md transition"
                                >
                                    {isSaving ? 'Saving...' : 'Save Device'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ADD / EDIT ROUTER PROFILE */}
            {isRouterModalOpen && editingRouter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <SignalIcon className="w-5 h-5 text-cyan-400" />
                                {editingRouter.id ? 'Edit Router Profile' : 'Add Router Profile'}
                            </h3>
                            <button
                                onClick={() => setIsRouterModalOpen(false)}
                                className="text-slate-400 hover:text-white text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveRouter} className="space-y-3.5 text-xs sm:text-sm">
                            <div>
                                <label className="block text-slate-300 font-medium mb-1">
                                    Router Name <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Staffroom Tenda F3, Main Lab AP"
                                    value={editingRouter.routerName || ''}
                                    onChange={e => setEditingRouter({ ...editingRouter, routerName: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Model</label>
                                    <input
                                        type="text"
                                        placeholder="Tenda F3, F6, etc."
                                        value={editingRouter.model || ''}
                                        onChange={e => setEditingRouter({ ...editingRouter, model: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Gateway IP</label>
                                    <input
                                        type="text"
                                        placeholder="192.168.0.1"
                                        value={editingRouter.ipAddress || ''}
                                        onChange={e => setEditingRouter({ ...editingRouter, ipAddress: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">WiFi SSID</label>
                                    <input
                                        type="text"
                                        placeholder="School_Staff_WiFi"
                                        value={editingRouter.wifiSsid || ''}
                                        onChange={e => setEditingRouter({ ...editingRouter, wifiSsid: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Location</label>
                                    <input
                                        type="text"
                                        placeholder="Staff Room"
                                        value={editingRouter.location || ''}
                                        onChange={e => setEditingRouter({ ...editingRouter, location: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsRouterModalOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-md transition"
                                >
                                    {isSaving ? 'Saving...' : 'Save Router'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
