import React, { useState } from 'react';
import { 
    ChartBarIcon, 
    ChartPieIcon, 
    TrendingUpIcon, 
    CurrencyIcon, 
    DocumentTextIcon,
    UsersIcon,
    ArrowPathIcon,
    SearchIcon,
    PlusIcon
} from '../icons/index';
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
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Today Revenue', value: 'KES 142,500', trend: '+12%', color: 'text-emerald-400', icon: CurrencyIcon },
                    { label: 'Pending SHA Claims', value: '84', trend: 'Active', color: 'text-indigo-400', icon: ChartLineIcon },
                    { label: 'Aged Receivables', value: 'KES 2.4M', trend: 'Critical', color: 'text-rose-400', icon: TrendingUpIcon },
                    { label: 'Avg Collection Time', value: '14 Days', trend: '-2 Days', color: 'text-sky-400', icon: ArrowPathIcon },
                ].map((stat, i) => (
                    <div key={i} className="glass-morphism p-6 rounded-3xl border border-white/5 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-white/5 rounded-xl">
                                <stat.icon className="w-5 h-5 text-slate-400" />
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${stat.color}`}>{stat.trend}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black mt-1 tracking-tight">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-morphism p-10 rounded-[3rem] border border-white/5 relative overflow-hidden h-[400px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest">Revenue Cycle Velocity</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">7-Day trend analysis</p>
                        </div>
                        <div className="flex gap-2 text-[9px] font-black uppercase">
                            <span className="text-indigo-400 border-b border-indigo-400">Cash</span>
                            <span className="text-slate-500">Corporate</span>
                            <span className="text-slate-500">SHA</span>
                        </div>
                    </div>
                    {/* Mock Chart Visualization */}
                    <div className="relative h-48 flex items-end gap-2 px-4">
                        {[40, 65, 45, 90, 70, 85, 95].map((h, i) => (
                            <div key={i} className="flex-1 space-y-2 group cursor-pointer">
                                <div className="relative w-full bg-white/5 rounded-t-xl overflow-hidden hover:bg-white/10 transition-all" style={{ height: `${h}%` }}>
                                    <div className="absolute bottom-0 left-0 w-full bg-indigo-500 opacity-20 group-hover:opacity-40 transition-all h-full"></div>
                                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-indigo-500 to-transparent h-12"></div>
                                </div>
                                <p className="text-[8px] text-center font-black text-slate-500 uppercase">Day {i+1}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest mb-6">Departmental Splitting</h3>
                        <div className="space-y-6">
                            {[
                                { dept: 'General OPD', value: '42%', color: 'bg-indigo-500' },
                                { dept: 'Dental Wing', value: '28%', color: 'bg-emerald-500' },
                                { dept: 'Ophthalmology', value: '18%', color: 'bg-rose-500' },
                                { dept: 'Pharmacy', value: '12%', color: 'bg-amber-500' }
                            ].map((d, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                                        <span>{d.dept}</span>
                                        <span className="text-slate-500">{d.value}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className={`h-full ${d.color} rounded-full`} style={{ width: d.value }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderClinicalReport = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-morphism p-10 rounded-[3rem] border border-white/5">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400">
                            <FireIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest">Disease Prevalence</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Disease pattern heatmap</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {[
                            { name: 'Respiratory Infections', count: 420, risk: 'High' },
                            { name: 'Malaria (Confirmed)', count: 280, risk: 'Medium' },
                            { name: 'HTN (Uncontrolled)', count: 185, risk: 'Low' },
                            { name: 'Enteric Fever', count: 92, risk: 'Low' }
                        ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <p className="text-xs font-bold">{item.name}</p>
                                    <p className="text-[9px] text-slate-500 font-black uppercase mt-0.5">{item.count} Global Cases</p>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                                    item.risk === 'High' ? 'bg-rose-500/20 text-rose-400' : 
                                    item.risk === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                                }`}>{item.risk} Risk</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 flex flex-col justify-center text-center space-y-6">
                    <div className="relative inline-block mx-auto">
                        <svg className="w-48 h-48 -rotate-90">
                            <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                            <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="552.92" strokeDashoffset="110.58" className="text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-4xl font-black">78%</p>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Recovery Rate</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-tight">Clinical Outcomes Score</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Based on patient discharge satisfaction</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderOperationalReport = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="glass-morphism p-10 rounded-[3rem] border border-white/5">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                            <ActivityIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest">Efficiency Matrix</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Throughput and resource management</p>
                        </div>
                    </div>
                    <button className="bg-white/5 border border-white/10 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">
                        <PlusIcon className="w-3 h-3 inline mr-2" /> Export to CSV
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Avg Wait (OPD)', value: '18m', score: 'Excellent', color: 'text-emerald-400' },
                        { label: 'Bed Utilization', value: '92%', score: 'High Load', color: 'text-rose-400' },
                        { label: 'Staff in Duty', value: '14/15', score: 'Optimal', color: 'text-emerald-400' },
                        { label: 'System Uptime', value: '99.9%', score: 'Registry Link', color: 'text-sky-400' },
                    ].map((m, i) => (
                        <div key={i} className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{m.label}</p>
                            <p className="text-3xl font-black">{m.value}</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full bg-current ${m.color}`}></div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${m.color}`}>{m.score}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in-up space-y-10">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-indigo-400">Clinical <span className="text-white">Intelligence</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Business Insights & Advanced Analytics Hub</p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-white text-slate-950 px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-white/5">
                        <DocumentTextIcon className="w-4 h-4" /> Download PDF Report
                    </button>
                </div>
            </div>

            <div className="flex gap-4 border-b border-white/5 pb-4">
                {[
                    { id: 'financial', label: 'Financial Velocity', icon: CurrencyIcon },
                    { id: 'clinical', label: 'Clinical Quality', icon: HeartIcon },
                    { id: 'operational', label: 'Operational Flow', icon: ActivityIcon },
                    { id: 'compliance', label: 'Compliance Audit', icon: DocumentTextIcon },
                ].filter(tab => availableTabs.includes(tab.id as ReportTab)).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as ReportTab)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === tab.id 
                            ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-500/30 ring-2 ring-indigo-400/20' 
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <main className="min-h-[500px]">
                {activeTab === 'financial' && renderFinancialReport()}
                {activeTab === 'clinical' && renderClinicalReport()}
                {activeTab === 'operational' && renderOperationalReport()}
                {activeTab === 'compliance' && (
                    <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                            <DocumentTextIcon className="w-8 h-8 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-sm font-black uppercase tracking-tight">Audit Logs Secured</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Regulatory compliance modules are restricted by privilege level</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
