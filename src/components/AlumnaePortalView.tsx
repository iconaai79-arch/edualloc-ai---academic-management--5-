
import React, { useState, useEffect, useMemo } from 'react';
import { 
    MessageSquare, 
    Heart, 
    Repeat2, 
    Share, 
    MoreHorizontal, 
    Image as ImageIcon, 
    Smile, 
    Calendar, 
    Search,
    Bell,
    Home,
    Hash,
    User,
    CheckCircle2,
    ArrowLeft,
    Send,
    Loader2,
    Plus,
    X,
    Sparkles,
    Users,
    Share2,
    Building2
} from 'lucide-react';
import type { AlumniPost, AlumniComment, Institution } from '../types';
import { apiService } from '../services/apiService';

interface AlumnaePortalViewProps {
    currentAlumna: any;
    institutions: Institution[];
    featureFee: number;
    onBack: () => void;
}

export const AlumnaePortalView: React.FC<AlumnaePortalViewProps> = ({ currentAlumna, institutions, featureFee, onBack }) => {
    const [posts, setPosts] = useState<AlumniPost[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [activeTab, setActiveTab] = useState<'for-you' | 'my-schools'>('for-you');
    const [selectedPost, setSelectedPost] = useState<AlumniPost | null>(null);
    const [comments, setComments] = useState<Record<string, AlumniComment[]>>({});
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [isProcessingFeature, setIsProcessingFeature] = useState(false);
    const [featuredMembers, setFeaturedMembers] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<'feed' | 'messages' | 'explore' | 'notifications' | 'classmates'>('feed');
    const [messages, setMessages] = useState<any[]>([]);
    const [activeConversationPartner, setActiveConversationPartner] = useState<any | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [alumnaeMembers, setAlumnaeMembers] = useState<any[]>([]);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileData, setProfileData] = useState({
        fullName: currentAlumna?.fullName || '',
        email: currentAlumna?.email || '',
        currentJob: currentAlumna?.currentJob || '',
        currentCompany: currentAlumna?.currentCompany || '',
        bio: currentAlumna?.bio || '',
        linkedinUrl: currentAlumna?.linkedinUrl || '',
        twitterUrl: currentAlumna?.twitterUrl || '',
        profilePhotoUrl: currentAlumna?.profilePhotoUrl || ''
    });
    const [profilePhotoUrlFile, setProfilePhotoFile] = useState<File | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [otherMemberships, setOtherMemberships] = useState<any[]>([]);
    const [isDetectingMemberships, setIsDetectingMemberships] = useState(false);
    const [showSwitcher, setShowSwitcher] = useState(false);
    const [postImageFile, setPostImageFile] = useState<File | null>(null);
    const [postImagePreview, setPostImagePreview] = useState<string | null>(null);

    const loadOtherMemberships = async () => {
        setIsDetectingMemberships(true);
        try {
            if (!currentAlumna?.email) return;
            const results = await apiService.fetchModuleRecords('alumnae_members', {
                email: currentAlumna.email.toLowerCase().trim()
            });
            // Filter to ensure same email and valid memberships, excluding current active one
            const others = results.filter((m: any) => 
                (m.email?.toLowerCase() === currentAlumna.email?.toLowerCase()) && 
                m.id !== currentAlumna.id
            );
            setOtherMemberships(others);
        } catch (e) {
            console.error("Failed to detect other memberships:", e);
        } finally {
            setIsDetectingMemberships(false);
        }
    };

    const handleSwitchCircle = (membership: any) => {
        localStorage.setItem('eduai_alumna_session', JSON.stringify(membership));
        window.location.reload(); // Hard refresh to reset all states with new institution
    };

    const handleUpdateProfile = async () => {
        setIsSavingProfile(true);
        try {
            let photoUrl = profileData.profilePhotoUrl;
            if (profilePhotoUrlFile) {
                const uploadRes = await apiService.uploadToGoogleDrive(profilePhotoUrlFile, 'Alumnae_Profiles', {
                    institutionId: currentAlumna.institutionId,
                    useGlobalConfig: !currentAlumna.institutionId
                });
                if (uploadRes.success) photoUrl = uploadRes.url;
            }

            await apiService.saveModuleRecord('alumnae_members', {
                ...currentAlumna,
                ...profileData,
                email: profileData.email || currentAlumna.email,
                full_name: profileData.fullName || currentAlumna.fullName || currentAlumna.full_name,
                institution_id: currentAlumna.institution_id || currentAlumna.institutionId,
                profile_photo: photoUrl, // Ensure snake_case mapping
                profilePhotoUrl: photoUrl,  // Keep for legacy frontend
                id: currentAlumna.id
            });
            // Update local session
            const updated = { ...currentAlumna, ...profileData, profilePhotoUrl: photoUrl };
            localStorage.setItem('eduai_alumna_session', JSON.stringify(updated));
            setIsEditingProfile(false);
            window.location.reload(); // Refresh to propagate changes
        } catch (e: any) {
            alert("Update Error: " + e.message);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const loadPosts = async () => {
        setLoadingPosts(true);
        try {
            const filters: any = {};
            if (activeTab === 'my-schools') {
                filters.institution_id = currentAlumna.institutionId || currentAlumna.schoolId;
            }
            
            const data = await apiService.fetchModuleRecords('alumni_posts', undefined, undefined, { 
                filter: filters,
                order: 'created_at.desc'
            });
            setPosts(data || []);
            
            // Prefetch comments for these posts
            if (data && data.length > 0) {
                for (const post of data) {
                    fetchComments(post.id);
                }
            }
        } catch (e) {
            console.error("Failed to load alumni posts:", e);
        } finally {
            setLoadingPosts(false);
        }
    };

    const fetchComments = async (postId: string) => {
        try {
            const data = await apiService.fetchModuleRecords('alumni_comments', undefined, undefined, {
                filter: { post_id: postId },
                order: 'created_at.asc'
            });
            setComments(prev => ({ ...prev, [postId]: data }));
        } catch (e) {}
    };

    const loadMessages = async () => {
        try {
            // Only load messages where current alumna is sender or recipient
            const data = await apiService.fetchModuleRecords('alumni_messages', undefined, undefined, {
                order: 'created_at.asc'
            });
            // Frontend filter as complex OR filters might be limited in standard fetch
            const filtered = (data || []).filter((m: any) => 
                m.sender_id === currentAlumna.id || m.recipient_id === currentAlumna.id
            );
            setMessages(filtered);
        } catch (e) {}
    };

    const loadAlumnaeMembers = async () => {
        try {
            const data = await apiService.fetchModuleRecords('alumnae_members', undefined, undefined, {
                filter: { institution_id: currentAlumna.institutionId || currentAlumna.schoolId }
            });
            setAlumnaeMembers(data || []);
            setFeaturedMembers((data || []).filter((m: any) => m.isFeatured));
        } catch (e) {}
    };

    const handleBeFeatured = async () => {
        if (!window.confirm(`Become a Featured Alumna for KES ${featureFee}? This will boost your profile visibility.`)) return;
        setIsProcessingFeature(true);
        
        try {
            const res = await apiService.triggerMpesaStkPush({
                amount: featureFee,
                phoneNumber: currentAlumna.phoneNumber,
                reference: `FEAT_${currentAlumna.id}`,
                description: 'Featured Alumna Promotion',
                institutionId: currentAlumna.institutionId || 'GLOBAL'
            });

            if (res.success) {
                // Success - Update record
                const featuredUntil = new Date();
                featuredUntil.setMonth(featuredUntil.getMonth() + 1); // 1 month feature

                await apiService.saveModuleRecord('alumnae_members', {
                    id: currentAlumna.id,
                    isFeatured: true,
                    featuredUntil: featuredUntil.toISOString()
                });

                alert("Congratulations! You are now a Featured Alumna.");
                window.location.reload();
            } else {
                alert("Payment failed: " + res.message);
            }
        } catch (e: any) {
            alert("Payment Error: " + e.message);
        } finally {
            setIsProcessingFeature(false);
        }
    };

    useEffect(() => {
        loadPosts();
        loadMessages();
        loadAlumnaeMembers();
        loadOtherMemberships();
    }, [currentAlumna, activeTab]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeConversationPartner) return;
        setIsSendingMessage(true);
        
        const msg = {
            id: `msg_${Date.now()}`,
            senderId: currentAlumna.id,
            receiverId: activeConversationPartner.id,
            content: newMessage,
            isRead: false,
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('alumni_messages', msg);
            setMessages([...messages, msg]);
            setNewMessage('');
        } catch (e: any) {
            alert("Message Error: " + e.message);
        } finally {
            setIsSendingMessage(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !postImageFile) return;
        setIsPosting(true);
        
        try {
            let photoUrl = '';
            if (postImageFile) {
                const uploadRes = await apiService.uploadToGoogleDrive(postImageFile, 'Alumnae_Social', {
                    institutionId: currentAlumna.institutionId,
                    useGlobalConfig: !currentAlumna.institutionId
                });
                if (uploadRes.success) photoUrl = uploadRes.url;
            }

            const post: AlumniPost = {
                id: `p_${Date.now()}`,
                authorId: currentAlumna.id,
                authorName: currentAlumna.fullName || currentAlumna.name,
                authorPhoto: currentAlumna.profilePhotoUrl,
                institutionId: currentAlumna.institutionId || currentAlumna.schoolId,
                content: newPostContent,
                photoUrl: photoUrl, // Add photo support
                likes: [],
                commentsCount: 0,
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('alumni_posts', post);
            setPosts([post, ...posts]);
            setNewPostContent('');
            setPostImageFile(null);
            setPostImagePreview(null);
        } catch (e: any) {
            console.error(e);
            if (e.message?.includes('photo_url')) {
                alert("Database update required. Please contact a County Administrator to run the 'Alumni Schema Migration' in the Settings tab.");
            } else {
                alert("Post Error: " + e.message);
            }
        } finally {
            setIsPosting(false);
        }
    };

    const handleLike = async (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const isLiked = post.likes.includes(currentAlumna.id);
        const newLikes = isLiked 
            ? post.likes.filter(id => id !== currentAlumna.id)
            : [...post.likes, currentAlumna.id];

        setPosts(posts.map(p => p.id === postId ? { ...p, likes: newLikes } : p));
        
        try {
            await apiService.saveModuleRecord('alumni_posts', { id: postId, likes: newLikes } as any);
        } catch (e) {}
    };

    const handleAddComment = async (postId: string, content: string) => {
        if (!content.trim()) return;
        
        const comment: AlumniComment = {
            id: `c_${Date.now()}`,
            postId,
            authorId: currentAlumna.id,
            authorName: currentAlumna.fullName || currentAlumna.name,
            authorPhoto: currentAlumna.profilePhotoUrl,
            content,
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('alumni_comments', comment);
            setComments(prev => ({
                ...prev,
                [postId]: [...(prev[postId] || []), comment]
            }));
            
            // Update local posts count
            setPosts(posts.map(p => p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
            // Update remote posts count
            const post = posts.find(p => p.id === postId);
            if (post) {
                await apiService.saveModuleRecord('alumni_posts', { id: postId, commentsCount: (post.commentsCount || 0) + 1 } as any);
            }
        } catch (e) {}
    };

    const myInstitutions = useMemo(() => {
        // Current active institution
        const active = institutions.find(inst => inst.id === (currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id));
        
        // Other institutions from other memberships
        const others = otherMemberships.map(m => {
            return institutions.find(inst => inst.id === (m.institution_id || m.school_id || m.institutionId));
        }).filter(Boolean);

        // Merge and unique by ID
        const all = [active, ...others].filter(Boolean);
        const unique = Array.from(new Map(all.map(item => [item!.id, item])).values());
        return unique;
    }, [institutions, currentAlumna, otherMemberships]);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col md:flex-row">
            {/* Left Sidebar - Navigation (Hidden on mobile, shown on md+) */}
            <aside className="hidden md:flex w-64 border-r border-slate-100 dark:border-slate-800 flex-col p-4 fixed h-screen bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl z-50">
                <div className="mb-8 px-2">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                        <Sparkles className="w-6 h-6" />
                    </div>
                </div>

                <nav className="space-y-2 flex-1">
                    {[
                        { icon: Home, label: 'Feed', onClick: () => setActiveSection('feed'), active: activeSection === 'feed' },
                        { icon: Users, label: 'Classmates', onClick: () => setActiveSection('classmates'), active: activeSection === 'classmates' },
                        { icon: Hash, label: 'Explore', onClick: () => setActiveSection('explore'), active: activeSection === 'explore' },
                        { icon: Bell, label: 'Notifications', onClick: () => setActiveSection('notifications'), active: activeSection === 'notifications' },
                        { icon: MessageSquare, label: 'Messages', onClick: () => setActiveSection('messages'), active: activeSection === 'messages' },
                        { icon: User, label: 'Profile', onClick: () => setIsEditingProfile(true) }
                    ].map((item, idx) => (
                        <button 
                            key={idx} 
                            onClick={item.onClick}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${item.active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                        >
                            <item.icon className="w-6 h-6" />
                            <span className="hidden md:block font-bold text-sm uppercase tracking-widest">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <button 
                    onClick={onBack}
                    className="w-full flex items-center gap-4 p-4 text-slate-400 hover:text-red-500 transition-all mb-4"
                >
                    <ArrowLeft className="w-6 h-6" />
                    <span className="hidden md:block font-black uppercase text-[10px] tracking-[0.2em]">Exit Portal</span>
                </button>

                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4 p-2">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-lg shrink-0">
                            {currentAlumna.fullName?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{currentAlumna.fullName}</h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate">{currentAlumna.institutionName || 'Verified Alumna'}</p>
                        </div>
                    </div>
                    {otherMemberships.length > 0 && (
                        <button 
                            onClick={() => setShowSwitcher(true)}
                            className="w-full mt-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            <Repeat2 className="w-3 h-3" /> Switch Circle ({otherMemberships.length + 1})
                        </button>
                    )}
                </div>

                {featureFee > 0 && !currentAlumna.isFeatured && (
                    <div className="p-4 mx-2 mb-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100 dark:shadow-none">
                        <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="w-5 h-5 text-indigo-200" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Premium Visibility</span>
                        </div>
                        <p className="text-[10px] font-bold leading-tight mb-3 opacity-90 uppercase">Get featured at the top of the network for KES {featureFee}/mo</p>
                        <button 
                            onClick={handleBeFeatured}
                            disabled={isProcessingFeature}
                            className="w-full py-2.5 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            {isProcessingFeature ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get Featured Now'}
                        </button>
                    </div>
                )}
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 max-w-2xl mx-auto w-full border-x border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 min-h-screen pb-20 md:pb-0">
                {activeSection === 'feed' ? (
                    <>
                    {/* Header Tabs */}
                <header className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 z-40">
                    <div className="px-6 py-4">
                        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Alumnae <span className="text-indigo-600">Circle</span></h2>
                    </div>
                    <div className="flex">
                        <button 
                            onClick={() => setActiveTab('for-you')}
                            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all ${activeTab === 'for-you' ? 'text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            Global Pulse
                            {activeTab === 'for-you' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-600 rounded-full" />}
                        </button>
                        <button 
                            onClick={() => setActiveTab('my-schools')}
                            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all ${activeTab === 'my-schools' ? 'text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            My Institutions
                            {activeTab === 'my-schools' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-600 rounded-full" />}
                        </button>
                    </div>
                </header>

                {/* Post Composer */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                            {currentAlumna.profilePhotoUrl ? <img src={currentAlumna.profilePhotoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-300" />}
                        </div>
                        <div className="flex-1 space-y-4">
                            <textarea 
                                placeholder="Share your legacy or start a topic..."
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 text-lg font-medium placeholder:text-slate-400 resize-none min-h-[100px] text-slate-900 dark:text-white"
                            ></textarea>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-900">
                                <div className="flex gap-2 text-indigo-600">
                                    <input 
                                        type="file" 
                                        id="post-photo-upload" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setPostImageFile(file);
                                                setPostImagePreview(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                    <button 
                                        onClick={() => document.getElementById('post-photo-upload')?.click()}
                                        className={`p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all ${postImageFile ? 'bg-indigo-50 text-indigo-600' : ''}`}
                                    >
                                        <ImageIcon className="w-5 h-5" />
                                    </button>
                                    <button className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"><Smile className="w-5 h-5" /></button>
                                    <button className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"><Calendar className="w-5 h-5" /></button>
                                </div>
                                <button 
                                    onClick={handleCreatePost}
                                    disabled={(!newPostContent.trim() && !postImageFile) || isPosting}
                                    className="bg-slate-900 dark:bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 dark:shadow-indigo-900/20 disabled:opacity-30 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Post Topic
                                </button>
                            </div>

                            {postImagePreview && (
                                <div className="relative mt-4 w-full aspect-video rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <img src={postImagePreview} className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => {
                                            setPostImageFile(null);
                                            setPostImagePreview(null);
                                        }}
                                        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Feed */}
                <div className="divide-y divide-slate-100 dark:divide-slate-900">
                    {loadingPosts ? (
                        <div className="p-10 text-center">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Synchronizing Legacy Stream...</p>
                        </div>
                    ) : posts.map((post) => (
                        <div key={post.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all group/post">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                                    {post.authorPhoto ? <img src={post.authorPhoto} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-300" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{post.authorName}</span>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">@{post.authorName.split(' ')[0].toLowerCase()}</span>
                                            <span className="text-slate-300 dark:text-slate-700">•</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-5 h-5" /></button>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm mb-4">{post.content}</p>
                                    
                                    {post.photoUrl && (
                                        <div className="mb-4 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                                            <img src={post.photoUrl} className="w-full max-h-96 object-cover" />
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between max-w-sm text-slate-400">
                                        <button 
                                            onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
                                            className="flex items-center gap-2 hover:text-indigo-600 transition-all"
                                        >
                                             <div className="p-2 group-hover/post:bg-indigo-50 dark:group-hover/post:bg-indigo-900/20 rounded-xl">
                                                 <MessageSquare className="w-4 h-4" />
                                             </div>
                                             <span className="text-[10px] font-black">{post.commentsCount}</span>
                                         </button>
                                         <button className="flex items-center gap-2 hover:text-emerald-500 transition-all">
                                             <div className="p-2 group-hover/post:bg-emerald-50 dark:group-hover/post:bg-emerald-900/20 rounded-xl">
                                                 <Repeat2 className="w-4 h-4" />
                                             </div>
                                             <span className="text-[10px] font-black">2</span>
                                         </button>
                                         <button 
                                             onClick={() => handleLike(post.id)}
                                             className={`flex items-center gap-2 transition-all ${(post.likes || []).includes(currentAlumna?.id) ? 'text-rose-500' : 'hover:text-rose-500'}`}
                                         >
                                             <div className={`p-2 group-hover/post:bg-rose-50 dark:group-hover/post:bg-rose-900/20 rounded-xl`}>
                                                 <Heart className={`w-4 h-4 ${(post.likes || []).includes(currentAlumna?.id) ? 'fill-current' : ''}`} />
                                             </div>
                                             <span className="text-[10px] font-black">{(post.likes || []).length}</span>
                                         </button>
                                         <button className="flex items-center gap-2 hover:text-indigo-600 transition-all">
                                             <div className="p-2 group-hover/post:bg-indigo-50 dark:group-hover/post:bg-indigo-900/20 rounded-xl">
                                                 <Share className="w-4 h-4" />
                                             </div>
                                         </button>
                                     </div>

                                     {/* Comments Section */}
                                     {selectedPost?.id === post.id && (
                                         <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-900 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                             <div className="space-y-4 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                                                 {(comments[post.id] || []).map((comment) => (
                                                     <div key={comment.id} className="flex gap-3">
                                                         <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                                                             {comment.authorPhoto ? <img src={comment.authorPhoto} className="w-full h-full object-cover" /> : <User className="w-full h-full p-1.5 text-slate-300" />}
                                                         </div>
                                                         <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl px-4 py-2 flex-1">
                                                             <div className="flex items-center justify-between mb-0.5">
                                                                 <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white">{comment.authorName}</span>
                                                                 <span className="text-[9px] text-slate-400 font-bold uppercase">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                             </div>
                                                             <p className="text-xs text-slate-600 dark:text-slate-400">{comment.content}</p>
                                                         </div>
                                                     </div>
                                                 ))}
                                                 {(comments[post.id] || []).length === 0 && (
                                                     <p className="text-center py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">No comments yet. Start the conversation!</p>
                                                 )}
                                             </div>
                                             
                                             <div className="flex gap-3 pt-2">
                                                 <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                                                     {currentAlumna.profilePhotoUrl ? <img src={currentAlumna.profilePhotoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-1.5 text-slate-300" />}
                                                 </div>
                                                 <div className="flex-1 relative">
                                                     <input 
                                                         type="text" 
                                                         placeholder="Post your reply..." 
                                                         className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl h-9 text-xs pl-4 pr-10 focus:ring-1 focus:ring-indigo-600 transition-all"
                                                         onKeyDown={(e) => {
                                                             if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                                 handleAddComment(post.id, e.currentTarget.value);
                                                                 e.currentTarget.value = '';
                                                             }
                                                         }}
                                                     />
                                                     <button className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-700">
                                                         <Send className="w-4 h-4" />
                                                     </button>
                                                 </div>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </>
                ) : activeSection === 'classmates' ? (
                    <div className="p-8">
                        <header className="mb-12 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Class of <span className="text-indigo-600">{currentAlumna.graduationYear}</span></h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">
                                    {alumnaeMembers.filter(m => m.graduationYear === currentAlumna.graduationYear).length} Members found in your year
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    const text = `Join me in the Alumnae Circle! Connect with our classmates from the Class of ${currentAlumna.graduationYear} at ${window.location.origin}/?view=alumnae_register`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-200 dark:shadow-none flex items-center gap-2 hover:scale-105 transition-all"
                            >
                                <Share2 className="w-4 h-4" /> Invite via WhatsApp
                            </button>
                        </header>

                        <div className="space-y-4">
                            {alumnaeMembers.filter(m => m.graduationYear === currentAlumna.graduationYear && m.id !== currentAlumna.id).map(member => (
                                <div key={member.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 flex items-center gap-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                                        {member.profilePhotoUrl ? <img src={member.profilePhotoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-slate-300" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{member.fullName}</h3>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{member.currentJob || 'Alumna'} at {member.currentCompany || 'EduAI Network'}</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setActiveConversationPartner(member);
                                            setActiveSection('messages');
                                        }}
                                        className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <MessageSquare className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            {alumnaeMembers.filter(m => m.graduationYear === currentAlumna.graduationYear && m.id !== currentAlumna.id).length === 0 && (
                                <div className="p-20 text-center">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-slate-300 mx-auto mb-6">
                                        <Users className="w-10 h-10" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">You're the first one here from {currentAlumna.graduationYear}!</p>
                                    <p className="text-xs text-slate-400 mt-2">Invite your classmates to join the legacy.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeSection === 'explore' ? (
                    <div className="p-8">
                        <header className="mb-12">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Explore <span className="text-indigo-600">Network</span></h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Connect with graduates from your alma mater</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {alumnaeMembers.filter(m => m.id !== currentAlumna.id).map(member => (
                                <div key={member.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 dark:shadow-none hover:scale-[1.02] transition-all group">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 ring-4 ring-slate-50 dark:ring-slate-800">
                                            {member.profilePhotoUrl ? <img src={member.profilePhotoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-slate-300" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{member.fullName}</h3>
                                                {member.isFeatured && <Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{member.currentJob || 'Alumna'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Alma Mater</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{member.schoolName || 'Partner Institution'}</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setActiveConversationPartner(member);
                                                setActiveSection('messages');
                                            }}
                                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 group-hover:scale-[1.02] transition-all"
                                        >
                                            <MessageSquare className="w-4 h-4" /> Message
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeSection === 'notifications' ? (
                    <div className="p-8">
                        <header className="mb-12">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Recent <span className="text-indigo-600">Activity</span></h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Stay updated on your social footprint</p>
                        </header>

                        <div className="space-y-4">
                            {[
                                { icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50', text: 'Someone sent you a private message', time: '2 mins ago' },
                                { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', text: 'An alumna liked your post about networking', time: '1 hour ago' },
                                { icon: User, color: 'text-blue-600', bg: 'bg-blue-50', text: 'New graduate joined the circle', time: '3 hours ago' },
                                { icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-50', text: 'Institutional update: Legacy Fund launched', time: '5 hours ago' }
                            ].map((notif, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 flex items-center gap-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
                                    <div className={`w-12 h-12 ${notif.bg} rounded-2xl flex items-center justify-center ${notif.color}`}>
                                        <notif.icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{notif.text}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{notif.time}</p>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex h-screen flex-col">
                        <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Secure <span className="text-indigo-600">Inbox</span></h2>
                            {activeConversationPartner && (
                                <button onClick={() => setActiveConversationPartner(null)} className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            )}
                        </header>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Conversations List */}
                            <div className={`w-full md:w-80 border-r border-slate-100 dark:border-slate-800 overflow-y-auto no-scrollbar ${activeConversationPartner ? 'hidden md:block' : 'block'}`}>
                                <div className="p-4 space-y-2">
                                    {alumnaeMembers.filter(m => m.id !== currentAlumna.id).map(member => {
                                        const lastMsg = [...messages].reverse().find(m => (m.senderId === member.id && m.receiverId === currentAlumna.id) || (m.senderId === currentAlumna.id && m.receiverId === member.id));
                                        return (
                                            <button 
                                                key={member.id}
                                                onClick={() => setActiveConversationPartner(member)}
                                                className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${activeConversationPartner?.id === member.id ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-100' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                                                    {member.profilePhotoUrl ? <img src={member.profilePhotoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-300" />}
                                                </div>
                                                <div className="text-left flex-1 min-w-0">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{member.fullName || 'Alumna'}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{lastMsg?.content || 'No messages yet'}</p>
                                                </div>
                                                {lastMsg && !lastMsg.isRead && lastMsg.receiverId === currentAlumna.id && (
                                                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Chat Window */}
                            <div className={`flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/20 ${!activeConversationPartner ? 'hidden md:flex' : 'flex'}`}>
                                {activeConversationPartner ? (
                                    <>
                                        <div className="flex-1 p-6 overflow-y-auto space-y-6 no-scrollbar">
                                            {messages.filter(m => (m.senderId === activeConversationPartner.id && m.receiverId === currentAlumna.id) || (m.senderId === currentAlumna.id && m.receiverId === activeConversationPartner.id)).map(msg => (
                                                <div key={msg.id} className={`flex ${msg.senderId === currentAlumna.id ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] p-4 rounded-[2rem] text-sm font-medium shadow-sm ${msg.senderId === currentAlumna.id ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-bl-none border border-slate-100 dark:border-slate-800'}`}>
                                                        {msg.content}
                                                        <p className={`text-[8px] font-bold uppercase tracking-widest mt-2 opacity-50 ${msg.senderId === currentAlumna.id ? 'text-white' : 'text-slate-400'}`}>
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    placeholder={`Message ${activeConversationPartner.fullName.split(' ')[0]}...`}
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                                    className="w-full h-14 pl-6 pr-16 bg-slate-100 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                                                />
                                                <button 
                                                    onClick={handleSendMessage}
                                                    disabled={!newMessage.trim() || isSendingMessage}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-30"
                                                >
                                                    {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2.5rem] flex items-center justify-center text-indigo-600 mb-6 animate-pulse">
                                            <MessageSquare className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Your Conversations</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest max-w-xs mx-auto mt-2 leading-relaxed">Select a member from the list to start a secure encrypted legacy conversation.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 flex items-center justify-around px-2 z-[60] safe-bottom">
                {[
                    { icon: Home, label: 'Feed', section: 'feed' },
                    { icon: Users, label: 'Circle', section: 'classmates' },
                    { icon: Hash, label: 'Explore', section: 'explore' },
                    { icon: MessageSquare, label: 'Chats', section: 'messages' },
                    { icon: User, label: 'Me', onClick: () => setIsEditingProfile(true) }
                ].map((item, idx) => (
                    <button 
                        key={idx} 
                        onClick={item.onClick || (() => setActiveSection(item.section as any))}
                        className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 py-1 ${activeSection === item.section ? 'text-indigo-600' : 'text-slate-400'}`}
                    >
                        <item.icon className={`w-5 h-5 ${activeSection === item.section ? 'scale-110' : ''} transition-transform`} />
                        <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                        {activeSection === item.section && <div className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />}
                    </button>
                ))}
            </nav>

            {/* Right Sidebar - Recommendations */}
            <aside className="hidden lg:block w-80 p-6 sticky top-0 h-screen overflow-y-auto">
                <div className="space-y-6">
                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search Network..." 
                            className="w-full h-12 pl-12 pr-6 bg-slate-100 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                        />
                    </div>

                    {/* My Groups */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
                            My Institutions
                            <Plus className="w-4 h-4 cursor-pointer hover:text-indigo-600" />
                        </h3>
                        <div className="space-y-4">
                            {myInstitutions.map(inst => {
                                const isActive = inst!.id === (currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id);
                                return (
                                    <div 
                                        key={inst!.id} 
                                        onClick={() => {
                                            if (!isActive) {
                                                const membership = otherMemberships.find(m => (m.institution_id || m.school_id || m.institutionId) === inst!.id);
                                                if (membership) handleSwitchCircle(membership);
                                            }
                                        }}
                                        className={`flex items-center justify-between group cursor-pointer p-2 rounded-2xl transition-all ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600'}`}>
                                                {isActive ? <Sparkles className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className={`text-[10px] font-black uppercase truncate max-w-[120px] ${isActive ? 'text-indigo-600' : 'text-slate-900 dark:text-white'}`}>{inst!.name}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{isActive ? 'Active Member' : 'Switch Circle'}</p>
                                            </div>
                                        </div>
                                        {isActive && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Trending Topics */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Trending Conversations</h3>
                        <div className="space-y-6">
                            {[
                                { tag: '#ClassOf2024', posts: '2.4k posts' },
                                { tag: '#MentorConnect', posts: '1.8k posts' },
                                { tag: '#LegacyAwards', posts: '950 posts' },
                                { tag: '#TechAlumnae', posts: '620 posts' }
                            ].map((topic, idx) => (
                                <div key={idx} className="group cursor-pointer">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{topic.posts}</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{topic.tag}</p>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all">Show More</button>
                    </div>

                    {/* Featured Members Showcase */}
                    {featuredMembers.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-2xl shadow-indigo-500/5">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Featured <span className="text-indigo-600">Alumnae</span></h3>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Premium Network Spotlight</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {featuredMembers.map((member) => (
                                    <div key={member.id} className="group flex items-center gap-4 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900">
                                                {member.profilePhotoUrl ? <img src={member.profilePhotoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-300" />}
                                            </div>
                                            <div className="absolute -top-1 -right-1 bg-indigo-600 text-white p-1 rounded-lg">
                                                <CheckCircle2 className="w-2 h-2" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{member.fullName || 'Featured Alumna'}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate">{member.currentJob} at {member.currentCompany}</p>
                                        </div>
                                        <button 
                                            onClick={() => setActiveConversationPartner(member)}
                                            className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Edit Profile Modal */}
            {isEditingProfile && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Edit <span className="text-indigo-600">Profile</span></h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Update your professional legacy</p>
                            </div>
                            <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                            {/* Profile Photo Section */}
                            <div className="flex flex-col items-center gap-4 mb-8">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-[2rem] bg-slate-100 dark:bg-slate-800 overflow-hidden ring-4 ring-indigo-50 dark:ring-indigo-900/20 shadow-xl">
                                        {profilePhotoUrlFile ? (
                                            <img src={URL.createObjectURL(profilePhotoUrlFile)} className="w-full h-full object-cover" />
                                        ) : profileData.profilePhotoUrl ? (
                                            <img src={profileData.profilePhotoUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-full h-full p-6 text-slate-300" />
                                        )}
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg shadow-indigo-200">
                                        <ImageIcon className="w-5 h-5" />
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) setProfilePhotoFile(e.target.files[0]);
                                            }}
                                        />
                                    </label>
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Update Profile Avatar</p>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
                                <input 
                                    type="text"
                                    value={profileData.fullName}
                                    onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                                    className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Job</label>
                                    <input 
                                        type="text"
                                        value={profileData.currentJob}
                                        onChange={(e) => setProfileData({...profileData, currentJob: e.target.value})}
                                        className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Company</label>
                                    <input 
                                        type="text"
                                        value={profileData.currentCompany}
                                        onChange={(e) => setProfileData({...profileData, currentCompany: e.target.value})}
                                        className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Professional Bio</label>
                                <textarea 
                                    value={profileData.bio}
                                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                                    className="w-full h-32 p-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 transition-all resize-none"
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">LinkedIn URL</label>
                                    <input 
                                        type="text"
                                        value={profileData.linkedinUrl}
                                        onChange={(e) => setProfileData({...profileData, linkedinUrl: e.target.value})}
                                        className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Twitter URL</label>
                                    <input 
                                        type="text"
                                        value={profileData.twitterUrl}
                                        onChange={(e) => setProfileData({...profileData, twitterUrl: e.target.value})}
                                        className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
                            <button 
                                onClick={() => setIsEditingProfile(false)}
                                className="flex-1 py-4 bg-white dark:bg-slate-900 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpdateProfile}
                                disabled={isSavingProfile}
                                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
                            >
                                {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Multi-Circle Switcher Modal */}
            {showSwitcher && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Switch <span className="text-indigo-600 italic">Prestige Circle</span></h3>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Jump between your verified institution memberships</p>
                            </div>
                            <button onClick={() => setShowSwitcher(false)} className="w-10 h-10 bg-white dark:bg-slate-950 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar">
                            {/* Current Active */}
                            <div className="p-6 bg-indigo-600 rounded-[2rem] text-white shadow-xl shadow-indigo-200 dark:shadow-none border border-indigo-500 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-20"><CheckCircle2 className="w-12 h-12" /></div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center font-black text-lg">
                                        {currentAlumna.institutionName?.charAt(0) || 'A'}
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Active Now</p>
                                        <h4 className="font-black uppercase tracking-tight text-lg">{currentAlumna.institutionName || 'Current Institution'}</h4>
                                    </div>
                                </div>
                            </div>

                            {/* Other Options */}
                            {otherMemberships.map((membership) => (
                                <button
                                    key={membership.id}
                                    onClick={() => handleSwitchCircle(membership)}
                                    className="w-full flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-[2rem] hover:bg-white dark:hover:bg-slate-700 hover:border-indigo-400 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600 font-black text-lg group-hover:scale-110 transition-transform">
                                            {membership.institutionName?.charAt(0) || 'A'}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{membership.institutionName || 'Legacy Institution'}</h4>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Class of {membership.graduationYear || membership.class_year || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <ArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:-translate-x-1 transition-all rotate-180" />
                                </button>
                            ))}
                        </div>

                        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex justify-center border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">EduAI Social Infrastructure • Verified Membership v2.0</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
