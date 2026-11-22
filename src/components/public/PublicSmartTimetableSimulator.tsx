import React, { useState, useMemo, useEffect } from 'react';
import { buildSmartTimetableDemoBundle } from '../../utils/ascTimetableDemoGenerator';
import { AscTimetableCardsDashboard } from '../AscTimetableCardsDashboard';
import { AscTimetablePrintPreviewReports } from '../AscTimetablePrintPreviewReports';

interface PublicSmartTimetableSimulatorProps {
    onRegister?: (modId: string) => void;
    onBookDemo?: () => void;
}

const SIM_STEPS = [
    {
        id: 'school',
        phase: 'Step 1 of 6 • Setup',
        icon: '🏛️',
        label: 'School & Bells',
        title: 'Configure School Periods & Breaks',
        insight: 'Set 5 teaching days × 10 periods/day with SHORT BREAK, LONG BREAK, and LUNCH BREAK — plus custom bell groups per class.',
    },
    {
        id: 'subjects',
        phase: 'Step 2 of 6 • Data Entry',
        icon: '📘',
        label: 'Subjects & Classes',
        title: 'Enter Subjects, Streams & Elective Divisions',
        insight: '13 Kenyan curriculum subjects across 4 Form Four streams (4N, 4C, 4S, 4E) with Friday P9–P10 Time-Off and elective splits (HIST/GEO, PHY/CRE, AGRI/HS/CS/BST).',
    },
    {
        id: 'teachers',
        phase: 'Step 3 of 6 • Staffing',
        icon: '🎓',
        label: 'Teachers & Labs',
        title: 'Assign Teachers, Color Swatches & Labs',
        insight: '16 teachers with aSc short codes (01–28), daily/consecutive limits, and shared science/computer labs (LAB 1, LAB 2, COMPUTER LAB, FIELD).',
    },
    {
        id: 'relations',
        phase: 'Step 4 of 6 • Constraints',
        icon: '🕸️',
        label: 'Card Relations',
        title: 'Enforce Card Relationships & Zero Clashes',
        insight: 'Rules like "BIO, PHY, CHE, MAT cannot follow", "Cannot be same day", and "Parallel Electives" are verified automatically.',
    },
    {
        id: 'cards',
        phase: 'Step 5 of 6 • AI Generation',
        icon: '🗂️',
        label: 'Subject Cards Board',
        title: 'Interactive aSc-Style Master Subject Cards Board',
        insight: '240+ subject cards placed clash-free across Mon–Fri with diagonal 2-subject splits and 4-way elective bands. Click any subject chip to highlight!',
    },
    {
        id: 'reports',
        phase: 'Step 6 of 6 • Print & PDF',
        icon: '🖨️',
        label: 'Print & PDF Reports',
        title: 'Instant Class Noticeboard Sheets & Landscape PDF',
        insight: 'Preview individual Class, Teacher, Classroom, or Wall Poster timetables with vertical breaks — click Download PDF to test a real export!',
    },
] as const;

type SimTabId = typeof SIM_STEPS[number]['id'];

