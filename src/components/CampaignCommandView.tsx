import React, { useState, useEffect, useMemo } from 'react';
import { 
    UserGroupIcon, CalendarDaysIcon, ChartBarIcon, 
    SparklesIcon, MapPinIcon, ChatBubbleLeftRightIcon,
    SpeakerWaveIcon, DocumentTextIcon, ArrowPathIcon,
    HeartIcon, ShieldCheckIcon, MegaphoneIcon,
    PhotoIcon, PlusIcon, XIcon, VideoCameraIcon, CameraIcon, DevicePhoneMobileIcon,
    ArrowUpTrayIcon, PaperAirplaneIcon
} from './icons';
import { SmartPoliticalImporterModal } from './SmartPoliticalImporterModal';
import { CampaignProfile, VoterOutreach, CampaignEvent, User, PoliticalParty, County, Constituency, Ward, CampaignVillage, CampaignGroup, CampaignGroupMember, Role } from '../types';
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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'voters' | 'events' | 'manifesto' | 'ai_pulse' | 'branding' | 'settings' | 'team' | 'sms_broadcast' | 'groups'>('dashboard');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showVoterImportModal, setShowVoterImportModal] = useState(false);
    const [selectedGroupIdForImport, setSelectedGroupIdForImport] = useState<string | null>(null);
    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [isVoterModalOpen, setIsVoterModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isVillageModalOpen, setIsVillageModalOpen] = useState(false);
    
    // Core Data
    const [staff, setStaff] = useState<User[]>([]);
    const [villages, setVillages] = useState<CampaignVillage[]>([]);
    const [groups, setGroups] = useState<CampaignGroup[]>([]);
    const [groupMembers, setGroupMembers] = useState<CampaignGroupMember[]>([]);
    
    // SMS & Filtering
    const [smsMessage, setSmsMessage] = useState('');
    const [isSendingSms, setIsSendingSms] = useState(false);
    const [activeVillageFilter, setActiveVillageFilter] = useState('');
    const [activeGroupFilter, setActiveGroupFilter] = useState('');
    
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
                const profiles = await apiService.fetchModuleRecords<CampaignProfile>('campaign_profiles', user.institutionId);
                if (profiles.length > 0) {
                    setProfile(profiles[0]);
                    
                    // Load related data
                    const voterData = await apiService.fetchModuleRecords<VoterOutreach>('voter_outreach', 'ALL', undefined, { filter: { campaign_id: profiles[0].id } });
                    setVoters(voterData);
                    
                    const eventData = await apiService.fetchModuleRecords<CampaignEvent>('campaign_events', 'ALL', undefined, { filter: { campaign_id: profiles[0].id } });
                    setEvents(eventData);

                    // Load campaign staff
                    const staffData = await apiService.fetchModuleRecords<User>('users', user.institutionId);
                    setStaff(staffData);

                    // Load Village & Groups
                    const villageData = await apiService.fetchModuleRecords<CampaignVillage>('campaign_villages', 'ALL', undefined, { filter: { campaign_id: profiles[0].id } });
                    setVillages(villageData);

                    const groupData = await apiService.fetchModuleRecords<CampaignGroup>('campaign_groups', 'ALL', undefined, { filter: { campaign_id: profiles[0].id } });
                    setGroups(groupData);

                    const memberData = await apiService.fetchModuleRecords<CampaignGroupMember>('campaign_group_members', 'ALL', undefined, { filter: { campaign_id: profiles[0].id } });
                    setGroupMembers(memberData);
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
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Error generating manifesto.");
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
        if (!profile) {
            console.error("No profile loaded for upload");
            alert("No active campaign profile found. Please complete setup first.");
            return;
        }
        console.log(`Starting ${type} upload:`, file.name);
        setUploading(true);
        
        try {
            const folderName = type === 'poster' ? 'Campaign_Posters' : 'Campaign_Profiles';
            const response = await apiService.uploadToGoogleDrive(file, folderName, { 
                institutionId: user.institutionId || (user as any).institution_id,
                useGlobalConfig: false 
            });
            
            if (response.success && response.fileUrl) {
                console.log("Upload successful:", response.fileUrl);
                const updatedProfile = { ...profile };
                if (type === 'profile') {
                    updatedProfile.profilePicture = response.fileUrl;
                } else {
                    updatedProfile.campaignPosters = [...(updatedProfile.campaignPosters || []), response.fileUrl];
                }
                
                await apiService.saveModuleRecord('campaign_profiles', updatedProfile);
                setProfile(updatedProfile);
            } else {
                console.error("Upload response failure:", response);
                throw new Error(response.error || 'Upload failed');
            }
        } catch (err: any) {
            console.error("handleAssetUpload failed:", err);
            alert(`Upload failed: ${err.message || 'Verify Google Drive status in Super Admin settings.'}`);
        } finally {
            setUploading(false);
        }
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

                <div className="flex flex-col gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl relative z-10">
                    <div className="flex">
                        {['dashboard', 'voters', 'groups', 'events', 'sms_broadcast'].map(t => (
                            <button 
                                key={t}
                                onClick={() => setActiveTab(t as any)}
                                className={`flex-1 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap text-center ${activeTab === t ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {t.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="flex">
                        {['manifesto', 'ai_pulse', 'team', 'branding', 'settings'].map(t => (
                            <button 
                                key={t}
                                onClick={() => setActiveTab(t as any)}
                                className={`flex-1 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap text-center ${activeTab === t ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {t.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
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
                                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Uploading to Google Drive...</span>
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
                                <div className="flex justify-between items-center mb-8">
                                    <h4 className="font-black text-xs uppercase tracking-widest text-indigo-600">Campaign Posters Gallery</h4>
                                    {(profile.campaignPosters || []).length > 0 && (
                                        <button 
                                            onClick={async () => {
                                                if (!confirm("Are you sure you want to clear all posters?")) return;
                                                const updated = { ...profile, campaignPosters: [] };
                                                await apiService.saveModuleRecord('campaign_profiles', updated);
                                                setProfile(updated);
                                            }}
                                            className="text-[9px] font-black uppercase text-red-500 hover:text-red-700 transition-colors tracking-widest"
                                        >
                                            Clear Gallery
                                        </button>
                                    )}
                                </div>
                                
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
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                    handleAssetUpload(e.target.files[0], 'poster');
                                                }
                                            }}
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
                                onClick={() => setIsSetupModalOpen(true)}
                                className="bg-slate-100 dark:bg-slate-800 text-indigo-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                            >
                                Edit Profile
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Candidate Name</label>
                                <p className="text-xl font-black text-slate-900 dark:text-white uppercase">{profile!.candidateName}</p>
                                
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mt-6">Target Office</label>
                                <p className="text-xl font-black text-slate-900 dark:text-white uppercase">{profile!.position}</p>

                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mt-6">Political Party</label>
                                <p className="text-xl font-black text-slate-900 dark:text-white uppercase">{profile!.partyName || 'Independent'}</p>
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
                                        value={`${window.location.origin}/?view=join-campaign&id=${profile!.inviteSlug || profile!.id}`}
                                        className="bg-white dark:bg-slate-900 border-none rounded-xl p-3 text-[10px] font-black text-indigo-500 w-full"
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/?view=join-campaign&id=${profile!.inviteSlug || profile!.id}`);
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
                                {(profile!.agendas || []).length > 0 ? profile!.agendas?.map((agenda, i) => (
                                    <div key={i} className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-l-4 border-indigo-500">
                                        <div className="w-6 h-6 shrink-0 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center font-black text-xs text-indigo-600 shadow-sm">{i+1}</div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{agenda}</p>
                                    </div>
                                )) : (
                                    <p className="text-slate-400 text-[10px] font-black uppercase">No structured agendas defined. Edit profile to add some.</p>
                                )}
                             </div>
                        </div>

                        {/* Village Configuration */}
                        <div className="mt-12 pt-12 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Ward Village Mapping</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign villages to {profile!.ward || 'your ward'} for targeted SMS</p>
                                </div>
                                <button 
                                    onClick={() => setIsVillageModalOpen(true)}
                                    className="text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl"
                                >
                                    <PlusIcon className="w-4 h-4" /> Add Village
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {villages.map((v, i) => (
                                    <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                            <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">{v.villageName}</span>
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                if (!confirm("Remove this village?")) return;
                                                await apiService.deleteModuleRecord('campaign_villages', v.id);
                                                setVillages(villages.filter(vi => vi.id !== v.id));
                                            }}
                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {villages.length === 0 && (
                                    <div className="col-span-3 py-12 text-center text-slate-400 text-[10px] font-black uppercase border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                                        No structural villages mapped yet.<br/>Add villages to enable granular SMS broadcasting.
                                    </div>
                                )}
                            </div>
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
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setIsVoterModalOpen(true)}
                                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Add New Contact
                                </button>
                                <button 
                                    onClick={() => setShowVoterImportModal(true)}
                                    className="bg-slate-100 dark:bg-slate-800 text-indigo-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm"
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4" />
                                    Import Excel
                                </button>
                            </div>
                        </div>
                        
                        <div className="mb-12">
                            <LeadScoutManager defaultNiche={profile?.constituencyWard + " Political Campaign"} />
                        </div>
                    </div>

                    {showVoterImportModal && profile && (
                        <SmartPoliticalImporterModal 
                            type="voters"
                            campaignId={profile.id}
                            groupId={selectedGroupIdForImport}
                            onClose={() => {
                                setShowVoterImportModal(false);
                                setSelectedGroupIdForImport(undefined);
                            }}
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

            {/* SMS Broadcast View */}
            {activeTab === 'sms_broadcast' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                                    <MegaphoneIcon className="w-8 h-8 text-indigo-600" />
                                    Voter Broadcast
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Send mass SMS to your entire voter database</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-indigo-600 leading-none">
                                    {(() => {
                                        let filtered = voters;
                                        if (activeVillageFilter) filtered = filtered.filter(v => v.village === activeVillageFilter);
                                        if (activeGroupFilter) {
                                            const memberVoterIds = groupMembers.filter(m => m.groupId === activeGroupFilter).map(m => m.voterId);
                                            filtered = filtered.filter(v => memberVoterIds.includes(v.id));
                                        }
                                        return filtered.length.toLocaleString();
                                    })()}
                                </p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Recipients</p>
                            </div>
                        </div>

                        {user.role !== 'campaign_admin' && user.role !== 'super_admin' ? (
                            <div className="p-10 bg-orange-50 dark:bg-orange-900/10 rounded-[2.5rem] border border-orange-100 dark:border-orange-800/30 text-center">
                                <ShieldCheckIcon className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                                <h4 className="text-lg font-black text-orange-900 dark:text-orange-200 uppercase tracking-tight mb-2">Unauthorized Access</h4>
                                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium max-w-xs mx-auto">
                                    Only the **Campaign Admin** is authorized to initiate mass SMS broadcasts to prevent unauthorized resource usage.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Broadcast Targeting */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                                        <label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest block mb-4">Target Specific Village</label>
                                        <select 
                                            value={activeVillageFilter}
                                            onChange={e => setActiveVillageFilter(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border-none rounded-xl py-3 px-4 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                        >
                                            <option value="">All Villages (Full Ward)</option>
                                            {Array.from(new Set(villages.map(v => v.villageName))).map(vn => (
                                                <option key={vn} value={vn}>{vn}</option>
                                            ))}
                                            {Array.from(new Set(voters.map(v => v.village).filter(v => v && !villages.some(vi => vi.villageName === v)))).map(vn => (
                                                <option key={vn} value={vn}>{vn} (Untracked)</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                                        <label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest block mb-4">Target Contact Group</label>
                                        <select 
                                            value={activeGroupFilter}
                                            onChange={e => setActiveGroupFilter(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border-none rounded-xl py-3 px-4 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                        >
                                            <option value="">Broadcast to All Supporters</option>
                                            {groups.map(g => (
                                                <option key={g.id} value={g.id}>{g.name} ({groupMembers.filter(m => m.groupId === g.id).length})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Message Content (Max 160 chars per unit)</label>
                                    <textarea 
                                        value={smsMessage}
                                        onChange={e => setSmsMessage(e.target.value)}
                                        rows={5}
                                        placeholder="e.g. Join us this Saturday at 2PM for a major rally at central park! Your voice matters. #TeamMisoi"
                                        className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-none rounded-[2rem] font-medium text-slate-700 dark:text-slate-300 focus:bg-white transition-all outline-none resize-none shadow-inner"
                                    />
                                    <div className="flex justify-between px-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">{smsMessage.length} characters used</p>
                                        <p className="text-[10px] font-black text-indigo-500 uppercase">{Math.ceil(smsMessage.length / 160)} SMS Unit(s)</p>
                                    </div>
                                </div>

                                <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                                    <div className="flex items-center gap-4">
                                        <SparklesIcon className="w-10 h-10 text-indigo-400 shrink-0" />
                                        <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 leading-relaxed uppercase">
                                            {(() => {
                                                let filtered = voters;
                                                if (activeVillageFilter) filtered = filtered.filter(v => v.village === activeVillageFilter);
                                                if (activeGroupFilter) {
                                                    const memberVoterIds = groupMembers.filter(m => m.groupId === activeGroupFilter).map(m => m.voterId);
                                                    filtered = filtered.filter(v => memberVoterIds.includes(v.id));
                                                }
                                                const totalUnits = filtered.length * Math.ceil(smsMessage.length / 160);
                                                return (
                                                    <span>
                                                        Estimated Cost: <span className="font-black text-indigo-600">{ totalUnits.toLocaleString() } SMS Units</span> for {filtered.length} recipients. 
                                                        Ensure your balance is topped up in the settings tab.
                                                    </span>
                                                );
                                            })()}
                                        </p>
                                    </div>
                                </div>

                                <button 
                                    onClick={async () => {
                                        let filtered = voters;
                                        if (activeVillageFilter) filtered = filtered.filter(v => v.village === activeVillageFilter);
                                        if (activeGroupFilter) {
                                            const memberVoterIds = groupMembers.filter(m => m.groupId === activeGroupFilter).map(m => m.voterId);
                                            filtered = filtered.filter(v => memberVoterIds.includes(v.id));
                                        }
                                        if (filtered.length === 0) return alert("No recipients found for chosen filters.");
                                        
                                        if (!confirm(`Broadcast this message to ${filtered.length} supporters?`)) return;
                                        setIsSendingSms(true);
                                        try {
                                            const phones = filtered.map(v => v.phoneNumber).filter(Boolean);
                                            await apiService.sendSms(phones as any, smsMessage, undefined, 1, user.institutionId);
                                            alert("Broadcast initiated successfully!");
                                            setSmsMessage('');
                                        } catch (e: any) {
                                            alert(`Broadcast failed: ${e.message}`);
                                        } finally {
                                            setIsSendingSms(false);
                                        }
                                    }}
                                    disabled={isSendingSms || !smsMessage || voters.length === 0}
                                    className="w-full py-5 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSendingSms ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PaperAirplaneIcon className="w-5 h-5" />}
                                    {isSendingSms ? 'Transmitting...' : 'Dispatch Hub Broadcast'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Groups & Mobilization Hub */}
            {activeTab === 'groups' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-12">
                            <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                                    <UserGroupIcon className="w-8 h-8 text-indigo-600" />
                                    Contact Groups
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-11">Organize voters into mobilization units</p>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowVoterImportModal(true)}
                                    className="bg-slate-100 dark:bg-slate-800 text-indigo-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm"
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4" />
                                    Bulk Import
                                </button>
                                <button 
                                    onClick={() => setIsGroupModalOpen(true)}
                                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Create Group
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groups.map((group, i) => (
                                <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 group hover:border-indigo-500 transition-all">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-indigo-600 font-black text-xl shadow-sm">
                                            {group.name[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter line-clamp-1">{group.name}</h4>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{groupMembers.filter(m => m.groupId === group.id).length} Members</p>
                                        </div>
                                    </div>
                                    
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 h-8 font-medium">
                                        {group.description || "No description provided for this group."}
                                    </p>

                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                setSelectedGroupIdForImport(group.id);
                                                setShowVoterImportModal(true);
                                            }}
                                            className="flex-1 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                                            Import
                                        </button>
                                        <button className="flex-1 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-all">
                                            View Unit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Team Management View */}
            {activeTab === 'team' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-12">
                            <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                                    <ShieldCheckIcon className="w-8 h-8 text-indigo-600" />
                                    Command Team
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-11">Manage authorized assistants and campaign agents</p>
                            </div>
                            <button 
                                onClick={() => setIsStaffModalOpen(true)}
                                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Register Staff
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {staff.map((member, i) => (
                                <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 group hover:border-indigo-500 transition-all">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-indigo-600 font-black text-xl shadow-sm">
                                            {member.name[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter line-clamp-1">{member.name}</h4>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${member.role === 'campaign_admin' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'} tracking-widest`}>
                                                    {member.role.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                            <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" /> {member.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                            <DevicePhoneMobileIcon className="w-3.5 h-3.5" /> {member.phoneNumber}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button className="flex-1 py-2 rounded-xl bg-white dark:bg-slate-700 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-red-500 transition-colors">Revoke</button>
                                        <button className="flex-1 py-2 rounded-xl bg-white dark:bg-slate-700 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-indigo-600 transition-colors">Permissions</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard Bottom Section */}
            {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800">
                            <h3 className="text-3xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                                <ChartBarIcon className="w-8 h-8 text-indigo-600" /> Supporter Growth & Status
                            </h3>
                            <div className="space-y-8">
                                {[
                                    { label: 'Strong Supporters', count: voters.filter(v => v.status === 'supporter').length, color: 'bg-emerald-500', icon: '🔥' },
                                    { label: 'Undecided / Potential', count: voters.filter(v => v.status === 'undecided' || v.status === 'uncontacted').length, color: 'bg-indigo-500', icon: '⏳' },
                                    { label: 'Opposed / Rivals', count: voters.filter(v => v.status === 'opposed').length, color: 'bg-red-500', icon: '⚠️' }
                                ].map((group, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{group.icon}</span>
                                                <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">{group.label}</span>
                                            </div>
                                            <span className="font-black text-xl text-slate-900 dark:text-white">
                                                {group.count.toLocaleString()}
                                                <span className="text-[10px] text-slate-400 ml-1">({voters.length > 0 ? Math.round((group.count / voters.length) * 100) : 0}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden border border-slate-50 dark:border-slate-700">
                                            <div className={`${group.color} h-full transition-all duration-1000`} style={{ width: `${voters.length > 0 ? (group.count / voters.length) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12 pt-8 border-t border-slate-50 dark:border-slate-800">
                                <p className="text-sm font-medium text-slate-400 italic flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl">
                                    <SparklesIcon className="w-10 h-10 text-emerald-400 shrink-0" />
                                    "Your supporter conversion rate is currently {voters.length > 0 ? Math.round((voters.filter(v => v.status === 'supporter').length / voters.length) * 100) : 0}%. To reach your 2027 target, you need to recruit roughly {profile ? Math.max(0, Math.round((profile.targetVoterCount - voters.filter(v => v.status === 'supporter').length) / 100)) : 0} new supporters daily."
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-900 text-white rounded-[3rem] p-12 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
                            
                            <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                                    <MapPinIcon className="w-8 h-8 text-indigo-400" /> Ward Hotspots
                                </h3>
                                <div className="space-y-6">
                                    {Array.from(new Set(voters.map(v => v.ward).filter(Boolean))).slice(0, 5).map((wardName, i) => {
                                        const wardSupporters = voters.filter(v => v.ward === wardName && v.status === 'supporter').length;
                                        return (
                                            <div key={i} className="flex justify-between items-center group">
                                                <div>
                                                    <h5 className="font-black text-xs uppercase tracking-widest text-white group-hover:text-indigo-400 transition-colors">{wardName}</h5>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{voters.filter(v => v.ward === wardName).length} Total Contacts</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-indigo-400">{wardSupporters}</p>
                                                    <p className="text-[8px] font-bold text-slate-500 uppercase">Supporters</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {voters.filter(v => !v.ward).length > 0 && (
                                        <div className="pt-4 border-t border-white/5">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{voters.filter(v => !v.ward).length} Supporters have no ward data</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button className="mt-12 bg-indigo-600 hover:bg-white hover:text-indigo-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/20">
                                View Full Voter Map
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isVoterModalOpen && profile && (
                <CampaignVoterModal 
                    campaignId={profile.id}
                    institutionId={user.institutionId}
                    onClose={() => setIsVoterModalOpen(false)}
                    onSave={(newVoter) => {
                        setVoters([...voters, newVoter]);
                        setIsVoterModalOpen(false);
                    }}
                />
            )}
            {isStaffModalOpen && (
                <CampaignStaffModal 
                    institutionId={user.institutionId}
                    onClose={() => setIsStaffModalOpen(false)}
                    onSave={(newStaff) => {
                        setStaff([...staff, newStaff]);
                        setIsStaffModalOpen(false);
                    }}
                />
            )}
            {isGroupModalOpen && profile && (
                <CampaignGroupModal 
                    campaignId={profile.id}
                    onClose={() => setIsGroupModalOpen(false)}
                    onSave={(newGroup) => {
                        setGroups([...groups, newGroup]);
                        setIsGroupModalOpen(false);
                    }}
                />
            )}
            {isVillageModalOpen && profile && (
                <CampaignVillageModal 
                    campaignId={profile.id}
                    wardName={profile.ward || ''}
                    onClose={() => setIsVillageModalOpen(false)}
                    onSave={(newVillage) => {
                        setVillages([...villages, newVillage]);
                        setIsVillageModalOpen(false);
                    }}
                />
            )}
            {showVoterImportModal && profile && (
                <SmartPoliticalImporterModal
                    type="voters"
                    campaignId={profile.id}
                    groupId={selectedGroupIdForImport || undefined}
                    onClose={() => {
                        setShowVoterImportModal(false);
                        setSelectedGroupIdForImport(null);
                    }}
                    onRefresh={async () => {
                        const voterData = await apiService.fetchModuleRecords<VoterOutreach>('voter_outreach', 'ALL', undefined, { filter: { campaign_id: profile.id } });
                        setVoters(voterData);
                        setShowVoterImportModal(false);
                        setSelectedGroupIdForImport(null);
                    }}
                />
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
        </div>
    );
};

interface CampaignStaffModalProps {
    institutionId: string;
    onClose: () => void;
    onSave: (user: User) => void;
}

const CampaignStaffModal: React.FC<CampaignStaffModalProps> = ({ institutionId, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<Role>('campaign_agent');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name || !email || !phone) return;
        setSaving(true);
        try {
            const newUser: User = {
                id: `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name,
                email,
                phoneNumber: phone,
                role,
                institutionId,
                staffId: `STAFF_${Date.now()}`,
                expertise: [],
                password: 'password123' 
            };
            await apiService.saveModuleRecord('users', newUser);
            onSave(newUser);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Error registering team member.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Register Command Assistant</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorize New Team Member</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                        <XIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Full Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Samuel Okoth" className="form-input" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Email Address</label>
                            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="samuel@example.com" className="form-input" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Phone Number</label>
                            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678" className="form-input" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Command Role</label>
                        <select value={role} onChange={e => setRole(e.target.value as any)} className="form-select uppercase text-xs font-black tracking-widest">
                            <option value="campaign_agent">Campaign Agent (Standard)</option>
                            <option value="campaign_admin">Campaign Co-Admin (Full Access)</option>
                            <option value="staff">Logistics Support</option>
                        </select>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-medium text-slate-500 italic">
                            Newly registered members will receive their login credentials (Portal URL, Email, and default password) via SMS and Email automatically.
                        </p>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={saving || !name || !email}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Registering...' : 'Authorize Access'}
                    </button>
                </div>
            </div>
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
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Error scheduling event.");
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

    const [target, setTarget] = useState(profile?.targetVoterCount || 50000);
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
                profilePicture: profile?.profilePicture,
                campaignPosters: profile?.campaignPosters,
                createdAt: profile?.createdAt || new Date().toISOString()
            };
            await apiService.saveModuleRecord('campaign_profiles', newProfile);
            onSave(newProfile);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to save profile.");
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
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Votes</label>
                                <input type="number" value={target} onChange={e => setTarget(Number(e.target.value))} className="form-input" />
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

interface CampaignGroupModalProps {
    campaignId: string;
    onClose: () => void;
    onSave: (group: CampaignGroup) => void;
}

const CampaignGroupModal: React.FC<CampaignGroupModalProps> = ({ campaignId, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name) return;
        setSaving(true);
        try {
            const newGroup: CampaignGroup = {
                id: `grp_${Date.now()}`,
                campaignId,
                name,
                description,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('campaign_groups', newGroup);
            onSave(newGroup);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Error creating group.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Create Mobilization Group</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Strategic Contact Grouping</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                        <XIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Group Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Boda Boda Mobilizers" className="form-input" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Key objectives for this group..." className="form-input resize-none" />
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={saving || !name}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Creating Group...' : 'Initialize Group'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface CampaignVillageModalProps {
    campaignId: string;
    wardName: string;
    onClose: () => void;
    onSave: (village: CampaignVillage) => void;
}

const CampaignVillageModal: React.FC<CampaignVillageModalProps> = ({ campaignId, wardName, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name) return;
        setSaving(true);
        try {
            const newVillage: CampaignVillage = {
                id: `vil_${Date.now()}`,
                campaignId,
                wardName,
                villageName: name,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('campaign_villages', newVillage);
            onSave(newVillage);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Error registering village.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Add Strategic Village</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ward: {wardName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                        <XIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Village Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kapkures Village" className="form-input" />
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={saving || !name}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Registering...' : 'Add to Ward Strategy'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface CampaignVoterModalProps {
    campaignId: string;
    institutionId: string;
    onClose: () => void;
    onSave: (voter: VoterOutreach) => void;
}

const CampaignVoterModal: React.FC<CampaignVoterModalProps> = ({ campaignId, institutionId, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [idNumber, setIdNumber] = useState(''); // Optional
    const [center, setCenter] = useState('');
    const [status, setStatus] = useState<VoterOutreach['status']>('uncontacted');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name || !phone) {
            alert("Name and Phone Number are required.");
            return;
        }
        setSaving(true);
        try {
            const newVoter: VoterOutreach = {
                id: `vo_${Date.now()}`,
                campaignId,
                institutionId,
                voterName: name,
                phoneNumber: phone,
                idNumber: idNumber || undefined,
                votingCenter: center,
                status,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('voter_outreach', newVoter);
            onSave(newVoter);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Error adding contact.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Add Campaign Contact</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual Voter Intelligence Entry</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                        <XIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Full Name (Compulsory)</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" className="form-input" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Phone Number (Compulsory)</label>
                            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0700 000 000" className="form-input" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">ID Number (Optional)</label>
                            <input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="National ID" className="form-input" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Voting Center</label>
                            <input value={center} onChange={e => setCenter(e.target.value)} placeholder="e.g. Primary School Hall" className="form-input" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Supporter Status</label>
                            <select value={status} onChange={e => setStatus(e.target.value as any)} className="form-select uppercase text-xs font-black tracking-widest">
                                <option value="uncontacted">Uncontacted</option>
                                <option value="supporter">Supporter</option>
                                <option value="undecided">Undecided</option>
                                <option value="opposed">Opposed</option>
                            </select>
                        </div>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={saving || !name || !phone}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Adding...' : 'Save to Intelligence'}
                    </button>
                </div>
            </div>
        </div>
    );
};
