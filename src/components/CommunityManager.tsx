
import React, { useState, useMemo } from 'react';
import { 
    Users, 
    Home, 
    Heart, 
    Globe, 
    CircleDollarSign,
    Calendar,
    ShieldCheck,
    MessageSquare,
    FileText,
    Plus,
    RotateCw,
    MapPin,
    Ghost,
    History,
    Network,
    Library,
    Mic,
    Image as ImageIcon,
    TreePalm,
    CalendarDays as CalendarDaysIcon,
    ArrowRight,
    Sparkles,
    Loader2,
    Star,
    Vote,
    CheckCircle
} from 'lucide-react';
import type { 
    Institution, User, 
    HeritageMember, HeritageStory, HeritageGallery, HeritageAnnouncement,
    CampaignProfile, CampaignVote
} from '../types';
import { apiService } from '../services/apiService';
import { LeadScoutManager } from './LeadScoutManager';

interface CommunityManagerProps {
    currentInstitution: Institution;
    users: User[];
}

const RELATIONSHIP_OPTIONS = [
    'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 
    'Grandfather', 'Grandmother', 'Great Grandfather', 'Great Grandmother',
    'Great-Great Grandfather', 'Great-Great Grandmother',
    'Uncle', 'Aunt', 'Cousin', 'Nephew', 'Niece', 'Husband', 'Wife', 'Other'
];

