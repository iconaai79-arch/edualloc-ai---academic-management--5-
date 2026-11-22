import React, { useState, useEffect } from 'react';
import type { Institution, TimetableSettings, AcademicYear } from '../types';
import { apiService } from '../services/apiService';

export interface AscBellPeriodRow {
    id: string;
    period?: number;
    name: string;
    short: string;
    start: string;
    end: string;
    isBreak?: boolean;
    print: boolean;
    bell: string; // 'All classes' or specific
    // backwards-compat alias
    label?: string;
}

export interface AscSchoolSettings {
    id: string;
    institutionId: string;
    schoolName: string;
    academicYear: string;
    registrationName: string;
    periodsPerDay: number;
    workWithZeroPeriods: boolean;
    numberOfDays: number;
    weekend: 'Saturday - Sunday' | 'Friday - Saturday' | 'Sunday only' | 'None';
    showDayNumberInsteadOfName: boolean;
    multiTermOrWeek: boolean;
    weeksCount: number;
    termsCount: number;
    dayNames: string[];
    bellTimes: AscBellPeriodRow[];
    differentBellsInClasses?: boolean;
    differentBellsOnDays?: boolean;
    country: string;
    curriculum: string;
    scheduleType: 'standard_weekly' | 'two_week' | 'multi_term';
    parameters: {
        allowDoubleAcrossBreak: boolean;
        prioritizeCoreMorning: boolean;
        defaultMaxConsecutive: number;
    };
    customFields: {
        motto: string;
        principalName: string;
        dosName: string;
        footerNote: string;
    };
    updatedAt: string;
}

interface AscSchoolSettingsPanelProps {
    institution?: Institution | null;
    activeAcademicYear?: AcademicYear | null;
    timetableSettings?: TimetableSettings;
    onSaveTimetableSettings?: (settings: TimetableSettings) => void;
    onClose?: () => void;
}

const DEFAULT_BELL_TIMES: AscBellPeriodRow[] = [
    { id: 'p_1', period: 1, name: '1', short: '1', start: '08:00', end: '08:40', isBreak: false, print: true, bell: 'All classes' },
    { id: 'p_2', period: 2, name: '2', short: '2', start: '08:40', end: '09:20', isBreak: false, print: true, bell: 'All classes' },
    { id: 'p_3', period: 3, name: '3', short: '3', start: '09:20', end: '10:00', isBreak: false, print: true, bell: 'All classes' },
    { id: 'b_1', name: 'BREAK', short: 'BREAK', start: '10:00', end: '10:15', isBreak: true, print: true, bell: 'All classes' },
    { id: 'p_4', period: 4, name: '4', short: '4', start: '10:15', end: '10:55', isBreak: false, print: true, bell: 'All classes' },
    { id: 'b_2', name: 'LONG BREAK', short: 'BREAK', start: '10:55', end: '11:25', isBreak: true, print: true, bell: 'All classes' },
    { id: 'p_5', period: 5, name: '5', short: '5', start: '11:25', end: '12:05', isBreak: false, print: true, bell: 'All classes' },
    { id: 'p_6', period: 6, name: '6', short: '6', start: '12:05', end: '12:45', isBreak: false, print: true, bell: 'All classes' },
    { id: 'b_3', name: 'LUNCH BREAK', short: 'LUNCH', start: '12:45', end: '13:45', isBreak: true, print: true, bell: 'All classes' },
    { id: 'p_7', period: 7, name: '7', short: '7', start: '13:45', end: '14:25', isBreak: false, print: true, bell: 'All classes' },
    { id: 'p_8', period: 8, name: '8', short: '8', start: '14:25', end: '15:05', isBreak: false, print: true, bell: 'All classes' },
    { id: 'p_9', period: 9, name: '9', short: '9', start: '15:05', end: '15:45', isBreak: false, print: true, bell: 'All classes' },
    { id: 'p_10', period: 10, name: '10', short: '10', start: '15:45', end: '16:25', isBreak: false, print: true, bell: 'All classes' },
];

const calcMinutesDiff = (start: string, end: string): number => {
    const parse = (t: string) => {
        const [h, m] = (t || '00:00').split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };
    const diff = parse(end) - parse(start);
    return diff > 0 ? diff : 0;
};

