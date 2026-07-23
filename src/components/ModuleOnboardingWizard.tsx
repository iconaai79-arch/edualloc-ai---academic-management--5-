import React, { useState, useMemo } from 'react';
import type { Institution, InstitutionModuleState } from '../types';

// ─── Icon helpers (inline SVGs to avoid import churn) ────────────────────────
const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);
const SparkIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
);

// ─── Module catalogue for education institutions ──────────────────────────────
interface EduModule {
    id: string;
    name: string;
    tagline: string;
    description: string;
    icon: string;
    color: string;
    gradient: string;
    features: string[];
    isCore?: boolean;
}

const EDU_MODULES: EduModule[] = [
    {
        id: 'academics',
        name: 'Academics',
        tagline: 'Grading & Performance',
        description: 'End-to-end academic management — grading, report cards, class rankings, and student performance analytics.',
        icon: '🎓',
        color: 'indigo',
        gradient: 'from-indigo-500 to-violet-600',
        features: ['Grading systems', 'Report cards', 'Class rankings', 'Performance analytics'],
        isCore: true,
    },
    {
        id: 'timetable',
        name: 'Smart Timetable',
        tagline: 'Scheduling Engine',
        description: 'AI-powered timetable generation with automatic conflict resolution, teacher availability tracking, and subject balancing.',
        icon: '🗓️',
        color: 'sky',
        gradient: 'from-sky-500 to-cyan-500',
        features: ['Auto-generation', 'Conflict detection', 'Teacher schedules', 'Calendar sync'],
        isCore: true,
    },
    {
        id: 'finance',
        name: 'Finance & Fees',
        tagline: 'Revenue Management',
        description: 'Complete fee collection, invoicing, expense tracking, M-Pesa integration, and financial reporting — all in one place.',
        icon: '💳',
        color: 'emerald',
        gradient: 'from-emerald-500 to-teal-500',
        features: ['Fee collection', 'M-Pesa payments', 'Invoicing', 'Financial reports'],
    },
    {
        id: 'library',
        name: 'Library',
        tagline: 'Resource Management',
        description: 'Digital library with book cataloguing, issuing & returns, overdue fines, and student borrowing history.',
        icon: '📚',
        color: 'purple',
        gradient: 'from-purple-500 to-fuchsia-500',
        features: ['Book catalogue', 'Issue & return', 'Fine tracking', 'Borrowing history'],
    },
    {
        id: 'school_store',
        name: 'School Inventory',
        tagline: 'Supply & Resource Tracking',
        description: 'Track and manage school supply inventory, uniform/stationery stock, student requests, and suppliers.',
        icon: '📦',
        color: 'orange',
        gradient: 'from-orange-500 to-amber-500',
        features: ['Inventory tracking', 'Supplier management', 'Stock requisitions', 'Asset registry'],
    },
    {
        id: 'boarding',
        name: 'Boarding Master',
        tagline: 'Hostel & Dormitory',
        description: 'Manage boarding facilities, hostel allocations, bed mappings, and student leave-out requests smoothly.',
        icon: '🛏️',
        color: 'rose',
        gradient: 'from-rose-500 to-pink-500',
        features: ['Hostel management', 'Bed allocation', 'Leave-out tracking', 'Discipline incidents'],
    },
    {
        id: 'transport',
        name: 'Fleet Registry',
        tagline: 'Transport & Routes',
        description: 'Complete school bus tracking, route planning, student transport onboarding, vehicle logs, and driver management.',
        icon: '🚌',
        color: 'sky',
        gradient: 'from-blue-500 to-indigo-500',
        features: ['Vehicle tracking', 'Driver mapping', 'Onboarding history', 'Gate check-in logs'],
    },
    {
        id: 'events',
        name: 'Event Desk',
        tagline: 'Marathon & Sports Coordinator',
        description: 'Complete event setup, runner registrations with mock payments, check-in log, RFID timings split simulator, and finisher certificate generators.',
        icon: '🏃',
        color: 'indigo',
        gradient: 'from-violet-500 to-indigo-600',
        features: ['Category setup', 'BIB & Kit desk', 'Timing splits', 'Printable certificates'],
    },
    {
        id: 'enrollment_manager',
        name: 'Enrollment Manager',
        tagline: 'Student Registry & Cohorts',
        description: 'Unified student registry and enrollment portal supporting both academic and driving school curriculums with biometric scanner integration.',
        icon: '👤',
        color: 'indigo',
        gradient: 'from-indigo-500 to-blue-600',
        features: ['Dynamic registries', 'Spreadsheet import', 'Biometric passkeys', 'Cohorts mapping'],
    },
    {
        id: 'restaurant_pos',
        name: 'Restaurant POS & Kitchen KDS',
        tagline: 'Point of Sale, Kitchen Display & Menu',
        description: 'Complete restaurant touch ordering, Kitchen Display System (KDS), digital menu builder, and customer order readiness display board.',
        icon: '🍽️',
        color: 'amber',
        gradient: 'from-amber-500 to-orange-600',
        features: ['Touchscreen POS', 'Kitchen KDS Display', 'Customer Order Board', 'Menu & Recipe Builder'],
    },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
    institution: Institution;
    onActivateModules: (moduleIds: string[]) => Promise<void>;
    onDismiss: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────
export const ModuleOnboardingWizard: React.FC<Props> = ({ institution, onActivateModules, onDismiss }) => {
    const [step, setStep] = useState<'welcome' | 'select' | 'activating' | 'done'>('welcome');
    const [selected, setSelected] = useState<Set<string>>(new Set(['academics', 'timetable'])); // sensible defaults
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [activatingProgress, setActivatingProgress] = useState(0);

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); }
            return next;
        });
    };

    const handleActivate = async () => {
        setStep('activating');
        const ids = Array.from(selected);
        // Simulate staggered progress
        for (let i = 0; i <= 100; i += Math.ceil(100 / (ids.length + 2))) {
            setActivatingProgress(Math.min(i, 95));
            await new Promise(r => setTimeout(r, 120));
        }
        await onActivateModules(ids);
        setActivatingProgress(100);
        await new Promise(r => setTimeout(r, 400));
        setStep('done');
    };

    const selectedList = EDU_MODULES.filter(m => selected.has(m.id));

    // ── Welcome Step ──────────────────────────────────────────────────────────
    if (step === 'welcome') {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                {/* Animated orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 max-w-lg w-full mx-4 text-center">
                    {/* Logo / Institution badge */}
                    <div className="mb-8 flex justify-center">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 text-5xl">
                                🏫
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg">
                                <SparkIcon />
                            </div>
                        </div>
                    </div>

                    <h1 className="text-4xl font-black text-white mb-3 leading-tight">
                        Welcome to<br />
                        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            {institution.name}
                        </span>
                    </h1>
                    <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                        Your institution portal is ready. Let's activate the modules you need to get up and running in minutes.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => setStep('select')}
                            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black rounded-2xl shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
                        >
                            ✨ Set Up My Modules
                        </button>
                        <button
                            onClick={onDismiss}
                            className="px-8 py-4 bg-white/5 text-slate-400 font-semibold rounded-2xl border border-white/10 hover:bg-white/10 hover:text-white transition-all text-sm"
                        >
                            Skip for now
                        </button>
                    </div>

                    <p className="mt-6 text-slate-600 text-xs">You can always change this later in Settings → Subscription</p>
                </div>
            </div>
        );
    }

    // ── Select Step ───────────────────────────────────────────────────────────
    if (step === 'select') {
        return (
            <div className="fixed inset-0 z-[9999] flex flex-col bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-y-auto">
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #818cf8 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-10">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <span className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
                            <SparkIcon /> Module Setup
                        </span>
                        <h2 className="text-3xl font-black text-white mb-2">Choose Your Modules</h2>
                        <p className="text-slate-400">Each module starts with a <span className="text-indigo-400 font-bold">14-day free trial</span>. Activate what you need — deactivate anytime.</p>
                    </div>

                    {/* Module cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {EDU_MODULES.map(mod => {
                            const isSelected = selected.has(mod.id);
                            const isHovered = hoveredId === mod.id;
                            return (
                                <button
                                    key={mod.id}
                                    onClick={() => toggle(mod.id)}
                                    onMouseEnter={() => setHoveredId(mod.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 group overflow-hidden
                                        ${isSelected
                                            ? 'border-indigo-500 bg-indigo-500/10 shadow-xl shadow-indigo-500/20 scale-[1.02]'
                                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                                        }`}
                                >
                                    {/* Selected checkmark */}
                                    <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200
                                        ${isSelected ? 'bg-indigo-500 text-white scale-100' : 'bg-white/10 text-transparent scale-75'}`}>
                                        <CheckIcon />
                                    </div>

                                    {/* Core badge */}
                                    {mod.isCore && (
                                        <span className="inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-3 border border-indigo-500/30">
                                            ⭐ Recommended
                                        </span>
                                    )}

                                    {/* Icon */}
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center text-2xl mb-3 shadow-lg transition-transform duration-200 ${isHovered ? 'scale-110' : ''}`}>
                                        {mod.icon}
                                    </div>

                                    <h3 className="text-white font-black text-base mb-0.5">{mod.name}</h3>
                                    <p className="text-indigo-300/70 text-[11px] font-bold uppercase tracking-wider mb-2">{mod.tagline}</p>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-3">{mod.description}</p>

                                    {/* Feature pills */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {mod.features.map(f => (
                                            <span key={f} className="text-[10px] bg-white/5 text-slate-400 border border-white/10 px-2 py-0.5 rounded-full font-medium">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Summary bar */}
                    <div className="sticky bottom-4 bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
                        <div>
                            <p className="text-white font-black text-sm">
                                {selected.size === 0
                                    ? 'No modules selected'
                                    : `${selected.size} module${selected.size !== 1 ? 's' : ''} selected`}
                            </p>
                            <p className="text-slate-400 text-xs mt-0.5">
                                {selected.size > 0
                                    ? selectedList.map(m => m.name).join(' · ')
                                    : 'Select at least one module to continue'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setStep('welcome')}
                                className="px-4 py-2.5 bg-white/5 text-slate-400 text-xs font-black uppercase tracking-widest rounded-xl border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleActivate}
                                disabled={selected.size === 0}
                                className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all
                                    ${selected.size > 0
                                        ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95'
                                        : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}
                            >
                                Activate Trials →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Activating Step ───────────────────────────────────────────────────────
    if (step === 'activating') {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                <div className="text-center max-w-sm w-full mx-4">
                    <div className="w-20 h-20 mx-auto mb-6 relative">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="8" />
                            <circle
                                cx="40" cy="40" r="34" fill="none"
                                stroke="url(#grad)" strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 34}`}
                                strokeDashoffset={`${2 * Math.PI * 34 * (1 - activatingProgress / 100)}`}
                                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                            />
                            <defs>
                                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-white font-black text-sm">
                            {activatingProgress}%
                        </div>
                    </div>
                    <h3 className="text-white font-black text-xl mb-2">Activating Modules</h3>
                    <p className="text-slate-400 text-sm">Setting up {selected.size} module trial{selected.size !== 1 ? 's' : ''} for {institution.name}…</p>
                    <div className="mt-6 space-y-2">
                        {selectedList.map((m, i) => (
                            <div key={m.id} className={`flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 transition-all duration-500 ${activatingProgress > (i + 1) * (100 / (selected.size + 1)) ? 'opacity-100' : 'opacity-40'}`}>
                                <span className="text-xl">{m.icon}</span>
                                <span className="text-white font-semibold text-sm flex-1 text-left">{m.name}</span>
                                {activatingProgress > (i + 1) * (100 / (selected.size + 1)) && (
                                    <span className="text-emerald-400"><CheckIcon /></span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── Done Step ─────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <div className="relative z-10 text-center max-w-md w-full mx-4">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center text-5xl shadow-2xl shadow-emerald-500/30 animate-bounce">
                    🚀
                </div>
                <h2 className="text-3xl font-black text-white mb-3">You're all set!</h2>
                <p className="text-slate-400 mb-6 leading-relaxed">
                    <span className="text-emerald-400 font-bold">{selected.size} module{selected.size !== 1 ? 's' : ''}</span> activated with a 14-day free trial.<br />
                    Explore your dashboard and start managing {institution.name}.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {selectedList.map(m => (
                        <span key={m.id} className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                            {m.icon} {m.name}
                        </span>
                    ))}
                </div>
                <button
                    onClick={onDismiss}
                    className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black rounded-2xl shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                    Open My Dashboard →
                </button>
            </div>
        </div>
    );
};
