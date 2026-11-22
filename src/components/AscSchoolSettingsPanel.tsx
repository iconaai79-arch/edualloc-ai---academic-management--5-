import React, { useState, useEffect } from 'react';
import type { Institution, TimetableSettings, AcademicYear } from '../types';
import { apiService } from '../services/apiService';

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
    bellTimes: Array<{ period: number; label: string; start: string; end: string }>;
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

const DEFAULT_BELL_TIMES = [
    { period: 1, label: '1', start: '08:00', end: '08:40' },
    { period: 2, label: '2', start: '08:40', end: '09:20' },
    { period: 3, label: '3', start: '09:30', end: '10:10' },
    { period: 4, label: '4', start: '10:10', end: '10:50' },
    { period: 5, label: '5', start: '11:20', end: '12:00' },
    { period: 6, label: '6', start: '12:00', end: '12:40' },
    { period: 7, label: '7', start: '12:40', end: '13:20' },
    { period: 8, label: '8', start: '14:00', end: '14:40' },
    { period: 9, label: '9', start: '14:40', end: '15:20' },
    { period: 10, label: '10', start: '15:20', end: '16:00' },
];

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
        const nextBells = Array.from({ length: n }).map((_, i) => {
            const existing = settings.bellTimes[i];
            if (existing) return existing;
            const startMin = 8 * 60 + i * 45;
            const endMin = startMin + 40;
            const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
            return { period: i + 1, label: String(i + 1), start: fmt(startMin), end: fmt(endMin) };
        });
        setSettings(prev => ({ ...prev, periodsPerDay: n, bellTimes: nextBells }));
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

            {/* MODAL: BELL TIMES / RENAME PERIODS */}
            {showBellTimesModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-400 p-5 w-full max-w-lg shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase">Bell Times / Rename Periods</h3>
                            <button type="button" onClick={() => setShowBellTimesModal(false)} className="font-black text-sm px-2 cursor-pointer">×</button>
                        </div>
                        <div className="max-h-72 overflow-y-auto space-y-1.5">
                            {settings.bellTimes.slice(0, settings.periodsPerDay).map((b, idx) => (
                                <div key={idx} className="grid grid-cols-3 gap-2 items-center text-xs">
                                    <input
                                        type="text"
                                        value={b.label}
                                        onChange={e => {
                                            const next = [...settings.bellTimes];
                                            next[idx] = { ...b, label: e.target.value };
                                            setSettings(p => ({ ...p, bellTimes: next }));
                                        }}
                                        className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold"
                                    />
                                    <input
                                        type="time"
                                        value={b.start}
                                        onChange={e => {
                                            const next = [...settings.bellTimes];
                                            next[idx] = { ...b, start: e.target.value };
                                            setSettings(p => ({ ...p, bellTimes: next }));
                                        }}
                                        className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono"
                                    />
                                    <input
                                        type="time"
                                        value={b.end}
                                        onChange={e => {
                                            const next = [...settings.bellTimes];
                                            next[idx] = { ...b, end: e.target.value };
                                            setSettings(p => ({ ...p, bellTimes: next }));
                                        }}
                                        className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <button type="button" onClick={() => setShowBellTimesModal(false)} className="px-6 py-1.5 rounded bg-blue-600 text-white text-xs font-bold cursor-pointer">Done</button>
                        </div>
                    </div>
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
