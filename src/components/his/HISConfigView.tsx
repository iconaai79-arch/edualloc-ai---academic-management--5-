import React, { useState } from 'react';
import { 
    Cog8ToothIcon as SettingsIcon,
    SparklesIcon,
    UsersIcon, 
    PencilIcon,
    PlusIcon,
} from '../icons/index';
import { GlobeAltIcon, PhotoIcon } from './HealthIcons';

type ConfigTab = 'branding' | 'staff' | 'clinic';

export const HISConfigView: React.FC = () => {
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
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 space-y-6">
                                <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Visual Identity</p>
                                
                                <div className="space-y-4">
                                    <label className="block">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Hospital Name</span>
                                        <input 
                                            type="text" 
                                            value={branding.hospitalName}
                                            onChange={(e) => setBranding({...branding, hospitalName: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Hospital Motto</span>
                                        <input 
                                            type="text" 
                                            value={branding.motto}
                                            onChange={(e) => setBranding({...branding, motto: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                        />
                                    </label>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Primary Brand Color</span>
                                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                                            <input 
                                                type="color" 
                                                value={branding.primaryColor}
                                                onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
                                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none"
                                            />
                                            <span className="text-xs font-mono uppercase text-slate-400">{branding.primaryColor}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 text-right pt-8">
                                        <button className="bg-indigo-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                                            Apply Branding
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center space-y-6 text-center group cursor-pointer border-dashed border-white/20 hover:border-indigo-500/50 transition-all">
                                <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                                    <PhotoIcon className="w-10 h-10 text-slate-500 group-hover:text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest">Hospital Emblem</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Upload transparent PNG or SVG (Max 5MB)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'staff':
                return (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Staff & Practitioner Registry</p>
                            <button className="bg-white text-slate-950 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                                <PlusIcon className="w-3 h-3 inline mr-2" /> Add Staff Member
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { name: 'Dr. John Smith', role: 'Doctor', specialty: 'General Surgeon', id: 'D001', photo: 'JS' },
                                { name: 'Jane Wilson', role: 'Nurse', specialty: 'ICU Specialist', id: 'N042', photo: 'JW' },
                                { name: 'Dr. Sarah Omondi', role: 'Doctor', specialty: 'Dentist', id: 'D015', photo: 'SO' }
                            ].map((staff, i) => (
                                <div key={i} className="glass-morphism p-6 rounded-[2rem] border border-white/5 flex items-center gap-4 group hover:bg-white/5 transition-all">
                                    <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 font-black tracking-tighter">
                                        {staff.photo}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-black">{staff.name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{staff.role} • {staff.specialty}</p>
                                    </div>
                                    <button className="p-2 text-slate-500 hover:text-white transition-colors">
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'clinic':
                return (
                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 space-y-10 animate-fade-in">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                                <GlobeAltIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest">Clinic Architecture</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Configure departments, rooms, and facilities</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { dept: 'General OPD', rooms: 12, head: 'Dr. Smith' },
                                { dept: 'Dental Wing', rooms: 4, head: 'Dr. Omondi' },
                                { dept: 'Emergency', rooms: 8, head: 'Triage Lead' },
                                { dept: 'Ophthalmology', rooms: 3, head: 'Dr. Mike' }
                            ].map((d, i) => (
                                <div key={i} className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-2">
                                    <p className="text-xs font-black uppercase tracking-tight">{d.dept}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{d.rooms} Service Points</p>
                                    <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest pt-2 underline underline-offset-4 pointer-events-none">{d.head}</p>
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
        <div className="animate-fade-in-up space-y-10">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-indigo-400">System <span className="text-white">Nexus</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">HIS Core Configuration & Branding Engine</p>
                </div>
            </div>

            <div className="flex gap-4 border-b border-white/5 pb-4">
                {[
                    { id: 'branding', label: 'Identity & Branding', icon: SparklesIcon },
                    { id: 'staff', label: 'Staff Registry', icon: UsersIcon },
                    { id: 'clinic', label: 'Clinic Setup', icon: SettingsIcon },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as ConfigTab)}
                        className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === tab.id 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {renderTab()}
        </div>
    );
};
