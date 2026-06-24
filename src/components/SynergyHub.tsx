import React, { useState, useEffect, useMemo } from 'react';
import { 
    Sparkles, 
    Send, 
    Loader2, 
    MessageSquare, 
    Heart, 
    Globe, 
    Calendar, 
    ChevronDown, 
    BookOpen, 
    Users, 
    Printer, 
    CheckCircle2, 
    Plus, 
    X,
    User,
    ArrowRight
} from 'lucide-react';
import { 
    User as UserType, 
    Subject, 
    Course, 
    StudentAttendance, 
    Assessment, 
    AssessmentMark,
    SynergyPost,
    SynergyComment,
    SynergyMessage
} from '../types';
import { apiService } from '../services/apiService';
import { 
    translateAcademicInsight, 
    refineTeacherTone, 
    generateConferenceAgenda 
} from '../services/geminiService';
import { AiCoachAssistant } from './common/AiCoachAssistant';

interface SynergyHubProps {
    role: 'parent' | 'teacher';
    currentUser: UserType;
    users: UserType[];
    subjects: Subject[];
    courses: Course[];
    studentAttendances?: StudentAttendance[];
    assessments?: Assessment[];
    assessmentMarks?: AssessmentMark[];
    disciplineIncidents?: any[];
}

export const SynergyHub: React.FC<SynergyHubProps> = ({
    role,
    currentUser,
    users = [],
    subjects = [],
    courses = [],
    studentAttendances = [],
    assessments = [],
    assessmentMarks = [],
    disciplineIncidents = []
}) => {
    const [activeTab, setActiveTab] = useState<'feed' | 'circles' | 'agendas' | 'coach'>('feed');
    const [posts, setPosts] = useState<SynergyPost[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    
    // Posting form states (teacher mode)
    const [postTitle, setPostTitle] = useState('');
    const [postContent, setPostContent] = useState('');
    const [targetChildIds, setTargetChildIds] = useState<string[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [isRefiningTone, setIsRefiningTone] = useState(false);

    // Comments states
    const [activePostCommentsId, setActivePostCommentsId] = useState<string | null>(null);
    const [comments, setComments] = useState<Record<string, SynergyComment[]>>({});
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
    const [isCommenting, setIsCommenting] = useState<Record<string, boolean>>({});

    // Translation states
    const [translatedContent, setTranslatedContent] = useState<Record<string, { text: string; lang: string }>>({});
    const [translatingId, setTranslatingId] = useState<string | null>(null);

    // Subject Circles states
    const [activeCircleId, setActiveCircleId] = useState<string | null>(null);
    const [circleMessages, setCircleMessages] = useState<Record<string, SynergyMessage[]>>({});
    const [circleMsgInput, setCircleMsgInput] = useState('');
    const [isSendingCircleMsg, setIsSendingCircleMsg] = useState(false);

    // Agenda generator states
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [isGeneratingAgenda, setIsGeneratingAgenda] = useState(false);
    const [generatedAgendaItems, setGeneratedAgendaItems] = useState<string[]>([]);

    // Determine linked children (for parent role)
    const children = useMemo(() => {
        return users.filter(u => u && currentUser?.studentIds?.includes(u.id));
    }, [users, currentUser]);

    // Active students in teacher's course (for teacher role)
    const classStudents = useMemo(() => {
        if (role !== 'teacher') return [];
        return users.filter(u => u && u.role === 'student' && u.courseLevelId === currentUser.courseLevelId);
    }, [users, role, currentUser]);

    // Load synergy posts
    const loadPosts = async () => {
        setLoadingPosts(true);
        try {
            const filters: any = {};
            const instId = currentUser.institutionId;
            
            // If parent, only show general institutional posts or posts specifically tagged with one of their children
            // If teacher, show all posts under their active institution
            const rawPosts = await apiService.fetchModuleRecords<any>('synergy_posts', instId, undefined, {
                order: 'created_at.desc'
            });

            const mapped: SynergyPost[] = rawPosts.map((p: any) => ({
                id: p.id,
                institutionId: p.institutionId || p.institution_id,
                courseId: p.courseId || p.course_id,
                courseLevelId: p.courseLevelId || p.course_level_id,
                authorId: p.authorId || p.author_id,
                authorName: p.authorName || p.author_name,
                authorRole: p.authorRole || p.author_role,
                authorPhotoUrl: p.authorPhotoUrl || p.author_photo_url,
                title: p.title,
                content: p.content,
                photoUrl: p.photoUrl || p.photo_url,
                videoUrl: p.videoUrl || p.video_url,
                likes: p.likes || [],
                commentsCount: p.commentsCount ?? p.comments_count ?? 0,
                studentIds: p.studentIds || p.student_ids || [],
                createdAt: p.createdAt || p.created_at
            }));

            // Filter for parent (privacy compliance)
            if (role === 'parent') {
                const childIds = children.map(c => c.id);
                const filtered = mapped.filter(post => {
                    // Show post if it is not targeted to any student (general announcement) OR if it targets one of their children
                    return !post.studentIds || post.studentIds.length === 0 || post.studentIds.some(id => childIds.includes(id));
                });
                setPosts(filtered);
            } else {
                setPosts(mapped);
            }
        } catch (e) {
            console.error("Failed to load synergy posts:", e);
        } finally {
            setLoadingPosts(false);
        }
    };

    // Load comments for a post
    const fetchComments = async (postId: string) => {
        try {
            const raw = await apiService.fetchModuleRecords<any>('synergy_comments', undefined, undefined, {
                filter: { post_id: postId },
                order: 'created_at.asc'
            });
            const mapped: SynergyComment[] = raw.map((c: any) => ({
                id: c.id,
                postId: c.postId || c.post_id,
                authorId: c.authorId || c.author_id,
                authorName: c.authorName || c.author_name,
                authorRole: c.authorRole || c.author_role,
                authorPhotoUrl: c.authorPhotoUrl || c.author_photo_url,
                content: c.content,
                createdAt: c.createdAt || c.created_at
            }));
            setComments(prev => ({ ...prev, [postId]: mapped }));
        } catch (e) {}
    };

    useEffect(() => {
        loadPosts();
        if (role === 'parent' && children.length > 0) {
            setSelectedStudentId(children[0].id);
        } else if (role === 'teacher' && classStudents.length > 0) {
            setSelectedStudentId(classStudents[0].id);
        }
    }, [role, currentUser]);

    // Handle posting
    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!postTitle.trim() || !postContent.trim() || isPosting) return;

        setIsPosting(true);
        const newPost: Partial<SynergyPost> = {
            id: `post_${Date.now()}`,
            institutionId: currentUser.institutionId,
            courseId: currentUser.courseId || '',
            courseLevelId: currentUser.courseLevelId || '',
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorRole: role === 'teacher' ? 'Class Teacher' : 'Parent',
            authorPhotoUrl: currentUser.profilePhotoUrl || '',
            title: postTitle.trim(),
            content: postContent.trim(),
            likes: [],
            commentsCount: 0,
            studentIds: targetChildIds,
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('synergy_posts', newPost);
            setPostTitle('');
            setPostContent('');
            setTargetChildIds([]);
            loadPosts();
        } catch (e) {
            alert("Connection error. Saved locally.");
        } finally {
            setIsPosting(false);
        }
    };

    // AI Refine Teacher Tone
    const handleRefineTone = async () => {
        if (!postContent.trim() || isRefiningTone) return;
        setIsRefiningTone(true);
        try {
            const refined = await refineTeacherTone(postContent);
            setPostContent(refined);
        } catch (e) {
            alert("AI service overloaded. Keeping draft.");
        } finally {
            setIsRefiningTone(false);
        }
    };

    // AI Translation
    const handleTranslate = async (postId: string, text: string, language: string) => {
        if (translatingId) return;
        setTranslatingId(postId);
        try {
            const translation = await translateAcademicInsight(text, language);
            setTranslatedContent(prev => ({
                ...prev,
                [postId]: { text: translation, lang: language }
            }));
        } catch (e) {
            alert("Translation engine timed out.");
        } finally {
            setTranslatingId(null);
        }
    };

    // Handle likes (Reactions)
    const handleLikePost = async (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const liked = post.likes.includes(currentUser.id);
        const newLikes = liked 
            ? post.likes.filter(id => id !== currentUser.id)
            : [...post.likes, currentUser.id];

        // Optimistic UI Update
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikes } : p));

        try {
            await apiService.saveModuleRecord('synergy_posts', {
                id: postId,
                likes: newLikes
            });
        } catch (e) {}
    };

    // Handle comments
    const handleAddComment = async (postId: string) => {
        const input = commentInputs[postId];
        if (!input || !input.trim() || isCommenting[postId]) return;

        setIsCommenting(prev => ({ ...prev, [postId]: true }));
        const commentData: Partial<SynergyComment> = {
            id: `comm_${Date.now()}`,
            postId,
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorRole: role === 'teacher' ? 'Class Teacher' : 'Parent',
            authorPhotoUrl: currentUser.profilePhotoUrl || '',
            content: input.trim(),
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('synergy_comments', commentData);
            setCommentInputs(prev => ({ ...prev, [postId]: '' }));
            fetchComments(postId);
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
        } catch (e) {
            alert("Error sending comment.");
        } finally {
            setIsCommenting(prev => ({ ...prev, [postId]: false }));
        }
    };

    // AI Conference Agenda Generator
    const handleGenerateAgenda = async () => {
        if (!selectedStudentId || isGeneratingAgenda) return;
        setIsGeneratingAgenda(true);
        setGeneratedAgendaItems([]);

        try {
            const student = users.find(u => u.id === selectedStudentId);
            if (!student) throw new Error("Student not found");

            // Extract performance summaries
            const studentMarks = assessmentMarks.filter(m => m.studentId === selectedStudentId);
            const studentDetails = studentMarks.map(m => {
                const asm = assessments.find(a => a.id === m.assessmentId);
                const subj = subjects.find(s => s.id === asm?.subjectId);
                return {
                    subject: subj?.name || 'Unknown Subject',
                    marks: m.marks,
                    maxMarks: asm?.maxMarks || 100
                };
            });

            const totalLessons = studentAttendances.filter(a => a.studentId === selectedStudentId).length;
            const present = studentAttendances.filter(a => a.studentId === selectedStudentId && (a.status === 'present' || a.status === 'late')).length;
            const rate = totalLessons > 0 ? (present / totalLessons) * 100 : 90;

            const discipline = disciplineIncidents.filter(i => i.studentId === selectedStudentId);

            const agenda = await generateConferenceAgenda(student.name, {
                subjects: studentDetails,
                attendanceRate: rate,
                disciplineIncidents: discipline
            });

            setGeneratedAgendaItems(agenda);
        } catch (e) {
            alert("AI Agenda engine encountered an error. Generating default template.");
            setGeneratedAgendaItems([
                "1. Focus review: Student milestone summaries and strengths",
                "2. Academic review: Core math and science gap closure",
                "3. Operational goals: Active attendance and class engagement guidelines",
                "4. Partnership alignment: Study space and home revision hours review"
            ]);
        } finally {
            setIsGeneratingAgenda(false);
        }
    };

    // Subject Circles Message Posting
    const loadCircleMessages = async (subjId: string) => {
        try {
            const raw = await apiService.fetchModuleRecords<any>('synergy_messages', undefined, undefined, {
                filter: { child_id: subjId }, // reusing child_id context as circle/subject id
                order: 'created_at.asc'
            });
            const mapped: SynergyMessage[] = raw.map((m: any) => ({
                id: m.id,
                senderId: m.senderId || m.sender_id,
                recipientId: m.recipientId || m.recipient_id,
                content: m.content,
                isRead: m.isRead || m.is_read || false,
                childId: m.childId || m.child_id,
                createdAt: m.createdAt || m.created_at
            }));
            setCircleMessages(prev => ({ ...prev, [subjId]: mapped }));
        } catch (e) {}
    };

    const handleSendCircleMessage = async (subjId: string) => {
        if (!circleMsgInput.trim() || isSendingCircleMsg) return;
        setIsSendingCircleMsg(true);

        const newMsg: Partial<SynergyMessage> = {
            id: `msg_${Date.now()}`,
            senderId: currentUser.id,
            recipientId: 'CIRCLE', // broadcast role
            content: circleMsgInput.trim(),
            isRead: false,
            childId: subjId, // subject circle ID
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('synergy_messages', newMsg);
            setCircleMsgInput('');
            loadCircleMessages(subjId);
        } catch (e) {} finally {
            setIsSendingCircleMsg(false);
        }
    };

    const handlePrintAgenda = () => {
        window.print();
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm h-fit space-y-4">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2 mb-3">Synergy Portal</h4>
                <div className="flex flex-col gap-2">
                    {[
                        { id: 'feed', label: 'Timeline Feed', icon: <Calendar className="w-4 h-4" /> },
                        { id: 'circles', label: 'Subject Circles', icon: <Users className="w-4 h-4" /> },
                        { id: 'agendas', label: 'Conference Agendas', icon: <BookOpen className="w-4 h-4" /> },
                        role === 'parent' && { id: 'coach', label: 'Home-Learning Coach', icon: <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> }
                    ].filter(Boolean).map((tab: any) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                if (tab.id === 'circles' && subjects.length > 0) {
                                    setActiveCircleId(subjects[0].id);
                                    loadCircleMessages(subjects[0].id);
                                }
                            }}
                            className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${
                                activeTab === tab.id 
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-150 dark:shadow-none' 
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Feed Workspace */}
            <div className="lg:col-span-3 space-y-6">
                
                {/* 1. TIMELINE FEED TAB */}
                {activeTab === 'feed' && (
                    <div className="space-y-6">
                        {/* Post Creator (Teacher Mode) */}
                        {role === 'teacher' && (
                            <form onSubmit={handleCreatePost} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-5 animate-fade-in-up">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight mb-1">Publish Synergy Update</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Share milestones and classroom updates with parents</p>
                                </div>
                                <div className="space-y-4">
                                    <input 
                                        type="text" 
                                        required
                                        value={postTitle}
                                        onChange={e => setPostTitle(e.target.value)}
                                        placeholder="Title of Milestone (e.g. Science Class Laboratory Progress)..." 
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-semibold"
                                    />
                                    <div className="relative">
                                        <textarea 
                                            required
                                            value={postContent}
                                            onChange={e => setPostContent(e.target.value)}
                                            rows={4}
                                            placeholder="Write your update description here..." 
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-semibold resize-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRefineTone}
                                            disabled={!postContent.trim() || isRefiningTone}
                                            className="absolute right-4 bottom-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                                        >
                                            {isRefiningTone ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                            )}
                                            AI Polish Tone
                                        </button>
                                    </div>
                                    
                                    {/* Optional Student Tagging */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Private Broadcast: Tag Students (Leave empty for class-wide)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {classStudents.map(student => {
                                                const active = targetChildIds.includes(student.id);
                                                return (
                                                    <button
                                                        key={student.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setTargetChildIds(prev => 
                                                                active ? prev.filter(id => id !== student.id) : [...prev, student.id]
                                                            );
                                                        }}
                                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                                            active 
                                                                ? 'bg-indigo-600 text-white border-indigo-650' 
                                                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {student.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isPosting}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-150 dark:shadow-none flex items-center justify-center gap-2"
                                >
                                    {isPosting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isPosting ? 'Publishing...' : 'Publish Update'}
                                </button>
                            </form>
                        )}

                        {/* Posts List */}
                        <div className="space-y-6">
                            {loadingPosts ? (
                                <div className="p-20 text-center flex flex-col items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Synchronizing Synergy Feed...</p>
                                </div>
                            ) : posts.length > 0 ? (
                                posts.map(post => {
                                    const hasComments = activePostCommentsId === post.id;
                                    const postComments = comments[post.id] || [];
                                    const isLiked = post.likes.includes(currentUser.id);
                                    const translation = translatedContent[post.id];

                                    return (
                                        <div key={post.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in-up">
                                            
                                            {/* Header */}
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-slate-500 font-black">
                                                        {post.authorPhotoUrl ? (
                                                            <img src={post.authorPhotoUrl} alt="author" className="w-full h-full object-cover rounded-2xl" />
                                                        ) : (
                                                            <User className="w-6 h-6" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-900 dark:text-white text-base leading-tight uppercase tracking-tight">{post.authorName}</h4>
                                                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-black mt-0.5">{post.authorRole}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>

                                            {/* Body */}
                                            <div className="space-y-3">
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{post.title}</h3>
                                                
                                                {/* Translated View */}
                                                {translation ? (
                                                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-2xl relative animate-fade-in">
                                                        <span className="absolute top-2 right-3 text-[9px] font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1">
                                                            <Globe className="w-3 h-3 animate-spin" /> Translated to {translation.lang}
                                                        </span>
                                                        <p className="text-sm text-slate-750 dark:text-slate-200 leading-relaxed font-semibold italic pr-20">
                                                            {translation.text}
                                                        </p>
                                                        <button 
                                                            onClick={() => setTranslatedContent(prev => {
                                                                const updated = { ...prev };
                                                                delete updated[post.id];
                                                                return updated;
                                                            })}
                                                            className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 mt-2 block"
                                                        >
                                                            Reset to Original
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-700 dark:text-slate-350 leading-relaxed font-medium">
                                                        {post.content}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Actions Footer */}
                                            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4">
                                                <div className="flex items-center gap-6">
                                                    <button 
                                                        onClick={() => handleLikePost(post.id)}
                                                        className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all ${
                                                            isLiked ? 'text-rose-500 scale-105' : 'text-slate-400 hover:text-slate-600'
                                                        }`}
                                                    >
                                                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500' : ''}`} />
                                                        {post.likes.length} Likes
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            if (hasComments) {
                                                                setActivePostCommentsId(null);
                                                            } else {
                                                                setActivePostCommentsId(post.id);
                                                                fetchComments(post.id);
                                                            }
                                                        }}
                                                        className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                        {post.commentsCount} Comments
                                                    </button>
                                                </div>

                                                {/* Translate Selector */}
                                                <div className="relative group/lang">
                                                    <button className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                                                        {translatingId === post.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Globe className="w-3.5 h-3.5" />
                                                        )}
                                                        AI Translate
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden hidden group-hover/lang:block z-50">
                                                        {['Swahili', 'Simplified English', 'Sheng', 'French'].map(lang => (
                                                            <button
                                                                key={lang}
                                                                onClick={() => handleTranslate(post.id, post.content, lang)}
                                                                className="w-full text-left px-4 py-2.5 hover:bg-slate-800 text-xs font-black uppercase tracking-wider text-slate-350 hover:text-white transition-colors"
                                                            >
                                                                {lang}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Comments View */}
                                            {hasComments && (
                                                <div className="border-t border-slate-100 dark:border-slate-700 pt-6 space-y-4 animate-fade-in">
                                                    {postComments.length > 0 ? (
                                                        <div className="space-y-4 pl-4 border-l border-slate-150 dark:border-slate-700">
                                                            {postComments.map(c => (
                                                                <div key={c.id} className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-xs text-slate-900 dark:text-white">{c.authorName}</span>
                                                                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-[8px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">{c.authorRole}</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">{c.content}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-slate-400 uppercase tracking-widest font-black text-center py-4">No comments yet</p>
                                                    )}

                                                    {/* Create Comment Form */}
                                                    <div className="flex gap-3">
                                                        <input 
                                                            type="text" 
                                                            value={commentInputs[post.id] || ''}
                                                            onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                            placeholder="Post your reply..." 
                                                            className="flex-grow px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white rounded-xl outline-none text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                        <button 
                                                            onClick={() => handleAddComment(post.id)}
                                                            disabled={isCommenting[post.id] || !(commentInputs[post.id] || '').trim()}
                                                            className="px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center"
                                                        >
                                                            {isCommenting[post.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-20 text-center bg-white dark:bg-slate-800 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-700">
                                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">No updates posted</h4>
                                    <p className="text-slate-400 text-xs mt-1.5">When milestone updates are shared, they will appear here in chronological order.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. SUBJECT CIRCLES TAB */}
                {activeTab === 'circles' && (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in-up">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight">Subject Discussion Circles</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Connect with active course subject teachers and other parents</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 dark:border-slate-700 pt-6">
                            {/* Circles navigation */}
                            <div className="md:col-span-1 border-r border-slate-100 dark:border-slate-700 pr-4 space-y-2">
                                {subjects.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            setActiveCircleId(s.id);
                                            loadCircleMessages(s.id);
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                                            activeCircleId === s.id 
                                                ? 'bg-indigo-50 border-indigo-100 text-indigo-650 dark:bg-slate-900 dark:border-indigo-900 dark:text-indigo-400' 
                                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        <span className="truncate">{s.name}</span>
                                        <span className="text-[9px] font-mono font-black uppercase tracking-wider">{s.code}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Circles Feed Area */}
                            <div className="md:col-span-2 flex flex-col h-[400px]">
                                {activeCircleId ? (
                                    <>
                                        <div className="flex-grow overflow-y-auto pr-2 space-y-4 no-scrollbar">
                                            {(circleMessages[activeCircleId] || []).length > 0 ? (
                                                (circleMessages[activeCircleId] || []).map(msg => (
                                                    <div key={msg.id} className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-black text-xs text-slate-850 dark:text-white uppercase tracking-tight">
                                                                {users.find(u => u.id === msg.senderId)?.name || 'Member'}
                                                            </span>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-semibold">{msg.content}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                                                    <Users className="w-10 h-10 text-slate-300 mb-3" />
                                                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest">No messages in this subject circle</p>
                                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Start the discussion now</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-4 border-t dark:border-slate-700 flex gap-2">
                                            <input
                                                type="text"
                                                value={circleMsgInput}
                                                onChange={e => setCircleMsgInput(e.target.value)}
                                                placeholder="Write a message to this circle..."
                                                className="flex-grow px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-semibold"
                                            />
                                            <button
                                                onClick={() => handleSendCircleMessage(activeCircleId)}
                                                disabled={isSendingCircleMsg || !circleMsgInput.trim()}
                                                className="px-5 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center"
                                            >
                                                Send
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 font-bold uppercase text-xs tracking-widest">Select a Subject Circle</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. AI CONFERENCE AGENDAS TAB */}
                {activeTab === 'agendas' && (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in-up no-print">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight">AI-Conference Agenda Generator</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Synthesize grades and attendance into constructive meeting agenda templates</p>
                            </div>
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl text-amber-600">
                                <Sparkles className="w-6 h-6 animate-pulse" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end border-t border-slate-100 dark:border-slate-700 pt-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Select Student</label>
                                <select 
                                    value={selectedStudentId}
                                    onChange={e => setSelectedStudentId(e.target.value)}
                                    className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold"
                                >
                                    {role === 'parent' ? (
                                        children.map(c => <option key={c.id} value={c.id}>{c.name} (linked child)</option>)
                                    ) : (
                                        classStudents.map(s => <option key={s.id} value={s.id}>{s.name} (enrolled student)</option>)
                                    )}
                                </select>
                            </div>
                            <button
                                onClick={handleGenerateAgenda}
                                disabled={!selectedStudentId || isGeneratingAgenda}
                                className="w-full h-12 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2"
                            >
                                {isGeneratingAgenda ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {isGeneratingAgenda ? 'Generating...' : 'Generate with AI'}
                            </button>
                        </div>

                        {/* Generated Checklist Agenda Box */}
                        {generatedAgendaItems.length > 0 && (
                            <div className="p-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-[2rem] space-y-6 animate-fade-in-up mt-6 print-container">
                                <div className="flex justify-between items-center border-b dark:border-slate-750 pb-4">
                                    <div>
                                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Parent-Teacher Conference Agenda</h4>
                                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-black mt-0.5">
                                            Student Profile: {users.find(u => u.id === selectedStudentId)?.name || 'N/A'}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={handlePrintAgenda}
                                        className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700"
                                    >
                                        <Printer className="w-4 h-4" /> Print
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {generatedAgendaItems.map((item, index) => (
                                        <div key={index} className="flex gap-4 items-start p-3 bg-white dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="w-5 h-5 bg-indigo-50 dark:bg-indigo-950/50 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-650 dark:text-indigo-400">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-750 dark:text-slate-205 leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-6">
                                    Generated dynamically by EduAI Hub on {new Date().toLocaleDateString()}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. PARENT'S HOME-COACH BOT TAB */}
                {activeTab === 'coach' && role === 'parent' && (
                    <div className="animate-fade-in-up">
                        {(() => {
                            const activeStudent = users.find(u => u.id === selectedStudentId);
                            if (!activeStudent) return null;

                            // Fetch child marks / details
                            const studentMarks = assessmentMarks.filter(m => m.studentId === selectedStudentId);
                            const performanceSummary = studentMarks.map(m => {
                                const asm = assessments.find(a => a.id === m.assessmentId);
                                const subj = subjects.find(s => s.id === asm?.subjectId);
                                return `${subj?.name || 'Subject'}: ${m.marks}/${asm?.maxMarks || 100} marks.`;
                            }).join(' ');

                            return (
                                <AiCoachAssistant
                                    child={activeStudent}
                                    childPerformanceSummary={performanceSummary || 'Consistent student showing potential across curriculum levels.'}
                                />
                            );
                        })()}
                    </div>
                )}
            </div>
            
            {/* Custom print CSS styles */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible; }
                    .print-container { position: absolute; left: 0; top: 0; width: 100%; border: none; background: white; color: black; box-shadow: none; p: 0; }
                }
            `}</style>
        </div>
    );
};