const normalizeBellRow = (row: any, idx: number): AscBellPeriodRow => ({
    id: row?.id || `p_${idx}_${row?.period || idx}`,
    period: row?.period,
    name: row?.name || row?.label || String(row?.period || idx + 1),
    short: row?.short || row?.label || String(row?.period || idx + 1),
    start: row?.start || '08:00',
    end: row?.end || '08:40',
    isBreak: Boolean(row?.isBreak),
    print: row?.print !== undefined ? Boolean(row.print) : true,
    bell: row?.bell || 'All classes',
});

export const AscSchoolSettingsPanel: React.FC<AscSchoolSettingsPanelProps> = ({
    institution,
    activeAcademicYear,
    timetableSettings,
    onSaveTimetableSettings,
    onClose,
}) => {
    const instId = institution?.id || 'default';
    const storageKey = `eduai_asc_school_settings_${instId}`;

    const [innerTab, setInnerTab] = useState<'basic' | 'country' | 'schedule_type'>('basic');
    const [canEditRegName, setCanEditRegName] = useState(false);
    const [savedToast, setSavedToast] = useState('');

    // Sub-modals
    const [showBellTimesModal, setShowBellTimesModal] = useState(false);
    const [selectedBellId, setSelectedBellId] = useState<string>('');
    const [editingBellRow, setEditingBellRow] = useState<AscBellPeriodRow | null>(null);
    const [showRenameDaysModal, setShowRenameDaysModal] = useState(false);
    const [showParamsModal, setShowParamsModal] = useState(false);
    const [showCustomFieldsModal, setShowCustomFieldsModal] = useState(false);

    const [settings, setSettings] = useState<AscSchoolSettings>(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return {
            id: `asc_school_${instId}`,
            institutionId: instId,
            schoolName: (institution?.name || 'MY SCHOOL').toUpperCase(),
            academicYear: activeAcademicYear?.name || `${new Date().getFullYear()}`,
            registrationName: 'EDUAI TECHNOLOGIES',
            periodsPerDay: 10,
            workWithZeroPeriods: false,
            numberOfDays: timetableSettings?.operatingDays?.length || 5,
            weekend: 'Saturday - Sunday',
            showDayNumberInsteadOfName: false,
            multiTermOrWeek: false,
            weeksCount: 2,
            termsCount: 3,
            dayNames: timetableSettings?.operatingDays?.length ? [...timetableSettings.operatingDays] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            bellTimes: DEFAULT_BELL_TIMES,
            country: 'Kenya',
            curriculum: 'CBC / KCSE Secondary',
            scheduleType: 'standard_weekly',
            parameters: {
                allowDoubleAcrossBreak: false,
                prioritizeCoreMorning: true,
                defaultMaxConsecutive: 3,
            },
            customFields: {
                motto: '',
                principalName: '',
                dosName: '',
                footerNote: '',
            },
            updatedAt: new Date().toISOString(),
        };
    });

    useEffect(() => {
        if (!institution?.id) return;
        apiService.fetchModuleRecords<AscSchoolSettings>('asc_school_settings', institution.id)
            .then(recs => {
                if (Array.isArray(recs) && recs.length > 0) {
                    setSettings(prev => ({ ...prev, ...recs[0] }));
                    try { localStorage.setItem(storageKey, JSON.stringify(recs[0])); } catch (_) {}
                }
            })
            .catch(() => {});
    }, [institution?.id, storageKey]);

    const handleSave = async () => {
        const next: AscSchoolSettings = { ...settings, updatedAt: new Date().toISOString() };
        setSettings(next);
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (_) {}
        await apiService.saveModuleRecord('asc_school_settings', next).catch(() => {});

        if (onSaveTimetableSettings && timetableSettings) {
            const activeDays = next.showDayNumberInsteadOfName
                ? Array.from({ length: next.numberOfDays }).map((_, i) => `Day ${i + 1}`)
                : next.dayNames.slice(0, next.numberOfDays);
            onSaveTimetableSettings({
                ...timetableSettings,
                operatingDays: activeDays,
            });
        }
        setSavedToast('School timetable settings saved!');
        setTimeout(() => setSavedToast(''), 3000);
    };

    const handleChangeDaysCount = (n: number) => {
        const allDefaults = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const nextNames = Array.from({ length: n }).map((_, i) => settings.dayNames[i] || allDefaults[i] || `Day ${i + 1}`);
        setSettings(prev => ({ ...prev, numberOfDays: n, dayNames: nextNames }));
    };

    const handleChangePeriodsCount = (n: number) => {
        const normalized = (settings.bellTimes || []).map(normalizeBellRow);
        const existingTeaching = normalized.filter(r => !r.isBreak);
        let nextBells = [...normalized];
        if (n > existingTeaching.length) {
            for (let i = existingTeaching.length; i < n; i++) {
                const startMin = 8 * 60 + i * 45;
                const endMin = startMin + 40;
                const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
                nextBells.push({
                    id: `p_${Date.now()}_${i + 1}`,
                    period: i + 1,
                    name: String(i + 1),
                    short: String(i + 1),
                    start: fmt(startMin),
                    end: fmt(endMin),
                    isBreak: false,
                    print: true,
                    bell: 'All classes',
                });
            }
        } else if (n < existingTeaching.length) {
            let kept = 0;
            nextBells = nextBells.filter(r => {
                if (r.isBreak) return true;
                kept++;
                return kept <= n;
            });
        }
        setSettings(prev => ({ ...prev, periodsPerDay: n, bellTimes: nextBells }));
    };

    const normalizedBells = (settings.bellTimes || DEFAULT_BELL_TIMES).map(normalizeBellRow);

    const handleMoveBellRow = (dir: -1 | 1) => {
        const idx = normalizedBells.findIndex(b => b.id === selectedBellId);
        if (idx < 0) return;
        const target = idx + dir;
        if (target < 0 || target >= normalizedBells.length) return;
        const next = [...normalizedBells];
        const [item] = next.splice(idx, 1);
        next.splice(target, 0, item);
        setSettings(p => ({ ...p, bellTimes: next }));
    };

    const handleDeleteBellRow = () => {
        const idx = normalizedBells.findIndex(b => b.id === selectedBellId);
        if (idx < 0) return;
        const next = normalizedBells.filter(b => b.id !== selectedBellId);
        setSettings(p => ({
            ...p,
            bellTimes: next,
            periodsPerDay: next.filter(x => !x.isBreak).length || p.periodsPerDay,
        }));
        setSelectedBellId(next[Math.max(0, idx - 1)]?.id || '');
    };

    const handleAddBreakBetweenLessons = () => {
        const idx = normalizedBells.findIndex(b => b.id === selectedBellId);
        const refRow = idx >= 0 ? normalizedBells[idx] : normalizedBells[normalizedBells.length - 1];
        const newBreak: AscBellPeriodRow = {
            id: `brk_${Date.now()}`,
            name: 'BREAK',
            short: 'BREAK',
            start: refRow?.end || '10:00',
            end: refRow?.end || '10:20',
            isBreak: true,
            print: true,
            bell: 'All classes',
        };
        const next = [...normalizedBells];
        if (idx >= 0) {
            next.splice(idx + 1, 0, newBreak);
        } else {
            next.push(newBreak);
        }
        setSettings(p => ({ ...p, bellTimes: next }));
        setSelectedBellId(newBreak.id);
        setEditingBellRow(newBreak);
    };

    const handleSaveEditedBellRow = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBellRow) return;
        const next = normalizedBells.map(b => b.id === editingBellRow.id ? editingBellRow : b);
        setSettings(p => ({ ...p, bellTimes: next }));
        setEditingBellRow(null);
    };

    return (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-lg overflow-hidden">
            {/* Top Classic aSc Inner Tabs: Basic data | Country | Schedule type */}
            <div className="bg-slate-200/80 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-3 pt-2 flex items-center justify-between gap-2">
                <div className="flex items-end gap-1">
                    {[
                        { id: 'basic', label: 'Basic data' },
                        { id: 'country', label: 'Country' },
                        { id: 'schedule_type', label: 'Schedule type' },
                    ].map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setInnerTab(t.id as any)}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-t-md border border-b-0 transition-colors cursor-pointer ${
                                innerTab === t.id
                                    ? 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold -mb-px'
                                    : 'bg-slate-200/60 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                {savedToast && (
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 pb-1">
                        ✓ {savedToast}
                    </span>
                )}
            </div>

            {/* TAB 1: BASIC DATA */}
            {innerTab === 'basic' && (
                <div className="p-4 space-y-3 text-xs text-slate-800 dark:text-slate-200">
                    {/* ROW 1: SCHOOL NAME, ACADEMIC YEAR, REGISTRATION NAME */}
                    <div className="bg-white/70 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-lg p-4 flex flex-col sm:flex-row items-start gap-5">
                        <div className="w-16 h-16 flex items-center justify-center text-5xl shrink-0">🏛️</div>
                        <div className="flex-1 w-full space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-center gap-2">
                                <label className="font-semibold">Name of the school :</label>
                                <input
                                    type="text"
                                    value={settings.schoolName}
                                    onChange={e => setSettings(p => ({ ...p, schoolName: e.target.value }))}
                                    className="w-full px-2.5 py-1.5 rounded border-2 border-blue-500 bg-white dark:bg-slate-900 text-xs font-bold uppercase focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-center gap-2">
                                <label className="font-semibold">Academic year :</label>
                                <input
                                    type="text"
                                    value={settings.academicYear}
                                    onChange={e => setSettings(p => ({ ...p, academicYear: e.target.value }))}
                                    className="w-48 px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-center gap-2">
                                <label className="font-semibold">Registration name</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        disabled={!canEditRegName}
                                        value={settings.registrationName}
                                        onChange={e => setSettings(p => ({ ...p, registrationName: e.target.value }))}
                                        className="flex-1 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900/60 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-80"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setCanEditRegName(p => !p)}
                                        className="px-4 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-semibold cursor-pointer"
                                    >
                                        {canEditRegName ? 'Lock' : 'Change'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ROW 2: PERIODS PER DAY, NUMBER OF DAYS, WEEKEND */}
                    <div className="bg-white/70 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-lg p-4 flex flex-col sm:flex-row items-start gap-5">
                        <div className="w-16 h-16 flex items-center justify-center text-5xl shrink-0">🗓️</div>
                        <div className="flex-1 w-full space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-start gap-2">
                                <label className="font-semibold pt-1.5">Periods per day:</label>
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <select
                                            value={settings.periodsPerDay}
                                            onChange={e => handleChangePeriodsCount(Number(e.target.value) || 8)}
                                            className="w-20 px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                                        >
                                            {[4, 5, 6, 7, 8, 9, 10, 11, 12, 14].map(n => (
                                                <option key={n} value={n}>{n}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setShowBellTimesModal(true)}
                                            className="px-6 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-semibold cursor-pointer"
                                        >
                                            Bell times / Rename periods
                                        </button>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.workWithZeroPeriods}
                                            onChange={e => setSettings(p => ({ ...p, workWithZeroPeriods: e.target.checked }))}
                                            className="w-3.5 h-3.5 accent-blue-600"
                                        />
                                        <span>Work with zero periods</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-start gap-2">
                                <label className="font-semibold pt-1.5">Number of days:</label>
                                <div className="space-y-2.5">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <select
                                            value={settings.numberOfDays}
                                            onChange={e => handleChangeDaysCount(Number(e.target.value) || 5)}
                                            className="w-20 px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                                        >
                                            {[5, 6, 7].map(n => (
                                                <option key={n} value={n}>{n}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setShowRenameDaysModal(true)}
                                            className="px-10 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-semibold cursor-pointer"
                                        >
                                            Rename days
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="font-semibold w-24">Weekend:</span>
                                        <select
                                            value={settings.weekend}
                                            onChange={e => setSettings(p => ({ ...p, weekend: e.target.value as any }))}
                                            className="w-52 px-2.5 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold"
                                        >
                                            <option value="Saturday - Sunday">Saturday - Sunday</option>
                                            <option value="Friday - Saturday">Friday - Saturday</option>
                                            <option value="Sunday only">Sunday only</option>
                                            <option value="None">None</option>
                                        </select>
                                    </div>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.showDayNumberInsteadOfName}
                                            onChange={e => setSettings(p => ({ ...p, showDayNumberInsteadOfName: e.target.checked }))}
                                            className="w-3.5 h-3.5 accent-blue-600"
                                        />
                                        <span>Show day number instead of day name (e.g. Day 1 instead of Monday)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ROW 3: MULTI-TERM / MULTI-WEEK */}
                    <div className="bg-white/70 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-lg p-4 flex flex-col sm:flex-row items-center gap-5">
                        <div className="w-16 h-14 flex items-center justify-center text-4xl shrink-0">📅</div>
                        <div className="flex-1 space-y-2">
                            <label className="flex items-start gap-2.5 cursor-pointer font-semibold">
                                <input
                                    type="checkbox"
                                    checked={settings.multiTermOrWeek}
                                    onChange={e => setSettings(p => ({ ...p, multiTermOrWeek: e.target.checked }))}
                                    className="w-4 h-4 mt-0.5 accent-blue-600"
                                />
                                <span>I want to create multi term or multi-week timetable that will be different in each week or term</span>
                            </label>
                            {settings.multiTermOrWeek && (
                                <div className="flex flex-wrap gap-4 pl-6 pt-1">
                                    <label className="flex items-center gap-2 text-xs">
                                        <span>Weeks:</span>
                                        <select value={settings.weeksCount} onChange={e => setSettings(p => ({ ...p, weeksCount: Number(e.target.value) || 2 }))} className="px-2 py-1 rounded border border-slate-300 bg-white dark:bg-slate-900 font-bold">
                                            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs">
                                        <span>Terms:</span>
                                        <select value={settings.termsCount} onChange={e => setSettings(p => ({ ...p, termsCount: Number(e.target.value) || 3 }))} className="px-2 py-1 rounded border border-slate-300 bg-white dark:bg-slate-900 font-bold">
                                            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ROW 4: PARAMETERS & CUSTOM FIELDS BUTTONS */}
                    <div className="bg-white/70 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-lg p-4 flex flex-wrap items-center justify-center sm:justify-start sm:pl-24 gap-5">
                        <button
                            type="button"
                            onClick={() => setShowParamsModal(true)}
                            className="flex items-center gap-4 px-5 py-3 rounded border border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 min-w-[200px] shadow-xs cursor-pointer"
                        >
                            <span className="text-3xl leading-none">🧮</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-white">Parameters</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCustomFieldsModal(true)}
                            className="flex items-center gap-4 px-5 py-3 rounded border border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 min-w-[200px] shadow-xs cursor-pointer"
                        >
                            <span className="text-3xl leading-none">📝</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-white">Custom fields</span>
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 2: COUNTRY */}
            {innerTab === 'country' && (
                <div className="p-6 space-y-4 text-xs">
                    <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-5 max-w-lg space-y-4">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">Country &amp; Curriculum System</h3>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Country</label>
                            <select value={settings.country} onChange={e => setSettings(p => ({ ...p, country: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold">
                                <option value="Kenya">Kenya</option>
                                <option value="Uganda">Uganda</option>
                                <option value="Tanzania">Tanzania</option>
                                <option value="Rwanda">Rwanda</option>
                                <option value="South Africa">South Africa</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Education Curriculum</label>
                            <select value={settings.curriculum} onChange={e => setSettings(p => ({ ...p, curriculum: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold">
                                <option value="CBC / KCSE Secondary">CBC / KCSE (Kenya)</option>
                                <option value="Primary & Junior School (CBC)">Primary &amp; Junior School (CBC)</option>
                                <option value="IGCSE / British">IGCSE / British Curriculum</option>
                                <option value="IB">International Baccalaureate (IB)</option>
                                <option value="TVET / College">TVET / College / University</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: SCHEDULE TYPE */}
            {innerTab === 'schedule_type' && (
                <div className="p-6 space-y-4 text-xs">
                    <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-5 max-w-xl space-y-3">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">Timetable Schedule Type</h3>
                        {[
                            { id: 'standard_weekly', title: 'Standard Weekly Timetable (5–6 days)', desc: 'Same weekly schedule repeats every week of the term (standard Kenyan schools).' },
                            { id: 'two_week', title: 'Two-Week Rotating Timetable (Week A / Week B)', desc: 'Alternating odd/even weeks for lab practicals or split subjects.' },
                            { id: 'multi_term', title: 'Multi-Term Schedule (Term 1 / Term 2 / Term 3)', desc: 'Different timetable allocations across academic terms.' },
                        ].map(opt => (
                            <label key={opt.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50/40 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={settings.scheduleType === opt.id}
                                    onChange={() => setSettings(p => ({ ...p, scheduleType: opt.id as any }))}
                                    className="mt-1 accent-blue-600"
                                />
                                <div>
                                    <div className="font-black text-slate-900 dark:text-white">{opt.title}</div>
                                    <div className="text-[11px] text-slate-500">{opt.desc}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="bg-slate-200/70 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 px-4 py-3 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={handleSave}
                    className="px-8 py-1.5 rounded border-2 border-blue-500 bg-white dark:bg-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500 text-xs font-bold text-slate-900 dark:text-white shadow-xs cursor-pointer"
                >
                    OK / Save
                </button>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-1.5 rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-semibold cursor-pointer"
                    >
                        Close
                    </button>
                )}
            </div>

            {/* MODAL: AUTHENTIC aSc "PERIODS" (BELL TIMES & BREAKS) DIALOG */}
            {showBellTimesModal && (() => {
                const selectedBell = normalizedBells.find(b => b.id === selectedBellId) || null;
                return (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-600 w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Title Bar */}
                            <div className="bg-white dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-2 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 dark:text-white">Periods</span>
                                <button
                                    type="button"
                                    onClick={() => setShowBellTimesModal(false)}
                                    className="px-2 py-0.5 rounded hover:bg-rose-100 text-slate-600 hover:text-rose-600 font-black text-sm cursor-pointer"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Body: Table + Right Controls */}
                            <div className="p-4 flex-1 overflow-y-auto space-y-4">
                                <div className="flex flex-col md:flex-row gap-3">
                                    {/* Periods & Breaks Table */}
                                    <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 rounded overflow-hidden max-h-[380px] overflow-y-auto">
                                        <table className="w-full text-left border-collapse text-xs select-none">
                                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                <tr>
                                                    <th className="py-1.5 px-2.5 border-r border-slate-300 dark:border-slate-700">Name</th>
                                                    <th className="py-1.5 px-2.5 border-r border-slate-300 dark:border-slate-700 w-20">Short</th>
                                                    <th className="py-1.5 px-2.5 border-r border-slate-300 dark:border-slate-700 w-20">Start</th>
                                                    <th className="py-1.5 px-2.5 border-r border-slate-300 dark:border-slate-700 w-20">The End</th>
                                                    <th className="py-1.5 px-2 border-r border-slate-300 dark:border-slate-700 w-14">Len...</th>
                                                    <th className="py-1.5 px-2.5 border-r border-slate-300 dark:border-slate-700 w-16">Print</th>
                                                    <th className="py-1.5 px-2.5 w-28">Bell</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                                {normalizedBells.map((b, idx) => {
                                                    const isSel = selectedBellId === b.id;
                                                    const len = calcMinutesDiff(b.start, b.end);
                                                    return (
                                                        <tr
                                                            key={b.id}
                                                            onClick={() => setSelectedBellId(b.id)}
                                                            onDoubleClick={() => {
                                                                setSelectedBellId(b.id);
                                                                setEditingBellRow({ ...b });
                                                            }}
                                                            className={`cursor-pointer transition-colors ${
                                                                isSel
                                                                    ? 'bg-blue-600 text-white font-bold'
                                                                    : b.isBreak
                                                                        ? 'bg-green-200/80 dark:bg-emerald-900/40 hover:bg-green-300/80 text-slate-900 dark:text-emerald-100 font-semibold'
                                                                        : idx % 2 === 0
                                                                            ? 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-100'
                                                                            : 'bg-slate-50/70 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-100'
                                                            }`}
                                                        >
                                                            <td className="py-1 px-2.5 flex items-center gap-2">
                                                                <span className="text-sm leading-none">{b.isBreak ? '🟢' : '🕒'}</span>
                                                                <span className="truncate">{b.name}</span>
                                                            </td>
                                                            <td className="py-1 px-2.5 font-mono">{b.short}</td>
                                                            <td className="py-1 px-2.5 font-mono">{b.start}</td>
                                                            <td className="py-1 px-2.5 font-mono">{b.end}</td>
                                                            <td className="py-1 px-2 font-mono">{len}</td>
                                                            <td className="py-1 px-2.5">{b.print ? 'Yes' : 'No'}</td>
                                                            <td className="py-1 px-2.5 truncate">{b.bell}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Right Action Column */}
                                    <div className="w-full md:w-48 flex flex-col justify-between gap-3 shrink-0">
                                        <div className="flex md:flex-col gap-2">
                                            <button
                                                type="button"
                                                disabled={!selectedBell}
                                                onClick={() => selectedBell && setEditingBellRow({ ...selectedBell })}
                                                className="flex-1 py-2 px-4 rounded border border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-semibold disabled:opacity-45 cursor-pointer"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!selectedBell}
                                                onClick={handleDeleteBellRow}
                                                className="flex-1 py-2 px-4 rounded border border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 text-xs font-semibold disabled:opacity-45 cursor-pointer"
                                            >
                                                Delete
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    type="button"
                                                    disabled={!selectedBell}
                                                    onClick={() => handleMoveBellRow(-1)}
                                                    className="w-7 h-7 rounded border border-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 font-black text-xs disabled:opacity-40 cursor-pointer"
                                                    title="Move Up"
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={!selectedBell}
                                                    onClick={() => handleMoveBellRow(1)}
                                                    className="w-7 h-7 rounded border border-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 font-black text-xs disabled:opacity-40 cursor-pointer"
                                                    title="Move Down"
                                                >
                                                    ↓
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddBreakBetweenLessons}
                                                className="flex-1 py-2.5 px-3 rounded border border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 hover:bg-emerald-100 text-[11px] font-semibold leading-tight text-center cursor-pointer"
                                            >
                                                Add break that will be printed between lessons
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Framed Checkboxes */}
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4 items-end">
                                    <div className="space-y-3 text-xs">
                                        <div className="border border-slate-300 dark:border-slate-700 rounded p-3 bg-white/50 dark:bg-slate-800/50">
                                            <label className="flex items-center gap-2 font-semibold cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(settings.differentBellsInClasses)}
                                                    onChange={e => setSettings(p => ({ ...p, differentBellsInClasses: e.target.checked }))}
                                                    className="w-3.5 h-3.5 accent-blue-600"
                                                />
                                                <span>We have a different bell times in different classes</span>
                                            </label>
                                        </div>
                                        <div className="border border-slate-300 dark:border-slate-700 rounded p-3 bg-white/50 dark:bg-slate-800/50">
                                            <label className="flex items-center gap-2 font-semibold cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(settings.differentBellsOnDays)}
                                                    onChange={e => setSettings(p => ({ ...p, differentBellsOnDays: e.target.checked }))}
                                                    className="w-3.5 h-3.5 accent-blue-600"
                                                />
                                                <span>This period has different bells on some days</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setShowBellTimesModal(false)}
                                            className="px-10 py-1.5 rounded border-2 border-blue-500 bg-slate-200 dark:bg-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                                        >
                                            OK
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* SUB-MODAL: EDIT PERIOD OR BREAK */}
            {editingBellRow && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <form onSubmit={handleSaveEditedBellRow} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-400 p-5 w-full max-w-md shadow-2xl space-y-4 text-xs">
                        <h3 className="text-sm font-black uppercase">
                            {editingBellRow.isBreak ? 'Edit Break' : `Edit Period ${editingBellRow.name}`}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={editingBellRow.name}
                                    onChange={e => setEditingBellRow({ ...editingBellRow, name: e.target.value })}
                                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Short *</label>
                                <input
                                    type="text"
                                    required
                                    value={editingBellRow.short}
                                    onChange={e => setEditingBellRow({ ...editingBellRow, short: e.target.value })}
                                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono font-bold"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Start</label>
                                <input
                                    type="time"
                                    value={editingBellRow.start}
                                    onChange={e => setEditingBellRow({ ...editingBellRow, start: e.target.value })}
                                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">The End</label>
                                <input
                                    type="time"
                                    value={editingBellRow.end}
                                    onChange={e => setEditingBellRow({ ...editingBellRow, end: e.target.value })}
                                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono font-bold"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 items-center">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Bell Applies To</label>
                                <input
                                    type="text"
                                    value={editingBellRow.bell}
                                    onChange={e => setEditingBellRow({ ...editingBellRow, bell: e.target.value })}
                                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold"
                                />
                            </div>
                            <label className="flex items-center gap-2 font-bold pt-4 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editingBellRow.print}
                                    onChange={e => setEditingBellRow({ ...editingBellRow, print: e.target.checked })}
                                    className="w-4 h-4 accent-blue-600"
                                />
                                <span>Print on timetable</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setEditingBellRow(null)} className="px-4 py-1.5 rounded bg-slate-100 dark:bg-slate-700 font-bold cursor-pointer">Cancel</button>
                            <button type="submit" className="px-6 py-1.5 rounded bg-blue-600 text-white font-black uppercase cursor-pointer">OK</button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL: RENAME DAYS */}
            {showRenameDaysModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-400 p-5 w-full max-w-sm shadow-2xl space-y-4">
                        <h3 className="text-sm font-black uppercase">Rename Days</h3>
                        <div className="space-y-2">
                            {settings.dayNames.slice(0, settings.numberOfDays).map((d, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                    <span className="w-12 font-bold text-slate-400">Day {idx + 1}</span>
                                    <input
                                        type="text"
                                        value={d}
                                        onChange={e => {
                                            const next = [...settings.dayNames];
                                            next[idx] = e.target.value;
                                            setSettings(p => ({ ...p, dayNames: next }));
                                        }}
                                        className="flex-1 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <button type="button" onClick={() => setShowRenameDaysModal(false)} className="px-6 py-1.5 rounded bg-blue-600 text-white text-xs font-bold cursor-pointer">Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: PARAMETERS */}
            {showParamsModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-400 p-5 w-full max-w-md shadow-2xl space-y-4 text-xs">
                        <h3 className="text-sm font-black uppercase">Timetable Generation Parameters</h3>
                        <label className="flex items-center gap-2 cursor-pointer font-semibold">
                            <input type="checkbox" checked={settings.parameters.prioritizeCoreMorning} onChange={e => setSettings(p => ({ ...p, parameters: { ...p.parameters, prioritizeCoreMorning: e.target.checked } }))} className="accent-blue-600" />
                            <span>Prioritize core subjects (MAT, ENG, KIS, Sciences) in morning periods</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-semibold">
                            <input type="checkbox" checked={settings.parameters.allowDoubleAcrossBreak} onChange={e => setSettings(p => ({ ...p, parameters: { ...p.parameters, allowDoubleAcrossBreak: e.target.checked } }))} className="accent-blue-600" />
                            <span>Allow double lessons to span across short breaks</span>
                        </label>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Default Max Consecutive Periods Per Teacher</label>
                            <input type="number" min={1} max={8} value={settings.parameters.defaultMaxConsecutive} onChange={e => setSettings(p => ({ ...p, parameters: { ...p.parameters, defaultMaxConsecutive: Math.max(1, Number(e.target.value) || 3) } }))} className="w-24 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-black" />
                        </div>
                        <div className="flex justify-end">
                            <button type="button" onClick={() => setShowParamsModal(false)} className="px-6 py-1.5 rounded bg-blue-600 text-white text-xs font-bold cursor-pointer">OK</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CUSTOM FIELDS */}
            {showCustomFieldsModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-400 p-5 w-full max-w-md shadow-2xl space-y-3 text-xs">
                        <h3 className="text-sm font-black uppercase">Custom School Print Fields</h3>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">School Motto</label>
                            <input type="text" value={settings.customFields.motto} onChange={e => setSettings(p => ({ ...p, customFields: { ...p.customFields, motto: e.target.value } }))} className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Principal / Head Teacher</label>
                            <input type="text" value={settings.customFields.principalName} onChange={e => setSettings(p => ({ ...p, customFields: { ...p.customFields, principalName: e.target.value } }))} className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Director of Studies (DOS)</label>
                            <input type="text" value={settings.customFields.dosName} onChange={e => setSettings(p => ({ ...p, customFields: { ...p.customFields, dosName: e.target.value } }))} className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Timetable Footer Note</label>
                            <input type="text" value={settings.customFields.footerNote} onChange={e => setSettings(p => ({ ...p, customFields: { ...p.customFields, footerNote: e.target.value } }))} className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold" />
                        </div>
                        <div className="flex justify-end pt-2">
                            <button type="button" onClick={() => setShowCustomFieldsModal(false)} className="px-6 py-1.5 rounded bg-blue-600 text-white text-xs font-bold cursor-pointer">OK</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
