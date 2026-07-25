
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
    CheckCircle,
    FileSpreadsheet,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Cpu,
    Zap,
    BarChart3,
    Shield,
    Upload,
    Download,
    Layers,
    Activity,
    Pencil,
    Trash2
} from 'lucide-react';
import type { 
    Institution, User, 
    HeritageMember, HeritageStory, HeritageGallery, HeritageAnnouncement,
    CampaignProfile, CampaignVote
} from '../types';
import { apiService } from '../services/apiService';
import { LeadScoutManager } from './LeadScoutManager';
import { SmartHeritageMemberImporterModal } from './SmartHeritageMemberImporterModal';

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
    const [themeMode, setThemeMode] = useState<'futuristic' | 'classic'>('futuristic');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [heritageView, setHeritageView] = useState<'tree' | 'stories' | 'gallery' | 'announcements' | 'members' | 'analytics' | 'hud'>('tree');
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showExcelImporterModal, setShowExcelImporterModal] = useState(false);
    const [editingMember, setEditingMember] = useState<HeritageMember | null>(null);
    const [editMemberForm, setEditMemberForm] = useState<Partial<HeritageMember>>({});
    const [editMemberError, setEditMemberError] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Heritage Data States
    const [treeMembers, setTreeMembers] = useState<HeritageMember[]>([]);
    const [heritageStories, setHeritageStories] = useState<HeritageStory[]>([]);
    const [heritageGallery, setHeritageGallery] = useState<HeritageGallery[]>([]);
    const [heritageAnnouncements, setHeritageAnnouncements] = useState<HeritageAnnouncement[]>([]);

    // 3D Family Tree Spatial Controls
    const [is3DMode, setIs3DMode] = useState(true);
    const [tiltX, setTiltX] = useState(18);
    const [rotateY, setRotateY] = useState(-8);
    const [zoomScale, setZoomScale] = useState(1);
    
    // Campaign Voting States
    const [allCampaigns, setAllCampaigns] = useState<CampaignProfile[]>([]);
    const [myVotes, setMyVotes] = useState<CampaignVote[]>([]);
    const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
    const [isVoting, setIsVoting] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Active User Tree Permission Rights
    const [userTreeRole, setUserTreeRole] = useState<'Patriarch' | 'Council Elder' | 'Branch Leader' | 'Descendant'>('Patriarch');

    const treePermissions = useMemo(() => {
        if (userTreeRole === 'Patriarch' || userTreeRole === 'Council Elder') {
            return { canAddSoul: true, canEditTree: true, canDeleteTree: true, canManageVault: true, canPublishProclamations: true, label: 'Full Council Admin Rights' };
        }
        if (userTreeRole === 'Branch Leader') {
            return { canAddSoul: true, canEditTree: true, canDeleteTree: false, canManageVault: true, canPublishProclamations: false, label: 'Branch Elder Rights' };
        }
        return { canAddSoul: false, canEditTree: false, canDeleteTree: false, canManageVault: false, canPublishProclamations: false, label: 'Read-Only Descendant Rights' };
    }, [userTreeRole]);

    const [newMember, setNewMember] = useState<Partial<HeritageMember>>({ 
        name: '', 
        branch: 'Paternal', 
        relation: '', 
        birthYear: '', 
        deathYear: '', 
        notes: '',
        role: 'Family Member',
        accessRight: 'Branch Editor',
        canAddSoul: true,
        canEditTree: true,
        canDeleteTree: false,
        canManageVault: false,
        canPublishProclamations: false
    });
    const [addMemberError, setAddMemberError] = useState('');

    const handleBatchImportHeritageMembers = async (members: HeritageMember[]) => {
        const savedMembers: HeritageMember[] = [];
        for (const m of members) {
            const saved = await apiService.saveModuleRecord('heritage_members', m);
            if (saved) savedMembers.push(saved);
        }
        setTreeMembers(prev => [...prev, ...savedMembers]);
    };

    // Fetch Metadata
    React.useEffect(() => {
        if (isHeritage) fetchHeritageData();
        if (isCampaign) fetchCampaignVotingData();
    }, [isHeritage, isCampaign, currentInstitution.id]);

    const fetchHeritageData = async () => {
        setIsLoading(true);
        try {
            const [members, stories, gallery, announcements] = await Promise.all([
                apiService.fetchModuleRecords<HeritageMember>('heritage_members', currentInstitution.id),
                apiService.fetchModuleRecords<HeritageStory>('heritage_stories', currentInstitution.id),
                apiService.fetchModuleRecords<HeritageGallery>('heritage_gallery', currentInstitution.id),
                apiService.fetchModuleRecords<HeritageAnnouncement>('heritage_announcements', currentInstitution.id)
            ]);
            if (members && Array.isArray(members)) setTreeMembers(members);
            if (stories && Array.isArray(stories)) setHeritageStories(stories);
            if (gallery && Array.isArray(gallery)) setHeritageGallery(gallery);
            if (announcements && Array.isArray(announcements)) setHeritageAnnouncements(announcements);
        } catch (error) {
            console.error('Error fetching heritage data:', error);
        } finally {
            setIsLoading(false);
        }
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
        
        if (!treePermissions.canAddSoul) {
            setAddMemberError('Permission Denied: Your active Family Tree role does not grant Add Soul rights.');
            return;
        }

        try {
            const memberToSave: HeritageMember = {
                id: `hm_${Date.now()}`,
                name: newMember.name.trim(),
                branch: (newMember.branch as 'Paternal' | 'Maternal') || 'Paternal',
                relation: newMember.relation.trim(),
                birthYear: newMember.birthYear || '',
                deathYear: newMember.deathYear || '',
                notes: newMember.notes || '',
                profilePhotoUrl: newMember.profilePhotoUrl || '',
                role: newMember.role || 'Family Member',
                accessRight: newMember.accessRight || 'Branch Editor',
                canAddSoul: newMember.canAddSoul ?? true,
                canEditTree: newMember.canEditTree ?? true,
                canDeleteTree: newMember.canDeleteTree ?? false,
                canManageVault: newMember.canManageVault ?? false,
                canPublishProclamations: newMember.canPublishProclamations ?? false,
                institutionId: currentInstitution.id,
                createdAt: new Date().toISOString()
            };

            let saved: HeritageMember | null = null;
            try {
                saved = await apiService.saveModuleRecord<HeritageMember>('heritage_members', memberToSave);
            } catch (err: any) {
                console.warn('[CommunityManager] Remote save fallback to local state:', err);
            }

            const recordToAdd = saved || memberToSave;
            setTreeMembers(prev => [...prev.filter(m => m.id !== recordToAdd.id), recordToAdd]);
            setNewMember({ name: '', branch: 'Paternal', relation: '', birthYear: '', deathYear: '', notes: '', profilePhotoUrl: '', role: 'Family Member', accessRight: 'Branch Editor', canAddSoul: true, canEditTree: true, canDeleteTree: false });
            setAddMemberError('');
            setShowAddMemberModal(false);
        } catch (error: any) {
            console.error('[CommunityManager] Failed to save member:', error);
            setAddMemberError(`Failed to save: ${error.message || 'Unknown error'}`);
        }
    };

    const handleOpenEditMember = (member: HeritageMember) => {
        setEditingMember(member);
        setEditMemberForm({ ...member });
        setEditMemberError('');
    };

    const handleSaveEditMember = async () => {
        if (!editMemberForm.name?.trim() || !editMemberForm.relation?.trim()) {
            setEditMemberError('Full name and relationship are required.');
            return;
        }

        setIsSavingEdit(true);
        try {
            const updatedMember = {
                ...editMemberForm,
                id: editingMember?.id || `hm_${Date.now()}`,
                institutionId: currentInstitution.id,
                updatedAt: new Date().toISOString()
            } as HeritageMember;

            const saved = await apiService.saveModuleRecord('heritage_members', updatedMember);
            if (saved) {
                setTreeMembers(prev => {
                    const exists = prev.some(m => m.id === saved.id);
                    if (exists) {
                        return prev.map(m => m.id === saved.id ? saved : m);
                    }
                    return [...prev, saved];
                });
                setEditingMember(null);
                setEditMemberError('');
            }
        } catch (error: any) {
            setEditMemberError(`Failed to update: ${error.message || 'Server error'}`);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeleteMember = async (memberId: string) => {
        if (!window.confirm('Are you sure you want to remove this soul from the family tree?')) return;
        
        try {
            await apiService.deleteModuleRecord('heritage_members', memberId).catch(() => {});
            setTreeMembers(prev => prev.filter(m => m.id !== memberId));
            if (editingMember?.id === memberId) {
                setEditingMember(null);
            }
        } catch (error) {
            console.error('Failed to delete heritage member:', error);
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

    const renderTreeSubView = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Visual Family Tree Preview with 3D Spatial Effects */}
            <div className={`lg:col-span-2 rounded-[3rem] p-6 md:p-10 relative overflow-hidden min-h-[580px] border shadow-2xl transition-all ${
                themeMode === 'futuristic'
                    ? 'bg-slate-950 border-amber-500/40 text-white shadow-amber-500/10'
                    : 'bg-slate-900 border-slate-800 text-white'
            }`}>
                {/* 3D Hologram Ambient Background & Grid */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950/80 to-slate-950 pointer-events-none"></div>
                <div 
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.25) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                        transform: is3DMode ? `perspective(1000px) rotateX(${tiltX * 0.5}deg)` : 'none',
                        transition: 'transform 0.5s ease-out'
                    }}
                ></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    {/* Header & 3D Spatial Controls Bar */}
                    <div className="w-full flex justify-between items-center mb-8 flex-wrap gap-4 pb-4 border-b border-amber-500/20">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-amber-400 flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                {is3DMode ? '⚡ 3D HOLOGRAM LINEAGE MATRIX' : '📄 2D LINEAGE MATRIX'}
                            </span>
                            {is3DMode && (
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[8px] font-mono font-black uppercase tracking-widest animate-pulse">
                                    3D Active ({tiltX}° X, {rotateY}° Y)
                                </span>
                            )}
                        </div>

                        {/* 3D Mode & Orbit Viewport Controls */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => setIs3DMode(!is3DMode)}
                                className={`px-3 py-1.5 rounded-xl font-mono text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border ${
                                    is3DMode
                                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                            >
                                <span>{is3DMode ? '🔮 3D Stage ON' : '📐 2D Flat Mode'}</span>
                            </button>

                            {is3DMode && (
                                <>
                                    <button
                                        onClick={() => { setTiltX(22); setRotateY(-12); }}
                                        className="px-2.5 py-1.5 bg-slate-900 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-slate-950 rounded-xl text-[9px] font-mono font-black uppercase transition-all"
                                        title="Isometric 3D View"
                                    >
                                        🧊 Iso 3D
                                    </button>
                                    <button
                                        onClick={() => { setTiltX(35); setRotateY(-18); }}
                                        className="px-2.5 py-1.5 bg-slate-900 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-slate-950 rounded-xl text-[9px] font-mono font-black uppercase transition-all"
                                        title="Deep Hologram 3D Perspective"
                                    >
                                        🔮 Deep 3D
                                    </button>
                                    <button
                                        onClick={() => { setTiltX(0); setRotateY(0); }}
                                        className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-[9px] font-mono font-black uppercase transition-all"
                                        title="Frontal 3D View"
                                    >
                                        🎯 Frontal
                                    </button>
                                    <button
                                        onClick={() => setZoomScale(p => Math.min(p + 0.15, 1.4))}
                                        className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 rounded-xl text-[10px] font-mono font-black transition-all"
                                        title="Zoom In"
                                    >
                                        +
                                    </button>
                                    <button
                                        onClick={() => setZoomScale(p => Math.max(p - 0.15, 0.7))}
                                        className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 rounded-xl text-[10px] font-mono font-black transition-all"
                                        title="Zoom Out"
                                    >
                                        -
                                    </button>
                                </>
                            )}

                            <button
                                onClick={() => setShowAddMemberModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[9px] uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all ml-2"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Soul
                            </button>
                        </div>
                    </div>

                    {/* 3D Spatial Canvas Container */}
                    <div 
                        className="w-full flex flex-col items-center py-6"
                        style={{
                            perspective: is3DMode ? '1200px' : 'none',
                            perspectiveOrigin: '50% 40%',
                        }}
                    >
                        <div 
                            className="space-y-12 md:space-y-16 w-full max-w-2xl transition-all duration-500 ease-out"
                            style={{
                                transformStyle: is3DMode ? 'preserve-3d' : 'flat',
                                transform: is3DMode
                                    ? `rotateX(${tiltX}deg) rotateY(${rotateY}deg) scale(${zoomScale})`
                                    : `scale(${zoomScale})`,
                            }}
                        >
                            {treeMembers.length > 0 ? (
                                <div className="flex flex-col items-center" style={{ transformStyle: is3DMode ? 'preserve-3d' : 'flat' }}>
                                    {/* Root Ancestor Node (First Member) - 3D Floating Layer */}
                                    {(() => {
                                        const rootMember = treeMembers[0];
                                        return (
                                            <div 
                                                onClick={() => handleOpenEditMember(rootMember)}
                                                style={{
                                                    transform: is3DMode ? 'translateZ(60px)' : 'none',
                                                    boxShadow: is3DMode ? '0 25px 50px -12px rgba(245, 158, 11, 0.4)' : undefined,
                                                }}
                                                className={`p-4 md:p-6 border-2 rounded-3xl backdrop-blur-xl text-center group cursor-pointer transition-all duration-300 relative ${
                                                    themeMode === 'futuristic'
                                                        ? 'bg-gradient-to-b from-amber-500/25 via-slate-950/90 to-amber-500/10 border-amber-400 text-white hover:border-yellow-300 hover:bg-amber-500 hover:text-slate-950'
                                                        : 'bg-white/10 border-amber-500 hover:bg-amber-500'
                                                }`}
                                            >
                                                <div className="absolute -top-3 -right-3 p-1.5 bg-amber-400 text-slate-950 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="flex items-center justify-center gap-2 mb-1">
                                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                                                    <span className="text-[9px] font-mono font-black uppercase text-amber-400 group-hover:text-slate-900 tracking-widest">Root Patriarch / Matriarch</span>
                                                </div>
                                                <p className="font-black text-base md:text-lg uppercase tracking-tight group-hover:text-slate-950">{rootMember.name}</p>
                                                <p className="text-[10px] font-mono font-black text-amber-300 group-hover:text-slate-900 uppercase mt-0.5">
                                                    {rootMember.relation} • {rootMember.branch} {rootMember.birthYear ? `(${rootMember.birthYear})` : ''}
                                                </p>
                                                <span className="text-[8px] font-mono block text-emerald-400 group-hover:text-slate-950 mt-1.5 uppercase font-bold tracking-widest">Click Node to Edit</span>
                                            </div>
                                        );
                                    })()}

                                    {/* 3D Vertical Line Connector Beam */}
                                    <div 
                                        className="w-1 h-12 md:h-16 bg-gradient-to-b from-amber-400 via-yellow-400 to-indigo-500 shadow-lg shadow-amber-500/50"
                                        style={{ transform: is3DMode ? 'translateZ(45px)' : 'none' }}
                                    ></div>

                                    {/* 3D Branch Container */}
                                    <div 
                                        className="flex gap-4 md:gap-10 items-start relative flex-wrap justify-center max-w-full"
                                        style={{ transformStyle: is3DMode ? 'preserve-3d' : 'flat' }}
                                    >
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[82%] h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 shadow-lg shadow-indigo-500/50"></div>
                                        {treeMembers.slice(1, 4).map((child, idx) => (
                                            <div key={child.id} className="flex flex-col items-center" style={{ transformStyle: is3DMode ? 'preserve-3d' : 'flat' }}>
                                                <div className="w-0.5 h-8 bg-indigo-500"></div>
                                                <div 
                                                    onClick={() => handleOpenEditMember(child)}
                                                    style={{
                                                        transform: is3DMode ? `translateZ(${30 + idx * 10}px)` : 'none',
                                                        boxShadow: is3DMode ? '0 15px 35px -8px rgba(99, 102, 241, 0.3)' : undefined,
                                                    }}
                                                    className={`p-4 rounded-2xl border-2 backdrop-blur-xl text-center transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 group relative ${
                                                        child.branch === 'Paternal'
                                                            ? 'bg-slate-950/90 border-cyan-400/60 text-cyan-200 hover:border-cyan-300 hover:shadow-cyan-500/40'
                                                            : 'bg-slate-950/90 border-pink-400/60 text-pink-200 hover:border-pink-300 hover:shadow-pink-500/40'
                                                    }`}
                                                >
                                                    <div className="absolute -top-2.5 -right-2.5 p-1 bg-amber-400 text-slate-950 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                                                        <Pencil className="w-3 h-3" />
                                                    </div>
                                                    <p className="font-bold text-xs uppercase tracking-tight">{child.name}</p>
                                                    <p className="text-[8px] font-mono font-black uppercase tracking-widest text-amber-300 mt-0.5">
                                                        {child.relation} • {child.branch}
                                                    </p>
                                                    <span className="text-[7px] font-mono block text-emerald-400 mt-1 uppercase font-bold tracking-widest">Edit Node</span>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Direct Add Branch Soul Button with 3D Float */}
                                        <div className="flex flex-col items-center" style={{ transformStyle: is3DMode ? 'preserve-3d' : 'flat' }}>
                                            <div className="w-0.5 h-8 bg-indigo-500"></div>
                                            <button
                                                onClick={() => setShowAddMemberModal(true)}
                                                style={{ transform: is3DMode ? 'translateZ(35px)' : 'none' }}
                                                className="p-4 border-2 border-dashed border-amber-400/70 rounded-2xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition-all duration-300 flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 group hover:scale-105"
                                            >
                                                <Plus className="w-4 h-4 text-amber-400 group-hover:text-slate-950 animate-bounce" />
                                                <span>Add Soul to Tree</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Fallback Demo Interactive Tree Nodes in 3D */
                                <div className="flex flex-col items-center" style={{ transformStyle: is3DMode ? 'preserve-3d' : 'flat' }}>
                                    <div 
                                        onClick={() => handleOpenEditMember({
                                            id: 'demo_root',
                                            name: 'Samuel Mwangi Sr.',
                                            relation: 'Grandfather / Root Ancestor',
                                            branch: 'Paternal',
                                            birthYear: '1892',
                                            deathYear: '1968',
                                            notes: 'Foundational patriarch of the family lineage.'
                                        } as HeritageMember)}
                                        style={{
                                            transform: is3DMode ? 'translateZ(60px)' : 'none',
                                            boxShadow: is3DMode ? '0 25px 50px -12px rgba(245, 158, 11, 0.45)' : undefined,
                                        }}
                                        className={`p-5 md:p-6 border-2 rounded-3xl backdrop-blur-xl text-center group cursor-pointer transition-all duration-300 relative ${
                                            themeMode === 'futuristic'
                                                ? 'bg-gradient-to-b from-amber-500/20 via-slate-950/90 to-amber-500/10 border-amber-400 text-white hover:bg-amber-500 hover:text-slate-950'
                                                : 'bg-white/10 border-amber-500 hover:bg-amber-500'
                                        }`}
                                    >
                                        <div className="absolute -top-3 -right-3 p-1.5 bg-amber-400 text-slate-950 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                                            <span className="text-[9px] font-mono font-black uppercase text-amber-400 group-hover:text-slate-900 tracking-widest">Root Ancestor Node</span>
                                        </div>
                                        <p className="font-black text-base md:text-lg uppercase tracking-tight group-hover:text-slate-950">Samuel Mwangi Sr.</p>
                                        <p className="text-[10px] font-mono font-black text-amber-300 group-hover:text-slate-900 uppercase">1892 - 1968 • Root Ancestor</p>
                                        <span className="text-[8px] font-mono block text-emerald-400 group-hover:text-slate-950 mt-1 uppercase font-bold tracking-widest">Click Node to Edit</span>
                                    </div>

                                    <div className="w-1 h-12 md:h-16 bg-gradient-to-b from-amber-400 via-yellow-400 to-indigo-500 shadow-lg shadow-amber-500/50" style={{ transform: is3DMode ? 'translateZ(45px)' : 'none' }}></div>

                                    <div className="flex gap-6 md:gap-10 items-start relative flex-wrap justify-center" style={{ transformStyle: is3DMode ? 'preserve-3d' : 'flat' }}>
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[82%] h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 shadow-lg shadow-indigo-500/50"></div>
                                        <div className="flex flex-col items-center" style={{ transformStyle: is3DMode ? 'preserve-3d' : 'flat' }}>
                                            <div className="w-0.5 h-8 bg-indigo-500"></div>
                                            <div 
                                                onClick={() => handleOpenEditMember({
                                                    id: 'demo_child1',
                                                    name: 'John Mwangi',
                                                    relation: 'Son',
                                                    branch: 'Paternal',
                                                    birthYear: '1924',
                                                    notes: 'Paternal lineage heir.'
                                                } as HeritageMember)}
                                                style={{ transform: is3DMode ? 'translateZ(35px)' : 'none' }}
                                                className={`p-4 rounded-2xl border-2 backdrop-blur-xl text-center transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 group relative ${
                                                    themeMode === 'futuristic'
                                                        ? 'bg-slate-950/90 border-cyan-400/60 text-cyan-200 hover:border-cyan-300'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                            >
                                                <div className="absolute -top-2.5 -right-2.5 p-1 bg-amber-400 text-slate-950 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Pencil className="w-2.5 h-2.5" />
                                                </div>
                                                <p className="font-bold text-xs uppercase tracking-tight">John Mwangi</p>
                                                <p className="text-[8px] font-mono font-black text-cyan-400 uppercase tracking-widest">Son • Gen 2 (Click to Edit)</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center" style={{ transformStyle: is3DMode ? 'preserve-3d' : 'flat' }}>
                                            <div className="w-0.5 h-8 bg-indigo-500"></div>
                                            <div 
                                                onClick={() => handleOpenEditMember({
                                                    id: 'demo_child2',
                                                    name: 'Grace Wamboi',
                                                    relation: 'Daughter',
                                                    branch: 'Maternal',
                                                    birthYear: '1928',
                                                    notes: 'Maternal matriarch.'
                                                } as HeritageMember)}
                                                style={{ transform: is3DMode ? 'translateZ(40px)' : 'none' }}
                                                className={`p-4 rounded-2xl border-2 backdrop-blur-xl text-center transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 group relative ${
                                                    themeMode === 'futuristic'
                                                        ? 'bg-slate-950/90 border-pink-400/60 text-pink-200 hover:border-pink-300'
                                                        : 'bg-white/5 border-white/10 border-t-4 border-t-amber-500'
                                                }`}
                                            >
                                                <div className="absolute -top-2.5 -right-2.5 p-1 bg-amber-400 text-slate-950 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Pencil className="w-2.5 h-2.5" />
                                                </div>
                                                <p className="font-bold text-xs uppercase tracking-tight">Grace Wamboi</p>
                                                <p className="text-[8px] font-mono font-black text-pink-400 uppercase tracking-widest">Daughter • Gen 2 (Click to Edit)</p>
                                            </div>
                                        </div>

                                        {/* Direct Add Node Button on Tree */}
                                        <div className="flex flex-col items-center" style={{ transformStyle: is3DMode ? 'preserve-3d' : 'flat' }}>
                                            <div className="w-0.5 h-8 bg-indigo-500"></div>
                                            <button
                                                onClick={() => setShowAddMemberModal(true)}
                                                style={{ transform: is3DMode ? 'translateZ(35px)' : 'none' }}
                                                className="p-4 border-2 border-dashed border-amber-400/70 rounded-2xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition-all duration-300 flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 group hover:scale-105"
                                            >
                                                <Plus className="w-4 h-4 text-amber-400 group-hover:text-slate-950 animate-bounce" />
                                                <span>Add Soul to Tree</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-3">
                        <button
                            onClick={() => setShowAddMemberModal(true)}
                            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add New Soul directly to Tree
                        </button>
                        <div className="text-[10px] font-mono font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-2">
                            <span>🔮 3D Hologram Spatial Mode</span> • <span>Click Any Ancestry Node Above to Edit</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tree Members Panel */}
            <div className="space-y-6">
                <div className={`p-6 md:p-8 rounded-[3rem] border transition-all ${
                    themeMode === 'futuristic'
                        ? 'bg-slate-900/90 border-amber-500/30 shadow-2xl'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'
                }`}>
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xl font-black uppercase tracking-tight">Tree Members</h4>
                        <button
                            onClick={() => setShowAddMemberModal(true)}
                            className="p-2 bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 active:scale-95 transition-all"
                            title="Add Soul"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                        {treeMembers.length === 0 ? (
                            <div className="p-6 text-center text-xs font-bold uppercase tracking-widest text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                                No tree members added yet.
                            </div>
                        ) : (
                            treeMembers.map((m) => (
                                <div key={m.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all group ${
                                    themeMode === 'futuristic'
                                        ? 'bg-slate-950/60 border-slate-800 hover:border-amber-500/40 text-white'
                                        : 'bg-slate-50 dark:bg-slate-900/50 border-transparent hover:border-amber-100'
                                }`}>
                                    {m.profilePhotoUrl ? (
                                        <img loading="lazy" 
                                            src={m.profilePhotoUrl} 
                                            alt={m.name} 
                                            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${
                                            m.branch === 'Paternal' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-pink-500/20 text-pink-400 border border-pink-500/40'
                                        }`}>
                                            {m.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-xs uppercase tracking-tight truncate">{m.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.relation} · {m.branch}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleOpenEditMember(m)}
                                            className="p-2 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500 hover:text-slate-950 transition-all"
                                            title="Edit Soul Record"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMember(m.id)}
                                            className="p-2 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                                            title="Delete Soul Record"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className={`p-6 rounded-[2.5rem] border transition-all ${
                    themeMode === 'futuristic'
                        ? 'bg-slate-900/90 border-amber-500/30 shadow-xl'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'
                }`}>
                    <h4 className="text-sm font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-500" />
                        Tree Lineage Health
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase tracking-widest">
                            <span className="text-slate-400">Total Recorded Souls</span>
                            <span className="text-amber-400">{treeMembers.length} Members</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase tracking-widest">
                            <span className="text-slate-400">Paternal Lineage</span>
                            <span className="text-blue-400">{treeMembers.filter(m => m.branch === 'Paternal').length}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase tracking-widest">
                            <span className="text-slate-400">Maternal Lineage</span>
                            <span className="text-pink-400">{treeMembers.filter(m => m.branch === 'Maternal').length}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mt-2 border border-slate-800">
                            <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500" style={{ width: `${Math.min((treeMembers.length / 20) * 100, 100)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStoriesSubView = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <div className={`p-6 md:p-8 rounded-[3rem] border min-h-[400px] transition-all ${
                themeMode === 'futuristic'
                    ? 'bg-slate-900/90 border-amber-500/30 shadow-2xl'
                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'
            }`}>
                <div className="flex justify-between items-center mb-8">
                    <h4 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                        <Library className="w-6 h-6 text-amber-500" />
                        Historical Origins
                    </h4>
                    <button className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl hover:bg-amber-500 hover:text-slate-950 transition-all">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
                <div className="space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2 text-amber-500" />
                            <p className="text-[10px] font-mono font-black uppercase tracking-widest">Loading Stories...</p>
                        </div>
                    ) : heritageStories.length === 0 ? (
                        <div className="text-center p-10 border-2 border-dashed border-slate-800 rounded-3xl">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No oral histories documented yet.</p>
                        </div>
                    ) : (
                        heritageStories.map((story, i) => (
                            <div key={story.id || i} className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                                themeMode === 'futuristic'
                                    ? 'bg-slate-950/60 border-slate-800 hover:border-amber-500/40'
                                    : 'bg-slate-50 dark:bg-slate-900/50 border-transparent hover:border-amber-100'
                            }`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-black uppercase tracking-tight text-sm">{story.title}</h5>
                                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">{story.storyDate}</span>
                                </div>
                                <p className="text-slate-400 text-sm line-clamp-2 italic mb-4">"{story.storyText}"</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-mono font-black uppercase text-slate-500">Oral Historian: {story.authorName || 'Elder'}</span>
                                    <ArrowRight className="w-4 h-4 text-amber-500" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className={`rounded-[3rem] p-8 relative overflow-hidden flex items-center justify-center border transition-all ${
                themeMode === 'futuristic'
                    ? 'bg-slate-900/90 border-amber-500/40 text-white shadow-2xl shadow-amber-500/10'
                    : 'bg-slate-900 text-white border-slate-800'
            }`}>
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none"></div>
                <div className="relative z-10 text-center animate-pulse">
                    <Mic className="w-20 h-20 text-amber-500 mx-auto mb-6 opacity-70" />
                    <h4 className="text-2xl font-black uppercase tracking-tighter mb-2">Voice of Elders Vault</h4>
                    <p className="text-slate-400 text-xs font-mono font-bold uppercase tracking-[0.2em]">Record Oral Testimony & Audio Archives</p>
                </div>
            </div>
        </div>
    );

    const renderGallerySubView = () => (
        <div className="space-y-8">
            <div className={`p-6 md:p-8 rounded-[3rem] border transition-all ${
                themeMode === 'futuristic'
                    ? 'bg-slate-900/90 border-amber-500/30 shadow-2xl'
                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'
            }`}>
                <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
                    <div>
                        <h4 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                            <ImageIcon className="w-6 h-6 text-amber-500" />
                            Heirloom Gallery
                        </h4>
                        <p className="text-slate-400 text-[10px] font-mono font-black uppercase tracking-widest mt-1">Encrypted Photo & Media Vault</p>
                    </div>
                    <button className="bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl hover:brightness-110 active:scale-95 transition-all">
                        <Upload className="w-4 h-4" />
                        Upload Heirlooms
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {isLoading ? (
                        <div className="col-span-full py-12 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                        </div>
                    ) : heritageGallery.length === 0 ? (
                        <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-800 rounded-[3rem]">
                            <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400 text-[10px] font-mono font-black uppercase tracking-[0.2em]">The vault gallery is currently empty.</p>
                        </div>
                    ) : (
                        heritageGallery.map((item, i) => (
                            <div key={item.id || i} className="aspect-square bg-slate-950 rounded-3xl overflow-hidden group relative cursor-pointer border border-slate-800">
                                <img loading="lazy" src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-amber-400 scale-0 group-hover:scale-100 transition-transform duration-500" />
                                </div>
                                <div className="absolute bottom-4 left-4 right-4">
                                    <p className="text-[10px] font-mono font-black uppercase tracking-widest text-white truncate">{item.title}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    const renderAnnouncementsSubView = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div className={`p-6 md:p-8 rounded-[3rem] border transition-all ${
                    themeMode === 'futuristic'
                        ? 'bg-slate-900/90 border-amber-500/30 shadow-2xl'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'
                }`}>
                    <h4 className="text-xl font-black uppercase tracking-tight mb-8 flex items-center gap-3">
                        <Ghost className="w-6 h-6 text-amber-500" />
                        Family Proclamations
                    </h4>
                    <div className="space-y-6">
                        {isLoading ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                            </div>
                        ) : heritageAnnouncements.length === 0 ? (
                            <div className="text-center p-12 bg-slate-950/40 rounded-3xl border-2 border-dashed border-slate-800">
                                <p className="text-slate-400 text-xs font-mono font-bold uppercase tracking-widest">No proclamations have been published.</p>
                            </div>
                        ) : (
                            heritageAnnouncements.map((post, i) => (
                                <div key={post.id || i} className={`p-6 rounded-3xl border flex gap-6 transition-all ${
                                    themeMode === 'futuristic'
                                        ? 'bg-slate-950/60 border-slate-800 hover:border-amber-500/40'
                                        : 'bg-slate-50 dark:bg-slate-900/50 border-transparent hover:border-slate-100'
                                }`}>
                                    <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-mono font-black text-amber-400 uppercase">
                                            {post.announcementDate?.split(' ')[0] || 'TBD'}
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-400 uppercase">
                                            {post.announcementDate?.split(' ')[1] || ''}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[8px] font-mono font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full tracking-widest uppercase">{post.type}</span>
                                            <h5 className="font-black text-sm uppercase tracking-tight">{post.title}</h5>
                                        </div>
                                        <p className="text-slate-400 text-xs leading-relaxed">{post.detail}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className={`p-8 rounded-[3rem] shadow-2xl relative overflow-hidden border transition-all ${
                    themeMode === 'futuristic'
                        ? 'bg-slate-900/90 border-amber-500/40 text-white shadow-amber-500/10'
                        : 'bg-slate-900 text-white border-slate-800'
                }`}>
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <CalendarDaysIcon className="w-20 h-20 text-amber-500" />
                    </div>
                    <h4 className="text-lg font-black uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-2">
                        Council Meetings
                    </h4>
                    <div className="space-y-4 relative z-10">
                        <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                            <p className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-400">Next Assembly</p>
                            <p className="text-sm font-bold mt-1 uppercase">Heritage Elders Council Sync</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono">Zoom • Saturday, 4PM</p>
                        </div>
                        <button className="w-full py-3 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition-all">
                            Join Council Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMembersSubView = () => (
        <div className="space-y-6">
            <div className={`p-6 md:p-8 rounded-[3rem] border transition-all ${
                themeMode === 'futuristic'
                    ? 'bg-slate-900/90 border-amber-500/30 shadow-2xl'
                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'
            }`}>
                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                    <div>
                        <h4 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                            <Users className="w-6 h-6 text-amber-500" />
                            Tree Members Directory
                        </h4>
                        <p className="text-slate-400 text-[10px] font-mono font-black uppercase tracking-widest mt-1">
                            Total Records: {treeMembers.length} Souls
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowExcelImporterModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Import Excel
                        </button>
                        <button
                            onClick={() => setShowAddMemberModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-amber-400 active:scale-95 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Add Soul
                        </button>
                    </div>
                </div>

                {treeMembers.length === 0 ? (
                    <div className="p-16 text-center text-xs font-mono font-bold uppercase tracking-widest text-slate-400 border border-dashed border-slate-800 rounded-3xl">
                        No family tree members registered yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-amber-500/20 bg-slate-950/40 text-[10px] font-mono font-black uppercase tracking-widest text-amber-400">
                                    <th className="p-4">Full Name</th>
                                    <th className="p-4">Branch</th>
                                    <th className="p-4">Relationship</th>
                                    <th className="p-4">Lifespan</th>
                                    <th className="p-4">Historical Notes</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-xs">
                                {treeMembers.map((m, idx) => (
                                    <tr key={m.id || idx} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 font-black uppercase flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                                                m.branch === 'Paternal' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                                            }`}>
                                                {m.name.charAt(0)}
                                            </div>
                                            <span>{m.name}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-mono font-black uppercase ${
                                                m.branch === 'Paternal' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-pink-500/20 text-pink-400 border border-pink-500/40'
                                            }`}>
                                                {m.branch}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-slate-300">{m.relation}</td>
                                        <td className="p-4 font-mono font-bold text-amber-400">
                                            {m.birthYear || '—'} {m.deathYear ? `- ${m.deathYear}` : ''}
                                        </td>
                                        <td className="p-4 text-slate-400 font-medium max-w-xs truncate">{m.notes || '—'}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEditMember(m)}
                                                    className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-xl text-[10px] font-mono font-black uppercase hover:bg-amber-500 hover:text-slate-950 transition-all flex items-center gap-1"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMember(m.id)}
                                                    className="px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-xl text-[10px] font-mono font-black uppercase hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );

    const renderAnalyticsSubView = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900/90 border border-amber-500/30 p-6 rounded-[2.5rem] shadow-xl">
                    <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-widest">Total Ancestral Souls</span>
                    <h4 className="text-3xl font-black text-amber-400 mt-2">{treeMembers.length}</h4>
                </div>
                <div className="bg-slate-900/90 border border-amber-500/30 p-6 rounded-[2.5rem] shadow-xl">
                    <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-widest">Paternal Lineage</span>
                    <h4 className="text-3xl font-black text-blue-400 mt-2">{treeMembers.filter(m => m.branch === 'Paternal').length}</h4>
                </div>
                <div className="bg-slate-900/90 border border-amber-500/30 p-6 rounded-[2.5rem] shadow-xl">
                    <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-widest">Maternal Lineage</span>
                    <h4 className="text-3xl font-black text-pink-400 mt-2">{treeMembers.filter(m => m.branch === 'Maternal').length}</h4>
                </div>
                <div className="bg-slate-900/90 border border-amber-500/30 p-6 rounded-[2.5rem] shadow-xl">
                    <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-widest">Documented Lifespans</span>
                    <h4 className="text-3xl font-black text-emerald-400 mt-2">{treeMembers.filter(m => m.birthYear || m.deathYear).length}</h4>
                </div>
            </div>
        </div>
    );

    const renderCyberHudSubView = () => (
        <div className="space-y-6">
            <div className="bg-slate-900/90 border border-amber-500/40 p-8 rounded-[3rem] shadow-2xl text-white">
                <div className="flex items-center gap-3 mb-6">
                    <Zap className="w-8 h-8 text-amber-400 animate-pulse" />
                    <div>
                        <h4 className="text-2xl font-black uppercase tracking-tight">Quantum Biometric Vault Status</h4>
                        <p className="text-xs font-mono text-amber-400 uppercase tracking-widest">Encrypted Soul Ledger v4.0 • Zero-Knowledge Vault Active</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800">
                        <p className="text-[9px] font-mono text-slate-400 uppercase">Encryption Cipher</p>
                        <p className="text-sm font-mono font-black text-emerald-400 mt-1">AES-256 GCM ANCESTRY</p>
                    </div>
                    <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800">
                        <p className="text-[9px] font-mono text-slate-400 uppercase">Vault Integrity</p>
                        <p className="text-sm font-mono font-black text-amber-400 mt-1">100% SECURED</p>
                    </div>
                    <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800">
                        <p className="text-[9px] font-mono text-slate-400 uppercase">Cloud Backup Hash</p>
                        <p className="text-sm font-mono font-black text-blue-400 mt-1">0x89F...7C2</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderHeritage = () => {
        const heritageSubTabs = [
            { id: 'tree', label: 'Ancestry Map', badge: 'Lineage Tree', icon: Network },
            { id: 'stories', label: 'Origin Stories', badge: 'Oral History', icon: Library },
            { id: 'gallery', label: 'Heritage Vault', badge: 'Media Vault', icon: ImageIcon },
            { id: 'announcements', label: 'Family Council', badge: 'Proclamations', icon: Ghost },
            { id: 'members', label: 'Tree Members', badge: 'Directory', icon: Users },
            { id: 'analytics', label: 'Lineage Analytics', badge: 'Metrics', icon: BarChart3 },
            { id: 'hud', label: 'Cyber Vault HUD', badge: 'Quantum', icon: Zap }
        ];

        return (
            <div className={`transition-all duration-500 min-h-[850px] w-full text-left ${
                themeMode === 'futuristic'
                    ? 'bg-slate-950/75 p-3 md:p-6 rounded-[3rem] border border-amber-500/30 shadow-2xl shadow-amber-500/10 text-white'
                    : 'bg-white dark:bg-slate-800 p-4 md:p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm'
            }`}>
                
                {/* ── Mobile Top Header (Android & Mobile Responsive) ── */}
                <div className="md:hidden flex items-center justify-between p-4 mb-6 bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-yellow-600 rounded-xl text-slate-950 shadow-md">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-xs uppercase tracking-tight text-white flex items-center gap-1.5 truncate max-w-[150px]">
                                {currentInstitution.name}
                            </h3>
                            <p className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                                {themeMode === 'futuristic' ? '⚡ Cyber HUD' : 'Family Heritage'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setThemeMode(themeMode === 'futuristic' ? 'classic' : 'futuristic')}
                            className="p-2.5 bg-slate-800 border border-amber-500/30 text-amber-400 rounded-xl text-xs active:scale-95 transition-all"
                            title="Toggle Futuristic Cyber Theme"
                        >
                            {themeMode === 'futuristic' ? '⚡' : '🏛️'}
                        </button>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2.5 bg-amber-500 text-slate-950 rounded-xl active:scale-95 transition-all shadow-lg font-black"
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* ── Mobile Slide-Over Navigation Drawer ── */}
                {isMobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl p-6 flex flex-col justify-between animate-fade-in text-white">
                        <div>
                            <div className="flex justify-between items-center pb-6 border-b border-amber-500/20 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl font-black">
                                        <History className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm uppercase text-white tracking-tight">Family Navigation</h4>
                                        <p className="text-[9px] font-mono text-amber-400 uppercase tracking-widest">Ancestry Control System</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                {heritageSubTabs.map((tab) => {
                                    const isActive = heritageView === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setHeritageView(tab.id as any);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={`w-full p-4 rounded-2xl flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider transition-all ${
                                                isActive
                                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                                                    : 'bg-slate-900/60 text-slate-300 border border-slate-800 hover:border-amber-500/40'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <tab.icon className="w-5 h-5" />
                                                <span>{tab.label}</span>
                                            </div>
                                            <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full uppercase ${
                                                isActive ? 'bg-slate-950/40 text-slate-950 font-bold' : 'bg-slate-800 text-amber-400'
                                            }`}>
                                                {tab.badge}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-800">
                            <button
                                onClick={() => {
                                    setThemeMode(themeMode === 'futuristic' ? 'classic' : 'futuristic');
                                    setIsMobileMenuOpen(false);
                                }}
                                className="w-full py-4 bg-slate-900 border border-amber-500/40 text-amber-400 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                            >
                                <Zap className="w-4 h-4" />
                                {themeMode === 'futuristic' ? 'Switch to Classic ERP Theme' : 'Switch to Cyber HUD Theme'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Desktop & Main Layout: Left Vertical Menu + Main View Content ── */}
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start w-full">
                    
                    {/* ── Left Vertical Navigation Menu Sidebar (Desktop) ── */}
                    <aside className={`hidden md:flex flex-col justify-between transition-all duration-300 ${
                        isSidebarCollapsed ? 'w-20' : 'w-72'
                    } flex-shrink-0 ${
                        themeMode === 'futuristic'
                            ? 'bg-slate-900/90 border border-amber-500/30 shadow-2xl rounded-[2.5rem] p-5'
                            : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-5'
                    }`}>
                        <div className="space-y-6">
                            {/* Sidebar Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-amber-500/20">
                                {!isSidebarCollapsed && (
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-2xl ${
                                            themeMode === 'futuristic'
                                                ? 'bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30'
                                                : 'bg-amber-600 text-white'
                                        }`}>
                                            <History className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className={`font-black text-xs uppercase tracking-tight ${themeMode === 'futuristic' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                                Heritage Vault
                                            </h4>
                                            <p className={`text-[8px] font-mono font-bold uppercase tracking-widest ${themeMode === 'futuristic' ? 'text-amber-400' : 'text-slate-400'}`}>
                                                {themeMode === 'futuristic' ? '⚡ Cyber HUD v4.0' : 'Navigation Menu'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                    className={`p-2 rounded-xl border transition-all ${
                                        themeMode === 'futuristic'
                                            ? 'bg-slate-950 border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-slate-950'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                    }`}
                                    title={isSidebarCollapsed ? "Expand Menu" : "Collapse Menu"}
                                >
                                    {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Vertical Menu Buttons */}
                            <nav className="space-y-2">
                                {heritageSubTabs.map((item) => {
                                    const isActive = heritageView === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setHeritageView(item.id as any)}
                                            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3'} rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-200 group ${
                                                isActive
                                                    ? (themeMode === 'futuristic'
                                                        ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30 scale-[1.02]'
                                                        : 'bg-amber-600 text-white shadow-md')
                                                    : (themeMode === 'futuristic'
                                                        ? 'text-slate-300 hover:bg-slate-800/80 hover:text-amber-400 border border-transparent hover:border-amber-500/30'
                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800')
                                            }`}
                                            title={item.label}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className={`w-5 h-5 flex-shrink-0 ${
                                                    isActive
                                                        ? (themeMode === 'futuristic' ? 'text-slate-950' : 'text-white')
                                                        : (themeMode === 'futuristic' ? 'text-amber-400 group-hover:text-amber-300' : 'text-slate-400')
                                                }`} />
                                                {!isSidebarCollapsed && (
                                                    <span className="truncate">{item.label}</span>
                                                )}
                                            </div>
                                            {!isSidebarCollapsed && (
                                                <span className={`text-[7px] font-mono px-2 py-0.5 rounded-full uppercase ${
                                                    isActive
                                                        ? (themeMode === 'futuristic' ? 'bg-slate-950/50 text-slate-950 font-bold' : 'bg-white/20 text-white')
                                                        : 'bg-slate-800/60 text-amber-400'
                                                }`}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Sidebar Footer & Theme Toggle Switch */}
                        {!isSidebarCollapsed && (
                            <div className="mt-8 pt-4 border-t border-amber-500/20">
                                <button
                                    onClick={() => setThemeMode(themeMode === 'futuristic' ? 'classic' : 'futuristic')}
                                    className={`w-full py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-between transition-all ${
                                        themeMode === 'futuristic'
                                            ? 'bg-slate-950 border border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-slate-950 shadow-md'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-400" />
                                        {themeMode === 'futuristic' ? '⚡ Cyber HUD' : '🏛️ Classic'}
                                    </span>
                                    <span className="text-[8px] font-mono opacity-80">TOGGLE</span>
                                </button>
                            </div>
                        )}
                    </aside>

                    {/* ── Main View Panel Container ── */}
                    <main className="flex-1 w-full space-y-6 md:space-y-8 min-w-0">
                        {/* Header Banner */}
                        <div className={`p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden transition-all border ${
                            themeMode === 'futuristic'
                                ? 'bg-slate-900/90 border-amber-500/40 shadow-2xl shadow-amber-500/10'
                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'
                        }`}>
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                <TreePalm className="w-48 h-48 text-amber-500" />
                            </div>
                            
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest rounded-full border ${
                                            themeMode === 'futuristic'
                                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                                                : 'bg-amber-50 text-amber-600 border-amber-200'
                                        }`}>
                                            {themeMode === 'futuristic' ? '⚡ QUANTUM ANCESTRY HUD' : 'FAMILY HERITAGE PRESERVATION'}
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-400 hidden sm:inline">ID: {currentInstitution.id.slice(0, 8)}</span>
                                    </div>

                                    <h3 className={`text-2xl md:text-3xl font-black uppercase tracking-tight mt-2 flex items-center gap-3 ${
                                        themeMode === 'futuristic' ? 'text-white' : 'text-slate-800 dark:text-white'
                                    }`}>
                                        <History className="w-8 h-8 text-amber-500" />
                                        {heritageView === 'tree' ? 'Ancestry Map & Lineage Tree' : 
                                         heritageView === 'stories' ? 'Origin & Oral History Chronicles' : 
                                         heritageView === 'gallery' ? 'Heritage Vault Gallery' : 
                                         heritageView === 'announcements' ? 'Family Council & Proclamations' : 
                                         heritageView === 'members' ? 'Tree Members Directory' : 
                                         heritageView === 'analytics' ? 'Ancestral Metrics & Analytics' : 'Cyber Vault Security HUD'}
                                    </h3>
                                    
                                    <p className={`text-xs font-medium mt-1 ${themeMode === 'futuristic' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {heritageView === 'tree' ? 'Visualize your ancestral lineage and connect paternal/maternal branches.' : 
                                         heritageView === 'stories' ? 'Document oral testimonies, migration histories, and family achievements.' : 
                                         heritageView === 'gallery' ? 'Preserve faces, places, historical photos, and heirloom documents.' : 
                                         heritageView === 'announcements' ? 'Coordinate family meetings, reunion dates, and official council proclamations.' : 
                                         heritageView === 'members' ? 'Manage full family membership, batch import Excel files, and export lineage.' : 
                                         heritageView === 'analytics' ? 'Statistical insights into generation depth, branch ratios, and lifespan records.' : 'Real-time encryption status, biometric lineage vault integrity, and backups.'}
                                    </p>
                                </div>

                                {/* Top Quick Actions */}
                                <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                                    <button
                                        onClick={() => setShowExcelImporterModal(true)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all"
                                    >
                                        <FileSpreadsheet className="w-4 h-4" />
                                        Import Excel
                                    </button>
                                    <button
                                        onClick={() => setShowAddMemberModal(true)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Soul
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* ── Tree Rights & Permission Control Selector Bar ── */}
                        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 flex-wrap mb-6 ${
                            themeMode === 'futuristic'
                                ? 'bg-slate-900/90 border-amber-500/30 text-white shadow-xl'
                                : 'bg-amber-50/70 border-amber-200 text-slate-900 shadow-sm'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/30">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-mono font-black uppercase text-amber-400 tracking-widest">Family Tree Rights & Role Matrix</p>
                                    <p className="text-xs font-bold">Active User Rights Level: <span className="text-amber-300 uppercase">{userTreeRole}</span></p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Switch Test Role:</span>
                                <select
                                    value={userTreeRole}
                                    onChange={e => setUserTreeRole(e.target.value as any)}
                                    className="px-3.5 py-2 bg-slate-950 border border-amber-500/40 rounded-xl font-bold text-white text-xs focus:outline-none focus:border-amber-400 transition-colors"
                                >
                                    <option value="Patriarch">👑 Patriarch (Full Council Admin Rights)</option>
                                    <option value="Council Elder">🏛️ Council Elder (Full Council Admin Rights)</option>
                                    <option value="Branch Leader">🌿 Branch Leader (Branch Editor Rights)</option>
                                    <option value="Descendant">🛡️ Descendant (View Only Rights)</option>
                                </select>

                                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-mono font-black uppercase tracking-widest ${
                                    treePermissions.canAddSoul
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}>
                                    {treePermissions.label}
                                </span>
                            </div>
                        </div>

                        {/* Render Sub View Content */}
                        {heritageView === 'tree' && renderTreeSubView()}
                        {heritageView === 'stories' && renderStoriesSubView()}
                        {heritageView === 'gallery' && renderGallerySubView()}
                        {heritageView === 'announcements' && renderAnnouncementsSubView()}
                        {heritageView === 'members' && renderMembersSubView()}
                        {heritageView === 'analytics' && renderAnalyticsSubView()}
                        {heritageView === 'hud' && renderCyberHudSubView()}
                    </main>
                </div>

                {/* ── Android & Mobile Bottom Floating Action Bar (FAB) ── */}
                <div className="md:hidden fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
                    <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="p-4 bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 rounded-full shadow-2xl shadow-amber-500/50 active:scale-90 transition-transform font-black flex items-center gap-2"
                        title="Add Member"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>
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
                                                    <img loading="lazy" 
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
                             )}
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
                                                <img loading="lazy" 
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

                                {/* Family Tree Rights & Council Role Assignment */}
                                <div className="col-span-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                                        <span className="text-[9px] font-mono font-black uppercase text-amber-400 tracking-widest">Family Role & Permission Rights</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[8px] font-mono font-black uppercase text-slate-400 mb-1">Family Role</label>
                                            <select
                                                value={newMember.role || 'Family Member'}
                                                onChange={e => setNewMember(p => ({ ...p, role: e.target.value as any }))}
                                                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-amber-400"
                                            >
                                                <option value="Patriarch">👑 Patriarch</option>
                                                <option value="Matriarch">👑 Matriarch</option>
                                                <option value="Council Elder">🏛️ Council Elder</option>
                                                <option value="Branch Leader">🌿 Branch Leader</option>
                                                <option value="Family Member">👤 Family Member</option>
                                                <option value="Descendant">🛡️ Descendant</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[8px] font-mono font-black uppercase text-slate-400 mb-1">Access Level</label>
                                            <select
                                                value={newMember.accessRight || 'Branch Editor'}
                                                onChange={e => setNewMember(p => ({ ...p, accessRight: e.target.value as any }))}
                                                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-amber-400"
                                            >
                                                <option value="Full Admin">Full Admin</option>
                                                <option value="Branch Editor">Branch Editor</option>
                                                <option value="View Only">View Only</option>
                                            </select>
                                        </div>
                                    </div>
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

            {/* ── Edit Member / Node Inspector Modal for Family Heritage ── */}
            {editingMember && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        onClick={() => { setEditingMember(null); setEditMemberError(''); }}
                    />
                    {/* Modal Card */}
                    <div className="relative z-10 bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-lg border border-amber-500/30 overflow-hidden text-white">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-amber-600 to-yellow-600 p-8 relative overflow-hidden">
                            <div className="absolute -right-8 -top-8 opacity-10">
                                <TreePalm className="w-48 h-48 text-slate-950" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-slate-950 mb-1">Family Tree Matrix</p>
                                <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter flex items-center gap-2">
                                    <Pencil className="w-6 h-6" />
                                    Edit Soul Record
                                </h3>
                                <p className="text-slate-900 text-xs font-bold mt-1">Update ancestral node details and lineage properties.</p>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="p-8 space-y-5">
                            {editMemberError && (
                                <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-2xl text-red-300 text-xs font-bold uppercase tracking-widest">
                                    {editMemberError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[9px] font-mono font-black uppercase text-amber-400 tracking-[0.2em] mb-2">Full Name *</label>
                                    <input
                                        value={editMemberForm.name || ''}
                                        onChange={e => setEditMemberForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g. Samuel Mwangi Sr."
                                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-mono font-black uppercase text-amber-400 tracking-[0.2em] mb-2">Branch *</label>
                                    <select
                                        value={editMemberForm.branch || 'Paternal'}
                                        onChange={e => setEditMemberForm(p => ({ ...p, branch: e.target.value as 'Paternal' | 'Maternal' }))}
                                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-white focus:outline-none focus:border-amber-400 transition-colors"
                                    >
                                        <option value="Paternal">Paternal</option>
                                        <option value="Maternal">Maternal</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-mono font-black uppercase text-amber-400 tracking-[0.2em] mb-2">Relationship *</label>
                                    <select
                                        value={editMemberForm.relation || ''}
                                        onChange={e => setEditMemberForm(p => ({ ...p, relation: e.target.value }))}
                                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-white focus:outline-none focus:border-amber-400 transition-colors"
                                    >
                                        <option value="">Select Relation</option>
                                        {RELATIONSHIP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-mono font-black uppercase text-amber-400 tracking-[0.2em] mb-2">Year of Birth</label>
                                    <input
                                        value={editMemberForm.birthYear || ''}
                                        onChange={e => setEditMemberForm(p => ({ ...p, birthYear: e.target.value }))}
                                        placeholder="e.g. 1892"
                                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-mono font-black uppercase text-amber-400 tracking-[0.2em] mb-2">Year of Death</label>
                                    <input
                                        value={editMemberForm.deathYear || ''}
                                        onChange={e => setEditMemberForm(p => ({ ...p, deathYear: e.target.value }))}
                                        placeholder="Leave blank if alive"
                                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[9px] font-mono font-black uppercase text-amber-400 tracking-[0.2em] mb-2">Profile Picture</label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative group overflow-hidden w-16 h-16 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center">
                                            {editMemberForm.profilePhotoUrl ? (
                                                <img loading="lazy" 
                                                    src={editMemberForm.profilePhotoUrl} 
                                                    alt="Preview" 
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <ImageIcon className="w-6 h-6 text-slate-500" />
                                            )}
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const url = await apiService.uploadFile('heritage', `members/${Date.now()}_${file.name}`, file);
                                                        if (url) setEditMemberForm(p => ({ ...p, profilePhotoUrl: url }));
                                                    }
                                                }}
                                            />
                                        </div>
                                        <input
                                            value={editMemberForm.profilePhotoUrl || ''}
                                            onChange={e => setEditMemberForm(p => ({ ...p, profilePhotoUrl: e.target.value }))}
                                            placeholder="Or enter Image URL..."
                                            className="flex-1 p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[9px] font-mono font-black uppercase text-amber-400 tracking-[0.2em] mb-2">Historical Notes / Bio</label>
                                    <textarea
                                        value={editMemberForm.notes || ''}
                                        onChange={e => setEditMemberForm(p => ({ ...p, notes: e.target.value }))}
                                        placeholder="Brief notes on this family member's legacy..."
                                        rows={3}
                                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                                    />
                                </div>

                                {/* Family Tree Rights & Council Role Assignment */}
                                <div className="col-span-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                                        <span className="text-[9px] font-mono font-black uppercase text-amber-400 tracking-widest">Family Role & Permission Rights</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[8px] font-mono font-black uppercase text-slate-400 mb-1">Family Role</label>
                                            <select
                                                value={editMemberForm.role || 'Family Member'}
                                                onChange={e => setEditMemberForm(p => ({ ...p, role: e.target.value as any }))}
                                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:border-amber-400"
                                            >
                                                <option value="Patriarch">👑 Patriarch</option>
                                                <option value="Matriarch">👑 Matriarch</option>
                                                <option value="Council Elder">🏛️ Council Elder</option>
                                                <option value="Branch Leader">🌿 Branch Leader</option>
                                                <option value="Family Member">👤 Family Member</option>
                                                <option value="Descendant">🛡️ Descendant</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[8px] font-mono font-black uppercase text-slate-400 mb-1">Access Level</label>
                                            <select
                                                value={editMemberForm.accessRight || 'Branch Editor'}
                                                onChange={e => setEditMemberForm(p => ({ ...p, accessRight: e.target.value as any }))}
                                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:border-amber-400"
                                            >
                                                <option value="Full Admin">Full Admin</option>
                                                <option value="Branch Editor">Branch Editor</option>
                                                <option value="View Only">View Only</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => handleDeleteMember(editingMember.id)}
                                    className="py-4 px-5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1.5"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                                <button
                                    onClick={() => { setEditingMember(null); setEditMemberError(''); }}
                                    className="flex-1 py-4 border border-slate-800 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-800 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEditMember}
                                    disabled={isSavingEdit}
                                    className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 font-bold"
                                >
                                    {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Smart Excel Importer Modal for Family Heritage ── */}
            {showExcelImporterModal && (
                <SmartHeritageMemberImporterModal
                    onClose={() => setShowExcelImporterModal(false)}
                    onImport={handleBatchImportHeritageMembers}
                    institutionId={currentInstitution.id}
                />
            )}
        </div>
    );
};

