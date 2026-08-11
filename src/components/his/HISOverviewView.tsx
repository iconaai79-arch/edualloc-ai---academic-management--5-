import React, { useState } from 'react';
import { HISPatient } from '../../types';
import { HeartIcon, ActivityIcon, BuildingOfficeIcon, ClockIcon } from './HealthIcons';
import { UsersIcon } from '../icons/UsersIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { ShieldIcon } from '../icons/ShieldIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

interface HISOverviewViewProps {
    institutionId?: string;
    userName?: string;
    activeRole?: string;
    patients?: HISPatient[];
}

export function HISOverviewView({ institutionId, userName, activeRole, patients = [] }: HISOverviewViewProps) {
    const [activeSubTab, setActiveSubTab] = useState<'summary' | 'departments' | 'roster' | 'occupancy'>('summary');

    return (
        <div className="space-y-8 text-slate-900 dark:text-white animate-fade-in p-2 md:p-6">

            {/* ── TOP HEADER BANNER ── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/20 shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/30 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Hospital Operations
                        </span>
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white italic">
                        Quantum HIS <span className="text-indigo-400">Executive Overview</span>
                    </h1>
                    <p className="text-xs text-indigo-200/70 font-bold uppercase tracking-wider mt-1">
                        High-level clinical analytics, departmental performance, staff duty roster &amp; bed utilization
                    </p>
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="text-left lg:text-right bg-white/5 border border-white/10 p-4 rounded-2xl">
                        <p className="text-2xl font-black text-white font-mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            {/* ── RICH HORIZONTAL SUB-MENU BAR ── */}
            <div className="flex items-center gap-2 p-2 bg-slate-900/60 border border-white/10 rounded-[2.5rem] overflow-x-auto no-scrollbar shadow-2xl">
                <button 
                    onClick={() => setActiveSubTab('summary')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeSubTab === 'summary' 
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <ChartBarIcon className="w-4 h-4" />
                    <span>Executive Summary</span>
                </button>

                <button 
                    onClick={() => setActiveSubTab('departments')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeSubTab === 'departments' 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <BuildingOfficeIcon className="w-4 h-4" />
                    <span>Department Operations</span>
                </button>

                <button 
                    onClick={() => setActiveSubTab('roster')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeSubTab === 'roster' 
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <UsersIcon className="w-4 h-4" />
                    <span>Clinical Duty Roster</span>
                </button>

                <button 
                    onClick={() => setActiveSubTab('occupancy')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeSubTab === 'occupancy' 
                            ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <ActivityIcon className="w-4 h-4" />
                    <span>Bed Occupancy &amp; Ward Capacity</span>
                </button>
            </div>

            {/* ── SUB-TAB 1: EXECUTIVE SUMMARY ── */}
            {activeSubTab === 'summary' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-6 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20">
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-400 mb-1">Total Registered Patients</p>
                            <p className="text-4xl font-black text-indigo-400">{patients.length > 0 ? patients.length : 142}</p>
                            <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase">+12 new registrations this week</p>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400 mb-1">OPD Consultations Today</p>
                            <p className="text-4xl font-black text-emerald-400">38</p>
                            <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase">Avg consultation time: 14 mins</p>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-rose-500/10 border border-rose-500/20">
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-rose-400 mb-1">Daily Revenue Invoiced</p>
                            <p className="text-4xl font-black text-rose-400">KES 148,500</p>
                            <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase">M-Pesa + Cash + Insurance Claims</p>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-purple-500/10 border border-purple-500/20">
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-purple-400 mb-1">Active Bed Occupancy</p>
                            <p className="text-4xl font-black text-purple-400">76%</p>
                            <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase">19 of 25 inpatient beds occupied</p>
                        </div>
                    </div>

                    {/* Quick Activity Stream */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 space-y-4">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight italic">
                                🏥 Real-Time Clinical <span className="text-indigo-400">Activity Stream</span>
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { time: '10 mins ago', text: 'Dr. John Smith completed OPD consultation for Jane Wanjiku', dept: 'OPD Clinic 1' },
                                    { time: '25 mins ago', text: 'Lancet Reference Lab returned Full Blood Count results for David Ochieng', dept: 'Laboratory' },
                                    { time: '40 mins ago', text: 'M-Pesa payment of KES 4,500 confirmed for Invoice #INV-2025-004', dept: 'Finance & Billing' },
                                    { time: '1 hr ago', text: 'Inpatient admission recorded in Male Surgical Ward - Bed 04', dept: 'Inpatient Ward' },
                                ].map((act, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex justify-between items-center text-xs">
                                        <div>
                                            <p className="font-bold text-white uppercase">{act.text}</p>
                                            <span className="text-[9px] text-indigo-400 font-black uppercase">{act.dept}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">{act.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 space-y-4">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight italic">
                                🛡️ Insurance Claims <span className="text-rose-400">Outstanding Summary</span>
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { insurer: 'SHA (Social Health Authority)', amount: 128000, count: 14, color: 'bg-rose-500' },
                                    { insurer: 'Jubilee Health Insurance', amount: 45000, count: 8, color: 'bg-indigo-500' },
                                    { insurer: 'AAR Health Insurance', amount: 38000, count: 5, color: 'bg-emerald-500' },
                                ].map((ins, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                                        <div className="flex justify-between items-center text-xs font-bold text-white uppercase">
                                            <span>{ins.insurer}</span>
                                            <span className="font-mono text-rose-400">KES {ins.amount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                                            <span>{ins.count} Pending Claims</span>
                                            <span>Batch Submitted</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SUB-TAB 2: DEPARTMENT OPERATIONS ── */}
            {activeSubTab === 'departments' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { dept: 'OPD Reception & Triage', icon: <UsersIcon className="w-6 h-6 text-indigo-400" />, status: 'Normal Flow', waiting: 4, handled: 42, color: 'border-indigo-500/30' },
                            { dept: 'Doctor Consultations', icon: <ActivityIcon className="w-6 h-6 text-emerald-400" />, status: '3 Rooms Active', waiting: 2, handled: 38, color: 'border-emerald-500/30' },
                            { dept: 'Laboratory & Diagnostics', icon: <BeakerIcon className="w-6 h-6 text-blue-400" />, status: 'Processing Samples', waiting: 5, handled: 29, color: 'border-blue-500/30' },
                            { dept: 'Pharmacy Store', icon: <BeakerIcon className="w-6 h-6 text-purple-400" />, status: 'Formulary Stocked', waiting: 3, handled: 51, color: 'border-purple-500/30' },
                            { dept: 'Dental & Eye Clinic', icon: <HeartIcon className="w-6 h-6 text-pink-400" />, status: 'Specialist On Duty', waiting: 1, handled: 12, color: 'border-pink-500/30' },
                            { dept: 'Inpatient Admissions', icon: <BuildingOfficeIcon className="w-6 h-6 text-rose-400" />, status: '19 Beds Occupied', waiting: 0, handled: 19, color: 'border-rose-500/30' },
                        ].map((d, i) => (
                            <div key={i} className={`p-6 rounded-[2.5rem] bg-slate-900 border ${d.color} space-y-4 shadow-xl`}>
                                <div className="flex justify-between items-center">
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10">{d.icon}</div>
                                    <span className="px-3 py-1 bg-white/10 text-white rounded-full text-[9px] font-black uppercase tracking-widest">{d.status}</span>
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-white uppercase tracking-tight">{d.dept}</h4>
                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase mt-3">
                                        <span>Currently Waiting: <strong className="text-white">{d.waiting}</strong></span>
                                        <span>Handled Today: <strong className="text-white">{d.handled}</strong></span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── SUB-TAB 3: CLINICAL DUTY ROSTER ── */}
            {activeSubTab === 'roster' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                        <h3 className="text-lg font-black text-white uppercase tracking-tight italic">
                            👨‍⚕️ On-Duty Practitioners &amp; <span className="text-purple-400">Room Assignments</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { name: 'Dr. John Smith', role: 'General Surgeon', room: 'Consultation Room 1', status: 'In Consultation', avatar: 'JS', color: 'bg-indigo-600' },
                                { name: 'Dr. Sarah Omondi', role: 'Paediatrician', room: 'Consultation Room 2', status: 'In Consultation', avatar: 'SO', color: 'bg-emerald-600' },
                                { name: 'Dr. Peter Kamau', role: 'Medical Officer', room: 'Consultation Room 3', status: 'Available', avatar: 'PK', color: 'bg-purple-600' },
                                { name: 'Nurse Grace Njeri', role: 'Triage & Vitals Lead', room: 'Triage Station A', status: 'Active Duty', avatar: 'GN', color: 'bg-blue-600' },
                                { name: 'Dr. Amina Hassan', role: 'Dentist', room: 'Dental Suite 1', status: 'Active Duty', avatar: 'AH', color: 'bg-pink-600' },
                            ].map((doc, i) => (
                                <div key={i} className="p-6 rounded-[2rem] bg-black/40 border border-white/10 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl ${doc.color} text-white font-black flex items-center justify-center text-sm shadow-md`}>
                                        {doc.avatar}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white uppercase tracking-tight">{doc.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{doc.role} • {doc.room}</p>
                                        <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase mt-2 inline-block">
                                            ● {doc.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── SUB-TAB 4: BED OCCUPANCY & WARD CAPACITY ── */}
            {activeSubTab === 'occupancy' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                        <h3 className="text-lg font-black text-white uppercase tracking-tight italic">
                            📈 Ward Capacity &amp; <span className="text-rose-400">Inpatient Bed Utilization</span>
                        </h3>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {[
                                { ward: 'Intensive Care Unit (ICU)', occupied: 3, capacity: 4, pct: 75, color: 'bg-rose-500' },
                                { ward: 'Male Medical & Surgical Ward', occupied: 8, capacity: 10, pct: 80, color: 'bg-indigo-500' },
                                { ward: 'Female Medical & Surgical Ward', occupied: 5, capacity: 6, pct: 83, color: 'bg-emerald-500' },
                                { ward: 'Paediatric Ward', occupied: 3, capacity: 5, pct: 60, color: 'bg-purple-500' },
                            ].map((w, i) => (
                                <div key={i} className="p-6 rounded-[2rem] bg-black/40 border border-white/10 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-black text-white uppercase tracking-tight">{w.ward}</h4>
                                        <span className="text-xs font-mono font-black text-emerald-400">{w.occupied} / {w.capacity} Beds ({w.pct}%)</span>
                                    </div>
                                    <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                        <div className={`h-full ${w.color} rounded-full transition-all duration-1000`} style={{ width: `${w.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default HISOverviewView;
