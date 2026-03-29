import React, { useState, useEffect } from 'react';
import { ChurchSacrament, ChurchMassIntention, ChurchCellGroup } from '../../../types';
import { CrossIcon as Cross } from '../../icons/CrossIcon';
import { UserGroupIcon as Users } from '../../icons/UserGroupIcon';
import { HeartIcon as Heart } from '../../icons/HeartIcon';
import { CalendarDaysIcon as Calendar } from '../../icons/CalendarDaysIcon';
import { PlusIcon as Plus } from '../../icons/PlusIcon';
import { BookOpenIcon as BookOpen } from '../../icons/BookOpenIcon';
import { ClockIcon as Clock } from '../../icons/ClockIcon';
import { DocumentTextIcon as FileText } from '../../icons/DocumentTextIcon';
import { UserPlusIcon as UserPlus } from '../../icons/UserPlusIcon';
import { ShieldCheckIcon as Shield } from '../../icons/ShieldCheckIcon';
import { SparklesIcon as Sparkles } from '../../icons/SparklesIcon';
import { FunnelIcon as Filter } from '../../icons/FunnelIcon';
import { ChevronRightIcon as ChevronRight } from '../../icons/ChevronRightIcon';
import { DownloadIcon as Download } from '../../icons/DownloadIcon';
import { useChurch } from '../ChurchDenominationProvider';
import { apiService } from '../../../services/apiService';