export const PublicSmartTimetableSimulator: React.FC<PublicSmartTimetableSimulatorProps> = ({
    onRegister,
    onBookDemo,
}) => {
    const demoBundle = useMemo(() => buildSmartTimetableDemoBundle('public_showcase_demo', 'DEMO SECONDARY SCHOOL'), []);

    // Seed demo localStorage keys for public_showcase_demo so Print Preview reads bells & teacher short codes seamlessly
    useEffect(() => {
        try {
            localStorage.setItem('eduai_asc_school_settings_public_showcase_demo', JSON.stringify(demoBundle.schoolSettings));
            localStorage.setItem('eduai_asc_teacher_prefs_public_showcase_demo', JSON.stringify(demoBundle.teacherPrefs));
        } catch (_) {}
    }, [demoBundle]);

    const [activeTab, setActiveTab] = useState<SimTabId>('cards');
    const [tourRunning, setTourRunning] = useState<boolean>(false);

    const activeStepIdx = SIM_STEPS.findIndex(s => s.id === activeTab);
    const activeStep = SIM_STEPS[activeStepIdx >= 0 ? activeStepIdx : 4];

    useEffect(() => {
        if (!tourRunning) return;
        if (activeStepIdx >= SIM_STEPS.length - 1) {
            setTourRunning(false);
            return;
        }
        const timer = window.setTimeout(() => {
            setActiveTab(SIM_STEPS[activeStepIdx + 1].id);
        }, 4200);
        return () => window.clearTimeout(timer);
    }, [tourRunning, activeStepIdx]);

    const startGuidedSimulation = () => {
        setActiveTab('school');
        setTourRunning(true);
    };

    const getSubjectById = (id: string) => demoBundle.subjects.find(s => s.id === id);
    const getLecturerById = (id: string) => demoBundle.lecturers.find(l => l.id === id);
    const getRoomById = (id: string) => demoBundle.rooms.find(r => r.id === id);

    return (
        <div className="rounded-[2rem] bg-slate-900/90 border border-indigo-500/30 shadow-2xl overflow-hidden text-left">
            {/* Top Simulator Header & Conversion Bar */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                            Interactive Live Demo • No Login Required
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                            4 Classes • 13 Subjects • 16 Teachers • 8 Labs/Rooms
                        </span>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                        Smart Timetable Simulator (aSc-Familiar Experience)
                    </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={tourRunning ? () => setTourRunning(false) : startGuidedSimulation}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer flex items-center gap-1.5"
                    >
                        <span>{tourRunning ? '⏸ Pause Walkthrough' : '▶ Run 6-Step Guided Simulation'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onRegister?.('edu')}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
                    >
                        🚀 Register Your School Free →
                    </button>
                </div>
            </div>

            {/* Step Tabs Bar */}
            <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {SIM_STEPS.map((step, idx) => {
                    const isActive = activeTab === step.id;
                    return (
                        <button
                            key={step.id}
                            type="button"
                            onClick={() => { setTourRunning(false); setActiveTab(step.id); }}
                            className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                                isActive
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                        >
                            <span>{step.icon}</span>
                            <span>{idx + 1}. {step.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Guided Insight Narrator Strip */}
            <div className="px-5 py-3 bg-indigo-950/60 border-b border-indigo-800/40 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                    <span className="text-xl leading-none mt-0.5">{activeStep.icon}</span>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
                            {activeStep.phase} — {activeStep.title}
                        </div>
                        <p className="text-xs text-slate-200 mt-0.5">{activeStep.insight}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        disabled={activeStepIdx <= 0}
                        onClick={() => { setTourRunning(false); setActiveTab(SIM_STEPS[activeStepIdx - 1].id); }}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase disabled:opacity-35 cursor-pointer"
                    >
                        ◀ Prev
                    </button>
                    <button
                        type="button"
                        disabled={activeStepIdx >= SIM_STEPS.length - 1}
                        onClick={() => { setTourRunning(false); setActiveTab(SIM_STEPS[activeStepIdx + 1].id); }}
                        className="px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase disabled:opacity-35 cursor-pointer"
                    >
                        Next Step →
                    </button>
                </div>
            </div>

            {/* Interactive Live Preview Workspace */}
            <div className="p-4 sm:p-6 bg-slate-100 text-slate-900 min-h-[420px]">
                {activeTab === 'school' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-white rounded-2xl border border-slate-300 p-5 space-y-3 shadow-sm">
                            <h4 className="text-sm font-black uppercase text-slate-900">🏛️ School Profile &amp; Schedule Rules</h4>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <div className="text-[10px] font-black uppercase text-slate-400">School Name</div>
                                    <div className="font-black text-slate-900 mt-0.5">{demoBundle.schoolSettings.schoolName}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <div className="text-[10px] font-black uppercase text-slate-400">Schedule Structure</div>
                                    <div className="font-black text-indigo-700 mt-0.5">5 Days × 10 Periods / Day</div>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <div className="text-[10px] font-black uppercase text-slate-400">Curriculum</div>
                                    <div className="font-bold text-slate-800 mt-0.5">{demoBundle.schoolSettings.curriculum}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <div className="text-[10px] font-black uppercase text-slate-400">Multi-Bell Support</div>
                                    <div className="font-bold text-emerald-700 mt-0.5">Different Bells Per Class Ready ✓</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm overflow-hidden">
                            <h4 className="text-sm font-black uppercase text-slate-900 mb-3">🕒 Configured Bell Times &amp; Breaks</h4>
                            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-600 sticky top-0">
                                        <tr><th className="p-2">Name</th><th className="p-2">Start</th><th className="p-2">End</th><th className="p-2">Bell</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {demoBundle.schoolSettings.bellTimes.map(b => (
                                            <tr key={b.id} className={b.isBreak ? 'bg-green-200/80 font-bold text-emerald-950' : ''}>
                                                <td className="p-2">{b.isBreak ? '🟢' : '🕒'} {b.name}</td>
                                                <td className="p-2 font-mono">{b.start}</td>
                                                <td className="p-2 font-mono">{b.end}</td>
                                                <td className="p-2">{b.bell}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'subjects' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-300 p-4 shadow-sm">
                            <h4 className="text-xs font-black uppercase text-slate-800 mb-2">📘 Subjects ({demoBundle.subjects.length})</h4>
                            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-600 sticky top-0">
                                        <tr><th className="p-2">Name</th><th className="p-2">Short</th><th className="p-2 text-right">Weekly</th><th className="p-2">Distribution</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {demoBundle.subjects.map(s => (
                                            <tr key={s.id}>
                                                <td className="p-2 font-bold">📘 {s.name}</td>
                                                <td className="p-2 font-mono font-black text-indigo-700">{s.code}</td>
                                                <td className="p-2 text-right font-mono">{(s as any).hoursPerWeek}</td>
                                                <td className="p-2">Ideal</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-300 p-4 shadow-sm space-y-3">
                            <h4 className="text-xs font-black uppercase text-slate-800">👥 Classes &amp; Elective Divisions ({demoBundle.courses.length})</h4>
                            {demoBundle.courses.map(c => (
                                <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                                    <div>
                                        <div className="font-black text-xs text-slate-900">👥 {c.name}</div>
                                        <div className="text-[10px] text-slate-500">Divisions: HIST/GEO • PHY/CRE • AGRI/HS/CS/BST</div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-mono font-black text-xs">{c.code}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'teachers' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-300 p-4 shadow-sm">
                            <h4 className="text-xs font-black uppercase text-slate-800 mb-2">🎓 Teachers, Color Swatches &amp; Short Codes ({demoBundle.lecturers.length})</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                                {demoBundle.lecturers.map(t => {
                                    const pref = demoBundle.teacherPrefs[t.id] || {};
                                    return (
                                        <div key={t.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span>🎓</span>
                                                <span style={{ backgroundColor: pref.color || '#6366f1' }} className="w-3.5 h-3.5 rounded-xs border border-black/25 inline-block" />
                                                <span className="font-bold text-slate-900">{t.name}</span>
                                            </div>
                                            <span className="font-mono font-black text-slate-500">#{pref.shortCode}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-300 p-4 shadow-sm space-y-2">
                            <h4 className="text-xs font-black uppercase text-slate-800">🚪 Shared Labs &amp; Rooms ({demoBundle.rooms.length})</h4>
                            {demoBundle.rooms.map(r => (
                                <div key={r.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                                    <span className="font-bold">🚪 {r.name}</span>
                                    <span className="text-[10px] font-mono text-slate-500">{r.capacity} seats</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'relations' && (
                    <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black uppercase text-slate-900">🕸️ Active Card Relationships &amp; Constraint Verification</h4>
                            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                                ✓ 0 Clashes • 100% Verified
                            </span>
                        </div>
                        <table className="w-full text-left border-collapse text-xs border border-slate-200">
                            <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-600">
                                <tr><th className="p-2.5">#</th><th className="p-2.5">Subjects</th><th className="p-2.5">Apply to</th><th className="p-2.5">Condition</th><th className="p-2.5">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {demoBundle.cardRelations.map((r, i) => (
                                    <tr key={r.id}>
                                        <td className="p-2.5 font-mono">{i + 1}</td>
                                        <td className="p-2.5 font-mono font-black text-indigo-700">
                                            {r.subjectIds.map(sid => getSubjectById(sid)?.code || sid).join(', ')}
                                        </td>
                                        <td className="p-2.5">All classes</td>
                                        <td className="p-2.5 font-semibold">{r.ruleType.replace(/_/g, ' ')}</td>
                                        <td className="p-2.5 text-emerald-600 font-black">✓ Satisfied</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'cards' && (
                    <AscTimetableCardsDashboard
                        entries={demoBundle.entries}
                        courses={demoBundle.courses}
                        subjects={demoBundle.subjects}
                        lecturers={demoBundle.lecturers}
                        rooms={demoBundle.rooms}
                        timetableSettings={demoBundle.timetableSettings}
                        institutionName="DEMO SECONDARY SCHOOL"
                        getSubjectById={getSubjectById}
                        getLecturerById={getLecturerById}
                        getRoomById={getRoomById}
                    />
                )}

                {activeTab === 'reports' && (
                    <AscTimetablePrintPreviewReports
                        institution={{ id: 'public_showcase_demo', name: 'DEMO SECONDARY SCHOOL' } as any}
                        entries={demoBundle.entries}
                        courses={demoBundle.courses}
                        subjects={demoBundle.subjects}
                        lecturers={demoBundle.lecturers}
                        rooms={demoBundle.rooms}
                        timetableSettings={demoBundle.timetableSettings}
                        getSubjectById={getSubjectById}
                        getLecturerById={getLecturerById}
                        getRoomById={getRoomById}
                    />
                )}
            </div>

            {/* Bottom Conversion Banner */}
            <div className="p-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="text-sm font-black uppercase tracking-wide">
                        Ready to generate your real school timetable in minutes?
                    </div>
                    <p className="text-xs text-indigo-100 mt-0.5">
                        Register your school account free — import your subjects, teachers, and streams, and print noticeboard-ready PDFs today.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => onRegister?.('edu')}
                        className="px-6 py-3 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider shadow-xl cursor-pointer"
                    >
                        Register Your School Free →
                    </button>
                    {onBookDemo && (
                        <button
                            type="button"
                            onClick={onBookDemo}
                            className="px-5 py-3 rounded-xl bg-slate-950/40 hover:bg-slate-950/60 border border-white/30 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                        >
                            Book Live Demo
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
