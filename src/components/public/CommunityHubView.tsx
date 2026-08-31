
import React, { useState, useMemo } from 'react';
import { 
    Users, 
    Heart, 
    MapPin, 
    Globe, 
    CircleDollarSign,
    Search,
    ArrowRight,
    GraduationCap,
    Home,
    Sparkles,
    ShieldCheck,
    History,
    Palmtree,
    Zap
} from 'lucide-react';
import type { Institution, County, CampaignProfile } from '../../types';
import { apiService } from '../../services/apiService';

interface CommunityHubViewProps {
    institutions: Institution[];
    counties: County[];
    onBack?: () => void;
    onBookDemo?: () => void;
    onEnterCircle?: () => void;
    onEnterWarRoom?: (profile: CampaignProfile) => void;
    hasActiveAlumnaSession?: boolean;
    hasActiveCampaignSession?: boolean;
}

export const CommunityHubView: React.FC<CommunityHubViewProps> = ({ institutions, counties, onBack, onBookDemo, onEnterCircle, onEnterWarRoom, hasActiveAlumnaSession, hasActiveCampaignSession }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCounty, setSelectedCounty] = useState('all');
    const [activeFilter, setActiveFilter] = useState('all');
    const [campaignProfiles, setCampaignProfiles] = useState<any[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);

    React.useEffect(() => {
        if (activeFilter === 'Political Campaign') {
            const loadProfiles = async () => {
                setLoadingProfiles(true);
                try {
                    const data = await apiService.fetchModuleRecords('campaign_profiles');
                    setCampaignProfiles(data);
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoadingProfiles(false);
                }
            };
            loadProfiles();
        }
    }, [activeFilter]);

    const communityInsts = useMemo(() => {
        return (institutions || []).filter(inst => 
            inst?.institutionType === 'Community' || 
            inst?.institutionType === 'Political Campaign' || 
            ['NGO/Foundation', 'Chama/Savings Group', 'Estate/Neighborhood', 'Relief/Social Work', 'Family Heritage', 'Political Campaign'].includes(inst?.category || '')
        );
    }, [institutions]);

    const filteredInsts = useMemo(() => {
        return communityInsts.filter(inst => {
            const matchesSearch = inst.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCounty = selectedCounty === 'all' || inst.phoneNumber?.includes(selectedCounty); // Hacky location check if no explicit county field
            const matchesFilter = activeFilter === 'all' || inst.category === activeFilter;
            return matchesSearch && matchesCounty && matchesFilter;
        });
    }, [communityInsts, searchTerm, selectedCounty, activeFilter]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans group/hub">
            {/* Premium Header */}
            <nav className="fixed top-0 inset-x-0 bg-white/80 backdrop-blur-xl z-[100] border-b border-slate-100 shadow-sm px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-black text-xl uppercase tracking-tighter text-slate-900">EduAI <span className="text-indigo-600">Community</span></span>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={onBookDemo}
                            className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
                        >
                            Register Group
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-6 bg-gradient-to-b from-indigo-50/50 to-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-indigo-100 mb-8 animate-fade-in">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Verified Social Impact Portals</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 uppercase tracking-tighter mb-6 leading-tight">
                        Powering <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">Community</span> <br /> Resilience
                    </h1>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto mb-12">
                        Discover and connect with local savings groups, neighborhood associations, and verified NGOs using our digital infrastructure.
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-4 p-3 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 mb-12 transform hover:scale-[1.01] transition-all">
                        <div className="flex-1 flex items-center px-4 gap-3 bg-slate-50 rounded-2xl border border-transparent focus-within:border-indigo-100 focus-within:bg-white transition-all">
                            <Search className="w-5 h-5 text-slate-400" />
                            <input 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by name or focus area..." 
                                className="w-full py-4 bg-transparent outline-none font-bold text-slate-700 placeholder:text-slate-300"
                            />
                        </div>
                        <select 
                            value={selectedCounty}
                            onChange={e => setSelectedCounty(e.target.value)}
                            className="px-6 py-4 bg-slate-50 rounded-2xl border-none outline-none font-black text-[10px] uppercase tracking-widest text-slate-500 appearance-none cursor-pointer hover:bg-slate-100"
                        >
                            <option value="all">Everywhere</option>
                            {counties.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-100">
                            Find Now
                        </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                        {['all', 'Chama/Savings Group', 'Estate/Neighborhood', 'NGO/Foundation', 'Family Heritage', 'Political Campaign'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-6 py-2 rounded-full font-black uppercase text-[9px] tracking-widest transition-all border-2 ${activeFilter === filter ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                            >
                                {filter === 'all' ? 'Browse All' : filter === 'Family Heritage' ? 'Heritage' : filter === 'Political Campaign' ? 'Campaign Battleground' : filter.split('/')[0]}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="max-w-7xl mx-auto px-6 py-20">
                {activeFilter === 'Political Campaign' ? (
                    <div className="space-y-16">
                        {/* Grouped Comparison View */}
                        {Array.from(new Set(campaignProfiles.map(p => `${p.position}|${p.constituencyWard}`))).map(groupKey => {
                            const [pos, ward] = groupKey.split('|');
                            const groupAspirants = campaignProfiles.filter(p => p.position === pos && p.constituencyWard === ward);
                            
                            return (
                                <div key={groupKey} className="space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px flex-1 bg-slate-200"></div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-400">
                                            {pos} BATTLE: <span className="text-indigo-600">{ward}</span>
                                        </h2>
                                        <div className="h-px flex-1 bg-slate-200"></div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {groupAspirants.map(aspirant => (
                                                <div key={aspirant.id} className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col h-full">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                                                    
                                                    <div className="flex items-center gap-5 mb-8">
                                                        <div className="relative">
                                                            {aspirant.profilePicture ? (
                                                                <img loading="lazy" 
                                                                    src={aspirant.profilePicture} 
                                                                    alt={aspirant.candidateName}
                                                                    className="w-20 h-20 rounded-[2rem] object-cover shadow-xl ring-4 ring-white"
                                                                />
                                                            ) : (
                                                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl shadow-xl ring-4 ring-white">
                                                                    {aspirant.candidateName[0]}
                                                                </div>
                                                            )}
                                                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                                                                <ShieldCheck className="w-4 h-4 text-white" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1 group-hover:text-indigo-600 transition-colors">{aspirant.candidateName}</h3>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg">{aspirant.partyName || 'Independent'}</span>
                                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{aspirant.constituencyWard}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 space-y-8">
                                                        {aspirant.tagline && (
                                                            <p className="text-sm font-black text-slate-800 uppercase italic leading-tight tracking-tight border-l-4 border-indigo-500 pl-4">{aspirant.tagline}</p>
                                                        )}

                                                        <div className="space-y-4">
                                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 pb-2 flex justify-between">
                                                                <span>Strategic Agenda</span>
                                                                {aspirant.campaignPosters?.length > 0 && <span className="text-indigo-500">{aspirant.campaignPosters.length} Posters Available</span>}
                                                            </p>
                                                            <div className="space-y-3">
                                                                {(aspirant.agendas || []).slice(0, 3).map((a: string, i: number) => (
                                                                    <div key={i} className="flex gap-3 items-start">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></div>
                                                                        <p className="text-xs font-bold text-slate-600 uppercase leading-snug tracking-tight">{a}</p>
                                                                    </div>
                                                                ))}
                                                                {(!aspirant.agendas || aspirant.agendas.length === 0) && (
                                                                    <p className="text-[10px] text-slate-300 italic uppercase font-black tracking-widest">Awaiting manifesto publication...</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {aspirant.manifestoAiDraft && (
                                                            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Vision Summary</p>
                                                                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3 font-medium italic">
                                                                    "{aspirant.manifestoAiDraft.substring(0, 200)}..."
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                         <div className="flex -space-x-3">
                                                             {[1, 2, 3].map(i => (
                                                                 <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400">
                                                                     {i}+
                                                                 </div>
                                                             ))}
                                                         </div>
                                                         <div className="flex flex-wrap gap-2">
                                                             {hasActiveCampaignSession && (
                                                                 <button 
                                                                     onClick={() => onEnterWarRoom?.(aspirant)}
                                                                     className="flex items-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                                                                 >
                                                                     Enter War Room <Zap className="w-3 h-3" />
                                                                 </button>
                                                             )}
                                                             <button 
                                                                 onClick={() => {
                                                                     const inst = institutions.find(i => i.id === aspirant.institutionId);
                                                                     const targetSlug = inst?.slug || aspirant.candidateName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
                                                                     window.open(`https://${targetSlug}.eduai.co.ke`, '_blank');
                                                                 }}
                                                                 className="flex items-center gap-3 px-6 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-100 transition-all active:scale-95"
                                                             >
                                                                 Access Portal <Globe className="w-4 h-4" />
                                                             </button>
                                                             <button 
                                                                 onClick={() => window.location.href = `/?view=join-campaign&id=${aspirant.inviteSlug || aspirant.id}`}
                                                                 className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-200 transition-all active:scale-95 group/btn"
                                                             >
                                                                 Pledge Support <ArrowRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
                                                             </button>
                                                         </div>
                                                     </div>
                                                </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {campaignProfiles.length === 0 && (
                            <div className="py-20 text-center opacity-50">
                                <Sparkles className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                                <p className="font-black uppercase tracking-widest text-xs">Awaiting first candidates to enter the battleground...</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Travel Hub Promotion Card */}
                        <div 
                            onClick={() => window.location.href = '/?view=travel'}
                            className="bg-slate-900 rounded-[3rem] p-8 border border-slate-800 shadow-2xl hover:-translate-y-2 transition-all group overflow-hidden relative cursor-pointer md:col-span-2 lg:col-span-1"
                        >
                            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rotate-45 translate-x-16 -translate-y-16 group-hover:bg-indigo-500/20 transition-colors"></div>
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div>
                                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-500/20">
                                        <Palmtree className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-4">
                                        Travel & <br /> <span className="text-indigo-400 italic">Leisure Hub</span>
                                    </h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                                        Discover the best safaris, hotels, and tours from our verified partners.
                                    </p>
                                </div>
                                <button className="mt-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 group-hover:bg-indigo-400 group-hover:text-white transition-all">
                                    Explore Travel Marketplace <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Alumnae Registry or Circle Card */}
                        {hasActiveAlumnaSession ? (
                            <div 
                                onClick={onEnterCircle}
                                className="bg-indigo-600 rounded-[3rem] p-8 border border-indigo-500 shadow-2xl hover:-translate-y-2 transition-all group overflow-hidden relative cursor-pointer"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mt-16 -mr-16 group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="relative z-10 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-6 backdrop-blur-xl">
                                            <Sparkles className="w-8 h-8 animate-pulse" />
                                        </div>
                                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-4">
                                            My Alumnae <br /> <span className="text-indigo-200 italic">Circle Feed</span>
                                        </h3>
                                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest leading-relaxed">
                                            Jump back into the conversation. See what's happening in your institutional network.
                                        </p>
                                    </div>
                                    <button className="mt-8 py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-2xl shadow-indigo-900/40">
                                        Open Social Feed <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div 
                                onClick={() => window.location.href = 'https://almamater.eduai.co.ke/?view=alumnae_register'}
                                className="bg-indigo-700 rounded-[3rem] p-8 border border-indigo-600 shadow-2xl hover:-translate-y-2 transition-all group overflow-hidden relative cursor-pointer"
                            >
                                <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full -mb-20 -mr-20 group-hover:scale-110 transition-transform"></div>
                                <div className="relative z-10 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-6 backdrop-blur-md">
                                            <GraduationCap className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-4">
                                            Alumnae & <br /> <span className="text-white/60 italic">Graduates</span>
                                        </h3>
                                        <p className="text-white/60 text-xs font-bold uppercase tracking-widest leading-relaxed">
                                            Join your institution's elite professional network. Reconnect with peers and mentor the next generation.
                                        </p>
                                    </div>
                                    <button className="mt-8 py-4 bg-white text-indigo-700 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/40">
                                        Become a Member <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {filteredInsts.map((inst, i) => (
                            <div key={inst.id} className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rotate-45 translate-x-16 -translate-y-16 group-hover:bg-indigo-50 transition-colors"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                                            inst.category === 'Chama/Savings Group' ? 'bg-green-50 text-green-600' : 
                                            inst.category === 'Estate/Neighborhood' ? 'bg-blue-50 text-blue-600' : 
                                            inst.category === 'Family Heritage' ? 'bg-amber-50 text-amber-600' : 'bg-pink-50 text-pink-600'
                                        }`}>
                                            {inst.category === 'Chama/Savings Group' ? <CircleDollarSign className="w-8 h-8" /> : 
                                            inst.category === 'Estate/Neighborhood' ? <Home className="w-8 h-8" /> : 
                                            inst.category === 'Family Heritage' ? <History className="w-8 h-8" /> : <Heart className="w-8 h-8" />}
                                        </div>
                                        <span className="text-[9px] font-black uppercase px-3 py-1 bg-slate-50 text-slate-400 rounded-full tracking-tighter">
                                            ID: {inst.id.slice(0, 6)}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2 group-hover:text-indigo-600 transition-colors">{inst.name}</h3>
                                    <div className="flex items-center gap-2 mb-6">
                                        <MapPin className="w-4 h-4 text-slate-300" />
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{inst.phoneNumber || 'Remote Operations'}</span>
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 border-b border-slate-50 pb-2 tracking-widest">
                                            <span>Primary Goal</span>
                                            <span className="text-slate-800">{inst.category?.split('/')[0]}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 border-b border-slate-50 pb-2 tracking-widest">
                                            <span>Status</span>
                                            <div className="flex items-center gap-1.5 text-green-600">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                                Active
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                         onClick={() => {
                                             const targetSlug = inst.slug || inst.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
                                             window.open(`https://${targetSlug}.eduai.co.ke`, '_blank');
                                         }}
                                        className="w-full bg-slate-50 group-hover:bg-indigo-600 text-slate-600 group-hover:text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        Access Portal
                                        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {filteredInsts.length === 0 && (
                    <div className="py-32 text-center">
                        <Globe className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-slate-300 uppercase tracking-widest">No matching communities found</h3>
                        <p className="text-slate-400 mt-2">Try adjusting your filters or search keywords.</p>
                    </div>
                )}
            </section>

            {/* Call to Action */}
            <section className="bg-slate-900 py-24 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] -mr-96 -mt-96"></div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-8 italic">
                        Bring your community <br /> <span className="text-indigo-400 underline decoration-indigo-500 underline-offset-8">to the future.</span>
                    </h2>
                    <p className="text-slate-400 text-lg mb-12 max-w-xl mx-auto">
                        Whether you're managing a savings group, an estate association, or a social foundation, we provide the tools to scale your impact.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all shadow-2xl shadow-indigo-500/20 active:scale-95">
                            Start for Free
                        </button>
                        <button className="bg-white/10 hover:bg-white/20 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all backdrop-blur border border-white/10 active:scale-95">
                            Documentation
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-slate-100 bg-white">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                        EduAI Community Neural Link v1.0
                    </p>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 italic">Secure Social Infrastructure</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

