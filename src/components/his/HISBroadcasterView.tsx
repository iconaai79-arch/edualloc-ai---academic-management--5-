import React, { useState } from 'react';
import { PlusIcon } from '../icons/PlusIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { BellIcon } from '../icons/BellIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { MegaphoneIcon, SignalIcon } from './HealthIcons';

interface Broadcast {
    id: string;
    title: string;
    message: string;
    type: 'CodeBlue' | 'Info' | 'Staff' | 'Queue';
    priority: 'Critical' | 'High' | 'Medium';
    timestamp: string;
}

const MOCK_MESSAGES: Broadcast[] = [
    { id: 'b1', title: 'Consultation Queue', message: 'Now serving #042 in Optometry Unit', type: 'Queue', priority: 'Medium', timestamp: '2 mins ago' },
    { id: 'b2', title: 'Code Blue', message: 'Emergency response required in ICU Ward Alpha, Bed 04', type: 'CodeBlue', priority: 'Critical', timestamp: '5 mins ago' },
    { id: 'b3', title: 'Staff Meeting', message: 'Clinical review meeting starting in Boardroom in 10 mins', type: 'Staff', priority: 'High', timestamp: '1 hour ago' },
];

export const HISBroadcasterView: React.FC = () => {
    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Signal <span className="text-amber-400">Broadcaster</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Unified communications & emergency paging system</p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-rose-600 text-white px-8 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-rose-900/40">
                        <ExclamationTriangleIcon className="w-5 h-5" /> Trigger Alert
                    </button>
                    <button className="bg-white text-slate-950 px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                        <PlusIcon className="w-4 h-4" /> New Broadcast
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Visual Signal Mixer / Live Feed */}
                <div className="md:col-span-8 space-y-8">
                    <div className="glass-morphism p-10 rounded-[3.5rem] border border-white/5 relative overflow-hidden bg-gradient-to-t from-amber-500/5 to-transparent">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                <SignalIcon className="w-6 h-6 text-amber-400 animate-pulse" /> Live <span className="text-amber-400">Transmissions</span>
                            </h3>
                            <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">PA System: Online</span>
                        </div>

                        <div className="space-y-4">
                            {MOCK_MESSAGES.map((msg, i) => (
                                <div key={i} className={`p-6 rounded-[2rem] border transition-all ${
                                    msg.type === 'CodeBlue' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/5'
                                }`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                                msg.type === 'CodeBlue' ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                            }`}>
                                                {msg.type === 'Queue' ? <UsersIcon className="w-6 h-6" /> : <MegaphoneIcon className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black uppercase tracking-tight">{msg.title}</h4>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{msg.timestamp}</p>
                                            </div>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                            msg.priority === 'Critical' ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400'
                                        }`}>
                                            {msg.priority} Priority
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold opacity-80 pl-16">{msg.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Control Hub */}
                <div className="md:col-span-4 space-y-8">
                    <div className="glass-morphism p-10 rounded-[3.5rem] border border-white/5">
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic">Transmission <span className="text-amber-400">Nodes</span></h3>
                        
                        <div className="space-y-6">
                            {[
                                { label: 'Waiting Lounge A', status: 'Casting' },
                                { label: 'General Wards', status: 'Silent' },
                                { label: 'Consultation East', status: 'Casting' },
                                { label: 'Staff Lounge', status: 'Silent' }
                            ].map((node, i) => (
                                <div key={i} className="flex justify-between items-center group cursor-pointer">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">{node.label}</span>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${node.status === 'Casting' ? 'text-emerald-400' : 'text-slate-600'}`}>
                                            {node.status}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full ${node.status === 'Casting' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-800'}`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 h-px bg-white/5"></div>

                        <div className="mt-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 text-center italic">Institutional Paging active</p>
                            <div className="flex justify-center">
                                <BellIcon className="w-10 h-10 text-amber-500/20" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
