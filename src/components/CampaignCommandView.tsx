import React, { useState, useEffect, useMemo } from 'react';
import { 
    UserGroupIcon, CalendarDaysIcon, ChartBarIcon, 
    SparklesIcon, MapPinIcon, ChatBubbleLeftRightIcon,
    SpeakerWaveIcon, DocumentTextIcon, ArrowPathIcon,
    HeartIcon, ShieldCheckIcon, MegaphoneIcon,
    PhotoIcon, PlusIcon, XIcon, VideoCameraIcon, CameraIcon, DevicePhoneMobileIcon,
    ArrowUpTrayIcon
} from './icons';
import { SmartPoliticalImporterModal } from './SmartPoliticalImporterModal';
import { CampaignProfile, VoterOutreach, CampaignEvent, User, PoliticalParty, County, Constituency, Ward } from '../types';
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
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [generatingManifesto, setGeneratingManifesto] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'voters' | 'events' | 'manifesto' | 'ai_pulse' | 'branding' | 'settings'>('dashboard');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showVoterImportModal, setShowVoterImportModal] = useState(false);
    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editProfile, setEditProfile] = useState<Partial<CampaignProfile>>({});
    
    const [politicalParties, setPoliticalParties] = useState<PoliticalParty[]>([]);
    const [politicalCounties, setPoliticalCounties] = useState<County[]>([]);
    const [politicalConstituencies, setPoliticalConstituencies] = useState<Constituency[]>([]);
    const [politicalWards, setPoliticalWards] = useState<Ward[]>([]);

    useEffect(() => {
        const loadMetaData = async () => {
            try {
                const [pData, couData, cData, wData] = await Promise.all([
                    apiService.fetchModuleRecords<PoliticalParty>('political_parties', undefined, undefined, { limit: 1000 }),
                    apiService.fetchModuleRecords<County>('counties', undefined, undefined, { limit: 1000 }),
                    apiService.fetchModuleRecords<Constituency>('constituencies', undefined, undefined, { limit: 1000 }),
                    apiService.fetchModuleRecords<Ward>('wards', undefined, undefined, { limit: 5000 })
                ]);
                setPoliticalParties(pData);
                setPoliticalCounties(couData);
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

    const fetchVoters = async (campaignId: string) => {
        try {
            const vData = await apiService.fetchModuleRecords<VoterOutreach>('voter_outreach', 'campaignId', campaignId);
            setVoters(vData);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAssetUpload = async (file: File, type: 'profile' | 'poster') => {
        if (!profile) return;
        setUploading(true);
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = (e.target?.result as string).split(',')[1];
            try {
                const response = await apiService.invokeIntegration({
                    action: 'campaign-upload',
                    file: base64,
                    fileName: file.name,
                    type,
                    campaignId: profile.id
                });
                
                if (response.success && response.url) {
                    const updatedProfile = { ...profile };
                    if (type === 'profile') {
                        updatedProfile.profilePicture = response.url;
                    } else {
                        updatedProfile.campaignPosters = [...(updatedProfile.campaignPosters || []), response.url];
                    }
                    
                    await apiService.saveModuleRecord('campaign_profiles', updatedProfile);
                    setProfile(updatedProfile);
                }
            } catch (err) {
                console.error(err);
                alert("Upload failed. Verify FTP credentials in System Settings.");
            } finally {
                setUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const stats = useMemo(() => {
        // Calculate total electorate based on position from geographical metadata
        let totalElectorate = profile?.targetVoterCount || 0;
        
        if (profile) {
            if (profile.position === 'President' || profile.position === 'Deputy') {
                totalElectorate = politicalWards.reduce((acc, w) => acc + (w.registered_voters || 0), 0);
            } else if (profile.position === 'Governor' || profile.position === 'Senator' || profile.position === 'Women Rep') {
                const county = politicalCounties.find(c => c.name === profile.county);
                if (county) {
                    // Find constituencies in this county
                    const cIds = politicalConstituencies.filter(c => c.countyId === county.id).map(c => c.id);
                    totalElectorate = politicalWards
                        .filter(w => cIds.includes(w.constituencyId))
                        .reduce((acc, w) => acc + (w.registered_voters || 0), 0);
                }
            } else if (profile.position === 'MP') {
                const constituency = politicalConstituencies.find(c => c.name === profile.constituency);
                if (constituency) {
                    totalElectorate = politicalWards
                        .filter(w => w.constituencyId === constituency.id)
                        .reduce((acc, w) => acc + (w.registered_voters || 0), 0);
                }
            } else if (profile.position === 'MCA') {
                const ward = politicalWards.find(w => w.name === profile.ward);
                totalElectorate = ward?.registered_voters || 0;
            }
        }

        // Use profile target if DB metadata is empty
        if (totalElectorate === 0) totalElectorate = profile?.targetVoterCount || 1000;

        const reached = voters.length;
        const supporters = voters.filter(v => v.status === 'supporter').length;
        const undecided = voters.filter(v => v.status === 'undecided').length;

        return {
            totalReached: reached,
            supporters,
            undecided,
            reachPercent: Math.min(Math.round((reached / totalElectorate) * 100), 100),
            supportPercent: Math.min(Math.round((supporters / (reached || 1)) * 100), 100),
            upcomingEvents: events.filter(e => new Date(e.eventTime) > new Date()).length,
            totalElectorate
        };
    }, [voters, events, profile, politicalWards, politicalConstituencies, politicalCounties]);

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
                    counties={politicalCounties}
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
                            <MapPinIcon className="w-4 h-4" /> {profile.constituencyWard}
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

            {/* ── Dashboard (War Room Intelligence) ── */}
            {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Electorate Reach Progress */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                           <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter">Onboarding Progress</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional reach vs Electorate Size</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black text-indigo-600 tracking-tighter">{stats.totalReached.toLocaleString()}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Onboarded</p>
                                </div>
                           </div>

                           <div className="flex flex-col md:flex-row items-center gap-12">
                                {/* Large SVG Progress Circle */}
                                <div className="relative w-48 h-48 shrink-0">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle cx="96" cy="96" r="80" fill="none" stroke="currentColor" strokeWidth="16" className="text-slate-100 dark:text-slate-800" />
                                        <circle 
                                            cx="96" cy="96" r="80" 
                                            fill="none" stroke="currentColor" strokeWidth="16" 
                                            strokeDasharray={2 * Math.PI * 80}
                                            strokeDashoffset={2 * Math.PI * 80 * (1 - stats.reachPercent / 100)}
                                            strokeLinecap="round"
                                            className="text-indigo-600 transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-black tracking-tighter">{stats.reachPercent}%</span>
                                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">of electorate</span>
                                    </div>
                                </div>

                                {/* Progress Metrics List */}
                                <div className="flex-1 w-full space-y-8">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voter Penetration</p>
                                            <p className="font-black text-slate-900 dark:text-white uppercase text-sm">{stats.totalReached.toLocaleString()} / {stats.totalElectorate.toLocaleString()}</p>
                                        </div>
                                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${stats.reachPercent}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Supporter Conversion</p>
                                            <div className="flex items-end gap-2">
                                                <p className="text-xl font-black text-emerald-500 leading-none">{stats.supportPercent}%</p>
                                                <span className="text-[9px] font-bold text-slate-400 mb-[2px]">of reached</span>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining to Target</p>
                                            <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{(stats.totalElectorate - stats.totalReached).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                           </div>

                           <div className="mt-12 pt-10 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50/30 dark:bg-indigo-900/10 -mx-10 px-10 -mb-10 py-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-indigo-600 rounded-xl text-white">
                                        <SpeakerWaveIcon className="w-5 h-5 animate-pulse" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight text-indigo-900 dark:text-indigo-200">AI Momentum Insight</p>
                                        <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">Onboarding is up 12% following the {profile.ward || profile.constituency} townhall.</p>
                                    </div>
                                </div>
                                <button onClick={() => setActiveTab('voters')} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">Manage Network →</button>
                           </div>
                        </div>

                        {/* Suggested Analytics Hub */}
                        <div className="bg-slate-900 text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden flex flex-col">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3 relative z-10">
                                <ChartBarIcon className="w-8 h-8 text-indigo-400" />
                                Strategy Analytics
                            </h3>
                            
                            <div className="space-y-6 flex-1 relative z-10">
                                {[
                                    { title: 'Sentiment Analysis', desc: 'Real-time tone monitoring of suppoter feedback.', status: 'Ready to Activate', icon: <ChatBubbleLeftRightIcon className="w-4 h-4"/>, color: 'text-emerald-400' },
                                    { title: 'Age Demographics', desc: 'Breakdown of your reach by GenZ, Millennials, and Elders.', status: 'Data Import Needed', icon: <UserGroupIcon className="w-4 h-4"/>, color: 'text-indigo-400' },
                                    { title: 'Geographic Heatmap', desc: 'Identify "Cold Zones" with zero voter onboarding.', status: 'Available in Pro', icon: <MapPinIcon className="w-4 h-4"/>, color: 'text-orange-400' },
                                    { title: 'Momentum Trajectory', desc: 'Projected reach by election day based on current rate.', status: 'Processing...', icon: <ArrowPathIcon className="w-4 h-4"/>, color: 'text-pink-400' }
                                ].map((analytic, idx) => (
                                    <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all cursor-default group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`${analytic.color} opacity-80 group-hover:opacity-100 transition-opacity`}>{analytic.icon}</div>
                                            <p className="text-xs font-black uppercase tracking-wide">{analytic.title}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-3">{analytic.desc}</p>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 ${analytic.color} border border-white/5 tracking-widest`}>
                                            {analytic.status}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button className="mt-8 w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                                Request Deep Intelligence Report
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Total Supporter Strength', val: stats.supporters.toLocaleString(), sub: 'Hard Votes', icon: HeartIcon, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10' },
                            { label: 'Remaining Unonboarded', val: (stats.totalElectorate - stats.totalReached).toLocaleString(), sub: 'Untapped Potential', icon: UserGroupIcon, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/10' },
                            { label: 'Upcoming Events', val: stats.upcomingEvents, sub: 'Engagement Ops', icon: CalendarDaysIcon, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/10' },
                            { label: 'Campaign Readiness', val: 'Elite', sub: 'Institution Level', icon: ShieldCheckIcon, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10' }
                        ].map((s, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                <div className={`flex items-center justify-between mb-4`}>
                                    <div className={`p-3 rounded-xl ${s.bg} ${s.color} group-hover:scale-110 transition-transform`}>
                                        <s.icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.sub}</span>
                                </div>
                                <p className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-1">{s.val}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Branding & Media View */}
            {activeTab === 'branding' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                                    <PhotoIcon className="w-8 h-8 text-indigo-600" />
                                    Branding & Media Hub
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-11">Manage official digital campaign assets</p>
                            </div>
                            {uploading && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                    <ArrowPathIcon className="w-4 h-4 animate-spin text-indigo-600" />
                                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Uploading to cPanel...</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Portrait Section */}
                            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="font-black text-xs uppercase tracking-widest text-indigo-600">Official Portrait</h4>
                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full text-[8px] font-black uppercase tracking-tighter">Live Asset</span>
                                </div>
                                
                                <div className="flex flex-col items-center gap-6">
                                    <div className="w-48 h-48 rounded-[3rem] bg-white dark:bg-slate-900 border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden relative group">
                                        <img 
                                            src={profile.profilePicture || 'https://images.unsplash.com/photo-1540910419892-f013c773998b?q=80&w=300&h=300&auto=format&fit=crop'} 
                                            alt="Candidate" 
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                                            <input 
                                                type="file" 
                                                id="profile-upload" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={(e) => e.target.files && handleAssetUpload(e.target.files[0], 'profile')}
                                            />
                                            <label htmlFor="profile-upload" className="cursor-pointer text-white font-black text-[10px] uppercase tracking-widest bg-indigo-600 px-5 py-3 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all">Update Photo</label>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase text-center leading-relaxed max-w-[200px]">High resolution profile photo used for official voting materials.</p>
                                </div>
                            </div>

                            {/* Posters Section */}
                            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                <h4 className="font-black text-xs uppercase tracking-widest text-indigo-600 mb-8">Campaign Posters Gallery</h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    {(profile.campaignPosters || []).map((p: string, i: number) => (
                                        <div key={i} className="aspect-[3/4] rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group relative">
                                            <img src={p} className="w-full h-full object-cover" />
                                            <button 
                                                onClick={async () => {
                                                    const updated = { ...profile, campaignPosters: profile.campaignPosters?.filter((_: string, idx: number) => idx !== i) };
                                                    await apiService.saveModuleRecord('campaign_profiles', updated);
                                                    setProfile(updated);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg backdrop-blur-sm"
                                            >
                                                <XIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    <div className="aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer relative overflow-hidden group">
                                        <input 
                                            type="file" 
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                            accept="image/*"
                                            onChange={(e) => e.target.files && handleAssetUpload(e.target.files[0], 'poster')}
                                        />
                                        <PlusIcon className="w-8 h-8 text-slate-300 group-hover:text-indigo-400 group-hover:scale-110 transition-all" />
                                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Add Poster</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Branding Package Info */}
                        <div className="mt-12 pt-12 border-t border-slate-100 dark:border-slate-800">
                             <div className="bg-slate-900 text-white rounded-[2.5rem] p-12 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                                    <div className="shrink-0">
                                        <SparklesIcon className="w-20 h-20 text-indigo-400" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h4 className="text-3xl font-black uppercase tracking-tighter mb-2">Elite Branding Package</h4>
                                        <p className="text-slate-400 font-medium mb-6 max-w-xl">Stand out with a verified identity, custom branded SMS sender ID, and AI-driven video content for TikTok.</p>
                                        
                                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                            {[
                                                { icon: <DocumentTextIcon className="w-4 h-4"/>, label: 'Custom SMS Sender ID' },
                                                { icon: <ShieldCheckIcon className="w-4 h-4"/>, label: 'Profile Verification' },
                                                { icon: <MegaphoneIcon className="w-4 h-4"/>, label: 'Social Media Toolkit' }
                                            ].map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest">
                                                    {f.icon} {f.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        {profile.brandingStatus === 'active' ? (
                                            <div className="bg-emerald-500/20 text-emerald-400 px-8 py-4 rounded-2xl border border-emerald-500/30 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                                                <ShieldCheckIcon className="w-5 h-5" /> Status: Active
                                            </div>
                                        ) : profile.brandingStatus === 'pending' ? (
                                            <div className="bg-orange-500/20 text-orange-400 px-8 py-4 rounded-2xl border border-orange-500/30 font-black uppercase text-xs tracking-widest">
                                                Review Pending...
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={async () => {
                                                    const updated = { ...profile, brandingStatus: 'pending' as const };
                                                    await apiService.saveModuleRecord('campaign_profiles', updated);
                                                    setProfile(updated);
                                                }}
                                                className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                                            >
                                                Apply Now
                                            </button>
                                        )}
                                    </div>
                                </div>
                             </div>
                        </div>
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
                                        {['MCA', 'MP', 'Women Rep', 'Senator', 'Governor', 'President', 'Deputy'].map(p => (
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
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                                    <UserGroupIcon className="w-8 h-8 text-indigo-600" />
                                    Voter Network
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-11">Manage and track your official campaign supporters</p>
                            </div>
                            <button 
                                onClick={() => setShowVoterImportModal(true)}
                                className="bg-slate-100 dark:bg-slate-800 text-indigo-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm"
                            >
                                <ArrowUpTrayIcon className="w-4 h-4" />
                                Import Excel
                            </button>
                        </div>
                        
                        <div className="mb-12">
                            <LeadScoutManager defaultNiche={profile?.constituencyWard + " Political Campaign"} />
                        </div>
                    </div>

                    {showVoterImportModal && profile && (
                        <SmartPoliticalImporterModal 
                            type="voters"
                            campaignId={profile.id}
                            onClose={() => setShowVoterImportModal(false)}
                            onRefresh={() => fetchVoters(profile.id)}
                        />
                    )}
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
                            <button 
                                onClick={() => setIsEventModalOpen(true)}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                            >
                                Schedule Event
                            </button>
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
                <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-all"></div>
                        
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <VideoCameraIcon className="w-10 h-10 text-indigo-600" />
                                    <h3 className="text-4xl font-black uppercase tracking-tighter">AI Video Suite</h3>
                                    <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-indigo-100">Pro Feature</span>
                                </div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-14">Transform your manifesto into viral TikTok & Reels clips</p>
                            </div>
                            
                            <div className="flex gap-4">
                                <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3 shadow-xl">
                                    <PlusIcon className="w-4 h-4" /> Generate New Clip
                                </button>
                                <button className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                                    Studio Mode
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { title: 'Viral Manifesto', style: 'High-Impact Kinetic Typography', color: 'indigo', icon: SparklesIcon },
                                { title: 'Townhall Highlight', style: 'Candid Event Recap with AI B-Roll', color: 'emerald', icon: CameraIcon },
                                { title: 'Policy Breakdown', style: 'Educational Infographic Animation', color: 'orange', icon: ChartBarIcon }
                            ].map((v, i) => (
                                <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 group/item hover:border-indigo-500 transition-all cursor-pointer">
                                    <div className={`w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-6`}>
                                        <v.icon className={`w-6 h-6 text-indigo-600`} />
                                    </div>
                                    <h4 className="font-black text-xl text-slate-900 dark:text-white uppercase mb-2 group-hover/item:text-indigo-600 transition-colors">{v.title}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-6">{v.style}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex -space-x-2">
                                            {[1,2].map(j => <div key={j} className="w-5 h-5 rounded-full bg-slate-200 border border-white"></div>)}
                                        </div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase">Used 244 times</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <DevicePhoneMobileIcon className="w-8 h-8 text-indigo-600" />
                                <div>
                                    <h5 className="font-black text-xs uppercase tracking-widest text-indigo-900 dark:text-indigo-100">Live TikTok Feed Integration</h5>
                                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-tighter">Your clips are optimized for vertical viewing and 9:16 aspect ratios.</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest cursor-pointer hover:underline">Verify Account</span>
                        </div>
                    </div>
                </div>
            )}
            {isSetupModalOpen && (
                    <CampaignProfileModal 
                        profile={profile} 
                        user={user} 
                        parties={politicalParties}
                        counties={politicalCounties}
                        constituencies={politicalConstituencies}
                        wards={politicalWards}
                        onClose={() => setIsSetupModalOpen(false)} 
                        onSave={(p) => {
                            setProfile(p);
                            setIsSetupModalOpen(false);
                        }} 
                    />
            )}
            {isEventModalOpen && (
                <CampaignEventModal 
                    profile={profile!} 
                    onClose={() => setIsEventModalOpen(false)} 
                    onSave={(newEvent) => {
                        setEvents([...events, newEvent]);
                        setIsEventModalOpen(false);
                    }} 
                />
            )}
        </div>
    );
};

interface CampaignEventModalProps {
    profile: CampaignProfile;
    onClose: () => void;
    onSave: (event: CampaignEvent) => void;
}

const CampaignEventModal: React.FC<CampaignEventModalProps> = ({ profile, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [type, setType] = useState<CampaignEvent['eventType']>('rally');
    const [time, setTime] = useState('');
    const [target, setTarget] = useState(100);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!title || !time || !location) return;
        setSaving(true);
        try {
            const newEvent: CampaignEvent = {
                id: `evt_${Date.now()}`,
                campaignId: profile.id,
                title,
                description,
                location,
                eventType: type,
                eventTime: time,
                attendanceEstimate: target,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('campaign_events', newEvent);
            onSave(newEvent);
        } catch (e) {
            console.error(e);
            alert("Error scheduling event.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Event Logistics</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Schedule Rallies & Meetings</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                        <ArrowPathIcon className="w-5 h-5 text-slate-400 rotate-45" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Event Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Major Rally at City Square" className="form-input" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Event Type</label>
                            <select value={type} onChange={e => setType(e.target.value as any)} className="form-select">
                                <option value="rally">Political Rally</option>
                                <option value="townhall">Town Hall Meeting</option>
                                <option value="strategy_meeting">Strategy Session</option>
                                <option value="fundraiser">Fundraiser</option>
                                <option value="door_to_door">Door to Door</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Attendance</label>
                            <input type="number" value={target} onChange={e => setTarget(Number(e.target.value))} className="form-input" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Location / Venue</label>
                            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Venue Name" className="form-input" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Date & Time</label>
                            <input type="datetime-local" value={time} onChange={e => setTime(e.target.value)} className="form-input" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Agenda / Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="form-input resize-none" placeholder="Key objectives and speaking points..." />
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={saving || !title || !time || !location}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-slate-900 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Processing...' : 'Deploy Event to Schedule'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface CampaignProfileModalProps {
    profile: CampaignProfile | null;
    user: User;
    parties: PoliticalParty[];
    counties: County[];
    constituencies: Constituency[];
    wards: Ward[];
    onClose: () => void;
    onSave: (profile: CampaignProfile) => void;
}

const CampaignProfileModal: React.FC<CampaignProfileModalProps> = ({ 
    profile, user, parties, counties, constituencies, wards, onClose, onSave 
}) => {
    const [name, setName] = useState(profile?.candidateName || user.name);
    const [position, setPosition] = useState<CampaignProfile['position']>(profile?.position || 'MCA');
    const [party, setParty] = useState(profile?.partyName || '');
    
    // Cascaded Area State
    const [selectedCounty, setSelectedCounty] = useState(profile?.county || '');
    const [selectedConstituency, setSelectedConstituency] = useState(profile?.constituency || '');
    const [selectedWard, setSelectedWard] = useState(profile?.ward || '');

    const [agendas, setAgendas] = useState<string[]>(profile?.agendas || ['', '', '']);
    const [slug, setSlug] = useState(profile?.inviteSlug || name.toLowerCase().replace(/\s+/g, '-'));
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Derived lists
    const filteredConstituencies = useMemo(() => {
        if (!selectedCounty) return [];
        const county = counties.find(c => c.name === selectedCounty);
        return county ? constituencies.filter(c => c.countyId === county.id) : [];
    }, [selectedCounty, counties, constituencies]);

    const filteredWards = useMemo(() => {
        if (!selectedConstituency) return [];
        const constituency = constituencies.find(c => c.name === selectedConstituency);
        return constituency ? wards.filter(w => w.constituencyId === constituency.id) : [];
    }, [selectedConstituency, constituencies, wards]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const newProfile: CampaignProfile = {
                id: profile?.id || `cp_${Date.now()}`,
                institutionId: user.institutionId,
                candidateName: name,
                position,
                partyName: party,
                county: selectedCounty,
                constituency: selectedConstituency,
                ward: selectedWard,
                constituencyWard: `${selectedConstituency}${selectedWard ? ' - ' + selectedWard : ''}`,
                targetVoterCount: target,
                agendas: agendas.filter(a => a.trim() !== ''),
                inviteSlug: slug || name.toLowerCase().replace(/\s+/g, '-'),
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
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh]">
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter">Profile Configuration</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Identity & Strategic Targets</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all">
                        <ArrowPathIcon className="w-6 h-6 text-slate-400 rotate-45" />
                    </button>
                </div>

                <div className="p-10 overflow-y-auto space-y-10 no-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Basic Identity */}
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em] mb-4">Aspirant Identity</h4>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Candidate Name</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="form-input" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Office</label>
                                <select value={position} onChange={e => setPosition(e.target.value as any)} className="form-select">
                                    <option value="MCA">MCA (County Assembly)</option>
                                    <option value="MP">MP (National Assembly)</option>
                                    <option value="Women Rep">Women Representative</option>
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
                        </div>

                        {/* Jurisdictional Area (Cascading) */}
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em] mb-4">Deployment Area</h4>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select County</label>
                                <select 
                                    value={selectedCounty} 
                                    onChange={e => {
                                        setSelectedCounty(e.target.value);
                                        setSelectedConstituency('');
                                        setSelectedWard('');
                                    }} 
                                    className="form-select"
                                >
                                    <option value="">Choose County...</option>
                                    {counties.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Constituency</label>
                                <select 
                                    value={selectedConstituency} 
                                    onChange={e => {
                                        setSelectedConstituency(e.target.value);
                                        setSelectedWard('');
                                    }} 
                                    disabled={!selectedCounty}
                                    className="form-select disabled:opacity-50"
                                >
                                    <option value="">{selectedCounty ? 'Choose Constituency...' : 'Select County first'}</option>
                                    {filteredConstituencies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Ward (For MCA)</label>
                                <select 
                                    value={selectedWard} 
                                    onChange={e => setSelectedWard(e.target.value)} 
                                    disabled={!selectedConstituency}
                                    className="form-select disabled:opacity-50"
                                >
                                    <option value="">{selectedConstituency ? 'Choose Ward...' : 'Select Constituency first'}</option>
                                    {filteredWards.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30">
                                <label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest ml-1">Custom Public Link Slug</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">/join/</span>
                                        <input 
                                            value={slug} 
                                            onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                                            className="form-input pl-14 text-indigo-600 font-bold" 
                                            placeholder="eg. votemisoi"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const url = `https://portal.eduai.co.ke/?view=join-campaign&id=${slug}`;
                                            navigator.clipboard.writeText(url);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                    >
                                        {copied ? 'Copied!' : 'Copy Link'}
                                    </button>
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium ml-1">Share this link to recruit supporters publicly</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em]">Priority Agendas (Publicly Visible)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
