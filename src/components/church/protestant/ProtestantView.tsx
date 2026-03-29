import React, { useState, useEffect } from 'react';
import { ChurchCellGroup, ChurchFollowUp } from '../../../types';
import { UserGroupIcon as Users } from '../../icons/UserGroupIcon';
import { UserPlusIcon as UserPlus } from '../../icons/UserPlusIcon';
import { HeartIcon as Heart } from '../../icons/HeartIcon';
import { CalendarDaysIcon as Calendar } from '../../icons/CalendarDaysIcon';
import { PlusIcon as Plus } from '../../icons/PlusIcon';
import { ChatBubbleLeftRightIcon as MessageSquare } from '../../icons/ChatBubbleLeftRightIcon';
import { MusicalNoteIcon as Music } from '../../icons/MusicalNoteIcon';
import { MagnifyingGlassIcon as Search } from '../../icons/MagnifyingGlassIcon';
import { ArrowRightIcon as ArrowRight } from '../../icons/ArrowRightIcon';
import { CheckCircleIcon as CheckCircle } from '../../icons/CheckCircleIcon';
import { ArrowTrendingUpIcon as TrendingUp } from '../../icons/ArrowTrendingUpIcon';
import { FunnelIcon as Filter } from '../../icons/FunnelIcon';
import { MoreVerticalIcon as MoreVertical } from '../../icons/MoreVerticalIcon';
import { ShareIcon as Share2 } from '../../icons/ShareIcon';
import { DownloadIcon as Download } from '../../icons/DownloadIcon';
import { useChurch } from '../ChurchDenominationProvider';
import { apiService } from '../../../services/apiService';

