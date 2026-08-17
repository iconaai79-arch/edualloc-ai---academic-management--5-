import React, { useState, useEffect, useMemo } from 'react';
import {
    User, Institution, BoardingMaintenanceLog, BoardingHouse,
    MaintenancePriority, MaintenanceStatus
} from '../types';
import { SettingsIcon } from './icons/SettingsIcon';
import { PlusIcon } from './icons/PlusIcon';
import { SearchIcon } from './icons/SearchIcon';
import { FilterIcon } from './icons/FilterIcon';
import { XIcon } from './icons/XIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { Cog8ToothIcon } from './icons/Cog8ToothIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { HomeIcon } from './icons/HomeIcon';
import { BedIcon } from './icons/BedIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { TrashIcon } from './icons/TrashIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ShieldIcon } from './icons/ShieldIcon';

import { apiService } from '../services/apiService';

interface BoardingMaintenanceManagerProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction: (action: string) => Promise<void>;
}

const BoardingMaintenanceManager: React.FC<BoardingMaintenanceManagerProps> = ({
    currentUser,
    currentInstitution,
    onLogAction
}) => {
    const [maintenanceLogs, setMaintenanceLogs] = useState<BoardingMaintenanceLog[]>([]);
    const [houses, setHouses] = useState<BoardingHouse[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [showModal, setShowModal] = useState(false);
    const [editingLog, setEditingLog] = useState<BoardingMaintenanceLog | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | MaintenanceStatus>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | MaintenancePriority>('all');

    const [formData, setFormData] = useState({
        houseId: '',
        roomId: '',
        bedId: '',
        issueDescription: '',
        priority: 'Medium' as MaintenancePriority,
        status: 'Pending' as MaintenanceStatus,
        resolutionNotes: ''
    });

    useEffect(() => {
        loadData();
    }, [currentInstitution.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadMaintenanceLogs(),
                loadHouses()
            ]);
        } catch (error) {
            console.error('Error synchronizing maintenance vector:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMaintenanceLogs = async () => {
        const data = await apiService.fetchMaintenanceLogs(currentInstitution.id);
        const transformed = (data || []).map((l: any) => ({
            ...l,
            houseName: l.boardingHouses?.name || 'Common Area',
            roomNumber: l.boardingRooms?.roomNumber || 'N/A',
            bedNumber: l.boardingBeds?.bedNumber || 'N/A',
            reportedByName: l.usersBoardingMaintenanceLogsReportedByFkey?.name || 'Anonymous',
            resolvedByName: l.usersBoardingMaintenanceLogsResolvedByFkey?.name || 'Unassigned'
        }));
        setMaintenanceLogs(transformed);
    };

    const loadHouses = async () => {
        const data = await apiService.fetchModuleRecords<BoardingHouse>('boarding_houses', currentInstitution.id);
        setHouses(data || []);
    };

    const handleOpenModal = (log?: BoardingMaintenanceLog) => {
        if (log) {
            setEditingLog(log);
            setFormData({
                houseId: log.houseId || '',
                roomId: log.roomId || '',
                bedId: log.bedId || '',
                issueDescription: log.issueDescription,
                priority: log.priority,
                status: log.status,
                resolutionNotes: log.resolutionNotes || ''
            });
        } else {
            setEditingLog(null);
            setFormData({
                houseId: '',
                roomId: '',
                bedId: '',
                issueDescription: '',
                priority: 'Medium',
                status: 'Pending',
                resolutionNotes: ''
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.issueDescription.trim() || !formData.issueDescription.trim()) return;

        try {
            if (editingLog) {
                const payload: any = {
                    ...formData,
                    institutionId: currentInstitution.id,
                    houseId: formData.houseId || null,
                    roomId: formData.roomId || null,
                    bedId: formData.bedId || null,
                    updatedAt: new Date().toISOString(),
                    id: editingLog.id
                };

                if (formData.status === 'Resolved' && editingLog.status !== 'Resolved') {
                    payload.resolvedDate = new Date().toISOString().split('T')[0];
                    payload.resolvedBy = currentUser.id;
                }

                await apiService.saveModuleRecord('boarding_maintenance_logs', payload);
                await onLogAction(`Maintenance: Updated Ticket #${editingLog.id.substring(0, 8)}`);
            } else {
                const payload = {
                    ...formData,
                    institutionId: currentInstitution.id,
                    houseId: formData.houseId || null,
                    roomId: formData.roomId || null,
                    bedId: formData.bedId || null,
                    reportedDate: new Date().toISOString().split('T')[0],
                    id: crypto.randomUUID?.() || `log_${Date.now()}`
                };

                await apiService.saveModuleRecord('boarding_maintenance_logs', payload);
                await onLogAction(`Maintenance: Created New Ticket - ${formData.issueDescription}`);
            }

            setShowModal(false);
            loadData();
        } catch (error) {
            alert('Protocol Violation: Maintenance log synchronization failed.');
        }
    };

    const handleDelete = async (log: BoardingMaintenanceLog) => {
        if (!confirm('Permanently purge maintenance record?')) return;
        try {
            await apiService.deleteModuleRecord('boarding_maintenance_logs', log.id);
            await onLogAction(`Maintenance: Purged Ticket #${log.id.substring(0, 8)}`);
            loadData();
        } catch (error) {
            alert('Purge Failure: Unable to delete record from cluster.');
        }
    };

    const filteredLogs = useMemo(() => {
        return maintenanceLogs.filter(log => {
            const matchesSearch = log.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.issueDescription.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
            const matchesPriority = priorityFilter === 'all' || log.priority === priorityFilter;
            return matchesSearch && matchesStatus && matchesPriority;
        });
    }, [maintenanceLogs, searchTerm, statusFilter, priorityFilter]);

    const stats = useMemo(() => {
        return {
            pending: maintenanceLogs.filter(l => l.status === 'Pending').length,
            inProgress: maintenanceLogs.filter(l => l.status === 'In Progress').length,
            completedToday: maintenanceLogs.filter(l => l.status === 'Resolved' && l.resolvedDate === new Date().toISOString().split('T')[0]).length,
            criticalAlerts: maintenanceLogs.filter(l => l.priority === 'Critical' && l.status !== 'Resolved').length
        };
    }, [maintenanceLogs]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-amber-600"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Archiving Infrastructure Stability...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in">
            {/* Infrastructure Intelligence Header */}
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-amber-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-amber-200 dark:shadow-none">
                            <Cog8ToothIcon className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Facilities Audit</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black mt-2">Institutional Maintenance & Repair Logistics</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-8 items-center bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2.2rem]">
                        <div className="text-center px-6 border-r border-slate-200 dark:border-slate-700">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 font-black">Open Issues</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{stats.pending + stats.inProgress}</p>
                        </div>
                        <div className="text-center px-6 border-r border-slate-200 dark:border-slate-700">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 font-black">Critical</p>
                            <p className="text-2xl font-black text-rose-600 leading-none">{stats.criticalAlerts}</p>
                        </div>
                        <div className="text-center px-6">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 font-black">MTTR Performance</p>
                            <p className="text-2xl font-black text-emerald-600 leading-none">Optimal</p>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.25em] shadow-xl hover:scale-105 transition-all"
                        >
                            INITIATE TICKET
                        </button>
                    </div>
                </div>
            </div>

            {/* Tactical Grid Architecture */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Sidebars Component */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-50 dark:border-slate-700 shadow-sm">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Status Vector</h4>
                        <div className="space-y-3">
                            {['all', 'Pending', 'In Progress', 'Resolved'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s as any)}
                                    className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${statusFilter === s ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                                        }`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest">{s}</span>
                                    {statusFilter === s && <CheckCircleIcon className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-50 dark:border-slate-700 shadow-sm">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Priority Tier</h4>
                        <div className="space-y-3">
                            {['all', 'Critical', 'High', 'Medium', 'Low'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPriorityFilter(p as any)}
                                    className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${priorityFilter === p ? 'bg-amber-600 text-white shadow-xl shadow-amber-100' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                                        }`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest">{p}</span>
                                    {priorityFilter === p && <AlertTriangleIcon className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Log Control Center */}
                <div className="lg:col-span-9 space-y-8">
                    <div className="relative">
                        <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300" />
                        <input
                            type="text"
                            placeholder="SCAN INFRASTRUCTURE LOGS..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-16 pr-8 py-6 bg-white dark:bg-slate-800 border-none rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-100/50 dark:shadow-none focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-6">
                        {filteredLogs.map((log) => (
                            <div key={log.id} className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700 group hover:-translate-y-1 transition-all">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                                    <div className="flex-grow">
                                        <div className="flex flex-wrap items-center gap-3 mb-4">
                                            <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border ${log.priority === 'Critical' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                                                log.priority === 'High' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                                    'bg-slate-50 border-slate-100 dark:bg-slate-900 text-slate-500'
                                                }`}>
                                                {log.priority} PRIORITY
                                            </span>
                                            <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${log.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' :
                                                log.status === 'In Progress' ? 'bg-indigo-50 text-indigo-600' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                {log.status}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-auto">
                                                TKT-{log.id.substring(log.id.length - 6).toUpperCase()}
                                            </span>
                                        </div>

                                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">{log.issueDescription}</h4>
                                        <p className="text-xs text-slate-500 font-bold leading-relaxed uppercase tracking-widest mb-8">{log.issueDescription}</p>

                                        <div className="flex flex-wrap gap-8">
                                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 px-5 py-3 rounded-2xl">
                                                <HomeIcon className="w-4 h-4 text-slate-400" />
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase">Station</p>
                                                    <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{log.houseName} • {log.roomNumber}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 px-5 py-3 rounded-2xl">
                                                <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase">Reported</p>
                                                    <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{new Date(log.reportedDate).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-row md:flex-col gap-3 ml-auto opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={() => handleOpenModal(log)}
                                            className="p-5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-[2rem] hover:scale-110 transition-all"
                                        >
                                            <SettingsIcon className="w-6 h-6" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(log)}
                                            className="p-5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2rem] hover:scale-110 transition-all"
                                        >
                                            <TrashIcon className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                {log.resolutionNotes && (
                                    <div className="mt-10 p-8 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/20">
                                        <div className="flex items-center gap-3 mb-3">
                                            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                                            <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Post-Audit Resolution</h5>
                                        </div>
                                        <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold leading-relaxed uppercase tracking-widest">
                                            {log.resolutionNotes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                        {filteredLogs.length === 0 && (
                            <div className="col-span-full py-40 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[4rem] border border-dashed border-slate-200 dark:border-slate-800">
                                <TrendingUpIcon className="w-20 h-20 text-slate-200 mx-auto mb-8" />
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No maintenance vectors detected in current sector</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tactical Input Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-3xl z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowModal(false)}>
                    <div className="bg-white dark:bg-slate-950 rounded-[4.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-white/5" onClick={e => e.stopPropagation()}>
                        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[90vh]">
                            {/* Mission Identity Pillar */}
                            <div className={`lg:col-span-4 p-16 text-white flex flex-col items-center justify-center text-center ${editingLog ? 'bg-indigo-600' : 'bg-amber-600'}`}>
                                <div className="w-32 h-32 bg-white/20 rounded-[3.5rem] flex items-center justify-center mb-10 backdrop-blur-2xl">
                                    <Cog8ToothIcon className="w-16 h-16" />
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tight mb-4">{editingLog ? 'Update Protocol' : 'New Incident'}</h3>
                                <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.4em] mb-12">Infrastructure Safety Audit</p>

                                <div className="w-full space-y-6 pt-10 border-t border-white/10 text-left">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">Authorized By</span>
                                        <span className="text-[10px] font-black uppercase">{(currentUser?.name || 'User').split(' ')[0]}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">Encryption</span>
                                        <span className="text-[10px] font-black uppercase">AES-256</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tactical Form */}
                            <div className="lg:col-span-8 p-16 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                                <div className="flex justify-between items-center mb-12">
                                    <div>
                                        <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Audit Parameters</h4>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.25em] mt-2">Logistical Issue Definition Phase</p>
                                    </div>
                                    <button onClick={() => setShowModal(false)} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 transition-all text-slate-400">
                                        <XIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incident Classifier</label>
                                            <input
                                                type="text"
                                                value={formData.issueDescription}
                                                onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                                                placeholder="e.g. GRID-4 FAILURE"
                                                required
                                                className="w-full p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Response Priority</label>
                                            <select
                                                value={formData.priority}
                                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as MaintenancePriority })}
                                                className="w-full p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
                                            >
                                                <option value="Low">Low Frequency</option>
                                                <option value="Medium">Standard Response</option>
                                                <option value="High">Tactical Priority</option>
                                                <option value="Urgent">Critical Security Risk</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vector Location (Optional)</label>
                                        <select
                                            value={formData.houseId}
                                            onChange={(e) => setFormData({ ...formData, houseId: e.target.value })}
                                            className="w-full p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
                                        >
                                            <option value="">Common Institutional Areas</option>
                                            {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Log Detail</label>
                                        <textarea
                                            value={formData.issueDescription}
                                            onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                                            className="w-full p-8 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border-none text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest outline-none focus:ring-2 focus:ring-amber-500 min-h-[140px]"
                                            placeholder="Provide technical issueDescription of the detected anomaly..."
                                            required
                                        />
                                    </div>

                                    {editingLog && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-50 dark:border-slate-800">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execution Status</label>
                                                <select
                                                    value={formData.status}
                                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as MaintenanceStatus })}
                                                    className="w-full p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="Pending">Awaiting Assignment</option>
                                                    <option value="In Progress">Tactical Deployment</option>
                                                    <option value="Completed">Objective Resolved</option>
                                                    <option value="Cancelled">Mission Aborted</option>
                                                </select>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolution Vector</label>
                                                <input
                                                    type="text"
                                                    value={formData.resolutionNotes}
                                                    onChange={(e) => setFormData({ ...formData, resolutionNotes: e.target.value })}
                                                    placeholder="ANOMALY CORRECTED BY..."
                                                    className="w-full p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row gap-6 pt-10">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="flex-1 py-6 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.4em]"
                                        >
                                            TERMINATE
                                        </button>
                                        <button
                                            type="submit"
                                            className={`flex-[2] py-6 text-white rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl transition-all ${editingLog ? 'bg-indigo-600 shadow-indigo-100 dark:shadow-none' : 'bg-amber-600 shadow-amber-100 dark:shadow-none'
                                                }`}
                                        >
                                            COMMIT RECORD
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default BoardingMaintenanceManager;

