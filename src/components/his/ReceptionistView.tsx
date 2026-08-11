import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon } from '../icons/PlusIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { BellIcon } from '../icons/BellIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

import { AddAppointmentModal } from './AddAppointmentModal';
import { RegisterPatientModal } from './RegisterPatientModal';
import { apiService } from '../../services/apiService';
import type { HISAppointment, HISPatient } from '../../types';

interface ReceptionistViewProps {
    institutionId?: string;
    userName?: string;
    users?: any[];
}

const TODAY = new Date().toISOString().split('T')[0];

const statusStyles: Record<string, string> = {
    Scheduled: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    Arrived:   'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'In-Progress': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    Completed:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
    Cancelled:  'bg-rose-500/10 text-rose-500 border-rose-500/20',
    Rescheduled:'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

export function ReceptionistView({ institutionId, userName, users = [] }: ReceptionistViewProps) {
    const [patients, setPatients] = useState<HISPatient[]>([]);
    const [appointments, setAppointments] = useState<HISAppointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<HISPatient | null>(null);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // ─── Data Fetch ───────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        if (!institutionId) return;
        setIsLoading(true);
        try {
            const [pts, apps] = await Promise.all([
                apiService.fetchModuleRecords<HISPatient>('his_patients', institutionId),
                apiService.fetchModuleRecords<HISAppointment>('his_appointments', institutionId),
            ]);
            setPatients(pts || []);
            setAppointments(apps || []);
        } catch (e) {
            console.error('[ReceptionistView] load error:', e);
        } finally {
            setIsLoading(false);
        }
    }, [institutionId]);

    useEffect(() => { loadData(); }, [loadData]);

    // ─── Derived ──────────────────────────────────────────────────────────────
    const todayAppointments = useMemo(() =>
        appointments
            .filter(a => (a.date || '').startsWith(TODAY))
            .sort((a, b) => (a.time || '').localeCompare(b.time || '')),
        [appointments]
    );

    const queueList = useMemo(() =>
        todayAppointments.filter(a => a.status === 'Arrived' || a.status === 'In-Progress'),
        [todayAppointments]
    );

    const stats = useMemo(() => ({
        total:      todayAppointments.length,
        scheduled:  todayAppointments.filter(a => a.status === 'Scheduled').length,
        arrived:    todayAppointments.filter(a => a.status === 'Arrived').length,
        inProgress: todayAppointments.filter(a => a.status === 'In-Progress').length,
        completed:  todayAppointments.filter(a => a.status === 'Completed').length,
    }), [todayAppointments]);

    const filteredPatients = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const q = searchTerm.toLowerCase();
        return patients.filter(p =>
            p.fullName?.toLowerCase().includes(q) ||
            p.contact?.toLowerCase().includes(q) ||
            (p.shaNumber || '').toLowerCase().includes(q)
        ).slice(0, 8);
    }, [searchTerm, patients]);

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const showNotif = (msg: string, type: 'success' | 'error' = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleBookAppointment = async (data: any) => {
        if (!institutionId) return;
        try {
            const newApp: HISAppointment = {
                ...data,
                id: `app_${Date.now()}`,
                institutionId,
                patientId: selectedPatient?.id || data.patientId || '',
                patientName: selectedPatient?.fullName || data.patientName || '',
                status: 'Scheduled',
                createdAt: new Date().toISOString(),
            };
            await apiService.saveModuleRecord('his_appointments', newApp);
            setAppointments(prev => [newApp, ...prev]);
            setIsBookingOpen(false);
            setSelectedPatient(null);
            showNotif(`Appointment booked for ${newApp.patientName}`);
        } catch (e) {
            console.error(e);
            showNotif('Failed to book appointment', 'error');
        }
    };

    const handleRegisterPatient = async (patientData: any) => {
        if (!institutionId) return;
        try {
            const record: HISPatient = {
                ...patientData,
                id: `his_p_${Date.now()}`,
                institutionId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await apiService.saveModuleRecord('his_patients', record);
            setPatients(prev => [record, ...prev]);
            setIsRegisterOpen(false);
            setSelectedPatient(record);
            showNotif(`${record.fullName} registered successfully`);
            setTimeout(() => setIsBookingOpen(true), 300);
        } catch (e) {
            console.error(e);
            showNotif('Registration failed', 'error');
        }
    };

    const handleUpdateStatus = async (app: HISAppointment, status: string) => {
        setUpdatingId(app.id);
        try {
            const updated = {
                ...app,
                status,
                ...(status === 'Arrived' ? { arrivedAt: new Date().toISOString() } : {}),
            };
            await apiService.saveModuleRecord('his_appointments', updated);
            setAppointments(prev => prev.map(a => a.id === app.id ? updated as HISAppointment : a));
            showNotif(`${app.patientName || 'Patient'} marked as ${status}`);
        } catch (e) {
            showNotif('Update failed', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-8 animate-fade-in">

            {/* Toast Notification */}
            {notification && createPortal(
                <div className={`fixed top-24 right-8 z-[9999] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce-in ring-4 transition-all
                    ${notification.type === 'success'
                        ? 'bg-emerald-600 text-white ring-emerald-400/30'
                        : 'bg-rose-600 text-white ring-rose-400/30'}`}>
                    {notification.type === 'success'
                        ? <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                        : <XCircleIcon className="w-5 h-5 flex-shrink-0" />}
                    <p className="text-[11px] font-black uppercase tracking-widest">{notification.msg}</p>
                </div>,
                document.body
            )}

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">
                        Reception <span className="text-indigo-500">Desk</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Logged in as <span className="text-indigo-400">{userName || 'Receptionist'}</span> &mdash; {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={() => setIsRegisterOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/20 transition-all border border-slate-200 dark:border-white/5"
                    >
                        <PlusIcon className="w-4 h-4" /> Register Patient
                    </button>
                    <button
                        onClick={() => setIsBookingOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-600/20"
                    >
                        <CalendarDaysIcon className="w-4 h-4" /> Book Appointment
                    </button>
                    <button onClick={loadData} className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-indigo-500 transition-all border border-slate-200 dark:border-white/5" title="Refresh">
                        <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── Stats Bar ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Today's Bookings", value: stats.total, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                    { label: 'Waiting',     value: stats.scheduled, color: 'text-slate-500',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20' },
                    { label: 'In Queue',    value: stats.arrived,   color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Completed',   value: stats.completed, color: 'text-slate-400',   bg: 'bg-slate-100 dark:bg-white/5', border: 'border-slate-200 dark:border-white/5' },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5 flex flex-col gap-1`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                        <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Main Grid: Search + Queue ────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

                {/* Left: Patient Search + Today's Schedule */}
                <div className="lg:col-span-3 space-y-6">

                    {/* Patient Search */}
                    <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl p-6 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search Patient to Book</p>
                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by name, phone, SHA number..."
                                className="w-full bg-slate-100 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-xl pl-11 pr-4 py-3.5 text-[11px] font-bold uppercase tracking-wider outline-none transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Dropdown results */}
                        {searchTerm.trim() && (
                            <div className="rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-lg">
                                {filteredPatients.length > 0 ? filteredPatients.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedPatient(p);
                                            setSearchTerm('');
                                            setIsBookingOpen(true);
                                        }}
                                        className="w-full flex items-center justify-between p-4 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all text-left border-b border-slate-50 dark:border-white/5 last:border-0 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 font-black text-xs flex-shrink-0">
                                                {p.fullName?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-tight">{p.fullName}</p>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase">{p.gender} &bull; {p.contact || 'No contact'} {p.shaNumber ? `• SHA: ${p.shaNumber}` : ''}</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Book →
                                        </span>
                                    </button>
                                )) : (
                                    <div className="p-6 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">No patient found</p>
                                        <button
                                            onClick={() => { setSearchTerm(''); setIsRegisterOpen(true); }}
                                            className="text-[10px] font-black uppercase tracking-widest text-indigo-500 underline underline-offset-4 decoration-2 hover:text-indigo-700 transition-colors"
                                        >
                                            + Register as New Patient
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedPatient && (
                            <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <CheckCircleIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">{selectedPatient.fullName}</p>
                                        <p className="text-[9px] text-slate-500 font-bold">{selectedPatient.contact}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedPatient(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Today's Appointment Schedule */}
                    <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Today's Schedule</p>
                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">{todayAppointments.length} appointment{todayAppointments.length !== 1 ? 's' : ''} &bull; {TODAY}</p>
                            </div>
                            {stats.arrived > 0 && (
                                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{stats.arrived} in queue</span>
                                </div>
                            )}
                        </div>

                        {isLoading ? (
                            <div className="py-16 text-center">
                                <ArrowPathIcon className="w-6 h-6 text-slate-300 animate-spin mx-auto mb-3" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading schedule…</p>
                            </div>
                        ) : todayAppointments.length === 0 ? (
                            <div className="py-16 text-center opacity-50">
                                <CalendarDaysIcon className="w-10 h-10 text-slate-400 mx-auto mb-4" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No appointments today</p>
                                <p className="text-[9px] text-slate-400 mt-1">Click "Book Appointment" to schedule one</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {todayAppointments.map((app, idx) => (
                                    <div key={app.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                        {/* Time */}
                                        <div className="w-14 text-right flex-shrink-0">
                                            <p className="text-xs font-black text-slate-700 dark:text-slate-200">{app.time}</p>
                                            <p className="text-[8px] text-slate-400 font-bold uppercase">#{idx + 1}</p>
                                        </div>

                                        {/* Avatar */}
                                        <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 font-black text-xs flex-shrink-0">
                                            {(app.patientName || '?')[0].toUpperCase()}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-black uppercase tracking-tight truncate">{app.patientName || app.patientId}</p>
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                    (app as any).paymentMethod === 'Cover' || (app as any).insuranceProvider
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                                                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                                }`}>
                                                    {(app as any).paymentMethod === 'Cover' || (app as any).insuranceProvider ? `🛡️ ${(app as any).insuranceProvider || 'Cover'}` : '💵 Cash'}
                                                </span>
                                            </div>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider truncate">{app.type} &bull; {app.doctorName || 'Unassigned'}</p>
                                            {app.reason && <p className="text-[8px] text-slate-400 italic truncate mt-0.5">{app.reason}</p>}
                                        </div>

                                        {/* Status badge */}
                                        <div className={`px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest flex-shrink-0 hidden sm:block ${statusStyles[app.status] || statusStyles['Scheduled']}`}>
                                            {app.status}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {app.status === 'Scheduled' && (
                                                <button
                                                    disabled={updatingId === app.id}
                                                    onClick={() => handleUpdateStatus(app, 'Arrived')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
                                                    title="Mark patient as Arrived"
                                                >
                                                    {updatingId === app.id
                                                        ? <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                                        : <CheckCircleIcon className="w-3 h-3" />}
                                                    Arrived
                                                </button>
                                            )}
                                            {app.status === 'Arrived' && (
                                                <button
                                                    disabled={updatingId === app.id}
                                                    onClick={() => handleUpdateStatus(app, 'In-Progress')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-md shadow-amber-500/20"
                                                    title="Move to In-Progress"
                                                >
                                                    <ChevronRightIcon className="w-3 h-3" />
                                                    In-Progress
                                                </button>
                                            )}
                                            {(app.status === 'In-Progress') && (
                                                <button
                                                    disabled={updatingId === app.id}
                                                    onClick={() => handleUpdateStatus(app, 'Completed')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-500 hover:bg-slate-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-md"
                                                    title="Mark as Completed"
                                                >
                                                    <CheckCircleIcon className="w-3 h-3" />
                                                    Done
                                                </button>
                                            )}
                                            {(app.status === 'Scheduled' || app.status === 'Arrived') && (
                                                <button
                                                    disabled={updatingId === app.id}
                                                    onClick={() => handleUpdateStatus(app, 'Cancelled')}
                                                    className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all disabled:opacity-50"
                                                    title="Cancel appointment"
                                                >
                                                    <XCircleIcon className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Live Consultation Queue */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Queue Panel */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] shadow-2xl text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20 blur-3xl" />
                        <div className="relative z-10 p-6 border-b border-white/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Live</p>
                                    </div>
                                    <h4 className="text-lg font-black uppercase tracking-tight italic">Consultation Queue</h4>
                                    <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-widest mt-0.5">
                                        {queueList.length} patient{queueList.length !== 1 ? 's' : ''} waiting
                                    </p>
                                </div>
                                <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                    <p className="text-2xl font-black">{queueList.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 p-3 space-y-2 max-h-80 overflow-y-auto no-scrollbar">
                            {queueList.length === 0 ? (
                                <div className="py-10 text-center">
                                    <UsersIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Queue is empty</p>
                                    <p className="text-[9px] text-white/30 mt-1">Mark patients as Arrived to add them</p>
                                </div>
                            ) : queueList.map((app, idx) => (
                                <div key={app.id} className="flex items-center gap-3 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl p-3 transition-all">
                                    {/* Position number */}
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${idx === 0 ? 'bg-amber-400 text-amber-900' : 'bg-white/20 text-white'}`}>
                                        #{idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[11px] font-black uppercase tracking-tight truncate">{app.patientName}</p>
                                            <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                (app as any).paymentMethod === 'Cover' || (app as any).insuranceProvider
                                                    ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30'
                                                    : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                                            }`}>
                                                {(app as any).paymentMethod === 'Cover' || (app as any).insuranceProvider ? `🛡️ ${(app as any).insuranceProvider || 'Cover'}` : '💵 Cash'}
                                            </span>
                                        </div>
                                        <p className="text-[9px] text-indigo-200 font-bold truncate">{app.time} &bull; {app.doctorName || 'General'}</p>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex-shrink-0 ${app.status === 'In-Progress' ? 'bg-amber-400/30 text-amber-300' : 'bg-emerald-400/20 text-emerald-300'}`}>
                                        {app.status === 'In-Progress' ? '🔵 Active' : '🟢 Waiting'}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Avg wait time */}
                        <div className="relative z-10 px-6 py-4 bg-black/10 border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest">Est. Wait / Patient</p>
                                <p className="text-sm font-black text-white">~15 <span className="text-xs font-bold text-indigo-200">min</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats — Doctors */}
                    <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">Today's Doctors On Duty</p>
                        <div className="space-y-3">
                            {(() => {
                                const doctors = [...new Set(
                                    todayAppointments
                                        .filter(a => a.doctorName)
                                        .map(a => a.doctorName!)
                                )];
                                if (doctors.length === 0) return (
                                    <p className="text-[10px] text-slate-400 font-bold text-center py-4 opacity-50">No doctors assigned yet</p>
                                );
                                return doctors.map(doc => {
                                    const docApps = todayAppointments.filter(a => a.doctorName === doc);
                                    const inProgress = docApps.find(a => a.status === 'In-Progress');
                                    return (
                                        <div key={doc} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inProgress ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-tight">{doc}</p>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase">{docApps.length} booking{docApps.length !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${inProgress ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-200 dark:border-emerald-800'}`}>
                                                {inProgress ? 'With Patient' : 'Available'}
                                            </span>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* Recent Completed */}
                    {stats.completed > 0 && (
                        <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl p-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Completed Today</p>
                            <div className="space-y-2">
                                {todayAppointments.filter(a => a.status === 'Completed').slice(0, 5).map(app => (
                                    <div key={app.id} className="flex items-center gap-3 p-2">
                                        <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-tight truncate">{app.patientName}</p>
                                            <p className="text-[8px] text-slate-400 font-bold">{app.time} &bull; {app.doctorName}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Book Appointment Modal ──────────────────────────────────────── */}
            {createPortal(
                <AddAppointmentModal
                    isOpen={isBookingOpen}
                    onClose={() => { setIsBookingOpen(false); setSelectedPatient(null); }}
                    onAdd={handleBookAppointment}
                    isEdu={false}
                    referredBy={userName || ''}
                    students={selectedPatient
                        ? [{ id: selectedPatient.id, name: selectedPatient.fullName }]
                        : patients.map(p => ({ id: p.id, name: p.fullName }))}
                />,
                document.body
            )}

            {/* ── Register Patient Modal ─────────────────────────────────────── */}
            <RegisterPatientModal
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                onRegister={handleRegisterPatient}
                users={users}
                isEdu={false}
            />
        </div>
    );
};

export default ReceptionistView;