export const ProtestantView: React.FC = () => {
    const { currentChurch } = useChurch();
    const [activeTab, setActiveTab] = useState<'cells' | 'followup' | 'worship'>('cells');
    const [cellGroups, setCellGroups] = useState<ChurchCellGroup[]>([]);
    const [followUps, setFollowUps] = useState<ChurchFollowUp[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentChurch?.id) return;
            setIsLoading(true);
            try {
                const [cells, follows] = await Promise.all([
                    apiService.fetchChurchCellGroups(currentChurch.id),
                    apiService.fetchChurchFollowUps(currentChurch.id)
                ]);
                setCellGroups(cells);
                setFollowUps(follows);
            } catch (error) {
                console.error("Error fetching protestant data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [currentChurch]);

    return (
        <div className="protestant-view animate-in fade-in duration-700">
            {/* Protestant Header */}
            <div className="flex flex-col md:flex-row items-center gap-6 mb-8 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-500/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
                    <Heart className="w-64 h-64" />
                </div>
                <div className="p-6 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-inner">
                    <Heart className="w-10 h-10 text-emerald-300" />
                </div>
                <div className="flex-grow text-center md:text-left">
                    <h2 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2">Worship & Community</h2>
                    <p className="text-emerald-200/80 text-xs font-bold uppercase tracking-[0.3em]">Grace-Driven Fellowship & Evangelism</p>
                </div>
                <div className="flex gap-3 bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                   <div className="text-center px-4">
                       <span className="block text-[10px] font-black uppercase text-emerald-400">Groups</span>
                       <span className="text-xl font-black">{cellGroups.length || 12}</span>
                   </div>
                   <div className="w-[1px] bg-white/10"></div>
                   <div className="text-center px-4">
                       <span className="block text-[10px] font-black uppercase text-emerald-400">Reach</span>
                       <span className="text-xl font-black">{followUps.length || 84}</span>
                   </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm p-1.5 rounded-[2rem] w-fit border border-slate-200/50 dark:border-slate-700/50">
                <TabButton 
                    active={activeTab === 'cells'} 
                    onClick={() => setActiveTab('cells')} 
                    icon={<Users className="w-4 h-4" />} 
                    label="Life Groups" 
                />
                <TabButton 
                    active={activeTab === 'followup'} 
                    onClick={() => setActiveTab('followup')} 
                    icon={<MessageSquare className="w-4 h-4" />} 
                    label="Follow-ups" 
                />
                <TabButton 
                    active={activeTab === 'worship'} 
                    onClick={() => setActiveTab('worship')} 
                    icon={<Music className="w-4 h-4" />} 
                    label="Worship Team" 
                />
            </div>

            {/* Tab Content */}
            <div className="tab-content transition-all duration-500">
                {activeTab === 'cells' && <CellsPanel groups={cellGroups} />}
                {activeTab === 'followup' && <FollowUpPanel followUps={followUps} />}
                {activeTab === 'worship' && <WorshipPanel />}
            </div>
        </div>
    );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] transition-all font-black text-[11px] uppercase tracking-widest ${
            active ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-500/10 scale-105 z-10' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800'
        }`}
    >
        {icon}
        {label}
    </button>
);

const CellsPanel: React.FC<{ groups: ChurchCellGroup[] }> = ({ groups }) => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div>
                <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Life Groups</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Nurturing faith in small, intimate communities</p>
            </div>
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
                <div className="relative flex-grow md:flex-grow-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Filter by location..." className="pl-12 pr-6 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm w-full md:w-64 focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <button className="flex items-center gap-3 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 active:scale-95">
                    <Plus className="w-4 h-4" />
                    Register Group
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {groups.length > 0 ? groups.map(group => (
                <CellCard key={group.id} name={group.name} location={group.location} members={group.memberIds?.length || 0} leader={group.leaderId} day={group.meetingDay} />
            )) : (
                <>
                    <CellCard name="Grace Fellowship" location="Westlands" members={12} leader="David & Sarah" day="Wednesdays 6 PM" />
                    <CellCard name="Zion Youth Cell" location="Campus Annex" members={24} leader="Kevin Mutua" day="Fridays 5:30 PM" />
                    <CellCard name="Victory Home Cell" location="Parklands" members={8} leader="Elder Otieno" day="Tuesdays 7 PM" />
                </>
            )}
        </div>
    </div>
);

const FollowUpPanel: React.FC<{ followUps: ChurchFollowUp[] }> = ({ followUps }) => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Assimilation Pipeline</h3>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">From First Visit to Fully Integrated Member</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-emerald-500 transition-colors">
                            <TrendingUp className="w-4 h-4" />
                        </button>
                        <button className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-emerald-500 transition-colors">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <PipelineStage label="New Visitors" count={followUps.filter(f => f.status === 'pending').length || 12} color="bg-blue-500" trend="+4 this week" />
                    <PipelineStage label="In Contact" count={followUps.filter(f => f.status === 'in_progress').length || 8} color="bg-orange-500" trend="Active" />
                    <PipelineStage label="Integrated" count={followUps.filter(f => f.status === 'converted').length || 42} color="bg-emerald-500" trend="85% Rate" />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Active Reached</h3>
                        <div className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                            Action Required
                        </div>
                    </div>
                    <button className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-2 hover:gap-3 transition-all">
                        View Spreadsheet <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {followUps.length > 0 ? followUps.map(follow => (
                        <FollowUpRow key={follow.id} name={follow.visitorId} date={new Date().toLocaleDateString()} status={follow.status} agent={follow.assignedTo} />
                    )) : (
                        <>
                            <FollowUpRow name="Alice Johnson" date="Mar 24, 2024" status="In Progress" agent="Deacon Paul" />
                            <FollowUpRow name="John Doe" date="Mar 23, 2024" status="In Progress" agent="Sarah W." />
                            <FollowUpRow name="Robert Smith" date="Mar 20, 2024" status="Pending" agent="Mark O." />
                        </>
                    )}
                </div>
            </div>
        </div>
        <div className="space-y-8">
            <div className="bg-slate-900 dark:bg-black rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
                <MessageSquare className="w-10 h-10 text-emerald-400 mb-8" />
                <h4 className="text-xl font-black tracking-tighter uppercase mb-4">Automation Hub</h4>
                <p className="text-slate-400 text-xs leading-relaxed mb-8">
                    Smart-trigger SMS sequences sent to all new visitors. Personalize the journey from first touch.
                </p>
                <div className="space-y-4 mb-10">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-colors cursor-pointer">
                        <span className="block text-[8px] font-black text-emerald-500 uppercase mb-1">Day 1 Sequence</span>
                        <p className="italic text-[10px] text-slate-300">"Welcome to Zion! We loved having you today..."</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-colors cursor-pointer">
                        <span className="block text-[8px] font-black text-blue-500 uppercase mb-1">Day 7 Sequence</span>
                        <p className="italic text-[10px] text-slate-300">"Hey! Just checking in to see if you have any prayer needs..."</p>
                    </div>
                </div>
                <button className="w-full py-4 bg-emerald-500 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                    Configure Flows
                </button>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute bottom-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-20 h-20" />
                </div>
                <h4 className="text-xl font-black tracking-tighter uppercase mb-2">Growth Insights</h4>
                <p className="text-indigo-200 text-xs mb-8">Visitor retention has increased by 14% this quarter.</p>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-8">
                    <div className="w-3/4 h-full bg-white rounded-full shadow-glow"></div>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                    Open Analytics <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
);

const WorshipPanel = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-10 shadow-sm relative">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Service Setlist</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Upcoming Sunday: Main Service</p>
                </div>
                <button className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-emerald-500 transition-colors">
                    <Filter className="w-4 h-4" />
                </button>
            </div>
            <div className="space-y-4">
                <SongRow title="Way Maker" artist="Sinach" bpm={68} key="C" />
                <SongRow title="Goodness of God" artist="Bethel Music" bpm={63} key="Ab" />
                <SongRow title="Gratitude" artist="Brandon Lake" bpm={74} key="E" />
                <SongRow title="Praise" artist="Elevation Worship" bpm={124} key="D" />
            </div>
            <div className="mt-10 flex items-center justify-between pt-8 border-t border-slate-50 dark:border-slate-800">
                <button className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:scale-105 transition-transform">
                    Song Library
                </button>
                <button className="flex items-center gap-3 px-6 py-3 bg-slate-900 dark:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-800 active:scale-95">
                    <Share2 className="w-3.5 h-3.5" />
                    Share with Team
                </button>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-10 shadow-sm">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Team Roster</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Rehearsal & Ministry Schedule</p>
                </div>
                <button className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-emerald-500 transition-colors">
                    <Calendar className="w-4 h-4" />
                </button>
            </div>
            <div className="space-y-10">
                <RehearsalEvent team="Praise & Worship" time="Tomorrow 5:00 PM" location="Main Sanctuary" participants={12} />
                <RehearsalEvent team="Media & Tech" time="Saturday 10:00 AM" location="AVL Booth" participants={6} />
                <RehearsalEvent team="Youth Choir" time="Sunday 7:00 AM" location="Hall B" participants={34} />
            </div>
            <button className="mt-12 w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-3">
                <Plus className="w-4 h-4" />
                Schedule Rehearsal
            </button>
        </div>
    </div>
);

const CellCard: React.FC<{ name: string, location: string, members: number, leader: string, day: string }> = ({ name, location, members, leader, day }) => (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-10 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 group-hover:bg-emerald-500/10 rounded-bl-3xl transition-all">
            <Users className="w-12 h-12" />
        </div>
        <div className="flex justify-between items-start mb-8">
            <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shadow-inner">
                <Users className="w-8 h-8" />
            </div>
            <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border border-slate-100 dark:border-slate-700">{day}</div>
        </div>
        <h4 className="text-2xl font-black tracking-tighter uppercase mb-2 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{name}</h4>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {location}
        </p>
        
        <div className="flex items-center justify-between pt-8 border-t border-slate-50 dark:border-slate-800">
            <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Leader</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{leader}</span>
            </div>
            <div className="text-right">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Members</span>
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{members}</span>
            </div>
        </div>
    </div>
);

const PipelineStage: React.FC<{ label: string, count: number, color: string, trend: string }> = ({ label, count, color, trend }) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${color} shadow-lg shadow-${color}/50 animate-pulse`}></div>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            </div>
            <MoreVertical className="w-4 h-4 text-slate-300" />
        </div>
        <div className="flex items-baseline gap-3">
            <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{count}</div>
            <div className="px-2 py-0.5 bg-white dark:bg-slate-700 rounded-lg text-[8px] font-black text-slate-400 uppercase shadow-sm">{trend}</div>
        </div>
    </div>
);