export const CatholicView: React.FC = () => {
    const { currentChurch } = useChurch();
    const [activeTab, setActiveTab] = useState<'sacraments' | 'jumuia' | 'intentions'>('sacraments');
    const [sacraments, setSacraments] = useState<ChurchSacrament[]>([]);
    const [jumuiaGroups, setJumuiaGroups] = useState<ChurchCellGroup[]>([]);
    const [intentions, setIntentions] = useState<ChurchMassIntention[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentChurch?.id) return;
            setIsLoading(true);
            try {
                const [sacRecords, groups, msIntentions] = await Promise.all([
                    apiService.fetchChurchSacraments(currentChurch.id),
                    apiService.fetchChurchCellGroups(currentChurch.id),
                    apiService.fetchChurchMassIntentions(currentChurch.id)
                ]);
                setSacraments(sacRecords);
                setJumuiaGroups(groups);
                setIntentions(msIntentions);
            } catch (error) {
                console.error("Error fetching catholic data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [currentChurch]);

    return (
        <div className="catholic-view animate-in fade-in duration-700">
            {/* Catholic Header */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-10 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-indigo-500/20">
                <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 scale-150">
                    <Cross className="w-80 h-80" />
                </div>
                <div className="p-6 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-inner group hover:bg-white/10 transition-all">
                    <Cross className="w-12 h-12 text-indigo-300 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-grow text-center md:text-left">
                    <h2 className="text-4xl font-black tracking-tighter uppercase leading-none mb-3">Parish Administration</h2>
                    <p className="text-indigo-200/60 text-xs font-bold uppercase tracking-[0.4em]">One • Holy • Catholic • Apostolic</p>
                </div>
                <div className="flex gap-4 bg-white/5 backdrop-blur-md p-3 rounded-[2rem] border border-white/10">
                    <div className="px-6 text-center">
                        <span className="block text-[10px] font-black uppercase text-indigo-400">Jumuia</span>
                        <span className="text-2xl font-black">{jumuiaGroups.length || 14}</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 bg-slate-950/20 p-1.5 rounded-[2rem] w-fit border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                <TabButton 
                    active={activeTab === 'sacraments'} 
                    onClick={() => setActiveTab('sacraments')} 
                    icon={<Heart className="w-4 h-4" />} 
                    label="Sacraments" 
                />
                <TabButton 
                    active={activeTab === 'jumuia'} 
                    onClick={() => setActiveTab('jumuia')} 
                    icon={<Users className="w-4 h-4" />} 
                    label="Jumuia (SCC)" 
                />
                <TabButton 
                    active={activeTab === 'intentions'} 
                    onClick={() => setActiveTab('intentions')} 
                    icon={<Calendar className="w-4 h-4" />} 
                    label="Mass Intentions" 
                />
            </div>

            {/* Tab Content */}
            <div className="tab-content transition-all duration-500">
                {activeTab === 'sacraments' && <SacramentsPanel records={sacraments} />}
                {activeTab === 'jumuia' && <JumuiaPanel groups={jumuiaGroups} />}
                {activeTab === 'intentions' && <IntentionsPanel intentions={intentions} />}
            </div>
        </div>
    );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] transition-all font-black text-[11px] uppercase tracking-widest ${
            active ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xl shadow-indigo-500/10 scale-105 z-10' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800'
        }`}
    >
        {icon}
        {label}
    </button>
);

const SacramentsPanel: React.FC<{ records: ChurchSacrament[] }> = ({ records }) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-10 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Sacramental Ledger</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Official records of the Parish</p>
                </div>
                <button className="flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                    <Plus className="w-4 h-4" />
                    New Record
                </button>
            </div>
            <div className="space-y-4">
                {records.length > 0 ? records.map(record => (
                    <SacramentRow key={record.id} name={record.memberId} type={record.sacramentType} date={new Date(record.date).toLocaleDateString()} status="Confirmed" />
                )) : (
                    <>
                        <SacramentRow name="Dominic Otieno" type="Baptism" date="2024-03-20" status="Confirmed" />
                        <SacramentRow name="Mary Wanjiku" type="First Communion" date="2024-03-15" status="Pending" />
                        <SacramentRow name="Josephat Kamau" type="Confirmation" date="2024-03-10" status="Confirmed" />
                    </>
                )}
            </div>
        </div>
        <div className="space-y-8">
            <div className="bg-slate-900 dark:bg-black rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-32 translate-x-32 transition-transform group-hover:scale-110"></div>
                <BookOpen className="w-12 h-12 text-indigo-400 mb-8" />
                <h3 className="text-2xl font-black tracking-tighter uppercase mb-4">Catechesis</h3>
                <p className="text-slate-400 text-xs mb-8 leading-relaxed">
                    Track students enrolled in First Holy Communion and Confirmation preparation classes. 
                </p>
                <div className="space-y-4 mb-10">
                    <ClassSummary label="F.H.C Class 2024" count={42} />
                    <ClassSummary label="Confirmation 2024" count={28} />
                </div>
                <button className="w-full py-4 bg-indigo-500 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                    Manage Classes
                </button>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-10 shadow-sm transition-all hover:shadow-xl">
                 <Shield className="w-10 h-10 text-emerald-500 mb-6" />
                 <h4 className="text-lg font-black uppercase tracking-tight mb-2 text-slate-900 dark:text-white">Certificates</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">
                    Generate secure, digital-ready sacramental certificates for the faithful.
                 </p>
                 <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    View Templates <ChevronRight className="w-4 h-4" />
                 </button>
            </div>
        </div>
    </div>
);

const ClassSummary: React.FC<{ label: string, count: number }> = ({ label, count }) => (
    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
        <span className="text-slate-300">{label}</span>
        <span className="text-indigo-400 font-black">{count} Enrolled</span>
    </div>
);

const JumuiaPanel: React.FC<{ groups: ChurchCellGroup[] }> = ({ groups }) => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Users className="w-32 h-32" />
             </div>
             <div>
                 <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Small Christian Communities</h3>
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Living witness of the Gospel in our neighborhoods</p>
             </div>
             <button className="flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl active:scale-95">
                 <Plus className="w-4 h-4" />
                 Charter New Jumuia
             </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {groups.length > 0 ? groups.map(group => (
                <JumuiaCard key={group.id} name={group.name} members={group.memberIds?.length || 18} leader={group.leaderId} nextMeeting={group.meetingDay} />
            )) : (
                <>
                    <JumuiaCard name="St. Jude Jumuia" members={18} leader="Mrs. Monica Gakuo" nextMeeting="Every Monday 5:00 PM" />
                    <JumuiaCard name="Holy Spirit Jumuia" members={24} leader="Mr. Peter Ndegwa" nextMeeting="Bi-weekly Tuesdays" />
                    <JumuiaCard name="St. Mary Jumuia" members={15} leader="Francisca Omolo" nextMeeting="Every Thursday 4:00 PM" />
                </>
            )}
            <div className="bg-slate-50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer group">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300 group-hover:scale-110 group-hover:text-indigo-500 transition-all shadow-sm mb-6">
                    <UserPlus className="w-8 h-8" />
                </div>
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Expand Mission</h4>
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold">New Community Proposal</p>
            </div>
        </div>
    </div>
);

const IntentionsPanel: React.FC<{ intentions: ChurchMassIntention[] }> = ({ intentions }) => (
    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
        <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/50 dark:bg-slate-800/20">
            <div>
                <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Mass Intentions Ledger</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Daily Parish Offerings & Petitions</p>
            </div>
            <div className="flex gap-4">
                <button className="p-4 bg-white dark:bg-slate-800 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-indigo-500 transition-all shadow-sm">
                    <Download className="w-5 h-5" />
                </button>
                <button className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                    <Plus className="w-4 h-4" />
                    Book Intention
                </button>
            </div>
        </div>
        <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                    <tr>
                        <th className="px-10 py-6 border-b border-slate-100 dark:border-slate-800">Date</th>
                        <th className="px-10 py-6 border-b border-slate-100 dark:border-slate-800">Intention Details</th>
                        <th className="px-10 py-6 border-b border-slate-100 dark:border-slate-800">Status</th>
                        <th className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800 italic font-medium text-slate-600 dark:text-slate-400">
                    {intentions.length > 0 ? intentions.map(int => (
                         <IntentionRow key={int.id} date={new Date(int.intentionDate).toLocaleDateString()} details={int.intention} status={int.status} amount="N/A" />
                    )) : (
                        <>
                            <IntentionRow date="Mar 20, 2024" details="Thanksgiving for Mercy's Success" status="Booked" amount="KES 1,000" />
                            <IntentionRow date="Mar 21, 2024" details="For the Deceased - Josephat Obiri (1st Anniversary)" status="Celebrated" amount="KES 500" />
                            <IntentionRow date="Mar 22, 2024" details="God's Favour - Business Expansion" status="Booked" amount="KES 2,000" />
                        </>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const IntentionRow: React.FC<{ date: string, details: string, status: string, amount: string }> = ({ date, details, status, amount }) => (
    <tr className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
        <td className="px-10 py-8 border-b border-slate-50 dark:border-slate-800">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-slate-300 group-hover:text-indigo-500 transition-colors">
                    <Clock className="w-4 h-4" />
                </div>
                <span className="text-base font-black text-slate-900 dark:text-white group-hover:translate-x-1 transition-transform">{date}</span>
            </div>
        </td>
        <td className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 text-sm not-italic font-semibold text-slate-700 dark:text-slate-300 max-w-md">{details}</td>
        <td className="px-10 py-8 border-b border-slate-50 dark:border-slate-800">
            <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                status === 'Celebrated' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-500/20' : 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:border-orange-500/20'
            }`}>
                {status}
            </span>
        </td>
        <td className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 text-right">
            <button className="p-3 text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <FileText className="w-5 h-5" />
            </button>
        </td>
    </tr>
);

const SacramentRow: React.FC<{ name: string, type: string, date: string, status: string }> = ({ name, type, date, status }) => (
    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20 shadow-sm hover:shadow-xl">
        <div className="flex items-center gap-6">
            <div className={`p-4 rounded-2xl shadow-sm group-hover:scale-110 transition-transform ${
                type === 'Baptism' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40' : 
                type === 'First Communion' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/40'
            }`}>
                <Sparkles className="w-6 h-6" />
            </div>
            <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2 group-hover:text-indigo-600 transition-colors">{name}</h4>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{type}</span>
                    <span className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{date}</span>
                </div>
            </div>
        </div>
        <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
            status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-500/20' : 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:border-orange-500/20'
        }`}>
            {status}
        </span>
    </div>
);

const JumuiaCard: React.FC<{ name: string, members: number, leader: string, nextMeeting: string }> = ({ name, members, leader, nextMeeting }) => (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-10 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-5 group-hover:scale-125 transition-all">
            <Users className="w-32 h-32" />
        </div>
        <h4 className="text-2xl font-black tracking-tighter uppercase mb-2 text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors uppercase">{name}</h4>
        <p className="text-[11px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-10">{members} Enrolled Families</p>
        
        <div className="space-y-6 mb-10">
            <div className="flex items-center gap-5">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                    <Users className="w-4 h-4" />
                </div>
                <div>
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Chairperson</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{leader}</span>
                </div>
            </div>
            <div className="flex items-center gap-5">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-500 transition-all">
                    <Calendar className="w-4 h-4" />
                </div>
                <div>
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Next Fellowship</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{nextMeeting}</span>
                </div>
            </div>
        </div>

        <button className="w-full py-4 bg-slate-100 dark:bg-slate-800/50 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-inner group-hover:shadow-lg group-hover:shadow-indigo-500/20 active:scale-95">
            View Member List
        </button>
    </div>
);
