import React, { useState } from 'react';
import { PlusIcon } from '../icons/PlusIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { BellIcon } from '../icons/BellIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { MegaphoneIcon, SignalIcon } from '../his/HealthIcons';
import { TruckIcon, CalendarDaysIcon, AcademicCapIcon } from '../icons';

interface Broadcast {
    id: string;
    title: string;
    message: string;
    type: 'Lesson' | 'Fleet' | 'Emergency' | 'Info';
    priority: 'Critical' | 'High' | 'Medium';
    timestamp: string;
}

interface DSBroadcasterViewProps {
    onNewBroadcast?: () => void;
}

const MOCK_MESSAGES: Broadcast[] = [
    { id: 'b1', title: 'Lesson Commencement', message: 'Practical Lesson #DS-042 (Class C1) starting at Training Ground A', type: 'Lesson', priority: 'Medium', timestamp: '2 mins ago' },
    { id: 'b2', title: 'Fleet Alert', message: 'Vehicle KCC 789Y reported mechanical issue on Thika Road. Instructor support dispatched.', type: 'Fleet', priority: 'High', timestamp: '15 mins ago' },
    { id: 'b3', title: 'Emergency Drill', message: 'Safety evacuation drill starting in 10 mins. All students to gather at assembly point.', type: 'Emergency', priority: 'Critical', timestamp: '5 mins ago' },
    { id: 'b4', title: 'Theory Session', message: 'Defensive Driving theory session for Group B starts in 20 mins at Room 2.', type: 'Info', priority: 'Medium', timestamp: '1 hour ago' },
];

const MOCK_SENT_MESSAGES: Broadcast[] = [
    { id: 's1', title: 'Weather Advisory', message: 'Heavy rain expected. All practical lessons to proceed with caution.', type: 'Info', priority: 'High', timestamp: '2 hours ago' },
    { id: 's2', title: 'System Maintenance', message: 'Student portal will be down for maintenance from midnight to 2 AM.', type: 'Info', priority: 'Medium', timestamp: '1 day ago' },
    { id: 's3', title: 'Instructor Meeting', message: 'Weekly briefing at 8 AM tomorrow in the main hall.', type: 'Info', priority: 'Medium', timestamp: '2 days ago' },
];

export const DSBroadcasterView: React.FC<DSBroadcasterViewProps> = ({ onNewBroadcast }) => {
    const [activeTab, setActiveTab] = useState<'Live Feed' | 'Sent' | 'Outbox'>('Live Feed');

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Institutional <span className="text-indigo-600">Broadcaster</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Unified paging & school-wide priority messaging system</p>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-4 w-full md:w-auto">
                    <button 
                        onClick={onNewBroadcast}
                        className="flex-1 md:flex-none bg-rose-600 text-white px-6 md:px-8 py-3 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-rose-600/20"
                    >
                        <ExclamationTriangleIcon className="w-5 h-5" /> Trigger Alert
                    </button>
                    <button 
                        onClick={onNewBroadcast}
                        className="flex-1 md:flex-none bg-indigo-600 text-white px-6 md:px-8 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-600/20"
                    >
                        <PlusIcon className="w-4 h-4" /> New Broadcast
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Visual Signal Mixer / Live Feed */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 text-slate-900 dark:text-white">
                                <SignalIcon className="w-6 h-6 text-indigo-600 animate-pulse" /> Live <span className="text-indigo-600">Transmissions</span>
                            </h3>
                            <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100">PA System: Online</span>
                        </div>

                        <div className="flex gap-4 mb-8 border-b border-slate-100 dark:border-slate-800 pb-4 overflow-x-auto scrollbar-hide">
                            {['Live Feed', 'Sent', 'Outbox'].map(tab => (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                                        activeTab === tab 
                                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900/50' 
                                        : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {activeTab === 'Outbox' ? (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        <MegaphoneIcon className="w-8 h-8 opacity-50" />
                                    </div>
                                    <h4 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Outbox is Empty</h4>
                                    <p className="text-xs text-slate-400 mt-2">All scheduled and queued broadcasts have been dispatched.</p>
                                </div>
                            ) : (
                                (activeTab === 'Sent' ? MOCK_SENT_MESSAGES : MOCK_MESSAGES).map((msg, i) => (
                                    <div key={i} className={`p-6 rounded-[2rem] border transition-all ${
                                        msg.type === 'Emergency' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                                    }`}>
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                            <div className="flex gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                                    msg.type === 'Emergency' ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-600'
                                                }`}>
                                                    {msg.type === 'Lesson' ? <CalendarDaysIcon className="w-6 h-6" /> : 
                                                     msg.type === 'Fleet' ? <TruckIcon className="w-6 h-6" /> : 
                                                     msg.type === 'Info' ? <AcademicCapIcon className="w-6 h-6" /> :
                                                     <MegaphoneIcon className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">{msg.title}</h4>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{msg.timestamp}</p>
                                                </div>
                                            </div>
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                msg.priority === 'Critical' ? 'bg-rose-600 text-white' : 
                                                msg.priority === 'High' ? 'bg-amber-100 text-amber-600' :
                                                'bg-white/50 text-slate-400'
                                            }`}>
                                                {msg.priority} Priority
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300 pl-0 sm:pl-16">{msg.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Control Hub */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic text-slate-900 dark:text-white">Transmission <span className="text-indigo-600">Nodes</span></h3>
                        
                        <div className="space-y-6">
                            {[
                                { label: 'Main Office PA', status: 'Casting', icon: MegaphoneIcon },
                                { label: 'Theory Room 1', status: 'Silent', icon: AcademicCapIcon },
                                { label: 'Theory Room 2', status: 'Casting', icon: AcademicCapIcon },
                                { label: 'Training Grounds', status: 'Casting', icon: SignalIcon },
                                { label: 'Instructor Mobile', status: 'Silent', icon: UsersIcon },
                                { label: 'Student Portal', status: 'Casting', icon: BellIcon }
                            ].map((node, i) => (
                                <div key={i} className="flex justify-between items-center group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl transition-all">
                                    <div className="flex items-center gap-3">
                                        <node.icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{node.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${node.status === 'Casting' ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {node.status}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full ${node.status === 'Casting' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 h-px bg-slate-100 dark:bg-slate-800"></div>

                        <div className="mt-8 flex flex-col items-center gap-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Broadcaster active</p>
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                                <MegaphoneIcon className="w-8 h-8 text-indigo-600" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