const FollowUpRow: React.FC<{ name: string, date: string, status: string, agent: string }> = ({ name, date, status, agent }) => (
    <div className="p-8 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group cursor-pointer">
        <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all transform group-hover:rotate-12">
                <UserPlus className="w-6 h-6" />
            </div>
            <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{name}</h4>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Enrolled {date}</p>
            </div>
        </div>
        <div className="flex items-center gap-10">
            <div className="text-right hidden md:block">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Followed By</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{agent}</span>
            </div>
            <div className="w-32">
                 <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                    status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                    status === 'Lost' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                    {status}
                </span>
            </div>
            <button className="p-3 text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors bg-slate-50 dark:bg-slate-800 rounded-2xl group-hover:scale-110 transition-transform">
                <ArrowRight className="w-5 h-5" />
            </button>
        </div>
    </div>
);

const SongRow: React.FC<{ title: string, artist: string, bpm: number, key: string }> = ({ title, artist, bpm, key }) => (
    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl hover:bg-emerald-50 dark:hover:bg-emerald-900/10 border border-transparent hover:border-emerald-100 transition-all cursor-pointer group">
        <div className="flex items-center gap-5">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all">
                <Music className="w-5 h-5" />
            </div>
            <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-600 transition-colors leading-none mb-1">{title}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{artist}</p>
            </div>
        </div>
        <div className="flex items-center gap-10">
            <div className="text-right">
                <span className="block text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Key</span>
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-400">{key}</span>
            </div>
            <div className="text-right">
                <span className="block text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">BPM</span>
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-400">{bpm}</span>
            </div>
            <div className="w-6 h-6 rounded-full border-2 border-slate-100 flex items-center justify-center group-hover:border-emerald-500 transition-colors">
                <CheckCircle className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
            </div>
        </div>
    </div>
);

const RehearsalEvent: React.FC<{ team: string, time: string, location: string, participants: number }> = ({ team, time, location, participants }) => (
    <div className="flex gap-6 group">
        <div className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 group-hover:scale-125 transition-transform"></div>
            <div className="w-0.5 flex-grow bg-slate-100 dark:bg-slate-800 my-2 shadow-inner"></div>
        </div>
        <div className="pb-8">
            <div className="flex items-center gap-3 mb-2">
                <h4 className="text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">{team}</h4>
                <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded text-[8px] font-black text-slate-400 uppercase">{participants} Confirmed</span>
            </div>
            <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-2">{time}</p>
            <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{location}</span>
            </div>
        </div>
    </div>
);
