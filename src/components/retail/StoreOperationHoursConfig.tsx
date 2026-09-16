import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { apiService } from '../../services/apiService';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { LockClosedIcon } from '../icons/LockClosedIcon';
import { ClockIcon } from '../icons/ClockIcon';

interface OperationHoursConfig {
    storeHoursEnforced: boolean;
    issueOpenTime: string;
    issueCloseTime: string;
    receiveOpenTime: string;
    receiveCloseTime: string;
    operatingDays: string[];
    closedMessage: string;
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const PRINCIPAL_ROLES = ['admin', 'head_teacher', 'super_admin', 'deputy'];

interface Props {
    institutionId: string;
    currentUser: User;
    currentInstitution?: any;
}

export function StoreOperationHoursConfig({ institutionId, currentUser, currentInstitution }: Props) {
    const isPrincipal = PRINCIPAL_ROLES.includes(currentUser.role) ||
        currentUser.roles?.some(r => PRINCIPAL_ROLES.includes(r));

    const [config, setConfig] = useState<OperationHoursConfig>({
        storeHoursEnforced: currentInstitution?.storeHoursEnforced ?? false,
        issueOpenTime: currentInstitution?.storeOpenTime ?? '08:00',
        issueCloseTime: currentInstitution?.storeCloseTime ?? '17:00',
        receiveOpenTime: currentInstitution?.receiveOpenTime ?? '08:00',
        receiveCloseTime: currentInstitution?.receiveCloseTime ?? '17:00',
        operatingDays: currentInstitution?.storeOperatingDays ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        closedMessage: currentInstitution?.storeClosedMessage ?? 'The school store is currently closed. Please visit during operating hours.',
    });

    const [isSaving, setIsSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const update = <K extends keyof OperationHoursConfig>(field: K, value: OperationHoursConfig[K]) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        setSavedAt(null);
    };

    const toggleDay = (day: string) => {
        setConfig(prev => {
            const days = prev.operatingDays.includes(day)
                ? prev.operatingDays.filter(d => d !== day)
                : [...prev.operatingDays, day];
            return { ...prev, operatingDays: days };
        });
        setIsDirty(true);
        setSavedAt(null);
    };

    const handleSave = async () => {
        if (!isPrincipal) return;
        setIsSaving(true);
        try {
            await apiService.saveModuleRecord('institutions', {
                id: institutionId,
                storeHoursEnforced: config.storeHoursEnforced,
                storeOpenTime: config.issueOpenTime,
                storeCloseTime: config.issueCloseTime,
                receiveOpenTime: config.receiveOpenTime,
                receiveCloseTime: config.receiveCloseTime,
                storeOperatingDays: config.operatingDays,
                storeClosedMessage: config.closedMessage,
            });
            setSavedAt(new Date().toLocaleTimeString());
            setIsDirty(false);
        } catch (err: any) {
            alert('Failed to save: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Compute current store status
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5);
    const isOpenDay = config.operatingDays.includes(dayName);
    const isIssueOpen = isOpenDay && currentTime >= config.issueOpenTime && currentTime <= config.issueCloseTime;
    const isReceiveOpen = isOpenDay && currentTime >= config.receiveOpenTime && currentTime <= config.receiveCloseTime;
    const storeIsOpen = !config.storeHoursEnforced || (isIssueOpen || isReceiveOpen);

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                            <ClockIcon className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Store Operation Hours</h2>
                    </div>
                    <p className="text-xs text-slate-500 ml-12">Control when items can be issued or received from suppliers.</p>
                </div>

                {/* Live status badge */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-wider ${
                    storeIsOpen
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
                        : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
                }`}>
                    <div className={`w-2 h-2 rounded-full ${storeIsOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    {storeIsOpen ? 'Store Open Now' : 'Store Closed Now'}
                </div>
            </div>

            {/* Principal-only lock notice */}
            {!isPrincipal && (
                <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-5 py-3">
                    <LockClosedIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-black text-amber-800 dark:text-amber-300">View Only</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Only the Principal / Administrator can modify store operation hours.</p>
                    </div>
                </div>
            )}

            {/* Master toggle */}
            <div className={`bg-white dark:bg-slate-800 rounded-2xl border ${config.storeHoursEnforced ? 'border-indigo-200 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-700'} p-5 shadow-sm`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-black text-slate-900 dark:text-white text-sm">Enforce Operation Hours</p>
                        <p className="text-xs text-slate-500 mt-0.5">When enabled, the system blocks issuance and receiving outside set hours.</p>
                    </div>
                    <button
                        onClick={() => isPrincipal && update('storeHoursEnforced', !config.storeHoursEnforced)}
                        disabled={!isPrincipal}
                        className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none ${!isPrincipal ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${config.storeHoursEnforced ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${config.storeHoursEnforced ? 'left-8' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            <div className={`space-y-5 transition-opacity ${config.storeHoursEnforced ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>

                {/* Operating Days */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Operating Days</h3>
                    <div className="flex flex-wrap gap-2">
                        {ALL_DAYS.map(day => (
                            <button
                                key={day}
                                onClick={() => isPrincipal && toggleDay(day)}
                                disabled={!isPrincipal}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                    config.operatingDays.includes(day)
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300'
                                } ${!isPrincipal ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                {day.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Issuance Hours */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <span className="text-lg">📤</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white">Item Issuance Hours</h3>
                            <p className="text-[10px] text-slate-500">When storeman can issue items to teachers/students</p>
                        </div>
                        <div className="ml-auto">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isIssueOpen ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                                {isIssueOpen ? 'Open Now' : 'Closed Now'}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Opens At</label>
                            <input
                                type="time"
                                value={config.issueOpenTime}
                                onChange={e => isPrincipal && update('issueOpenTime', e.target.value)}
                                disabled={!isPrincipal}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Closes At</label>
                            <input
                                type="time"
                                value={config.issueCloseTime}
                                onChange={e => isPrincipal && update('issueCloseTime', e.target.value)}
                                disabled={!isPrincipal}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                        <ClockIcon className="w-3 h-3" />
                        <span>Issue window: <span className="font-bold text-slate-600 dark:text-slate-300">{config.issueOpenTime} – {config.issueCloseTime}</span></span>
                    </div>
                </div>

                {/* Receiving Hours */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                            <span className="text-lg">📥</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white">Supplier Receiving Hours</h3>
                            <p className="text-[10px] text-slate-500">When storeman can receive stock from suppliers</p>
                        </div>
                        <div className="ml-auto">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isReceiveOpen ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                                {isReceiveOpen ? 'Open Now' : 'Closed Now'}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Opens At</label>
                            <input
                                type="time"
                                value={config.receiveOpenTime}
                                onChange={e => isPrincipal && update('receiveOpenTime', e.target.value)}
                                disabled={!isPrincipal}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Closes At</label>
                            <input
                                type="time"
                                value={config.receiveCloseTime}
                                onChange={e => isPrincipal && update('receiveCloseTime', e.target.value)}
                                disabled={!isPrincipal}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                        <ClockIcon className="w-3 h-3" />
                        <span>Receive window: <span className="font-bold text-slate-600 dark:text-slate-300">{config.receiveOpenTime} – {config.receiveCloseTime}</span></span>
                    </div>
                </div>

                {/* Closed Message */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Message When Store is Closed</label>
                    <textarea
                        rows={2}
                        value={config.closedMessage}
                        onChange={e => isPrincipal && update('closedMessage', e.target.value)}
                        disabled={!isPrincipal}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Message shown to staff when store is outside hours..."
                    />
                </div>
            </div>

            {/* Current schedule summary card */}
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 p-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3">Current Schedule Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Enforcement</p>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${config.storeHoursEnforced ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                            {config.storeHoursEnforced ? 'Active' : 'Disabled'}
                        </span>
                    </div>
                    <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Issue Window</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{config.issueOpenTime} – {config.issueCloseTime}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Receive Window</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{config.receiveOpenTime} – {config.receiveCloseTime}</p>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                    {ALL_DAYS.map(day => (
                        <span key={day} className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${config.operatingDays.includes(day) ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            {day.slice(0, 3)}
                        </span>
                    ))}
                </div>
            </div>

            {/* Save button (principal only) */}
            {isPrincipal && (
                <div className="flex items-center justify-between pt-2">
                    {savedAt && !isDirty && (
                        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> Saved at {savedAt}
                        </p>
                    )}
                    {!savedAt && !isDirty && <div />}
                    {isDirty && <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest">Unsaved changes</p>}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !isDirty}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isSaving ? (
                            <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
                        ) : (
                            <><CheckCircleIcon className="w-3.5 h-3.5" /> Save Hours</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
