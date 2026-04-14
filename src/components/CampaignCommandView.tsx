import React, { useState, useEffect } from 'react';
import { 
    UserGroupIcon, CalendarDaysIcon, ChartBarIcon, 
    SparklesIcon, MapPinIcon, ChatBubbleLeftRightIcon,
    SpeakerWaveIcon, DocumentTextIcon, ArrowPathIcon,
    HeartIcon, ShieldCheckIcon, MegaphoneIcon
} from './icons';
import { CampaignProfile, VoterOutreach, CampaignEvent, User, PoliticalParty, Constituency, Ward } from '../types';
import { apiService } from '../services/apiService';
import { generateAIContent } from '../services/geminiService';
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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'voters' | 'events' | 'manifesto' | 'ai_pulse' | 'branding' | 'settings'>('dashboard');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
    const [editProfile, setEditProfile] = useState<Partial<CampaignProfile>>({});
    
    const [politicalParties, setPoliticalParties] = useState<PoliticalParty[]>([]);
    const [politicalConstituencies, setPoliticalConstituencies] = useState<Constituency[]>([]);
    const [politicalWards, setPoliticalWards] = useState<Ward[]>([]);

    useEffect(() => {
        const loadMetaData = async () => {
            try {
                const [pData, cData, wData] = await Promise.all([
                    apiService.fetchModuleRecords<PoliticalParty>('political_parties'),
                    apiService.fetchModuleRecords<Constituency>('constituencies'),
                    apiService.fetchModuleRecords<Ward>('wards')
                ]);
                setPoliticalParties(pData);
                setPoliticalConstituencies(cData);
                setPoliticalWards(wData);
            } catch (e) {
                console.error(e);
            }
        };
        loadMetaData();
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Load profile
                const profiles = await apiService.fetchModuleRecords<CampaignProfile>('campaign_profiles');
                if (profiles.length > 0) {
                    setProfile(profiles[0]);
                    
                    // Load related data
                    const voterData = await apiService.fetchModuleRecords<VoterOutreach>('voter_outreach', 'ALL', undefined, { filter: { campaign_id: profiles[0].id } });
                    setVoters(voterData);
                    
                    const eventData = await apiService.fetchModuleRecords<CampaignEvent>('campaign_events', 'ALL', undefined, { filter: { campaign_id: profiles[0].id } });
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
            
            const response = await generateAIContent(prompt);
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
            <button 
                onClick={() => setIsSetupModalOpen(true)}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all active:scale-95"
            >
                Setup Campaign Now
            </button>

            {isSetupModalOpen && (
                <CampaignProfileModal 
                    profile={null} 
                    user={user} 
                    parties={politicalParties}
                    constituencies={politicalConstituencies}
                    wards={politicalWards}
                    onClose={() => setIsSetupModalOpen(false)} 
                    onSave={(p) => {
                        setProfile(p);
                        setIsSetupModalOpen(false);
                    }} 
                />
            )}
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

                <div className="flex bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl relative z-10 overflow-x-auto max-w-full">
                    {['dashboard', 'voters', 'events', 'manifesto', 'ai_pulse', 'branding', 'settings'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setActiveTab(t as any)}
                            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {t.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Branding View */}
            {activeTab === 'branding' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800 text-center max-w-3xl mx-auto">
                        <SparklesIcon className="w-20 h-20 text-indigo-600 mx-auto mb-6" />
                        <h2 className="text-4xl font-black tracking-tighter uppercase mb-4">Elite Branding Package</h2>
                        <p className="text-slate-500 font-medium mb-8">
                            Stand out from the crowd with a professional identity, verified candidate logo, and custom branded SMS sender ID for all your outreach.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-transparent hover:border-indigo-100 transition-all">
                                <DocumentTextIcon className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">Branded SMS</h4>
                                <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">Send texts with your name (e.g., TEAM-RAILA)</p>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-transparent hover:border-indigo-100 transition-all">
                                <ShieldCheckIcon className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">Verified Badge</h4>
                                <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">Blue checkmark on your public comparison profile</p>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-transparent hover:border-indigo-100 transition-all">
                                <MegaphoneIcon className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">AI Video Suite</h4>
                                <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">Generate high-quality campaign clips for TikTok</p>
                            </div>
                        </div>

                        {profile.brandingStatus === 'active' ? (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 p-8 rounded-[2.5rem] font-black uppercase tracking-widest text-sm border-2 border-emerald-500/20 flex items-center justify-center gap-4">
                                <ShieldCheckIcon className="w-6 h-6" /> Branding Plan Active
                            </div>
                        ) : profile.brandingStatus === 'pending' ? (
                            <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 p-8 rounded-[2.5rem] font-black uppercase tracking-widest text-sm border-2 border-orange-500/20">
                                Application Processing...
                            </div>
                        ) : (
                            <button 
                                onClick={async () => {
                                    const updated = { ...profile, brandingStatus: 'pending' as const };
                                    await apiService.saveModuleRecord('campaign_profiles', updated);
                                    setProfile(updated);
                                }}
                                className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-200 dark:shadow-none hover:scale-105 transition-all"
                            >
                                Apply & Upgrade Now
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Settings & Invite Link View */}
            {activeTab === 'settings' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-12">
                            <h3 className="text-3xl font-black uppercase tracking-tighter">Campaign Configuration</h3>
                            <button 
                                onClick={() => {
                                    setEditProfile({ ...profile });
                                    setShowProfileModal(true);
                                }}
                                className="bg-slate-100 dark:bg-slate-800 text-indigo-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                            >
                                Edit Profile
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Candidate Name</label>
                                <p className="text-xl font-black text-slate-900 dark:text-white uppercase">{profile.candidateName}</p>
                                
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mt-6">Target Office</label>
                                <p className="text-xl font-black text-slate-900 dark:text-white uppercase">{profile.position}</p>

                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mt-6">Political Party</label>
                                <p className="text-xl font-black text-slate-900 dark:text-white uppercase">{profile.partyName || 'Independent'}</p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 relative group">
                                <ChatBubbleLeftRightIcon className="w-12 h-12 text-indigo-600 mb-6" />
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-2">Unique Invite Link</h4>
                                <p className="text-slate-500 text-xs font-medium mb-6">
                                    Share this link online. Supporters who click this can join your campaign and provide their contact details.
                                </p>
                                <div className="flex gap-2">
                                    <input 
                                        readOnly 
                                        value={`${window.location.origin}/?view=join-campaign&id=${profile.inviteSlug || profile.id}`}
                                        className="bg-white dark:bg-slate-900 border-none rounded-xl p-3 text-[10px] font-black text-indigo-500 w-full"
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/?view=join-campaign&id=${profile.inviteSlug || profile.id}`);
                                            alert("Link copied to clipboard!");
                                        }}
                                        className="bg-indigo-600 text-white px-4 rounded-xl font-black text-[10px] uppercase tracking-widest"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                             <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-4">Core Agendas</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(profile.agendas || []).length > 0 ? profile.agendas?.map((agenda, i) => (
                                    <div key={i} className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-l-4 border-indigo-500">
                                        <div className="w-6 h-6 shrink-0 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center font-black text-xs text-indigo-600 shadow-sm">{i+1}</div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{agenda}</p>
                                    </div>
                                )) : (
                                    <p className="text-slate-400 text-[10px] font-black uppercase">No structured agendas defined. Edit profile to add some.</p>
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Edit Modal */}
            {showProfileModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-slate-900/80">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl relative overflow-hidden animate-fade-in-up">
                        <h3 className="text-3xl font-black uppercase tracking-tighter mb-8">Edit Campaign Information</h3>
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Candidate Name</label>
                                    <input 
                                        value={editProfile.candidateName} 
                                        onChange={e => setEditProfile({...editProfile, candidateName: e.target.value})}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold uppercase text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Post Running For</label>
                                    <select 
                                        value={editProfile.position} 
                                        onChange={e => setEditProfile({...editProfile, position: e.target.value as any})}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold uppercase text-xs"
                                    >
                                        {['MCA', 'MP', 'Senator', 'Governor', 'President', 'Deputy'].map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Political Party</label>
                                <select 
                                    value={editProfile.partyName} 
                                    onChange={e => setEditProfile({...editProfile, partyName: e.target.value})}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold uppercase text-xs"
                                >
                                    <option value="">Choose Party...</option>
                                    <option value="Independent">Independent</option>
                                    {politicalParties.map(p => <option key={p.id} value={p.name}>{p.name} ({p.acronym})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Constituency / Ward</label>
                                <select 
                                    value={editProfile.constituencyWard} 
                                    onChange={e => setEditProfile({...editProfile, constituencyWard: e.target.value})}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold uppercase text-xs"
                                >
                                    <option value="">Choose Location...</option>
                                    <optgroup label="Constituencies">
                                        {politicalConstituencies.map(c => <option key={c.id} value={c.name}>{c.name} (Constituency)</option>)}
                                    </optgroup>
                                    <optgroup label="Wards">
                                        {politicalWards.map(w => <option key={w.id} value={w.name}>{w.name} (Ward)</option>)}
                                    </optgroup>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Key Agendas (Comma separated)</label>
                                <textarea 
                                    value={editProfile.agendas?.join(', ')} 
                                    onChange={e => setEditProfile({...editProfile, agendas: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold uppercase text-xs h-32"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-12">
                            <button 
                                onClick={async () => {
                                    if (!editProfile.candidateName) return;
                                    await apiService.saveModuleRecord('campaign_profiles', editProfile as CampaignProfile);
                                    setProfile(editProfile as CampaignProfile);
                                    setShowProfileModal(false);
                                }}
                                className="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100"
                            >
                                Save Changes
                            </button>
                            <button 
                                onClick={() => setShowProfileModal(false)}
                                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-5 rounded-2xl font-black uppercase tracking-widest text-xs"
                            >
                                Cancel
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
            {isSetupModalOpen && (
                <CampaignProfileModal 
                    profile={profile} 
                    user={user} 
                    parties={politicalParties}
                    constituencies={politicalConstituencies}
                    wards={politicalWards}
                    onClose={() => setIsSetupModalOpen(false)} 
                    onSave={(p) => {
                        setProfile(p);
                        setIsSetupModalOpen(false);
                    }} 
                />
            )}
        </div>
    );
};

interface CampaignProfileModalProps {
    profile: CampaignProfile | null;
    user: User;
    parties: PoliticalParty[];
    constituencies: Constituency[];
    wards: Ward[];
    onClose: () => void;
    onSave: (profile: CampaignProfile) => void;
}

const CampaignProfileModal: React.FC<CampaignProfileModalProps> = ({ 
    profile, user, parties, constituencies, wards, onClose, onSave 
}) => {
    const [name, setName] = useState(profile?.candidateName || user.name);
    const [position, setPosition] = useState<CampaignProfile['position']>(profile?.position || 'MCA');
    const [party, setParty] = useState(profile?.partyName || '');
    const [ward, setWard] = useState(profile?.constituencyWard || '');
    const [target, setTarget] = useState(profile?.targetVoterCount || 50000);
    const [agendas, setAgendas] = useState<string[]>(profile?.agendas || ['', '', '']);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const newProfile: CampaignProfile = {
                id: profile?.id || `cp_${Date.now()}`,
                institutionId: user.institutionId,
                candidateName: name,
                position,
                partyName: party,
                constituencyWard: ward,
                targetVoterCount: target,
                agendas: agendas.filter(a => a.trim() !== ''),
                inviteSlug: profile?.inviteSlug || name.toLowerCase().replace(/\s+/g, '-'),
                brandingStatus: profile?.brandingStatus || 'none',
                createdAt: profile?.createdAt || new Date().toISOString()
            };
            await apiService.saveModuleRecord('campaign_profiles', newProfile);
            onSave(newProfile);
        } catch (e) {
            console.error(e);
            alert("Failed to save profile.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter">Profile Configuration</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Identity & Strategic Targets</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all">
                        <ArrowPathIcon className="w-6 h-6 text-slate-400 rotate-45" />
                    </button>
                </div>

                <div className="p-10 overflow-y-auto space-y-8 no-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Candidate Name</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="form-input" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Office</label>
                            <select value={position} onChange={e => setPosition(e.target.value as any)} className="form-select">
                                <option value="MCA">MCA (County Assembly)</option>
                                <option value="MP">MP (National Assembly)</option>
                                <option value="Senator">Senator</option>
                                <option value="Governor">Governor</option>
                                <option value="President">President</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Political Party</label>
                            <select value={party} onChange={e => setParty(e.target.value)} className="form-select">
                                <option value="">Choose Party...</option>
                                <option value="Independent">Independent</option>
                                {parties.map(p => <option key={p.id} value={p.name}>{p.name} ({p.acronym})</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Constituency / Ward</label>
                            <select value={ward} onChange={e => setWard(e.target.value)} className="form-select">
                                <option value="">Choose Location...</option>
                                <optgroup label="Constituencies">
                                    {constituencies.map(c => <option key={c.id} value={c.name}>{c.name} (Constituency)</option>)}
                                </optgroup>
                                <optgroup label="Wards">
                                    {wards.map(w => <option key={w.id} value={w.name}>{w.name} (Ward)</option>)}
                                </optgroup>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em]">Priority Agendas (Publicly Visible)</h4>
                        {agendas.map((a, i) => (
                            <input 
                                key={i}
                                value={a}
                                onChange={e => {
                                    const next = [...agendas];
                                    next[i] = e.target.value;
                                    setAgendas(next);
                                }}
                                placeholder={`Agenda Item #${i+1}`}
                                className="form-input"
                            />
                        ))}
                    </div>
                </div>

                <div className="p-10 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-100 rounded-2xl transition-all">Discard</button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-[2] py-4 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Synchronizing...' : (profile ? 'Update Strategy' : 'Initialize Campaign')}
                    </button>
                </div>
            </div>
        </div>
    );
};
