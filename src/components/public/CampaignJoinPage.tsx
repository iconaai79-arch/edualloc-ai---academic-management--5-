
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
import { CampaignProfile } from '../types';

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
                let data = await apiService.fetchModuleRecords<CampaignProfile>('campaign_profiles', 'ALL', undefined, { invite_slug: campaignId });
                if (data.length === 0) {
                    data = await apiService.fetchModuleRecords<CampaignProfile>('campaign_profiles', 'ALL', undefined, { id: campaignId });
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
        <div className="min-h-screen bg-slate-50 font-sans relative overflow-hidden flex flex-col">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[120px] -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[100px] -ml-24 -mb-24"></div>

            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-xl">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-indigo-50 dark:border-slate-800">
                        {/* Header */}
                        <div className="bg-indigo-600 p-12 text-center text-white relative">
                            <div className="absolute top-0 inset-x-0 h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                            <div className="relative z-10">
                                <div className="w-24 h-24 bg-white rounded-3xl mx-auto mb-6 flex items-center justify-center text-indigo-600 font-black text-4xl shadow-2xl">
                                    {profile.candidateName[0]}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-2 block">Official Campaign Gateway</span>
                                <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Team {profile.candidateName.split(' ')[0]}</h1>
                                <p className="text-indigo-100 font-bold text-sm uppercase flex items-center justify-center gap-2">
                                    <MapPin className="w-4 h-4" /> {profile.position} Candidate · {profile.constituencyWard}
                                </p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-12">
                            {joined ? (
                                <div className="text-center py-8 animate-fade-in">
                                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 className="w-12 h-12" />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">Welcome to the Team!</h2>
                                    <p className="text-slate-500 font-medium mb-8">
                                        Thank you for joining our movement. You are now part of the campaign for {profile.candidateName}. We will keep you updated via SMS.
                                    </p>
                                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 italic text-sm text-slate-600 font-medium">
                                        "Together, we will transform {profile.constituencyWard} for the better!"
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="text-center">
                                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Join the Movement</h2>
                                        <p className="text-slate-400 text-sm font-medium">Leave your details to receive campaign updates and event invites.</p>
                                    </div>

                                    <form onSubmit={handleJoin} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                                <input 
                                                    required
                                                    value={name}
                                                    onChange={e => setName(e.target.value)}
                                                    placeholder="e.g. John Doe"
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold placeholder:text-slate-200 outline-none focus:bg-white transition-all shadow-inner"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Phone Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                                <input 
                                                    required
                                                    type="tel"
                                                    value={phone}
                                                    onChange={e => setPhone(e.target.value)}
                                                    placeholder="0712 345 678"
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold placeholder:text-slate-200 outline-none focus:bg-white transition-all shadow-inner"
                                                />
                                            </div>
                                        </div>

                                        <button 
                                            disabled={joining}
                                            className="w-full bg-indigo-600 hover:bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                                        >
                                            {joining ? 'Processing...' : (
                                                <>Support {profile.candidateName.split(' ')[0]} <ArrowRight className="w-5 h-5" /></>
                                            )}
                                        </button>
                                    </form>

                                    <div className="pt-8 border-t border-slate-50 flex items-center justify-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Verified Candidate</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-indigo-500" />
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">1k+ Supporters</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="mt-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                        Powered by EduAI Political Command
                    </p>
                </div>
            </main>
        </div>
    );
};
