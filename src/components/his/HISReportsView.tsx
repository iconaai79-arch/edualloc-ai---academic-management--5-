import React, { useState } from 'react';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { ChartPieIcon } from '../icons/ChartPieIcon';
import { TrendingUpIcon } from '../icons/TrendingUpIcon';
import { CurrencyIcon } from '../icons/CurrencyIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { ChartLineIcon, FireIcon, HeartIcon, ActivityIcon, CalendarIcon } from './HealthIcons';
import { Role } from '../../types';

type ReportTab = 'financial' | 'clinical' | 'operational' | 'compliance';

interface HISReportsProps {
    activeRole?: Role;
}

export const HISReportsView: React.FC<HISReportsProps> = ({ activeRole }) => {
    // Permission Mapping
    const permissions: Record<ReportTab, Role[]> = {
        financial: ['super_admin', 'his_admin', 'admin', 'property_admin'],
        clinical: ['super_admin', 'his_admin', 'lecturer', 'hod', 'academics_officer'],
        operational: ['super_admin', 'his_admin', 'info_desk', 'admin'],
        compliance: ['super_admin', 'his_admin']
    };

    const availableTabs = (['financial', 'clinical', 'operational', 'compliance'] as ReportTab[]).filter(tab => 
        !activeRole || permissions[tab].includes(activeRole)
    );

    const [activeTab, setActiveTab] = useState<ReportTab>(availableTabs[0] || 'compliance');

    const renderFinancialReport = () => (
        <div className="space-y-10 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Today Revenue', value: 'KES 142,500', trend: '+12%', color: 'text-emerald-500', icon: CurrencyIcon, sub: 'Daily Collection' },
                    { label: 'SHA Claims', value: '84', trend: 'Active', color: 'text-indigo-500', icon: ClockIcon, sub: 'Pending Review' },
                    { label: 'Receivables', value: 'KES 2.4M', trend: 'Critical', color: 'text-rose-500', icon: TrendingUpIcon, sub: 'Aged Debt' },
                    { label: 'Velocity', value: '14 Days', trend: '-2 Days', color: 'text-sky-500', icon: ArrowPathIcon, sub: 'Avg cycle' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-6 group hover:scale-[1.02] transition-all">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl group-hover:rotate-12 transition-transform">
                                <stat.icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/10 ${stat.color}`}>{stat.trend}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{stat.label}</p>
                            <p className="text-2xl font-black mt-1 tracking-tight italic">{stat.value}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 p-12 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 blur-[120px] rounded-full -mr-40 -mt-40 group-hover:scale-125 transition-transform duration-1000"></div>
                    <div className="flex justify-between items-center mb-12 relative z-10">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] italic">Revenue Cycle Velocity</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">7-Day Quantum Trend Analysis</p>
                        </div>
                        <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest">
                            <span className="text-indigo-600 underline underline-offset-8 decoration-2 cursor-pointer">Cash</span>
                            <span className="text-slate-400 cursor-pointer hover:text-indigo-400 transition-colors">Corporate</span>
                            <span className="text-slate-400 cursor-pointer hover:text-indigo-400 transition-colors">SHA</span>
                        </div>
                    </div>
                    
                    <div className="relative h-64 flex items-end gap-4 px-4 relative z-10">
                        {[40, 65, 45, 90, 70, 85, 95].map((h, i) => (
                            <div key={i} className="flex-1 space-y-4 group/bar cursor-pointer">
                                <div className="relative w-full bg-slate-50 dark:bg-white/5 rounded-t-2xl overflow-hidden hover:ring-2 hover:ring-indigo-500/20 transition-all shadow-inner" style={{ height: `${h}%` }}>
                                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-indigo-600 to-indigo-400 opacity-20 group-hover/bar:opacity-60 transition-all h-full scale-y-0 group-hover/bar:scale-y-100 origin-bottom duration-500"></div>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                        <div className="bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded shadow-xl">KES {h}K</div>
                                    </div>
                                </div>
                                <p className="text-[9px] text-center font-black text-slate-400 uppercase tracking-widest italic">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-12 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl flex flex-col justify-between group">
                    <div>
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-sm font-black uppercase tracking-widest italic">Vertical Flow</h3>
                            <ChartPieIcon className="w-5 h-5 text-indigo-500 group-hover:rotate-45 transition-transform" />
                        </div>
                        <div className="space-y-8">
                            {[
                                { dept: 'General OPD', value: '42%', color: 'bg-indigo-500' },
                                { dept: 'Dental Wing', value: '28%', color: 'bg-emerald-500' },
                                { dept: 'Ophthalmology', value: '18%', color: 'bg-rose-500' },
                                { dept: 'Pharmacy', value: '12%', color: 'bg-amber-500' }
                            ].map((d, i) => (
                                <div key={i} className="space-y-3 cursor-pointer group/item">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest italic transition-colors group-hover/item:text-indigo-500">
                                        <span>{d.dept}</span>
                                        <span className="text-slate-400">{d.value}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                                        <div className={`h-full ${d.color} rounded-full shadow-[0_0_10px_currentColor] group-hover/item:scale-x-105 transition-transform origin-left`} style={{ width: d.value }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button className="mt-12 w-full py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic hover:bg-indigo-600 hover:text-white transition-all">Audit Segments</button>
                </div>
            </div>
        </div>
    );

    const renderClinicalReport = () => (
        <div className="space-y-10 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900/50 p-12 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl">
                    <div className="flex items-center gap-6 mb-12">
                        <div className="w-14 h-14 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10 animate-pulse">
                            <FireIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] italic">Morbidity Matrix</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Disease Diffusion Heatmap</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {[
                            { name: 'Respiratory Infections', count: 420, risk: 'High', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
                            { name: 'Malaria (Confirmed)', count: 280, risk: 'Medium', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
                            { name: 'HTN (Uncontrolled)', count: 185, risk: 'Notice', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
                            { name: 'Enteric Fever', count: 92, risk: 'Stable', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }
                        ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 hover:scale-[1.02] transition-all cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-white/20 group-hover:bg-indigo-500 transition-colors"></div>
                                    <div>
                                        <p className="text-sm font-black italic">{item.name}</p>
                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{item.count} Global Observations</p>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border italic ${item.color}`}>{item.risk}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-12 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl flex flex-col items-center justify-center text-center space-y-10 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent pointer-events-none"></div>
                    <div className="relative inline-block">
                        <svg className="w-64 h-64 -rotate-90">
                            <circle cx="128" cy="128" r="110" stroke="currentColor" strokeWidth="20" fill="transparent" className="text-slate-100 dark:text-white/5 transition-all" />
                            <circle cx="128" cy="128" r="110" stroke="currentColor" strokeWidth="20" fill="transparent" strokeDasharray="691" strokeDashoffset="152" className="text-indigo-600 drop-shadow-[0_0_20px_rgba(79,70,229,0.3)] group-hover:stroke-indigo-400 transition-all duration-1000" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-6xl font-black italic tracking-tighter">78<span className="text-2xl text-slate-400">%</span></p>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mt-2 underline underline-offset-8 decoration-2 decoration-indigo-500">Recovery</p>
                        </div>
                    </div>
                    <div className="max-w-xs">
                        <h4 className="text-lg font-black uppercase tracking-tight italic">Quality Benchmark</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 leading-relaxed">Cross-sectional analysis of patient discharge efficacy scores</p>
                    </div>
                    <button className="px-10 py-4 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] italic hover:scale-105 transition-all shadow-xl shadow-indigo-600/20">Full Analytics</button>
                </div>
            </div>
        </div>
    );

    const renderOperationalReport = () => (
        <div className="space-y-10 animate-fade-in">
            <div className="bg-white dark:bg-slate-900/50 p-12 rounded-[4rem] border border-slate-200 dark:border-white/5 shadow-xl relative overflow-hidden group">
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[150px] rounded-full -mr-48 -mb-48 pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-8 mb-16 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-3xl flex items-center justify-center text-indigo-600 border border-slate-100 dark:border-white/10 group-hover:rotate-12 transition-transform shadow-xl">
                            <ActivityIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-widest italic">Operational Flow Control</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Quantum Efficiency Matrix & Wait Logistics</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                         <button className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest italic hover:scale-103 transition-all flex items-center gap-3">
                            <TrendingUpIcon className="w-4 h-4" /> Real-time Feed
                        </button>
                        <button className="px-8 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest italic hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
                            Export Manifest
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                    {[
                        { label: 'OPD Flow Velocity', value: '18m', score: 'Exceptional', color: 'text-emerald-500', desc: 'Avg response time' },
                        { label: 'Bed Saturation', value: '92%', score: 'Critical Load', color: 'text-rose-500', desc: 'Admission ceiling' },
                        { label: 'Presence Sync', value: '14/15', score: 'Nominal', color: 'text-indigo-500', desc: 'Active clinical staff' },
                        { label: 'Registry Link', value: '100%', score: 'Healthy', color: 'text-sky-500', desc: 'External node sync' },
                    ].map((m, i) => (
                        <div key={i} className="p-8 bg-slate-50 dark:bg-white/5 rounded-[3rem] border border-slate-100 dark:border-white/5 space-y-6 hover:shadow-2xl transition-all group/card">
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{m.label}</p>
                                <div className={`w-2 h-2 rounded-full bg-current ${m.color} animate-pulse shadow-[0_0_10px_currentColor]`}></div>
                            </div>
                            <div>
                                <p className="text-4xl font-black italic tracking-tighter">{m.value}</p>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] mt-2 italic underline underline-offset-4 decoration-2 decoration-indigo-500/30">{m.score}</p>
                            </div>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed">{m.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-12 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-10">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter italic"><span className="text-indigo-600 block text-xs tracking-[0.4em] mb-2 underline underline-offset-4 decoration-4">Business Core</span> Health <span className="text-indigo-600">Intelligence</span></h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-3 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-lg inline-block border border-slate-100 dark:border-white/5 italic shadow-inner">Advanced Clinical & Financial Data Analytics Hub</p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-indigo-600 text-white px-10 py-5 rounded-3xl flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-2xl shadow-indigo-600/30 italic ring-4 ring-indigo-500/20">
                        <DocumentTextIcon className="w-5 h-5" /> Dispatch Global PDF
                    </button>
                </div>
            </div>

            {/* Premium Tab Navigation */}
            <div className="flex flex-wrap gap-4 p-2 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/5 w-fit shadow-inner">
                {[
                    { id: 'financial', label: 'Financial Velocity', icon: CurrencyIcon },
                    { id: 'clinical', label: 'Clinical Quality', icon: HeartIcon },
                    { id: 'operational', label: 'Operational Flow', icon: ActivityIcon },
                    { id: 'compliance', label: 'Compliance Audit', icon: DocumentTextIcon },
                ].filter(tab => availableTabs.includes(tab.id as ReportTab)).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as ReportTab)}
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

            <main className="min-h-[600px] relative">
                {activeTab === 'financial' && renderFinancialReport()}
                {activeTab === 'clinical' && renderClinicalReport()}
                {activeTab === 'operational' && renderOperationalReport()}
                {activeTab === 'compliance' && (
                    <div className="flex flex-col items-center justify-center p-20 text-center space-y-8 bg-white dark:bg-slate-900/50 rounded-[4rem] border border-slate-200 dark:border-white/5 shadow-xl">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center shadow-inner relative group">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <DocumentTextIcon className="w-10 h-10 text-slate-400 group-hover:text-indigo-600 transition-colors relative z-10" />
                        </div>
                        <div>
                            <p className="text-2xl font-black uppercase tracking-tight italic">Vault Secured Access</p>
                            <p className="text-[11px] text-slate-500 font-bold uppercase mt-3 tracking-widest max-w-sm leading-relaxed">Compliance & Regulatory Audit modules are protected by hardware-level privilege filters.</p>
                        </div>
                         <button className="px-8 py-4 border-2 border-indigo-600/50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all italic">Initialize Credential Handshake</button>
                    </div>
                )}
            </main>
        </div>
    );
};

