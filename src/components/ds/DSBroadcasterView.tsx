import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon } from '../icons/PlusIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { BellIcon } from '../icons/BellIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { MegaphoneIcon, SignalIcon } from '../his/HealthIcons';
import { TruckIcon, CalendarDaysIcon, AcademicCapIcon } from '../icons';
import { apiService } from '../../services/apiService';
import type { DSLead } from '../../types';

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
    currentInstitution?: any;
    leads?: DSLead[];
    students?: any[];
    instructors?: any[];
}

const MOCK_MESSAGES: Broadcast[] = [
    { id: 'b1', title: 'Lesson Commencement', message: 'Practical Lesson #DS-042 (Class C1) starting at Training Ground A', type: 'Lesson', priority: 'Medium', timestamp: '2 mins ago' },
    { id: 'b2', title: 'Fleet Alert', message: 'Vehicle KCC 789Y reported mechanical issue on Thika Road. Instructor support dispatched.', type: 'Fleet', priority: 'High', timestamp: '15 mins ago' },
    { id: 'b3', title: 'Emergency Drill', message: 'Safety evacuation drill starting in 10 mins. All students to gather at assembly point.', type: 'Emergency', priority: 'Critical', timestamp: '5 mins ago' },
    { id: 'b4', title: 'Theory Session', message: 'Defensive Driving theory session for Group B starts in 20 mins at Room 2.', type: 'Info', priority: 'Medium', timestamp: '1 hour ago' },
];

export const DSBroadcasterView: React.FC<DSBroadcasterViewProps> = ({ onNewBroadcast, currentInstitution, leads = [], students = [], instructors = [] }) => {
    const [activeTab, setActiveTab] = useState<'Live Feed' | 'Sent' | 'Outbox'>('Live Feed');
    const [sentBroadcasts, setSentBroadcasts] = useState<any[]>([]);
    const [loadingSent, setLoadingSent] = useState(false);

    const fetchSentBroadcasts = useCallback(async () => {
        if (!currentInstitution?.id) return;
        setLoadingSent(true);
        try {
            const res = await apiService.fetchModuleRecords<any>('broadcaster_messages', currentInstitution.id, undefined, { limit: 100000 });
            // Sort by created_at descending
            const sorted = (res || []).sort((a: any, b: any) => {
                const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
                const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
                return timeB - timeA;
            });
            setSentBroadcasts(sorted);
        } catch (e) {
            console.error("Failed to load sent broadcaster messages:", e);
        } finally {
            setLoadingSent(false);
        }
    }, [currentInstitution?.id]);

    useEffect(() => {
        if (activeTab === 'Sent') {
            fetchSentBroadcasts();
        }
    }, [activeTab, fetchSentBroadcasts]);

    const getResponseCount = (msgId: string) => {
        return leads.filter(l => 
            l.broadcastId === msgId || 
            (l.notes && l.notes.includes(`[Campaign Ref: ${msgId}]`))
        ).length;
    };

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
                                    className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all ${
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
                            ) : activeTab === 'Sent' ? (
                                loadingSent ? (
                                    <div className="text-center py-12">
                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Fetching Sent Archive...</p>
                                    </div>
                                ) : sentBroadcasts.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <MegaphoneIcon className="w-8 h-8 opacity-50" />
                                        </div>
                                        <h4 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">No Sent Broadcasts</h4>
                                        <p className="text-xs text-slate-400 mt-2">Any promotional messages or priority alerts you send will appear here.</p>
                                    </div>
                                ) : (
                                    sentBroadcasts.map((msg, i) => {
                                        const responses = getResponseCount(msg.id);
                                        const dateStr = new Date(msg.created_at || msg.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                                        return (
                                            <div key={i} className="p-6 rounded-[2rem] border bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:shadow-md transition-all">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                                    <div className="flex gap-4">
                                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-600">
                                                            <MegaphoneIcon className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">{msg.subject || 'Institutional Broadcast'}</h4>
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{dateStr}</span>
                                                                <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md uppercase tracking-wider">{msg.channel}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                                            👥 {msg.recipientsCount || msg.recipients_count || 0} Sent
                                                        </span>
                                                        <span className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                                            📈 {responses} responses
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 pl-0 sm:pl-16 whitespace-pre-line leading-relaxed">{msg.body}</p>
                                            </div>
                                        );
                                    })
                                )
                            ) : (
                                MOCK_MESSAGES.map((msg, i) => (
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

                    <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic text-slate-900 dark:text-white">Audience <span className="text-indigo-600">Reach</span></h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <UsersIcon className="w-5 h-5 text-indigo-600" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Driving Students</p>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-450 mt-0.5">Active Learners</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{students.length}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <UsersIcon className="w-5 h-5 text-purple-600" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Instructors</p>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-450 mt-0.5">Active Trainers</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{instructors.length}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                <div className="flex items-center gap-3">
                                    <SparklesIcon className="w-5 h-5 text-rose-600 animate-pulse" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Enquiry Leads</p>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-450 mt-0.5">Marketing Prospects</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-rose-600 animate-pulse">{leads.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
