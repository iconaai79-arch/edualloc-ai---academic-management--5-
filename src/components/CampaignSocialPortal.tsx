
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Users, 
    MessageSquare, 
    Bell, 
    Search, 
    Settings, 
    LogOut, 
    Plus, 
    Heart, 
    Share2, 
    MoreHorizontal,
    Send,
    ShieldCheck,
    Sparkles,
    Flag,
    MapPin,
    Trophy,
    Target,
    Zap,
    X,
    Image as ImageIcon,
    Loader2,
    CheckCircle2,
    User
} from 'lucide-react';
import { apiService } from '../services/apiService';
import type { Institution, CampaignProfile } from '../types';

interface CampaignSocialPortalProps {
    currentMember: any;
    campaignProfile: CampaignProfile;
    onBack?: () => void;
}

export const CampaignSocialPortal: React.FC<CampaignSocialPortalProps> = ({ currentMember, campaignProfile, onBack }) => {
    const [activeTab, setActiveTab] = useState<'battleground' | 'strategy' | 'mobilization' | 'members'>('battleground');
    const [posts, setPosts] = useState<any[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [postsLimit, setPostsLimit] = useState(10);
    
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConversationPartner, setActiveConversationPartner] = useState<any | null>(null);

    useEffect(() => {
        loadPosts();
    }, [activeTab]);

    const loadPosts = async () => {
        setLoadingPosts(true);
        try {
            // Use institution_id of the campaign to filter relevant political posts
            const data = await apiService.fetchModuleRecords('alumni_posts', undefined, undefined, { 
                filter: { institution_id: campaignProfile.institutionId },
                order: 'created_at.desc',
                limit: postsLimit
            });
            setPosts(data || []);
        } catch (e) {
            console.error("Failed to load campaign posts:", e);
        } finally {
            setLoadingPosts(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) return;
        setIsPosting(true);
        try {
            await apiService.saveModuleRecord('alumni_posts', {
                id: `cp_${Date.now()}`,
                institution_id: campaignProfile.institutionId,
                author_id: currentMember.id,
                author_name: currentMember.fullName || currentMember.full_name,
                author_role: currentMember.campaignRole || 'Campaign Member',
                author_photo: currentMember.profilePhotoUrl || currentMember.profile_photo,
                content: newPostContent,
                category: activeTab === 'strategy' ? 'Strategy' : 'Battleground',
                created_at: new Date().toISOString()
            });
            setNewPostContent('');
            loadPosts();
        } catch (e) {
            console.error(e);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-indigo-500/30">
            {/* War Room Header */}
            <nav className="fixed top-0 inset-x-0 bg-slate-900/80 backdrop-blur-2xl z-[100] border-b border-white/5 px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group cursor-pointer" onClick={onBack}>
                        <Flag className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="hidden md:block">
                        <h2 className="text-xl font-black uppercase tracking-tighter leading-none">
                            Team <span className="text-indigo-400">{campaignProfile.candidateName.split(' ')[0]}</span>
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Command Circle Hub</p>
                    </div>
                </div>

                <div className="flex-1 max-w-xl mx-12 hidden lg:block">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                            placeholder="Search strategy, voter data, or field updates..." 
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                        <Bell className="w-6 h-6" />
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-[#0f172a]"></span>
                    </button>
                    
                    <div className="flex items-center gap-3 pl-6 border-l border-white/5">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-black uppercase tracking-tight">{currentMember.fullName || currentMember.full_name}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">{currentMember.campaignRole || 'Strategic Advisor'}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 overflow-hidden shadow-xl">
                            {currentMember.profilePhotoUrl || currentMember.profile_photo ? (
                                <img loading="lazy" src={currentMember.profilePhotoUrl || currentMember.profile_photo} className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-full h-full p-2 text-indigo-400" />
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto pt-28 px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
                
                {/* Tactical Navigation (Sidebar) - Hidden on mobile */}
                <aside className="hidden lg:block lg:col-span-3 space-y-6">
                    <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-4 overflow-hidden">
                        <nav className="space-y-2">
                            {[
                                { id: 'battleground', label: 'Battleground', icon: <Zap /> },
                                { id: 'strategy', label: 'Strategy Room', icon: <Target /> },
                                { id: 'mobilization', label: 'Mobilization', icon: <Users /> },
                                { id: 'members', label: 'Command Team', icon: <ShieldCheck /> }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as any)}
                                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all group ${
                                        activeTab === item.id 
                                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' 
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <span className={`${activeTab === item.id ? 'text-white' : 'text-indigo-400 group-hover:text-white'} transition-colors`}>
                                        {React.cloneElement(item.icon as any, { className: 'w-5 h-5' })}
                                    </span>
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 rounded-[2.5rem] p-8 border border-indigo-500/20 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mt-16 -mr-16"></div>
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-4 relative z-10">War Room <br /> <span className="text-indigo-400">Statistics</span></h3>
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reach</span>
                                <span className="text-xs font-black">2.4M</span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="w-3/4 h-full bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Volunteers</span>
                                <span className="text-xs font-black">450+</span>
                            </div>
                        </div>
                        <button className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5">
                            Detailed Report
                        </button>
                    </div>
                </aside>

                {/* Main Battleground Feed */}
                <main className="lg:col-span-6 space-y-8 pb-20 lg:pb-0">
                    {/* Strategy Broadcast Area */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-[3rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 overflow-hidden flex items-center justify-center">
                                {currentMember.profilePhotoUrl || currentMember.profile_photo ? (
                                    <img loading="lazy" src={currentMember.profilePhotoUrl || currentMember.profile_photo} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-6 h-6 text-indigo-400" />
                                )}
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest">Post a Field Update</h3>
                        </div>
                        <textarea 
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder={activeTab === 'strategy' ? "Outline tactical objectives..." : "Report progress from the field..."}
                            className="w-full h-32 bg-transparent text-slate-200 placeholder:text-slate-600 font-medium outline-none resize-none text-lg border-b border-white/5 focus:border-indigo-500/50 transition-all"
                        ></textarea>
                        <div className="mt-6 flex items-center justify-between">
                            <div className="flex gap-4">
                                <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-indigo-400 transition-all">
                                    <ImageIcon className="w-5 h-5" />
                                </button>
                                <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-indigo-400 transition-all">
                                    <Target className="w-5 h-5" />
                                </button>
                            </div>
                            <button 
                                onClick={handleCreatePost}
                                disabled={isPosting || !newPostContent.trim()}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-indigo-500/20"
                            >
                                {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Broadcast
                            </button>
                        </div>
                    </div>

                    {/* Feed Content */}
                    <div className="space-y-6">
                        {loadingPosts ? (
                            <div className="py-20 flex flex-col items-center gap-4">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Synchronizing War Room Feed...</p>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="py-32 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                <Flag className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                <h3 className="text-xl font-black uppercase tracking-widest text-slate-500">Quiet on the Frontlines</h3>
                                <p className="text-xs text-slate-600 font-medium mt-2">Start the conversation by posting an update.</p>
                            </div>
                        ) : posts.map((post) => (
                            <div key={post.id} className="bg-slate-900/80 border border-white/5 rounded-[3rem] p-10 hover:border-indigo-500/30 transition-all group animate-in fade-in slide-in-from-bottom-8 duration-500">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="flex gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-white/5 overflow-hidden">
                                            {post.author_photo ? <img loading="lazy" src={post.author_photo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-3 text-slate-600" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-black text-white uppercase tracking-tight">{post.author_name}</h4>
                                                {post.category === 'Strategy' && <ShieldCheck className="w-4 h-4 text-indigo-400" />}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest">{post.author_role}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">2h ago</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="text-slate-600 hover:text-white transition-colors">
                                        <MoreHorizontal className="w-6 h-6" />
                                    </button>
                                </div>

                                <p className="text-lg text-slate-300 font-medium leading-relaxed mb-8">
                                    {post.content}
                                </p>

                                <div className="flex items-center justify-between pt-8 border-t border-white/5">
                                    <div className="flex gap-8">
                                        <button className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors group/btn">
                                            <Heart className="w-5 h-5 group-hover/btn:fill-current" />
                                            <span className="text-xs font-black uppercase tracking-widest">12</span>
                                        </button>
                                        <button className="flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors">
                                            <MessageSquare className="w-5 h-5" />
                                            <span className="text-xs font-black uppercase tracking-widest">4</span>
                                        </button>
                                    </div>
                                    <button className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
                                        <Share2 className="w-5 h-5" />
                                        <span className="text-xs font-black uppercase tracking-widest">Briefing</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {posts.length >= postsLimit && (
                            <div className="flex justify-center py-12">
                                <button 
                                    onClick={() => setPostsLimit(prev => prev + 10)}
                                    className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:border-indigo-500 transition-all active:scale-95"
                                >
                                    Sync More Intel
                                </button>
                            </div>
                        )}
                    </div>
                </main>

                {/* Tactical Intel (Right Sidebar) */}
                <aside className="lg:col-span-3 space-y-8">
                    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2.5rem] p-8">
                        <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Strategic Objectives
                        </h3>
                        <div className="space-y-6">
                            {[
                                { title: 'Voter Registration Drive', progress: 85, color: 'bg-emerald-500' },
                                { title: 'Door-to-Door Canvassing', progress: 42, color: 'bg-indigo-500' },
                                { title: 'Social Media Reach', progress: 68, color: 'bg-violet-500' }
                            ].map((obj, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                                        <span>{obj.title}</span>
                                        <span className="text-slate-400">{obj.progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className={`h-full ${obj.color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} style={{ width: `${obj.progress}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Top Strategists</h3>
                        <div className="space-y-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4 group cursor-pointer">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 overflow-hidden ring-2 ring-transparent group-hover:ring-indigo-500 transition-all">
                                        <User className="w-full h-full p-2 text-slate-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black uppercase text-white truncate">Strategist {i}</p>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">Ground Team Lead</p>
                                    </div>
                                    <Trophy className="w-4 h-4 text-amber-500 opacity-40 group-hover:opacity-100" />
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-8 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-white/5 rounded-xl transition-all">
                            View Full Command
                        </button>
                    </div>
                </aside>
            </div>

            {/* Mobile Bottom Tactical Navigation */}
            <nav className="lg:hidden fixed bottom-0 inset-x-0 h-18 bg-slate-900/95 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-2 z-[110] pb-2">
                {[
                    { id: 'battleground', label: 'Battle', icon: <Zap /> },
                    { id: 'strategy', label: 'Strategy', icon: <Target /> },
                    { id: 'mobilization', label: 'Field', icon: <Users /> },
                    { id: 'members', label: 'Team', icon: <ShieldCheck /> }
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 py-3 ${
                            activeTab === item.id ? 'text-indigo-400' : 'text-slate-500'
                        }`}
                    >
                        {React.cloneElement(item.icon as any, { 
                            className: `w-5 h-5 ${activeTab === item.id ? 'scale-110' : ''} transition-transform` 
                        })}
                        <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

