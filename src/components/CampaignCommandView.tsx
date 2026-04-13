import React, { useState, useEffect } from 'react';
import { 
    UserGroupIcon, CalendarDaysIcon, ChartBarIcon, 
    SparklesIcon, MapPinIcon, ChatBubbleLeftRightIcon,
    SpeakerWaveIcon, DocumentTextIcon, ArrowPathIcon,
    HeartIcon, ShieldCheckIcon, MegaphoneIcon
} from './icons';
import { CampaignProfile, VoterOutreach, CampaignEvent, User } from '../types';
import { apiService } from '../services/apiService';
import { LeadScoutManager } from './LeadScoutManager';

interface CampaignCommandViewProps {
    user: User;
}

export const CampaignCommandView: React.FC<CampaignCommandViewProps> = ({ user }) => {
    const [profile, setProfile] = useState<CampaignProfile | null>(null);
    const [voters, setVoters] = useState<VoterOutreach[]>([]);
    const [events, setEvents] = useState<CampaignEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingManifesto, setGeneratingManifesto] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'voters' | 'events' | 'manifesto' | 'ai_pulse'>('dashboard');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Load profile
                const profiles = await apiService.fetchModuleRecords<CampaignProfile>('campaign_profiles');
                if (profiles.length > 0) {
                    setProfile(profiles[0]);
                    
                    // Load related data
                    const voterData = await apiService.fetchModuleRecords<VoterOutreach>('voter_outreach', 'ALL', undefined, { campaign_id: profiles[0].id });
                    setVoters(voterData);
                    
                    const eventData = await apiService.fetchModuleRecords<CampaignEvent>('campaign_events', 'ALL', undefined, { campaign_id: profiles[0].id });
                    setEvents(eventData);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const generateManifesto = async () => {
        if (!profile) return;
        setGeneratingManifesto(true);
        try {
            const prompt = `Draft a high-impact political manifesto for ${profile.candidateName} running for ${profile.position} in ${profile.constituencyWard}. 
            Focus on key Kenyan issues: youth employment, healthcare, infrastructure, and transparency. 
            Format with bold sections and a catchy 2027 campaign tagline.`;
            
            const response = await apiService.generateAIContent(prompt);
            const updatedProfile = { ...profile, manifestoAiDraft: response };
            await apiService.saveModuleRecord('campaign_profiles', updatedProfile);
            setProfile(updatedProfile);
        } catch (e) {
            console.error(e);
        } finally {
            setGeneratingManifesto(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><ArrowPathIcon className="w-10 h-10 animate-spin text-indigo-500" /></div>;

    if (!profile) return (
        <div className="flex flex-col items-center justify-center h-screen space-y-6">
            <MegaphoneIcon className="w-20 h-20 text-slate-200" />
            <h1 className="text-2xl font-black uppercase tracking-tighter">Campaign War Room</h1>
            <p className="text-slate-400 font-bold uppercase text-xs">No active campaign profile found for this institution.</p>
            <button className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Setup Campaign Now</button>
        </div>
    );

    const stats = {
        totalVoters: voters.length,
        supporters: voters.filter(v => v.status === 'supporter').length,
        reachPercent: Math.round((voters.length / (profile.targetVoterCount || 1)) * 100),
        upcomingEvents: events.filter(e => new Date(e.eventTime) > new Date()).length
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-930 p-6 space-y-8 animate-fade-in">
            {/* War Room Header */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-indigo-200 dark:shadow-none">
                        {profile.candidateName[0]}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-black text-[10px] uppercase tracking-widest">
                                {profile.position} CANDIDATE
                            </span>
                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full font-black text-[10px] uppercase tracking-widest">
                                {profile.partyName}
                            </span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">{profile.candidateName}</h1>
                        <p className="text-slate-400 font-bold text-xs uppercase flex items-center gap-1 mt-1">
                            <MapPinIcon className="w-4 h-4" /> {profile.constituencyWard} Constituency / Ward
                        </p>
                    </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl relative z-10">
                    {['dashboard', 'voters', 'events', 'manifesto', 'ai_pulse'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setActiveTab(t as any)}
                            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {t.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Dashboard View */}
            {activeTab === 'dashboard' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 relative group overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Target Reach</p>
                                <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.reachPercent}%</p>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
                                    <div className="bg-indigo-600 h-full" style={{ width: `${stats.reachPercent}%` }}></div>
                                </div>
                            </div>
                            <ChartBarIcon className="absolute -bottom-4 -right-4 w-24 h-24 text-slate-50 dark:text-slate-800 rotate-12 group-hover:scale-110 transition-transform" />
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Supporter Base</p>
                            <p className="text-4xl font-black text-emerald-500 tracking-tighter">{stats.supporters.toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase flex items-center gap-1">
                                <HeartIcon className="w-3 h-3 text-red-500" /> +12% this week
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Upcoming Rallies</p>
                            <p className="text-4xl font-black text-orange-500 tracking-tighter">{stats.upcomingEvents}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Scheduled Actions</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
                            <p className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-1">Digital Footprint</p>
                            <p className="text-3xl font-black tracking-tighter">EXCELLENT</p>
                            <div className="mt-3 flex gap-1">
                                {[1,2,3,4,5].map(i => <div key={i} className="w-4 h-1 bg-white/30 rounded-full"></div>)}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* AI Pulse */}
                        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800">
                             <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-indigo-600" /> AI Strategic Analysis (Ward Sentiment)
                             </h3>
                             <div className="space-y-6">
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-l-4 border-emerald-500">
                                    <h4 className="font-black text-xs uppercase text-emerald-600 mb-2 mt-0">Winning Theme identified</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                        "Youth Sports Infrastructure" is trending in **{profile.constituencyWard}**. Doubling down on this in your next townhall will increase secondary-voter favorability by 15%.
                                    </p>
                                </div>
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-l-4 border-indigo-500">
                                    <h4 className="font-black text-xs uppercase text-indigo-600 mb-2 mt-0">Communication Strategy</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                        Sheng outreach via WhatsApp is currently outperforming traditional radio spots 3:1 with voters aged 18-35.
                                    </p>
                                </div>
                             </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
                            <h3 className="text-xl font-black uppercase tracking-tighter mb-6">War Room Tools</h3>
                            <button className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white transition-all rounded-2xl group text-left">
                                <div className="flex items-center gap-3">
                                    <SpeakerWaveIcon className="w-5 h-5" />
                                    <span className="font-black text-[10px] uppercase tracking-widest">Broadcast SMS</span>
                                </div>
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                            <button className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white transition-all rounded-2xl group text-left">
                                <div className="flex items-center gap-3">
                                    <MegaphoneIcon className="w-5 h-5" />
                                    <span className="font-black text-[10px] uppercase tracking-widest">Generate Poster</span>
                                </div>
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                            <button className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-rose-600 hover:text-white transition-all rounded-2xl group text-left">
                                <div className="flex items-center gap-3">
                                    <MapPinIcon className="w-5 h-5" />
                                    <span className="font-black text-[10px] uppercase tracking-widest">Map Outreach</span>
                                </div>
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manifesto View */}
            {activeTab === 'manifesto' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
                        <div className="absolute top-8 right-8">
                            <button 
                                onClick={generateManifesto}
                                disabled={generatingManifesto}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
                            >
                                {generatingManifesto ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                                RE-DRAFT WITH AI
                            </button>
                        </div>

                        <div className="mb-12 border-b border-slate-100 dark:border-slate-800 pb-12 text-center">
                            <p className="text-indigo-600 font-black text-xs uppercase tracking-[0.5em] mb-4">Official 2027 Manifesto Draft</p>
                            <h2 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase mb-2">The Digital Hustle</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Empowering {profile.constituencyWard} Through Innovation</p>
                        </div>

                        <div className="prose dark:prose-invert max-w-none">
                            {profile.manifestoAiDraft ? (
                                <div dangerouslySetInnerHTML={{ __html: profile.manifestoAiDraft.replace(/\n/g, '<br/>') }} className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium" />
                            ) : (
                                <div className="text-center py-20">
                                    <DocumentTextIcon className="w-20 h-20 text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold uppercase text-xs">No manifesto draft yet. Use AI to generate one.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Voters View */}
            {activeTab === 'voters' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800">
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
                            <UserGroupIcon className="w-8 h-8 text-indigo-600" />
                            Voter Prospect Discovery (AI Lead Scout)
                        </h3>
                        <LeadScoutManager defaultNiche={profile.constituencyWard + " Political Campaign"} />
                    </div>
                </div>
            )}

            {/* Events View */}
            {activeTab === 'events' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                                <CalendarDaysIcon className="w-8 h-8 text-orange-600" />
                                Campaign Schedule & Rallies
                            </h3>
                            <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Schedule Event</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {events.length > 0 ? events.map(event => (
                                <div key={event.id} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 group hover:border-indigo-500 transition-all">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center font-black text-indigo-600 shadow-sm text-xs">
                                            {new Date(event.eventTime).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 dark:text-white uppercase text-lg">{event.title}</h4>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{event.location}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{event.description}</p>
                                    <div className="flex justify-between items-center">
                                        <div className="flex -space-x-3">
                                            {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200"></div>)}
                                            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600">+12</div>
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-indigo-600">Details & Map</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-2 py-20 text-center">
                                    <CalendarDaysIcon className="w-20 h-20 text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold uppercase text-xs">No campaign events scheduled yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Pulse View */}
            {activeTab === 'ai_pulse' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                     <div className="bg-slate-900 text-white rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <SparklesIcon className="w-8 h-8 text-emerald-400" /> Sentiment Analysis
                        </h3>
                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="font-black text-[10px] uppercase tracking-widest">Public Favorability</span>
                                    <span className="text-emerald-400 font-black">78%</span>
                                </div>
                                <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                                    <div className="bg-emerald-400 h-full" style={{ width: '78%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="font-black text-[10px] uppercase tracking-widest">Digital Engagement</span>
                                    <span className="text-indigo-400 font-black">92%</span>
                                </div>
                                <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                                    <div className="bg-indigo-400 h-full" style={{ width: '92%' }}></div>
                                </div>
                            </div>
                            <div className="pt-8 border-t border-white/10">
                                <p className="text-sm font-medium text-slate-400 italic">
                                    "Voters are responding positively to your stance on digital literacy in primary schools. The sentiment spike matches your recent radio interview."
                                </p>
                            </div>
                        </div>
                     </div>

                     <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800">
                        <h3 className="text-3xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <ShieldCheckIcon className="w-8 h-8 text-indigo-600" /> Strategic Recommendations
                        </h3>
                        <div className="space-y-6">
                            {[
                                { title: 'Differentiate', text: 'Rival candidate Z is focusing on roads. Shift your focus to "Internet for Every Home" to capture the Gen-Z vote.' },
                                { title: 'Town Hall Strategy', text: 'Schedule a meeting in Outer Ward B. Your support there has dipped by 4% in favor of undecided voters.' },
                                { title: 'Media Spend', text: 'Increase TikTok budget by 20% over the weekend. Traffic from that platform is converting to newsletter signups at a record rate.' }
                            ].map((rec, i) => (
                                <div key={i} className="flex gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl group hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all cursor-default">
                                    <div className="w-8 h-8 shrink-0 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm">{i+1}</div>
                                    <div>
                                        <h4 className="font-black text-[10px] uppercase tracking-widest text-indigo-600 mb-1">{rec.title}</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{rec.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                </div>
            )}
        </div>
    );
};
