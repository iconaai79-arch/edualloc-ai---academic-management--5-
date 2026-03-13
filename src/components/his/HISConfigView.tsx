import React, { useState } from 'react';
import { 
    Cog8ToothIcon as SettingsIcon,
    SparklesIcon,
    UsersIcon, 
    PencilIcon,
    PlusIcon,
} from '../icons/index';
import { HISStaff } from '../../types';
import { GlobeAltIcon, PhotoIcon } from './HealthIcons';

interface HISConfigProps {
    demoStaff?: HISStaff[];
}

type ConfigTab = 'branding' | 'staff' | 'clinic';

export const HISConfigView: React.FC<HISConfigProps> = ({ demoStaff }) => {
    const [activeTab, setActiveTab] = useState<ConfigTab>('branding');
    const [branding, setBranding] = useState({
        hospitalName: 'Quantum Health Medical Center',
        motto: 'Precision in Care, Excellence in Service',
        primaryColor: '#6366f1',
        logoUrl: ''
    });

    const renderTab = () => {
        switch (activeTab) {
            case 'branding':
                return (
                    <div className="space-y-10 animate-fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="bg-white dark:bg-slate-900/50 p-12 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none"></div>
                                
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.3em] italic text-indigo-600 mb-2">Visual DNA</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Hospital Identity & Branding Engine</p>
                                </div>
                                
                                <div className="space-y-6">
                                    <label className="block group/input">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block group-hover/input:text-indigo-500 transition-colors italic">Institutional Nomenclature</span>
                                        <input 
                                            type="text" 
                                            value={branding.hospitalName}
                                            onChange={(e) => setBranding({...branding, hospitalName: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-inner"
                                            placeholder="Enter Hospital Name..."
                                        />
                                    </label>
                                    <label className="block group/input">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block group-hover/input:text-indigo-500 transition-colors italic">Clinical Motto</span>
                                        <input 
                                            type="text" 
                                            value={branding.motto}
                                            onChange={(e) => setBranding({...branding, motto: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-inner"
                                            placeholder="Precision in Care..."
                                        />
                                    </label>
                                </div>

                                <div className="flex flex-col md:flex-row gap-6 pt-4">
                                    <div className="flex-1">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block italic">Signature Color</span>
                                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-3 shadow-inner">
                                            <div className="relative group/picker">
                                                <input 
                                                    type="color" 
                                                    value={branding.primaryColor}
                                                    onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
                                                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-none focus:outline-none"
                                                />
                                                <div className="absolute inset-0 rounded-xl pointer-events-none border-2 border-white/20 shadow-lg"></div>
                                            </div>
                                            <span className="text-xs font-black uppercase text-slate-500 tracking-widest italic">{branding.primaryColor}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex items-end justify-end">
                                        <button className="bg-indigo-600 text-white px-10 py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] italic hover:scale-105 transition-all shadow-2xl shadow-indigo-600/30 ring-4 ring-indigo-500/20">
                                            Commit DNA
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/30 p-12 rounded-[3.5rem] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center space-y-8 text-center group cursor-pointer hover:border-indigo-500/50 hover:bg-slate-100 dark:hover:bg-white/5 transition-all relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent pointer-events-none"></div>
                                <div className="w-28 h-28 rounded-4xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform relative z-10">
                                    <PhotoIcon className="w-12 h-12 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-sm font-black uppercase tracking-[0.2em] italic">Institutional Emblem</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-3 tracking-widest max-w-[200px] leading-relaxed italic">Quantum-ready SVG or high-fidelity PNG preferred (Max 10MB)</p>
                                </div>
                                <div className="px-6 py-2 bg-slate-200 dark:bg-white/10 rounded-full text-[8px] font-bold text-slate-500 uppercase tracking-widest relative z-10">DRAG & DROP SECURE NODE</div>
                            </div>
                        </div>
                    </div>
                );
            case 'staff':
                return (
                    <div className="space-y-10 animate-fade-in pb-20">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.4em] italic text-indigo-600">Clinical Registry</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">Managing {3} certified healthcare providers</p>
                            </div>
                            <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic hover:scale-105 transition-all shadow-xl">
                                <PlusIcon className="w-4 h-4 inline mr-2" /> Add Practitioner
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {(demoStaff || [
                                { name: 'Dr. John Smith', role: 'Doctor', specialty: 'General Surgeon', id: 'D001', photo: 'JS', color: 'bg-indigo-500' },
                                { name: 'Jane Wilson', role: 'Nurse', specialty: 'ICU Specialist', id: 'N042', photo: 'JW', color: 'bg-emerald-500' },
                                { name: 'Dr. Sarah Omondi', role: 'Doctor', specialty: 'Dentist', id: 'D015', photo: 'SO', color: 'bg-rose-500' }
                            ]).map((staff: any, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900/50 p-8 rounded-[3rem] border border-slate-200 dark:border-white/5 flex flex-col space-y-6 group hover:shadow-2xl transition-all relative overflow-hidden cursor-pointer">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.03] blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/[0.06]"></div>
                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className={`w-16 h-16 ${staff.color || 'bg-indigo-500'} bg-opacity-10 dark:bg-opacity-20 rounded-[1.5rem] flex items-center justify-center text-current font-black text-lg tracking-tighter group-hover:rotate-6 transition-transform shadow-inner border border-white/10`}>
                                            <span className={(staff.color || 'bg-indigo-500').replace('bg-', 'text-')}>{staff.photo || (staff.name ? staff.name.split(' ').map((n: string) => n[0]).join('') : '??')}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-lg font-black italic tracking-tighter group-hover:text-indigo-600 transition-colors">{staff.name}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{staff.role} • {staff.specialty}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pt-2 relative z-10">
                                        <div className="px-4 py-1.5 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            ID: <span className="text-slate-600 dark:text-slate-200">{staff.id}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-slate-400 hover:text-indigo-500 hover:scale-110 transition-all">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                             <button className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-slate-400 hover:text-rose-500 hover:scale-110 transition-all">
                                                <SettingsIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'clinic':
                return (
                    <div className="bg-white dark:bg-slate-900/50 p-12 rounded-[4rem] border border-slate-200 dark:border-white/5 space-y-12 animate-fade-in relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/[0.02] blur-[150px] rounded-full -mr-48 -mt-48 pointer-events-none transition-all group-hover:bg-emerald-500/[0.05]"></div>
                        
                        <div className="flex items-center gap-8 relative z-10">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500 shadow-2xl shadow-emerald-500/10 group-hover:rotate-[15deg] transition-all">
                                <GlobeAltIcon className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter italic">Clinical Architecture</h3>
                                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Infrastructure Mapping: Departments, Theaters & Point of Care</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                            {[
                                { dept: 'General OPD', rooms: 12, head: 'Dr. Smith', color: 'indigo' },
                                { dept: 'Dental Wing', rooms: 4, head: 'Dr. Omondi', color: 'rose' },
                                { dept: 'Emergency', rooms: 8, head: 'Triage Lead', color: 'amber' },
                                { dept: 'Ophthalmology', rooms: 3, head: 'Dr. Mike', color: 'sky' }
                            ].map((d, i) => (
                                <div key={i} className="p-8 bg-slate-50 dark:bg-white/5 rounded-[3rem] border border-slate-100 dark:border-white/5 space-y-6 hover:shadow-xl transition-all cursor-pointer group/card active:scale-95">
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tight italic group-hover/card:text-indigo-500 transition-colors">{d.dept}</p>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">{d.rooms} Operational Nodes</p>
                                    </div>
                                    <div className="h-px w-full bg-slate-200 dark:bg-white/10"></div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] italic text-${d.color}-500 underline underline-offset-4 decoration-2`}>{d.head}</p>
                                        <SettingsIcon className="w-4 h-4 text-slate-300 group-hover/card:rotate-90 transition-transform" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-12 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-10">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter italic"><span className="text-indigo-600 block text-xs tracking-[0.4em] mb-2 underline underline-offset-4 decoration-4">Nexus Engine</span> System <span className="text-indigo-600">Core</span></h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-3 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-lg inline-block border border-slate-100 dark:border-white/5 italic">HIS Global Configuration & Operational DNA Hub</p>
                </div>
            </div>

            {/* Premium Tab Navigation */}
            <div className="flex flex-wrap gap-4 p-2 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/5 w-fit shadow-inner">
                {[
                    { id: 'branding', label: 'Identity & DNA', icon: SparklesIcon },
                    { id: 'staff', label: 'Staff Registry', icon: UsersIcon },
                    { id: 'clinic', label: 'Clinic Setup', icon: SettingsIcon },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as ConfigTab)}
                        className={`flex items-center gap-4 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic ${
                            activeTab === tab.id 
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xl shadow-indigo-500/10 ring-1 ring-slate-100 dark:ring-white/10' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 transition-transform ${activeTab === tab.id ? 'scale-125' : ''}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <main className="min-h-[500px]">
                {renderTab()}
            </main>
        </div>
    );
};
