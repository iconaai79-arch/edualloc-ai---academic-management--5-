import React, { useState } from 'react';
import { Role } from '../../types';
import { 
    PlusIcon, 
    SparklesIcon,
    ArrowPathIcon,
    SearchIcon,
    ChevronRightIcon,
    UsersIcon,
    EyeIcon,
    BuildingOfficeIcon,
    PencilIcon,
    CreditCardIcon,
    DocumentTextIcon,
    BellIcon,
    Cog8ToothIcon as SettingsIcon,
    ChartBarIcon
} from '../icons/index';
import { HeartIcon, ActivityIcon, ScissorsIcon, CalendarIcon, GlobeAltIcon, PhotoIcon, ChartLineIcon } from './HealthIcons';

import { InpatientView } from './InpatientView';
import { DentalView } from './DentalView';
import { OphthalmologyView } from './OphthalmologyView';
import { HISBillingView } from './HISBillingView';
import { HISBroadcasterView } from './HISBroadcasterView';
import { AppointmentsView } from './AppointmentsView';
import { HISConfigView } from './HISConfigView';
import { HISReportsView } from './HISReportsView';

type HISModule = 'general' | 'inpatient' | 'dental' | 'eye' | 'billing' | 'broadcaster' | 'appointments' | 'config' | 'reports';

interface HealthCoreProps {
    activeRole?: Role;
}

export const HealthCoreView: React.FC<HealthCoreProps> = ({ activeRole }) => {
    const [activeModule, setActiveModule] = useState<HISModule>('general');

    const renderModule = () => {
        switch (activeModule) {
            case 'general':
                return <GeneralMedicineView />;
            case 'inpatient':
                return <InpatientView />;
            case 'dental':
                return <DentalView />;
            case 'eye':
                return <OphthalmologyView />;
            case 'billing':
                return <HISBillingView />;
            case 'broadcaster':
                return <HISBroadcasterView />;
            case 'appointments':
                return <AppointmentsView />;
            case 'config':
                return <HISConfigView />;
            case 'reports':
                return <HISReportsView activeRole={activeRole} />;
            default:
                return <GeneralMedicineView />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
            {/* Top Navigation Bar */}
            <nav className="h-20 border-b border-white/5 flex items-center justify-between px-8 glass-morphism sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <SparklesIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-[0.3em]">Quantum <span className="text-indigo-400">HIS</span></h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Medical Operating System v2.0</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {[
                        { id: 'general', label: 'General', icon: HeartIcon },
                        { id: 'inpatient', label: 'Inpatient', icon: BuildingOfficeIcon },
                        { id: 'dental', label: 'Dental', icon: ScissorsIcon },
                        { id: 'eye', label: 'Optical', icon: EyeIcon },
                        { id: 'billing', label: 'Billing', icon: CreditCardIcon },
                        { id: 'broadcaster', label: 'Signal', icon: BellIcon },
                        { id: 'appointments', label: 'Scheduling', icon: CalendarIcon },
                        { id: 'config', label: 'Nexus', icon: SettingsIcon },
                        { id: 'reports', label: 'Intelligence', icon: ChartBarIcon },
                    ].map((mod) => (
                        <button
                            key={mod.id}
                            onClick={() => setActiveModule(mod.id as HISModule)}
                            className={`flex items-center gap-3 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeModule === mod.id 
                                ? 'bg-white text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,0.2)]' 
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <mod.icon className="w-4 h-4" />
                            {mod.label}
                        </button>
                    ))}
                </div>
            </nav>

            <main className="p-8">
                {renderModule()}
            </main>
        </div>
    );
};

// --- General Medicine View (Patient 360) ---

const GeneralMedicineView = () => (
    <div className="animate-fade-in-up">
        <div className="flex justify-between items-end mb-10">
            <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter">Patient <span className="text-indigo-400">Portfolio</span></h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Unified 360-degree clinical profile</p>
            </div>
            <div className="flex gap-4">
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="text"
                        placeholder="Search patient registry..."
                        className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all w-64"
                    />
                </div>
                <button className="bg-indigo-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                    <PlusIcon className="w-4 h-4" /> Register Patient
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
                <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 h-[600px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                    <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mb-8">Clinical Timeline</p>
                    
                    <div className="space-y-12">
                        {[
                            { date: 'Oct 12', time: '14:30', event: 'Dental Extraction (Tooth 14)', dept: 'Dental', provider: 'Dr. Sarah' },
                            { date: 'Sep 28', time: '10:15', event: 'Refraction Exam (OD: -2.25)', dept: 'Ophthalmology', provider: 'Dr. Mike' },
                            { date: 'Sep 15', time: '09:00', event: 'General Consultation', dept: 'OPD', provider: 'Dr. Jane' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-8 group">
                                <div className="text-right w-20 pt-1">
                                    <p className="text-xs font-black text-white">{item.date}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{item.time}</p>
                                </div>
                                <div className="relative">
                                    <div className="w-px h-full bg-white/5 absolute left-1/2 -translate-x-1/2 top-4"></div>
                                    <div className="w-3 h-3 rounded-full bg-indigo-500 relative z-10 border-4 border-slate-950 group-hover:scale-150 transition-transform"></div>
                                </div>
                                <div className="flex-1 pb-10 border-b border-white/5">
                                    <h4 className="text-sm font-black uppercase tracking-tight mb-2 group-hover:text-indigo-400 transition-colors">{item.event}</h4>
                                    <div className="flex gap-4">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">{item.dept}</span>
                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-400/20 px-3 py-1 rounded-full">{item.provider}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                    <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mb-8">Vital Statistics</p>
                    <div className="space-y-6">
                        {[
                            { label: 'Blood Pressure', value: '120/80', unit: 'mmHg', trend: 'Normal', color: 'text-emerald-400' },
                            { label: 'Heart Rate', value: '72', unit: 'BPM', trend: '+2', color: 'text-white' },
                            { label: 'Oxygen Saturation', value: '98%', unit: 'SpO2', trend: 'Normal', color: 'text-blue-400' },
                            { label: 'Body Temp', value: '36.8', unit: '°C', trend: '-0.2', color: 'text-white' }
                        ].map((vital, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{vital.label}</p>
                                    <p className="text-2xl font-black">{vital.value} <span className="text-xs font-bold text-slate-500 tracking-tight">{vital.unit}</span></p>
                                </div>
                                <div className={`text-[10px] font-black uppercase tracking-widest ${vital.color} italic underline underline-offset-4 decoration-2`}>
                                    {vital.trend}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full mt-10 py-5 bg-white text-slate-950 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl shadow-white/5">
                        Update Vitals
                    </button>
                </div>
            </div>
        </div>
    </div>
);