export const CommunityManager: React.FC<CommunityManagerProps> = ({ currentInstitution, users }) => {
    const category = currentInstitution.category || 'NGO/Foundation';
    
    const isHeritage = category.includes('Family') || category.includes('Heritage') || currentInstitution.institutionType === 'Community' && category.includes('Heritage');
    const isCampaign = category.includes('Political') || category.includes('Campaign') || currentInstitution.institutionType === 'Political Campaign';

    // Determine initial view based on category
    const getInitialTab = () => {
        if (category.includes('Chama')) return 'savings';
        if (category.includes('Estate')) return 'residences';
        if (category.includes('NGO')) return 'social';
        if (isHeritage) return 'heritage';
        if (isCampaign) return 'campaign';
        return 'overview';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab());
    const [searchTerm, setSearchTerm] = useState('');
    const [heritageView, setHeritageView] = useState<'tree' | 'stories' | 'gallery' | 'announcements'>('tree');
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Heritage Data States
    const [treeMembers, setTreeMembers] = useState<HeritageMember[]>([]);
    const [heritageStories, setHeritageStories] = useState<HeritageStory[]>([]);
    const [heritageGallery, setHeritageGallery] = useState<HeritageGallery[]>([]);
    const [heritageAnnouncements, setHeritageAnnouncements] = useState<HeritageAnnouncement[]>([]);
    
    // Campaign Voting States
    const [allCampaigns, setAllCampaigns] = useState<CampaignProfile[]>([]);
    const [myVotes, setMyVotes] = useState<CampaignVote[]>([]);
    const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
    const [isVoting, setIsVoting] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const [newMember, setNewMember] = useState<Partial<HeritageMember>>({ 
        name: '', 
        branch: 'Paternal', 
        relation: '', 
        birthYear: '', 
        deathYear: '', 
        notes: '' 
    });
    const [addMemberError, setAddMemberError] = useState('');

    // Fetch Metadata
    React.useEffect(() => {
        if (isHeritage) fetchHeritageData();
        if (isCampaign) fetchCampaignVotingData();
    }, [isHeritage, isCampaign, currentInstitution.id]);

    const fetchHeritageData = async () => {
        // ... previous code for heritage ...
    };

    const fetchCampaignVotingData = async () => {
        setIsLoading(true);
        try {
            const [profiles, votes] = await Promise.all([
                apiService.fetchModuleRecords<CampaignProfile>('campaign_profiles'),
                apiService.fetchModuleRecords<CampaignVote>('campaign_votes')
            ]);
            setAllCampaigns(profiles);
            setMyVotes(votes);
            
            // Calculate pseudo-live counts (in a real app, this would be an aggregation query)
            const counts: Record<string, number> = {};
            votes.forEach(v => {
                counts[v.campaignId] = (counts[v.campaignId] || 0) + 1;
            });
            setVoteCounts(counts);
        } catch (error) {
            console.error('Error fetching campaign data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCastVote = async (campaignId: string, position: string, rating: number) => {
        setIsVoting(true);
        try {
            // Check if already voted for this category
            const existing = myVotes.find(v => v.position === position);
            
            const voteToSave = {
                id: existing?.id || `vote_${Date.now()}`,
                voterId: 'CURRENT_USER', // In a real app, this would be auth.uid()
                campaignId,
                position,
                rating,
                createdAt: new Date().toISOString()
            } as CampaignVote;

            const saved = await apiService.saveModuleRecord('campaign_votes', voteToSave);
            if (saved) {
                setMyVotes(prev => [...prev.filter(v => v.position !== position), saved]);
                alert(`Successfully cast your voice for the ${position} category!`);
            }
        } catch (error: any) {
            console.error(error);
            alert("Unable to cast vote. You may only vote once per category.");
        } finally {
            setIsVoting(false);
        }
    };

    const handleAddMember = async () => {
        if (!newMember.name?.trim() || !newMember.relation?.trim()) {
            setAddMemberError('Full name and relationship are required.');
            return;
        }
        
        try {
            const memberToSave = {
                ...newMember,
                id: `hm_${Date.now()}`,
                institutionId: currentInstitution.id,
                createdAt: new Date().toISOString()
            } as HeritageMember;

            const saved = await apiService.saveModuleRecord('heritage_members', memberToSave);
            if (saved) {
                setTreeMembers(prev => [...prev, saved]);
                setNewMember({ name: '', branch: 'Paternal', relation: '', birthYear: '', deathYear: '', notes: '' });
                setAddMemberError('');
                setShowAddMemberModal(false);
            }
        } catch (error: any) {
            setAddMemberError(`Failed to save: ${error.message}`);
        }
    };

    const stats = isHeritage ? [
        { name: 'Ancestors Documented', value: '124', icon: Library, color: 'text-amber-600', bg: 'bg-amber-50' },
        { name: 'Family Members', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { name: 'Heritage Documents', value: '452', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { name: 'Active Memorials', value: '3', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
    ] : [
        { name: 'Active Members', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { name: 'Collections (MTD)', value: 'KES 428,500', icon: CircleDollarSign, color: 'text-green-600', bg: 'bg-green-50' },
        { name: 'Open Projects', value: '12', icon: Globe, color: 'text-purple-600', bg: 'bg-purple-50' },
        { name: 'Pending Requests', value: '8', icon: RotateCw, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    const renderOverview = () => (
        <div className="animate-fade-in space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.name} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.name}</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity / Announcements Contextual */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-xl font-black mb-6 text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        <MessageSquare className="w-6 h-6 text-indigo-600" />
                        {isHeritage ? 'Ancestral Timeline' : 'Community Bulletin'}
                    </h3>
                    <div className="space-y-4">
                        {(isHeritage ? [
                            { title: 'New Marriage Records Added', date: 'Highland Branch', type: 'Archival' },
                            { title: 'Oral History Recording: Elder John', date: 'Maternal Side', type: 'Voice' },
                            { title: 'Clan Meeting Scheduled', date: 'Aug 15th, 2026', type: 'Meeting' }
                        ] : [
                            { title: 'Annual General Meeting', date: 'Oct 24, 2024', type: 'Event' },
                            { title: 'Water Tank Maintenance', date: 'Oct 20, 2024', type: 'Maintenance' },
                            { title: 'New Security Protocol', date: 'Oct 18, 2024', type: 'Security' }
                        ]).map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all cursor-pointer">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                                    <p className="text-xs text-slate-400 font-medium">{item.date}</p>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full tracking-widest ${isHeritage ? 'text-amber-600 border-amber-100' : 'text-slate-500'}`}>
                                    {item.type}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Map/Location vs Vault Preview */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative min-h-[300px]">
                    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
                        {isHeritage ? (
                            <>
                                <Library className="w-16 h-16 text-amber-600 mb-4 animate-pulse" />
                                <span className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">Digital Heritage Vault</span>
                                <p className="text-[10px] text-slate-500 mt-2 max-w-[200px]">Your family documents and media are securely preserved in the ancestral archives.</p>
                                <button onClick={() => setActiveTab('heritage')} className="mt-6 px-6 py-2 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Explore Archives</button>
                            </>
                        ) : (
                            <>
                                <Home className="w-16 h-16 text-indigo-600 mb-4 animate-pulse" />
                                <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Community Map Loading...</span>
                            </>
                        )}
                    </div>
                    {!isHeritage && (
                        <div className="absolute top-8 left-8 p-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-2xl shadow-xl z-10 border border-white/20">
                            <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Live Operations</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">Active Project Sites</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderSavings = () => (
        <div className="animate-fade-in bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Savings & Contributions</h3>
                    <p className="text-slate-500 font-medium text-sm mt-1">Track member deposits, loans, and merry-go-round cycles.</p>
                </div>
                <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold active:scale-95 shadow-lg shadow-green-100 dark:shadow-none">
                    <CircleDollarSign className="w-5 h-5" />
                    New Deposit
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-blue-600 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                    <CircleDollarSign className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Total Savings Pool</p>
                    <h4 className="text-3xl font-black mt-1 tracking-tighter uppercase">KES 1,250,000</h4>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-white/20 w-fit px-3 py-1 rounded-full">
                        <RotateCw className="w-3 h-3" />
                        +12% from last month
                    </div>
                </div>
                <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Reserve Fund</p>
                    <h4 className="text-3xl font-black mt-1 tracking-tighter uppercase text-slate-800 dark:text-white">KES 45,000</h4>
                    <p className="text-[10px] font-bold text-slate-500 mt-2">Available for immediate withdrawal</p>
                </div>
                <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Active Merry-Go-Round</p>
                    <h4 className="text-3xl font-black mt-1 tracking-tighter uppercase text-slate-800 dark:text-white">Batch #42</h4>
                    <p className="text-[10px] font-bold text-slate-500 mt-2">Next Payout: Oct 30 (Jane Smith)</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50">
                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Member Name</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Deposits</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Loan Balance</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                            <th className="px-8 py-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {users.slice(0, 5).map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white uppercase tracking-tight">{user.name}</p>
                                            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{user.staffId || 'MBR-00' + user.id.slice(0,3)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6 font-black text-slate-600 dark:text-slate-300">KES 45,000</td>
                                <td className="px-8 py-6 font-black text-red-500">KES 12,000</td>
                                <td className="px-8 py-6">
                                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest">Active</span>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <button className="p-3 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-2xl text-indigo-600 transition-all">
                                        <RotateCw className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderResidences = () => (
        <div className="animate-fade-in space-y-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <Home className="w-8 h-8 text-indigo-600" />
                            Estate Management
                        </h3>
                        <p className="text-slate-500 font-medium text-sm mt-1">Manage residency logs, service charges, and security protocols.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none">
                            <ShieldCheck className="w-5 h-5" />
                            Create Security Clear
                        </button>
                        <button className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-2xl hover:bg-slate-50 transition-all font-bold active:scale-95">
                            Billing
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Units', value: '142', icon: Home, color: 'text-blue-500' },
                        { label: 'Occupancy', value: '94%', icon: Users, color: 'text-green-500' },
                        { label: 'Unpaid Dues', value: 'KES 28k', icon: CircleDollarSign, color: 'text-red-500' },
                        { label: 'Reports', value: '0 NEW', icon: FileText, color: 'text-indigo-500' }
                    ].map((stat, i) => (
                        <div key={i} className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <h4 className="text-lg font-black mb-6 text-slate-800 dark:text-white uppercase tracking-tight">Recent Visitors / Gate Logs</h4>
                <div className="space-y-4">
                    {[
                        { guest: 'Sarah Johnson', house: 'C12', time: '14:20', status: 'In' },
                        { guest: 'Michael Chen (Delivery)', house: 'B08', time: '13:45', status: 'Out' },
                        { guest: 'Taxi - KCB 001Z', house: 'A22', time: '13:10', status: 'In' }
                    ].map((log, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center">
                                    <Home className="w-5 h-5 text-blue-500 mb-3" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{log.guest}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">House {log.house} • {log.time}</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${log.status === 'In' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                {log.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderSocial = () => (
        <div className="animate-fade-in space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        <Heart className="w-8 h-8 text-red-500" />
                        Foundation & Social Impact
                    </h3>
                    <p className="text-slate-500 font-medium text-sm mt-1">Beneficiary mapping, relief distribution, and project tracking.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Projects */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h4 className="text-lg font-black mb-6 text-slate-800 dark:text-white uppercase tracking-tight">Active Relief Projects</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { name: 'School Lunch Program', progress: 85, color: 'bg-indigo-600', beneficiaries: 1200 },
                                { name: 'Health Awareness Camp', progress: 40, color: 'bg-green-600', beneficiaries: 350 },
                                { name: 'Clean Water Initiative', progress: 65, color: 'bg-blue-600', beneficiaries: 890 },
                            ].map((project, i) => (
                                <div key={i} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                    <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight mb-1">{project.name}</h5>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{project.beneficiaries} Beneficiaries</p>
                                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className={`h-full ${project.color}`} style={{ width: `${project.progress}%` }}></div>
                                    </div>
                                    <div className="mt-3 flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                                        <span>Progress</span>
                                        <span>{project.progress}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Beneficiary Search */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-lg font-black mb-6 text-slate-800 dark:text-white uppercase tracking-tight">Beneficiary Lookup</h4>
                    <div className="relative mb-6">
                        <Plus className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 cursor-pointer" />
                        <input 
                            placeholder="Enter Name or ID" 
                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-bold placeholder:text-slate-300"
                        />
                    </div>
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Verified Beneficiaries</p>
                        {users.slice(0, 4).map((user, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all rounded-2xl border-b border-transparent">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                                    {user.name.charAt(0)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate uppercase tracking-tight">{user.name}</p>
                                    <p className="text-[9px] text-slate-400 font-black uppercase">Verified ID: {user.id.slice(0, 6)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderHeritage = () => {
        return (
            <div className="animate-fade-in space-y-8">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <TreePalm className="w-64 h-64" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
                        <div className="max-w-xl">
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-4">
                                <History className="w-10 h-10 text-amber-600" />
                                {heritageView === 'tree' ? 'Ancestry Map' : 
                                 heritageView === 'stories' ? 'Origin & Oral History' : 
                                 heritageView === 'gallery' ? 'Heritage Gallery' : 'Family Council'}
                            </h3>
                            <p className="text-slate-500 font-medium mt-2">
                                {heritageView === 'tree' ? 'Visualize your lineage and connect the branches of your family tree.' : 
                                 heritageView === 'stories' ? 'Document the stories of your origin, migration, and family achievements.' : 
                                 heritageView === 'gallery' ? 'Preserve the faces and places that define your family legacy.' : 'Coordinate family meetings, ceremonies, and important announcements.'}
                            </p>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                            {[
                                { id: 'tree', label: 'Tree', icon: Network },
                                { id: 'stories', label: 'Stories', icon: Library },
                                { id: 'gallery', label: 'Gallery', icon: ImageIcon },
                                { id: 'announcements', label: 'Council', icon: Ghost }
                            ].map((view) => (
                                <button
                                    key={view.id}
                                    onClick={() => setHeritageView(view.id as any)}
                                    className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${heritageView === view.id ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <view.icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{view.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {heritageView === 'tree' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Visual Family Tree Preview */}
                        <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden min-h-[500px] border-4 border-slate-800 shadow-2xl">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-full flex justify-between items-center mb-12">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">Gen 1: Foundational Roots</p>
                                    <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Paternal</div>
                                        <div className="flex items-center gap-2 ml-4"><div className="w-2 h-2 rounded-full bg-pink-500"></div> Maternal</div>
                                    </div>
                                </div>

                                {/* Interactive Tree Root Simulation */}
                                <div className="space-y-16 w-full max-w-2xl">
                                    <div className="flex flex-col items-center">
                                        <div className="p-4 bg-white/10 border-2 border-amber-500 rounded-2xl backdrop-blur-md text-center group cursor-pointer hover:bg-amber-500 transition-all">
                                            <p className="font-black text-sm uppercase tracking-tight group-hover:text-slate-900">Samuel Mwangi Sr.</p>
                                            <p className="text-[9px] font-black text-amber-400 uppercase group-hover:text-slate-800">1892 - 1968</p>
                                        </div>
                                        <div className="w-0.5 h-16 bg-gradient-to-b from-amber-500 to-indigo-500"></div>
                                        <div className="flex gap-20 items-start relative">
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[240px] h-0.5 bg-indigo-500"></div>
                                            <div className="flex flex-col items-center">
                                                <div className="w-0.5 h-8 bg-indigo-500"></div>
                                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm text-center transition-all hover:bg-white/10 select-none">
                                                    <p className="font-bold text-xs uppercase tracking-tight">John Mwangi</p>
                                                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Son</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <div className="w-0.5 h-8 bg-indigo-500"></div>
                                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm text-center border-t-4 border-t-amber-500 animate-pulse transition-all hover:scale-105 active:scale-95 cursor-pointer">
                                                    <p className="font-bold text-xs uppercase tracking-tight">Grace Wamboi</p>
                                                    <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Daughter</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-12 text-center text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">
                                    Hold & Drag to Explore Lineage
                                </div>
                            </div>
                        </div>

                        {/* Heritage Status + Member List */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Tree Members</h4>
                                    <button
                                        onClick={() => setShowAddMemberModal(true)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-100 dark:shadow-none hover:bg-amber-700 active:scale-95 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Member
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                    {treeMembers.map((m) => (
                                        <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-transparent hover:border-amber-100 transition-all">
                                            {m.profilePhotoUrl ? (
                                                <img 
                                                    src={m.profilePhotoUrl} 
                                                    alt={m.name} 
                                                    className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                                                />
                                            ) : (
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${m.branch === 'Paternal' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                                    {m.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight truncate">{m.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.relation} · {m.branch}</p>
                                            </div>
                                            {m.birthYear && <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">{m.birthYear}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight mb-4">Tree Health</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        <span>Total Members</span>
                                        <span className="text-amber-600">{treeMembers.length} Souls</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        <span>Paternal Branch</span>
                                        <span className="text-blue-600">{treeMembers.filter(m => m.branch === 'Paternal').length}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        <span>Maternal Branch</span>
                                        <span className="text-pink-600">{treeMembers.filter(m => m.branch === 'Maternal').length}</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden mt-2">
                                        <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${Math.min((treeMembers.length / 20) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {heritageView === 'stories' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm min-h-[400px]">
                            <div className="flex justify-between items-center mb-10">
                                <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Historical Origins</h4>
                                <button className="p-3 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-100 transition-colors">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-6">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Loading Stories...</p>
                                    </div>
                                ) : heritageStories.length === 0 ? (
                                    <div className="text-center p-10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No oral histories documented yet.</p>
                                    </div>
                                ) : (
                                    heritageStories.map((story, i) => (
                                        <div key={story.id || i} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-transparent hover:border-amber-100 transition-all cursor-pointer">
                                            <div className="flex justify-between items-start mb-2">
                                                <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">{story.title}</h5>
                                                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{story.storyDate}</span>
                                            </div>
                                            <p className="text-slate-500 text-sm line-clamp-2 italic mb-4">"{story.storyText}"</p>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase text-slate-400">Oral Historian: {story.authorName || 'Elder'}</span>
                                                <ArrowRight className="w-4 h-4 text-slate-300" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-transparent"></div>
                            <div className="relative z-10 text-center animate-pulse">
                                <Mic className="w-20 h-20 text-amber-500 mx-auto mb-6 opacity-50" />
                                <h4 className="text-2xl font-black uppercase tracking-tighter mb-2">Voice of Elders</h4>
                                <p className="text-slate-400 text-sm uppercase font-bold tracking-[0.2em]">Record Oral Testimony</p>
                            </div>
                        </div>
                    </div>
                )}

                {heritageView === 'gallery' && (
                    <div className="space-y-8">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Heirloom Gallery</h4>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Preserve every smile & milestone</p>
                                </div>
                                <button className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 transition-all active:scale-95">
                                    <ImageIcon className="w-5 h-5" />
                                    Upload Photos
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {isLoading ? (
                                    <div className="col-span-full py-12 flex justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                    </div>
                                ) : heritageGallery.length === 0 ? (
                                    <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-50 dark:border-slate-900 rounded-[3rem]">
                                        <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">The gallery is currently empty.</p>
                                    </div>
                                ) : (
                                    heritageGallery.map((item, i) => (
                                        <div key={item.id || i} className="aspect-square bg-slate-100 dark:bg-slate-900 rounded-3xl overflow-hidden group relative cursor-pointer">
                                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Sparkles className="w-8 h-8 text-white scale-0 group-hover:scale-100 transition-transform duration-500" />
                                            </div>
                                            <div className="absolute bottom-4 left-4 right-4">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white truncate">{item.title}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {heritageView === 'announcements' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* Announcements Feed */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white mb-8">Family Proclamations</h4>
                                <div className="space-y-6">
                                    {isLoading ? (
                                        <div className="flex justify-center p-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                                        </div>
                                    ) : heritageAnnouncements.length === 0 ? (
                                        <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No proclamations have been made.</p>
                                        </div>
                                    ) : (
                                        heritageAnnouncements.map((post, i) => (
                                            <div key={post.id || i} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-transparent hover:border-slate-100 transition-all flex gap-6">
                                                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center border border-slate-100 shadow-sm flex-shrink-0">
                                                    <span className="text-xs font-black text-amber-600 uppercase tracking-tighter">
                                                        {post.announcementDate?.split(' ')[0] || 'TBD'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {post.announcementDate?.split(' ')[1] || ''}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full tracking-widest">{post.type}</span>
                                                        <h5 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight">{post.title}</h5>
                                                    </div>
                                                    <p className="text-slate-500 text-xs leading-relaxed">{post.detail}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Calendar Quick View */}
                        <div className="space-y-6">
                            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <CalendarDaysIcon className="w-20 h-20" />
                                </div>
                                <h4 className="text-lg font-black uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-2">
                                    Council Meetings
                                </h4>
                                <div className="space-y-4 relative z-10">
                                    <div className="p-4 bg-white/10 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Next Meeting</p>
                                        <p className="text-sm font-bold mt-1">Heritage Committee Sync</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Zoom • Saturday, 4PM</p>
                                    </div>
                                    <button className="w-full py-3 bg-amber-500 text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                                        Join Council Link
                                    </button>
                                </div>
                            </div>

                            <button className="w-full p-8 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] text-slate-300 font-black uppercase tracking-widest text-[10px] hover:border-amber-200 hover:text-amber-500 transition-all flex flex-col items-center gap-4">
                                <Plus className="w-8 h-8" />
                                Create Announcement
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-4xl font-black flex items-center gap-3 text-slate-800 dark:text-white uppercase tracking-tighter">
                        <Users className="w-12 h-12 text-indigo-600" />
                        {category} Gateway
                    </h2>
                    <p className="text-slate-500 font-medium text-sm mt-1">Professional dashboard for community-led organizations and welfare programs.</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Overview
                    </button>
                    {(category.includes('Chama') || category.includes('Savings')) && (
                        <button
                            onClick={() => setActiveTab('savings')}
                            className={`px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'savings' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Savings Hub
                        </button>
                    )}
                    {category.includes('Estate') && (
                        <button
                            onClick={() => setActiveTab('residences')}
                            className={`px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'residences' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Estate Ops
                        </button>
                    )}
                    {(category.includes('NGO') || category.includes('Welfare')) && (
                        <button
                            onClick={() => setActiveTab('social')}
                            className={`px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'social' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Social Impact
                        </button>
                    )}
                    {isCampaign && (
                        <button
                            onClick={() => setActiveTab('campaign')}
                            className={`px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'campaign' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Campaign Intelligence
                        </button>
                    )}
                    {(category.includes('Family') || category.includes('Heritage')) && (
                        <button
                            onClick={() => setActiveTab('heritage')}
                            className={`px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'heritage' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Family Tree
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-8 transition-all duration-300">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'savings' && renderSavings()}
                {activeTab === 'residences' && renderResidences()}
                {activeTab === 'social' && renderSocial()}
                {activeTab === 'heritage' && renderHeritage()}
                {activeTab === 'campaign' && (
                    <div className="space-y-12 animate-fade-in">
                        {/* ── 2022 Voter Registry Awareness Hero ── */}
                        <div className="relative overflow-hidden bg-slate-900 rounded-[3.5rem] p-12 text-white border-4 border-slate-800 shadow-2xl">
                            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                                <Sparkles className="w-full h-full text-indigo-500 blur-3xl animate-pulse" />
                            </div>
                            
                            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/20">Official 2022 Register</span>
                                        <div className="flex -space-x-2">
                                            {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border border-slate-900 bg-slate-800"></div>)}
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-5xl font-black uppercase tracking-tighter leading-none">
                                        Empowering the <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-purple-400 animate-gradient-x">Digital Electorate</span>
                                    </h3>
                                    
                                    <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-xl">
                                        The 2022 Voter Register is the foundation of our democratic journey. Stay informed, verify your records, and support the next generation of voters.
                                    </p>
                                    
                                    <div className="flex flex-wrap gap-4 pt-4">
                                        <a href="https://voters.iebc.or.ke" target="_blank" rel="noreferrer" className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 flex items-center gap-2">
                                            <ShieldCheck className="w-5 h-5" />
                                            Register with IEBC
                                        </a>
                                        <button className="bg-slate-800 text-white border border-slate-700 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition-all flex items-center gap-2">
                                            <History className="w-5 h-5" />
                                            2022 Archives
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="shrink-0 grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Total Voters (2022)', val: '22.1M', sub: 'Verified Citizens' },
                                        { label: 'Youth Percent', val: '39.8%', sub: 'Future Leaders' },
                                        { label: ' constituencies ', val: '290', sub: 'Electoral Units' },
                                        { label: 'Polling Stations', val: '46K+', sub: 'Active Hubs' }
                                    ].map((s, i) => (
                                        <div key={i} className="p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 text-center hover:bg-white/10 transition-colors">
                                            <p className="text-2xl font-black tracking-tighter uppercase leading-none mb-1">{s.val}</p>
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400">{s.label}</p>
                                            <p className="text-[7px] font-bold text-slate-500 uppercase mt-1 italic">{s.sub}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Call to Action Info Grid ── */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm group hover:border-indigo-500 transition-all">
                                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                                    <MapPin className="w-8 h-8" />
                                </div>
                                <h4 className="text-xl font-black uppercase tracking-tight mb-2">Neighborhood Outreach</h4>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">Use AI to identify unregistered neighbors and guide them to the nearest IEBC center.</p>
                            </div>
                            
                            <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                                <Sparkles className="absolute -right-4 -top-4 w-32 h-32 opacity-10" />
                                <h4 className="text-xl font-black uppercase tracking-tight mb-2">Be the Change</h4>
                                <p className="text-sm text-indigo-100 leading-relaxed font-medium mb-6">Your voice matters. Encourage 10 people today to verify their eligibility.</p>
                                <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                                    Start Mission
                                </button>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm group hover:border-indigo-500 transition-all">
                                <div className="w-16 h-16 bg-pink-50 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center text-pink-600 mb-6 group-hover:scale-110 transition-transform">
                                    <MessageSquare className="w-8 h-8" />
                                </div>
                                <h4 className="text-xl font-black uppercase tracking-tight mb-2">Civic Dialogue</h4>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">Join our community discussions on electoral transparency and progress.</p>
                            </div>
                        </div>

                        {/* ── Strategic Lead Scout Integration ── */}
                        <div className="bg-white dark:bg-slate-800 p-12 rounded-[4rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="mb-10 text-center max-w-2xl mx-auto">
                                <h3 className="text-4xl font-black uppercase tracking-tighter">Voter Intelligence Hub</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Powered by Antigravity AI</p>
                            </div>
                        <LeadScoutManager defaultNiche={category + " Voters " + (currentInstitution.location || "")} />

                        {/* ── Public Mock Election & Ballot ── */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[4rem] p-12 border border-slate-100 dark:border-slate-800 mt-12">
                             <div className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="text-center md:text-left">
                                    <h3 className="text-4xl font-black uppercase tracking-tighter">Mock Election Ballot</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 italic">Official Community Opinion Poll • One Choice Per Category</p>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setShowResults(!showResults)}
                                        className={`px-6 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all ${showResults ? 'bg-indigo-600 text-white shadow-xl' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'}`}
                                    >
                                        {showResults ? 'View Ballot' : 'Live Trends'}
                                    </button>
                                    <div className="bg-white dark:bg-slate-800 px-6 py-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 text-center hidden sm:block">
                                        <p className="text-2xl font-black text-indigo-600">{allCampaigns.length}</p>
                                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Candidates</p>
                                    </div>
                                    <div className="bg-indigo-600 px-6 py-4 rounded-3xl shadow-xl shadow-indigo-100 text-center text-white hidden sm:block">
                                        <p className="text-2xl font-black">{myVotes.length}</p>
                                        <p className="text-[8px] font-black uppercase opacity-60 tracking-widest">My Choices</p>
                                    </div>
                                </div>
                             </div>

                             {showResults ? (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <h4 className="text-xl font-black uppercase tracking-tight mb-8">Electoral Heatmap (Projected)</h4>
                                        <div className="space-y-6">
                                            {['President', 'Governor', 'Senator', 'Women Rep', 'MP', 'MCA'].map(pos => {
                                                const candidates = allCampaigns.filter(c => c.position === pos);
                                                if (candidates.length === 0) return null;
                                                
                                                const totalPosVotes = candidates.reduce((acc, c) => acc + (voteCounts[c.id] || 0), 0);
                                                
                                                return (
                                                    <div key={pos} className="space-y-4">
                                                        <div className="flex justify-between items-end">
                                                            <h5 className="font-black text-indigo-600 uppercase text-xs tracking-widest">{pos} Category</h5>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{totalPosVotes} Total Voices</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {candidates.map(c => {
                                                                const count = voteCounts[c.id] || 0;
                                                                const percent = totalPosVotes > 0 ? Math.round((count / totalPosVotes) * 100) : 0;
                                                                return (
                                                                    <div key={c.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase">{c.candidateName}</p>
                                                                            <span className="font-black text-indigo-600 text-xs">{percent}%</span>
                                                                        </div>
                                                                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                             ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                   {allCampaigns.length > 0 ? allCampaigns.map((candidate) => {
                                    const userVote = myVotes.find(v => v.position === candidate.position);
                                    const isVotedForThis = userVote?.campaignId === candidate.id;
                                    const isLockedByCategory = userVote && !isVotedForThis;

                                    return (
                                        <div key={candidate.id} className={`bg-white dark:bg-slate-800 p-8 rounded-[3rem] border-2 transition-all group relative overflow-hidden ${isVotedForThis ? 'border-emerald-500 shadow-2xl' : 'border-slate-100 dark:border-slate-700 hover:border-indigo-500 shadow-sm'}`}>
                                            {isVotedForThis && (
                                                <div className="absolute top-0 right-0 p-4">
                                                    <div className="bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="flex flex-col items-center text-center space-y-5">
                                                <div className="w-24 h-24 rounded-[2.5rem] bg-slate-100 dark:bg-slate-900 border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden">
                                                    <img 
                                                        src={candidate.profilePicture || 'https://images.unsplash.com/photo-1540910419892-f013c773998b?q=80&w=200&h=200&auto=format&fit=crop'} 
                                                        className="w-full h-full object-cover"
                                                        alt={candidate.candidateName}
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">{candidate.position}</span>
                                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white mt-1">{candidate.candidateName}</h4>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{candidate.partyName || 'Independent'}</p>
                                                </div>

                                                <div className="flex gap-1.5 justify-center py-2">
                                                    {[1,2,3,4,5].map(star => (
                                                        <button 
                                                            key={star}
                                                            disabled={isLockedByCategory || isVoting}
                                                            onClick={(e) => { e.stopPropagation(); handleCastVote(candidate.id, candidate.position, star); }}
                                                            className={`transition-all hover:scale-125 active:scale-95 ${star <= (isVotedForThis ? (userVote?.rating || 0) : 0) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'} ${isLockedByCategory ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        >
                                                            <Star className={`w-8 h-8 ${star <= (isVotedForThis ? (userVote?.rating || 0) : 0) ? 'fill-amber-400' : ''}`} />
                                                        </button>
                                                    ))}
                                                </div>

                                                <button 
                                                    disabled={isLockedByCategory || isVotedForThis || isVoting}
                                                    onClick={() => handleCastVote(candidate.id, candidate.position, 5)}
                                                    className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${isVotedForThis ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : isLockedByCategory ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-indigo-600 shadow-lg'}`}
                                                >
                                                    {isVotedForThis ? 'Ballot Cast' : isLockedByCategory ? 'Choice Locked' : 'Vote Candidate'}
                                                </button>
                                                
                                                {isLockedByCategory && (
                                                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-[0.2em] animate-pulse">Category Already Voted</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="col-span-full py-20 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                                        <Vote className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No active candidates listed for this community yet.</p>
                                    </div>
                                )}
                             </div>
                        </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Add Family Member Modal ── */}
            {showAddMemberModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => { setShowAddMemberModal(false); setAddMemberError(''); }}
                    />
                    {/* Modal Card */}
                    <div className="relative z-10 bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-8 relative overflow-hidden">
                            <div className="absolute -right-8 -top-8 opacity-10">
                                <TreePalm className="w-48 h-48 text-white" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-200 mb-1">Family Tree</p>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Add Family Member</h3>
                                <p className="text-amber-100 text-xs mt-1">Grow your ancestral lineage one soul at a time.</p>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="p-8 space-y-5">
                            {addMemberError && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold uppercase tracking-widest">
                                    {addMemberError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Full Name *</label>
                                    <input
                                        value={newMember.name}
                                        onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g. James Mwangi"
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white placeholder:text-slate-300 focus:outline-none focus:border-amber-400 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Branch *</label>
                                    <select
                                        value={newMember.branch}
                                        onChange={e => setNewMember(p => ({ ...p, branch: e.target.value as 'Paternal' | 'Maternal' }))}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white focus:outline-none focus:border-amber-400 transition-colors"
                                    >
                                        <option value="Paternal">Paternal</option>
                                        <option value="Maternal">Maternal</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Relationship *</label>
                                    <select
                                        value={newMember.relation}
                                        onChange={e => setNewMember(p => ({ ...p, relation: e.target.value }))}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white focus:outline-none focus:border-amber-400 transition-colors"
                                    >
                                        <option value="">Select Relation</option>
                                        {RELATIONSHIP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Profile Picture</label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative group overflow-hidden w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                            {newMember.profilePhotoUrl ? (
                                                <img 
                                                    src={newMember.profilePhotoUrl} 
                                                    alt="Preview" 
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-slate-300" />
                                            )}
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const url = await apiService.uploadFile('heritage', `members/${Date.now()}_${file.name}`, file);
                                                        if (url) setNewMember(p => ({ ...p, profilePhotoUrl: url }));
                                                    }
                                                }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium">Click box to upload legacy photo.</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Year of Birth</label>
                                    <input
                                        value={newMember.birthYear}
                                        onChange={e => setNewMember(p => ({ ...p, birthYear: e.target.value }))}
                                        placeholder="e.g. 1952"
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white placeholder:text-slate-300 focus:outline-none focus:border-amber-400 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Year of Death</label>
                                    <input
                                        value={newMember.deathYear}
                                        onChange={e => setNewMember(p => ({ ...p, deathYear: e.target.value }))}
                                        placeholder="Leave blank if alive"
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white placeholder:text-slate-300 focus:outline-none focus:border-amber-400 transition-colors"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Historical Notes</label>
                                    <textarea
                                        value={newMember.notes}
                                        onChange={e => setNewMember(p => ({ ...p, notes: e.target.value }))}
                                        placeholder="Brief notes on this family member's legacy..."
                                        rows={3}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white placeholder:text-slate-300 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => { setShowAddMemberModal(false); setAddMemberError(''); }}
                                    className="flex-1 py-4 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddMember}
                                    className="flex-1 py-4 bg-amber-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-amber-200 dark:shadow-none hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add to Tree
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
