
import React, { useState, useEffect } from 'react';
import { 
    Users, 
    Sparkles, 
    ShieldCheck, 
    ArrowRight,
    MapPin,
    Heart,
    Phone,
    User,
    CheckCircle2
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { CampaignProfile } from '../../types';

interface CampaignJoinPageProps {
    campaignId: string;
    onBack?: () => void;
}

export const CampaignJoinPage: React.FC<CampaignJoinPageProps> = ({ campaignId, onBack }) => {
    const [profile, setProfile] = useState<CampaignProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [joining, setJoining] = useState(false);
    const [joined, setJoined] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            try {
                // Try searching by inviteSlug first, then id
                let data = await apiService.fetchModuleRecords<CampaignProfile>('campaign_profiles', 'ALL', undefined, { filter: { invite_slug: campaignId } });
                if (data.length === 0) {
                    data = await apiService.fetchModuleRecords<CampaignProfile>('campaign_profiles', 'ALL', undefined, { filter: { id: campaignId } });
                }
                
                if (data.length > 0) {
                    setProfile(data[0]);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, [campaignId]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone || !profile) return;
        
        setJoining(true);
        try {
            await apiService.saveModuleRecord('voter_outreach', {
                id: `vo_${Date.now()}`,
                campaignId: profile.id,
                institutionId: profile.institutionId,
                voterName: name,
                phoneNumber: phone,
                status: 'supporter',
                createdAt: new Date().toISOString()
            });
            setJoined(true);
        } catch (e) {
            console.error(e);
            alert("Error joining campaign. Please try again.");
        } finally {
            setJoining(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-indigo-500 animate-pulse" />
        </div>
    );

    if (!profile) return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
            <Heart className="w-20 h-20 text-slate-800 mb-6" />
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Campaign Not Found</h1>
            <p className="text-slate-400 mb-8 max-w-md">The campaign link you followed seems to be invalid or has expired.</p>
            <button onClick={onBack} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest">Return Home</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 font-sans relative overflow-hidden flex flex-col">
            {/* Dynamic Background - Candidates Portrait Blurred */}
            {profile.profilePicture && (
                <div 
                    className="absolute inset-0 opacity-20 blur-[100px] scale-110 pointer-events-none"
                    style={{ 
                        backgroundImage: `url(${profile.profilePicture})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                ></div>
            )}
            
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px] -mr-96 -mt-96"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px] -ml-48 -mb-48"></div>

            <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10 w-full max-w-7xl mx-auto">
                <div className="w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                    
                    {/* Hero Portrait Section - 3D Effect */}
                    <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-end group">
                        <div className="relative transform perspective-[1500px] rotate-y-[-10deg] lg:rotate-y-[-15deg] group-hover:rotate-y-[-5deg] transition-all duration-700 ease-out">
                            {/* 3D Depth Layers */}
                            <div className="absolute -inset-4 bg-indigo-600/20 rounded-[4rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="relative w-[280px] h-[380px] md:w-[400px] md:h-[540px] rounded-[3.5rem] overflow-hidden shadow-[30px_50px_100px_rgba(0,0,0,0.5)] border-4 border-white/10">
                                {profile.profilePicture ? (
                                    <img 
                                        src={profile.profilePicture} 
                                        alt={profile.candidateName} 
                                        className="w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform duration-1000" 
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-indigo-900 flex items-center justify-center text-white font-black text-9xl">
                                        {profile.candidateName[0]}
                                    </div>
                                )}
                                
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
                                
                                {/* Floating Badge */}
                                <div className="absolute bottom-8 left-8 p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center gap-2 transform translate-z-20 group-hover:translate-x-2 transition-transform">
                                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                    <span className="text-[10px] font-black uppercase text-white tracking-widest">Verified Identity</span>
                                </div>
                            </div>

                            {/* Floating Stats or Tagline Overlay */}
                            <div className="absolute -bottom-10 -right-10 md:-right-20 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 hidden md:block max-w-[300px] transform translate-z-40">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                                        <Users className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Global Support</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">1,250+</p>
                                    </div>
                                </div>
                                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase leading-relaxed tracking-tight">
                                    {profile.tagline || `Join the movement for a better ${profile.constituencyWard}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Join Form Section - Glassmorphism */}
                    <div className="w-full lg:w-1/2 max-w-xl">
                        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3.5rem] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50">
                            
                            {/* Inner Header */}
                            <div className="p-10 md:p-14 border-b border-slate-100 dark:border-slate-800/50">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 mb-4 block">Official Command Center</span>
                                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 leading-[0.9]">
                                    Team <span className="text-indigo-600">{profile.candidateName.split(' ')[0]}</span>
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-indigo-500" /> {profile.position} Candidate · {profile.constituencyWard}
                                </p>
                            </div>

                            {/* Form Content */}
                            <div className="p-10 md:p-14">
                                {joined ? (
                                    <div className="text-center py-10 animate-fade-in">
                                        <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                                            <CheckCircle2 className="w-12 h-12" />
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-6">You're in the Fight!</h2>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed max-w-xs mx-auto text-lg">
                                            Welcome to the change that starts today with your support for {profile.candidateName}.
                                        </p>
                                        <button 
                                            onClick={onBack}
                                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                                        >
                                            Explore Platform
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-12">
                                        
                                        {/* Agendas Preview */}
                                        {profile.agendas && profile.agendas.length > 0 && (
                                            <div className="space-y-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Our Shared Vision</p>
                                                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {profile.agendas.slice(0, 2).map((a, i) => (
                                                        <div key={i} className="flex gap-4 items-center p-5 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>
                                                            <p className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-tight leading-none">{a}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <form onSubmit={handleJoin} className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-6">Your Identity</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                                        <User className="w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                                                    </div>
                                                    <input 
                                                        required
                                                        value={name}
                                                        onChange={e => setName(e.target.value)}
                                                        placeholder="FULL NAME"
                                                        className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800/30 border-2 border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 rounded-3xl font-black text-xs uppercase tracking-widest placeholder:text-slate-300 outline-none transition-all shadow-inner"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-6">Digital Contact</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                                        <Phone className="w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                                                    </div>
                                                    <input 
                                                        required
                                                        type="tel"
                                                        value={phone}
                                                        onChange={e => setPhone(e.target.value)}
                                                        placeholder="PHONE NUMBER"
                                                        className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800/30 border-2 border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 rounded-3xl font-black text-xs uppercase tracking-widest placeholder:text-slate-300 outline-none transition-all shadow-inner"
                                                    />
                                                </div>
                                            </div>

                                            <button 
                                                disabled={joining}
                                                className="w-full relative group overflow-hidden bg-indigo-600 p-1 rounded-3xl active:scale-95 transition-all disabled:opacity-50 mt-4 h-[72px]"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 group-hover:animate-gradient-x"></div>
                                                <div className="relative h-full bg-indigo-600 group-hover:bg-transparent transition-colors rounded-[calc(1.5rem-2px)] flex items-center justify-center gap-4 text-white">
                                                    {joining ? (
                                                        <Sparkles className="w-6 h-6 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <span className="font-black uppercase text-xs tracking-[0.3em]">Pledge My Support</span>
                                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                                        </>
                                                    )}
                                                </div>
                                            </button>
                                        </form>

                                        <p className="text-center text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] leading-relaxed">
                                            BY PLEDGING, YOU AGREE TO RECEIVE <span className="text-indigo-500">OFFICIAL COMMAND UPDATES</span> AND LOGISTICAL INVITES FROM TEAM {profile.candidateName.split(' ')[0]}.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-20 flex flex-col md:flex-row items-center gap-10 md:gap-20 opacity-40">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">EduAI Political Command Hub v2.1</p>
                    <div className="flex gap-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Secured with AES-256</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Universal Reach Enabled</span>
                    </div>
                </div>
            </main>
        </div>
    );
};
