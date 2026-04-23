
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
    Sparkles
} from 'lucide-react';
import type { AlumniPost, AlumniComment, Institution } from '../types';
import { apiService } from '../services/apiService';

interface AlumnaePortalViewProps {
    currentAlumna: any;
    institutions: Institution[];
    onBack: () => void;
}

export const AlumnaePortalView: React.FC<AlumnaePortalViewProps> = ({ currentAlumna, institutions, onBack }) => {
    const [posts, setPosts] = useState<AlumniPost[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [activeTab, setActiveTab] = useState<'for-you' | 'my-schools'>('for-you');
    const [selectedPost, setSelectedPost] = useState<AlumniPost | null>(null);
    const [comments, setComments] = useState<Record<string, AlumniComment[]>>({});
    const [loadingPosts, setLoadingPosts] = useState(true);

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

    useEffect(() => {
        loadPosts();
    }, [currentAlumna, activeTab]);

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) return;
        setIsPosting(true);
        
        const post: AlumniPost = {
            id: `p_${Date.now()}`,
            authorId: currentAlumna.id,
            authorName: currentAlumna.fullName || currentAlumna.name,
            authorPhoto: currentAlumna.profilePhoto,
            institutionId: currentAlumna.institutionId || currentAlumna.schoolId,
            content: newPostContent,
            likes: [],
            commentsCount: 0,
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('alumni_posts', post);
            setPosts([post, ...posts]);
            setNewPostContent('');
        } catch (e: any) {
            alert("Post Error: " + e.message);
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
            authorPhoto: currentAlumna.profilePhoto,
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
        return institutions.filter(inst => inst.id === (currentAlumna.institutionId || currentAlumna.schoolId));
    }, [institutions, currentAlumna]);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex">
            {/* Left Sidebar - Navigation */}
            <aside className="w-20 md:w-64 border-r border-slate-100 dark:border-slate-800 flex flex-col p-4 fixed h-screen bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl z-50">
                <div className="mb-8 px-2">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                        <Sparkles className="w-6 h-6" />
                    </div>
                </div>

                <nav className="space-y-2 flex-1">
                    {[
                        { icon: Home, label: 'Feed', active: true },
                        { icon: Hash, label: 'Explore' },
                        { icon: Bell, label: 'Notifications' },
                        { icon: MessageSquare, label: 'Messages' },
                        { icon: User, label: 'Profile' }
                    ].map((item, idx) => (
                        <button key={idx} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${item.active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
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

                <div className="p-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            {currentAlumna.profilePhoto ? <img src={currentAlumna.profilePhoto} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-300" />}
                        </div>
                        <div className="hidden md:block">
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate max-w-[120px]">{currentAlumna.fullName || 'Alumna Member'}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Verified Alumna</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-20 md:ml-64 max-w-2xl border-r border-slate-100 dark:border-slate-800">
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
                            {currentAlumna.profilePhoto ? <img src={currentAlumna.profilePhoto} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-300" />}
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
                                    <button className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"><ImageIcon className="w-5 h-5" /></button>
                                    <button className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"><Smile className="w-5 h-5" /></button>
                                    <button className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"><Calendar className="w-5 h-5" /></button>
                                </div>
                                <button 
                                    onClick={handleCreatePost}
                                    disabled={!newPostContent.trim() || isPosting}
                                    className="bg-slate-900 dark:bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 dark:shadow-indigo-900/20 disabled:opacity-30 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Post Topic
                                </button>
                            </div>
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
                                             className={`flex items-center gap-2 transition-all ${post.likes.includes(currentAlumna.id) ? 'text-rose-500' : 'hover:text-rose-500'}`}
                                         >
                                             <div className={`p-2 group-hover/post:bg-rose-50 dark:group-hover/post:bg-rose-900/20 rounded-xl`}>
                                                 <Heart className={`w-4 h-4 ${post.likes.includes(currentAlumna.id) ? 'fill-current' : ''}`} />
                                             </div>
                                             <span className="text-[10px] font-black">{post.likes.length}</span>
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
                                                     {currentAlumna.profilePhoto ? <img src={currentAlumna.profilePhoto} className="w-full h-full object-cover" /> : <User className="w-full h-full p-1.5 text-slate-300" />}
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
            </main>

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
                            {myInstitutions.map(inst => (
                                <div key={inst.id} className="flex items-center justify-between group cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white truncate max-w-[120px]">{inst.name}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Active Member</p>
                                        </div>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                </div>
                            ))}
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
                </div>
            </aside>
        </div>
    );
};
