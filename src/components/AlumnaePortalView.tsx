
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
    Building2,
    LogOut,
    Edit2,
    Trash2,
    Video,
    ArrowRight,
    Maximize2,
    Atom,
    Crown,
    ChevronRight,
    ChevronDown,
    Mail,
    Lock,
    Eye,
    Camera,
    Briefcase,
    ShoppingBag,
    Flag,
    Medal,
    Globe,
    Zap,
    ShieldCheck
} from 'lucide-react';
import type { AlumniPost, AlumniComment, Institution } from '../types';
import { apiService } from '../services/apiService';

interface AlumnaePortalViewProps {
    currentAlumna: any;
    institutions: Institution[];
    featureFee: number;
    ncbaConfig?: any;
    onBack: () => void;
    onJoinAnother?: () => void;
}

export const AlumnaePortalView: React.FC<AlumnaePortalViewProps> = ({ currentAlumna, institutions, featureFee, ncbaConfig, onBack, onJoinAnother }) => {
    const [posts, setPosts] = useState<AlumniPost[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [activeTab, setActiveTab] = useState<'for-you' | 'my-schools'>('for-you');
    const [selectedPost, setSelectedPost] = useState<AlumniPost | null>(null);
    const [comments, setComments] = useState<Record<string, AlumniComment[]>>({});
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [isProcessingFeature, setIsProcessingFeature] = useState(false);
    const [featuredMembers, setFeaturedMembers] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState<'feed' | 'messages' | 'explore' | 'notifications' | 'classmates' | 'funding' | 'support' | 'jobs' | 'marketplace' | 'mentorship' | 'groups' | 'management' | 'events' | 'profile'>('feed');
    const [schoolTeam, setSchoolTeam] = useState<any[]>([]);
    const [isTeamLoading, setIsTeamLoading] = useState(false);
    const [isAddingTeamMember, setIsAddingTeamMember] = useState(false);
    const [newTeamMemberEmail, setNewTeamMemberEmail] = useState('');
    const [newTeamMemberRole, setNewTeamMemberRole] = useState<'Admin' | 'Moderator' | 'Editor'>('Moderator');
    const [isSavingTeamMember, setIsSavingTeamMember] = useState(false);
    const [isManagementTeam, setIsManagementTeam] = useState(false);
    const [jobs, setJobs] = useState<any[]>([]);
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [rsvps, setRsvps] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [successStories, setSuccessStories] = useState<any[]>([]);
    const [docRequests, setDocRequests] = useState<any[]>([]);
    const [loadingNewModules, setLoadingNewModules] = useState(false);
    const [donationAmount, setDonationAmount] = useState('');
    const [isDonating, setIsDonating] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [activeConversationPartner, setActiveConversationPartner] = useState<any | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [alumnaeMembers, setAlumnaeMembers] = useState<any[]>([]);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileData, setProfileData] = useState({
        fullName: currentAlumna?.fullName || currentAlumna?.full_name || '',
        email: currentAlumna?.email || '',
        currentJob: currentAlumna?.currentJob || currentAlumna?.current_job || '',
        currentCompany: currentAlumna?.currentCompany || currentAlumna?.current_company || '',
        bio: currentAlumna?.bio || '',
        linkedinUrl: currentAlumna?.linkedinUrl || currentAlumna?.linkedin_url || '',
        twitterUrl: currentAlumna?.twitterUrl || currentAlumna?.twitter_url || '',
        profilePhotoUrl: currentAlumna?.profilePhotoUrl || currentAlumna?.profile_photo || currentAlumna?.profile_photo_url || '',
        coverPhotoUrl: currentAlumna?.coverPhotoUrl || currentAlumna?.cover_photo_url || '',
        isMentorAvailable: currentAlumna?.isMentorAvailable || currentAlumna?.is_mentor_available || false
    });
    const [profilePhotoUrlFile, setProfilePhotoFile] = useState<File | null>(null);
    const [profileCoverPhotoFile, setProfileCoverPhotoFile] = useState<File | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [otherMemberships, setOtherMemberships] = useState<any[]>([]);
    const [isDetectingMemberships, setIsDetectingMemberships] = useState(false);
    const [showSwitcher, setShowSwitcher] = useState(false);
    const [postImageFile, setPostImageFile] = useState<File | null>(null);
    const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
    const [postVideoFile, setPostVideoFile] = useState<File | null>(null);
    const [postVideoPreview, setPostVideoPreview] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [showPostMenuId, setShowPostMenuId] = useState<string | null>(null);
    const [viewedProfileId, setViewedProfileId] = useState<string | null>(null);
    const [viewedProfileData, setViewedProfileData] = useState<any | null>(null);
    const [profileActiveTab, setProfileActiveTab] = useState<'posts' | 'replies' | 'media' | 'highlights' | 'pulse'>('posts');
    const [profilePosts, setProfilePosts] = useState<AlumniPost[]>([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
    const [schoolProjects, setSchoolProjects] = useState<any[]>([]);
    const [schoolInbox, setSchoolInbox] = useState<any[]>([]);
    const [activeProject, setActiveProject] = useState<any | null>(null);
    const [projectUpdates, setProjectUpdates] = useState<any[]>([]);
    const [newMessageToSchool, setNewMessageToSchool] = useState('');
    const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [alumniNotifications, setAlumniNotifications] = useState<any[]>([]);
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
    const [showMoreMobileMenu, setShowMoreMobileMenu] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [showPostJobModal, setShowPostJobModal] = useState(false);
    const [jobData, setJobData] = useState({
        title: '',
        company: '',
        location: '',
        description: '',
        salaryRange: '',
        applyUrl: ''
    });
    const [isSavingJob, setIsSavingJob] = useState(false);
    
    const [showPostBusinessModal, setShowPostBusinessModal] = useState(false);
    const [exploreSearch, setExploreSearch] = useState('');
    const [businessData, setBusinessData] = useState({
        businessName: '',
        industry: '',
        description: '',
        websiteUrl: '',
        exclusiveDiscount: '',
        logoUrl: ''
    });
    const [businessLogoFile, setBusinessLogoFile] = useState<File | null>(null);
    const [isSavingBusiness, setIsSavingBusiness] = useState(false);

    const COMMON_EMOJIS = ['😊', '🎓', '✨', '🙌', '🎉', '💙', '🏛️', '💼', '💪', '👩‍🎓', '🏫', '💡', '🥂', '🔥', '📚', '🤝'];

    const addEmoji = (emoji: string) => {
        setNewPostContent(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const getCurrentStaffRole = () => {
        if (currentAlumna.isSuperAdmin) return 'Admin';
        const staff = schoolTeam.find(t => (t.member_id || t.memberId) === currentAlumna.id);
        return staff?.role || staff?.Role || null;
    };

    const loadOtherMemberships = async () => {
        setIsDetectingMemberships(true);
        try {
            if (!currentAlumna?.email) return;
            const targetEmail = currentAlumna.email.toLowerCase().trim();
            
            // Discovery Phase: Search by primary email column
            let results = await apiService.fetchModuleRecords('alumnae_members', undefined, undefined, {
                filter: { email: targetEmail }
            });

            // Fallback: Search by legacy user_email column if no results found
            if (!results || results.length === 0) {
                results = await apiService.fetchModuleRecords('alumnae_members', undefined, undefined, {
                    filter: { user_email: targetEmail }
                });
            }

            // Filter to ensure same email and valid memberships, excluding current active one
            const others = (results || []).filter((m: any) => 
                ((m.email?.toLowerCase() === targetEmail) || (m.user_email?.toLowerCase() === targetEmail)) && 
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

    const loadSchoolEngagement = async (instId: string) => {
        try {
            const projects = await apiService.fetchModuleRecords('school_projects', undefined, undefined, {
                filter: { institution_id: instId },
                order: 'created_at.desc'
            });
            const mappedProjects = (projects || []).map((p: any) => ({
                ...p,
                currentAmount: p.current_amount || p.currentAmount,
                targetAmount: p.target_amount || p.targetAmount,
                institutionId: p.institution_id || p.institutionId
            }));
            setSchoolProjects(mappedProjects);

            if (mappedProjects.length > 0) {
                const projectIds = mappedProjects.map((p: any) => p.id);
                const updates = await apiService.fetchModuleRecords('project_updates', undefined, undefined, {
                    filter: { project_id: { in: projectIds } },
                    order: 'created_at.desc'
                });
                const mappedUpdates = (updates || []).map((u: any) => ({
                    ...u,
                    projectId: u.project_id || u.projectId,
                    updateTitle: u.update_title || u.updateTitle
                }));
                setProjectUpdates(mappedUpdates);
            }

            const messages = await apiService.fetchModuleRecords('alumni_school_inbox', undefined, undefined, {
                filter: { alumna_id: currentAlumna.id, institution_id: instId },
                order: 'created_at.asc'
            });
            const mappedMessages = (messages || []).map((m: any) => ({
                id: m.id,
                alumnaId: m.alumna_id || m.alumnaId,
                institutionId: m.institution_id || m.institutionId,
                content: m.content,
                direction: m.direction,
                createdAt: m.created_at || m.createdAt
            }));
            setSchoolInbox(mappedMessages);
        } catch (e) {
            console.error("Engagement load failed:", e);
        }
    };

    const loadNotifications = async () => {
        try {
            const alumnaId = currentAlumna.id || currentAlumna.alumna_id || currentAlumna.student_id;
            const raw = await apiService.fetchModuleRecords('alumni_notifications', undefined, undefined, {
                filter: { recipient_id: alumnaId },
                order: 'created_at.desc'
            });
            setAlumniNotifications(raw);
        } catch (e) {
            console.error("Notifications fetch failed:", e);
        }
    };

    const detectNewClassmates = async () => {
        const instId = currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id;
        const gradYear = currentAlumna.graduationYear || currentAlumna.graduation_year;
        if (!instId || !gradYear) return;

        try {
            // Find members who joined recently (simulated by checking newly loaded members)
            // If we find someone in our year who we haven't seen before, notify locally
            const lastChecked = localStorage.getItem(`last_classmate_check_${currentAlumna.id}`);
            const now = new Date().toISOString();
            
            if (!lastChecked || (new Date(now).getTime() - new Date(lastChecked).getTime() > 3600000)) {
                const results = await apiService.fetchModuleRecords('alumnae_members', instId);
                const newClassmates = (results || []).filter((m: any) => 
                    m.id !== currentAlumna.id && 
                    (String(m.graduationYear) === String(gradYear) || String(m.graduation_year) === String(gradYear)) &&
                    (!lastChecked || new Date(m.created_at || m.createdAt).getTime() > new Date(lastChecked).getTime())
                );

                if (newClassmates.length > 0) {
                    const names = newClassmates.map((m: any) => m.fullName || m.full_name).slice(0, 2).join(', ');
                    const extra = newClassmates.length > 2 ? ` and ${newClassmates.length - 2} others` : '';
                    
                    const newNotif = {
                        id: `cn_${Date.now()}`,
                        actor_name: 'Network Intelligence',
                        content: `${names}${extra} just joined the Class of ${gradYear} circle! Reconnect now.`,
                        created_at: now,
                        is_read: false
                    };
                    
                    setAlumniNotifications(prev => [newNotif, ...prev]);
                    localStorage.setItem(`last_classmate_check_${currentAlumna.id}`, now);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadNewModules = async () => {
        setLoadingNewModules(true);
        try {
            const instId = currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id;
            
            // Load Jobs
            const jobData = await apiService.fetchModuleRecords('alumni_jobs', undefined, undefined, {
                filter: { institution_id: instId },
                order: 'created_at.desc'
            });
            setJobs((jobData || []).map((j: any) => ({
                ...j,
                applyUrl: j.apply_url || j.applyUrl,
                salaryRange: j.salary_range || j.salaryRange
            })));

            // Load Businesses
            const bizData = await apiService.fetchModuleRecords('alumni_businesses', undefined, undefined, {
                filter: { institution_id: instId },
                order: 'created_at.desc'
            });
            setBusinesses((bizData || []).map((b: any) => ({
                ...b,
                businessName: b.business_name || b.businessName,
                logoUrl: b.logo_url || b.logoUrl,
                websiteUrl: b.website_url || b.websiteUrl,
                exclusiveDiscount: b.exclusive_discount || b.exclusiveDiscount
            })));

            // Load Groups
            const groupData = await apiService.fetchModuleRecords('alumni_groups', undefined, undefined, {
                filter: { institution_id: instId },
                order: 'created_at.desc'
            });
            setGroups((groupData || []).map((g: any) => ({
                ...g,
                imageUrl: g.image_url || g.imageUrl
            })));

            // Load Success Stories
            const storyData = await apiService.fetchModuleRecords('alumni_success_stories', undefined, undefined, {
                filter: { institution_id: instId },
                order: 'created_at.desc'
            });
            setSuccessStories((storyData || []).map((s: any) => ({
                ...s,
                imageUrl: s.image_url || s.imageUrl,
                isFeatured: s.is_featured || s.isFeatured
            })));

            const alumnaId = currentAlumna.id || currentAlumna.alumna_id || currentAlumna.student_id;
            const reqData = await apiService.fetchModuleRecords('alumni_document_requests', undefined, undefined, {
                filter: { alumna_id: alumnaId },
                order: 'created_at.desc'
            });
            setDocRequests((reqData || []).map((r: any) => ({
                ...r,
                documentType: r.document_type || r.documentType,
                alumnaId: r.alumna_id || r.alumnaId
            })));

            const rsvpData = await apiService.fetchModuleRecords('alumni_event_rsvps', undefined, undefined, {
                filter: { alumna_id: alumnaId }
            });
            setRsvps((rsvpData || []).map((r: any) => ({
                ...r,
                eventId: r.event_id || r.eventId,
                alumnaId: r.alumna_id || r.alumnaId
            })));

        } catch (e) {
            console.error("New modules load failed:", e);
        } finally {
            setLoadingNewModules(false);
        }
    };

    const loadSchoolTeam = async () => {
        const instId = currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id;
        if (!instId) return;
        
        setIsTeamLoading(true);
        try {
            const team = await apiService.fetchModuleRecords('alumni_school_staff', undefined, undefined, {
                filter: { institution_id: instId }
            });
            
            // Enrich with member details
            if (team && team.length > 0) {
                const memberIds = team.map((t: any) => t.member_id || t.memberId);
                const memberDetails = await apiService.fetchModuleRecords('alumnae_members', undefined, undefined, {
                    filter: { id: { in: memberIds } }
                });
                
                const enriched = team.map((t: any) => {
                    const detail = memberDetails.find((m: any) => m.id === (t.member_id || t.memberId));
                    return {
                        ...t,
                        fullName: detail?.full_name || detail?.fullName || 'Unknown Member',
                        email: detail?.email || 'N/A',
                        profilePhotoUrl: detail?.profile_photo || detail?.profilePhotoUrl
                    };
                });
                setSchoolTeam(enriched);
                
                // Check if current user is part of the team
                const isMember = enriched.some((t: any) => (t.member_id || t.memberId) === currentAlumna.id);
                setIsManagementTeam(isMember || currentAlumna.isSuperAdmin);
            } else {
                setSchoolTeam([]);
                setIsManagementTeam(!!currentAlumna.isSuperAdmin);
            }
        } catch (e) {
            console.error("Team load failed:", e);
        } finally {
            setIsTeamLoading(false);
        }
    };

    const handleAddTeamMember = async () => {
        if (!newTeamMemberEmail.trim()) return;
        const institutionId = currentAlumna.institutionId || currentAlumna.institution_id || null;
        const schoolId = currentAlumna.schoolId || currentAlumna.school_id || null;
        
        setIsSavingTeamMember(true);
        try {
            // 1. Find member by email
            const members = await apiService.fetchModuleRecords('alumnae_members', undefined, undefined, {
                filter: { email: newTeamMemberEmail.trim().toLowerCase() }
            });
            
            if (!members || members.length === 0) {
                alert("Member not found with this email address. Please ensure they have registered in the portal.");
                return;
            }
            
            const member = members[0];
            
            // 2. Add to staff table
            await apiService.saveModuleRecord('alumni_school_staff', {
                id: `stf_${Date.now()}`,
                institution_id: institutionId,
                school_id: schoolId,
                member_id: member.id,
                role: newTeamMemberRole,
                added_by: currentAlumna.id,
                created_at: new Date().toISOString()
            });
            
            alert(`${member.full_name || member.fullName} added to the management team as ${newTeamMemberRole}.`);
            setNewTeamMemberEmail('');
            setIsAddingTeamMember(false);
            loadSchoolTeam();
        } catch (e: any) {
            console.error("Failed to add team member:", e);
            alert("Failed to add member: " + (e.message || "Duplicate entry or database error."));
        } finally {
            setIsSavingTeamMember(false);
        }
    };

    const handleRemoveTeamMember = async (staffId: string) => {
        if (!window.confirm("Are you sure you want to remove this member from the management team?")) return;
        try {
            await apiService.deleteModuleRecord('alumni_school_staff', staffId);
            loadSchoolTeam();
        } catch (e) {
            console.error("Remove failed:", e);
        }
    };

    useEffect(() => {
        const instId = currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id;
        if (instId) {
            loadSchoolEngagement(instId as string);
            loadNewModules();
            loadSchoolTeam();
        }
        
        loadNotifications();
        detectNewClassmates();

        // Real-time simulation check every 5 mins
        const timer = setInterval(loadNotifications, 300000);
        return () => clearInterval(timer);
    }, [currentAlumna]);

    const handleSendMessageToSchool = async () => {
        if (!newMessageToSchool.trim()) return;
        const institutionId = currentAlumna.institutionId || currentAlumna.institution_id || null;
        const schoolId = currentAlumna.schoolId || currentAlumna.school_id || null;
        
        const msg = {
            id: `sm_${Date.now()}`,
            alumna_id: currentAlumna.id,
            institution_id: institutionId,
            school_id: schoolId,
            content: newMessageToSchool,
            direction: 'to_school',
            created_at: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('alumni_school_inbox', msg);
            setSchoolInbox([...schoolInbox, {
                id: msg.id,
                alumnaId: msg.alumna_id,
                institutionId: msg.institution_id,
                schoolId: msg.school_id,
                content: msg.content,
                direction: msg.direction,
                createdAt: msg.created_at
            }]);
            setNewMessageToSchool('');
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateProfile = async () => {
        setIsSavingProfile(true);
        try {
            let photoUrl = profileData.profilePhotoUrl;
            let coverUrl = profileData.coverPhotoUrl;
            
            if (profilePhotoUrlFile) {
                const uploadRes = await apiService.uploadToGoogleDrive(profilePhotoUrlFile, 'Alumnae_Profiles', {
                    institutionId: currentAlumna.institutionId,
                    useGlobalConfig: !currentAlumna.institutionId
                });
                if (uploadRes.success) photoUrl = uploadRes.url;
            }

            if (profileCoverPhotoFile) {
                const uploadRes = await apiService.uploadToGoogleDrive(profileCoverPhotoFile, 'Alumnae_Covers', {
                    institutionId: currentAlumna.institutionId,
                    useGlobalConfig: !currentAlumna.institutionId
                });
                if (uploadRes.success) coverUrl = uploadRes.url;
            }

            const alumnaId = currentAlumna.id || currentAlumna.alumna_id || currentAlumna.student_id;
            await apiService.saveModuleRecord('alumnae_members', {
                ...currentAlumna,
                ...profileData,
                email: profileData.email || currentAlumna.email,
                full_name: profileData.fullName || currentAlumna.fullName || currentAlumna.full_name,
                institution_id: currentAlumna.institution_id || currentAlumna.institutionId,
                profile_photo: photoUrl, 
                profilePhotoUrl: photoUrl,
                cover_photo_url: coverUrl,
                coverPhotoUrl: coverUrl,
                id: alumnaId
            });
            // Update local session
            const updated = { ...currentAlumna, ...profileData, profilePhotoUrl: photoUrl, coverPhotoUrl: coverUrl };
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
            const instId = currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id;
            const schoolRegId = currentAlumna.schoolId || currentAlumna.school_id;

            if (activeTab === 'my-schools') {
                // If Super Admin, they should see everything for this school/institution
                // Note: fetchModuleRecords filter is usually equality. 
                // We'll fetch and then filter in frontend if needed, but let's try to be efficient.
                if (instId && instId !== 'GLOBAL') {
                    filters.institution_id = instId;
                } else if (schoolRegId) {
                    filters.school_id = schoolRegId;
                }
            }
            
            const data = await apiService.fetchModuleRecords('alumni_posts', undefined, undefined, { 
                filter: filters,
                order: 'created_at.desc'
            });

            // Mapping database results (snake_case) to UI type (camelCase)
            const mappedData: AlumniPost[] = (data || []).map((p: any) => ({
                id: p.id,
                authorId: p.author_id || p.authorId,
                authorName: p.author_name || p.authorName,
                authorPhoto: p.author_photo || p.authorPhoto,
                institutionId: p.institution_id || p.institutionId,
                schoolId: p.school_id || p.schoolId,
                groupId: p.group_id || p.groupId,
                groupName: p.group_name || p.groupName,
                content: p.content,
                photoUrl: p.photo_url || p.photoUrl,
                videoUrl: p.video_url || p.videoUrl,
                likes: p.likes || [],
                commentsCount: p.comments_count ?? p.commentsCount ?? 0,
                createdAt: p.created_at || p.createdAt
            }));

            // Frontend Post-Filter for Edge Cases
            let processedPosts = mappedData;
            if (activeTab === 'my-schools') {
                processedPosts = mappedData.filter((p: any) => {
                    if (currentAlumna.isSuperAdmin) return true; // Super admin sees all for this context
                    return (p.institutionId === instId) || (p.schoolId === schoolRegId);
                });
            }

            setPosts(processedPosts);
            
            // Prefetch comments for these posts
            if (mappedData.length > 0) {
                for (const post of mappedData) {
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
            
            const mappedComments: AlumniComment[] = (data || []).map((c: any) => ({
                id: c.id,
                postId: c.post_id || c.postId,
                authorId: c.author_id || c.authorId,
                authorName: c.author_name || c.authorName,
                authorPhoto: c.author_photo || c.authorPhoto,
                institutionId: c.institution_id || c.institutionId,
                content: c.content,
                createdAt: c.created_at || c.createdAt
            }));

            setComments(prev => ({ ...prev, [postId]: mappedComments }));
        } catch (e) {}
    };

    const loadMessages = async () => {
        try {
            // Only load messages where current alumna is sender or recipient
            const data = await apiService.fetchModuleRecords('alumni_messages', undefined, undefined, {
                order: 'created_at.asc'
            });
            
            const mapped = (data || []).map((m: any) => ({
                id: m.id,
                senderId: m.sender_id || m.senderId,
                recipientId: m.recipient_id || m.recipientId || m.receiver_id || m.receiverId,
                institutionId: m.institution_id || m.institutionId,
                content: m.content,
                isRead: m.is_read || m.isRead,
                createdAt: m.created_at || m.createdAt
            }));

            // Frontend filter as complex OR filters might be limited in standard fetch
            const alumnaId = currentAlumna.id || currentAlumna.alumna_id || currentAlumna.student_id;
            const filtered = mapped.filter((m: any) => 
                m.senderId === alumnaId || m.recipientId === alumnaId
            );
            setMessages(filtered);
        } catch (e) {}
    };

    const [allInstitutionMembers, setAllInstitutionMembers] = useState<any[]>([]);

    const loadAlumnaeMembers = async () => {
        try {
            const instId = currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id;
            const gradYear = currentAlumna.graduationYear || currentAlumna.graduation_year;
            const schoolRegId = currentAlumna.schoolId || currentAlumna.school_id;
            
            // Fetch all members associated with this institution/school
            const data = await apiService.fetchModuleRecords('alumnae_members', instId);
            
            // Mapping database results (snake_case) to UI type (camelCase)
            const mappedMembers = (data || []).map((m: any) => ({
                ...m,
                id: m.id,
                fullName: m.full_name || m.fullName || m.name,
                profilePhotoUrl: m.profile_photo || m.profilePhotoUrl || m.profile_photo_url,
                graduationYear: m.graduation_year || m.graduationYear,
                institutionId: m.institution_id || m.institutionId,
                schoolId: m.school_id || m.schoolId,
                isMentorAvailable: m.is_mentor_available || m.isMentorAvailable,
                currentJob: m.current_job || m.currentJob,
                currentCompany: m.current_company || m.currentCompany,
                bio: m.bio,
                isFeatured: m.is_featured || m.isFeatured
            }));

            // STRICT FILTER: Ensure they belong to THIS institution or school registry entry
            const institutionMembers = mappedMembers.filter((m: any) => {
                const memberInstId = m.institutionId;
                const memberSchoolRegId = m.schoolId;
                
                // Match by Onboarded Institution ID
                if (instId && memberInstId === instId) return true;
                
                // Match by Registry School ID (for schools not yet onboarded)
                if (schoolRegId && memberSchoolRegId === schoolRegId) return true;
                
                return false;
            });

            setAllInstitutionMembers(institutionMembers);

            // Scoped classmates: Same Institution + Same Year (OR All for Super Admin)
            const classmates = institutionMembers.filter((m: any) => 
                currentAlumna.isSuperAdmin || 
                (String(m.graduationYear) === String(gradYear))
            );
            
            setAlumnaeMembers(classmates);
            
            // Featured members: Must match Institution/School
            setFeaturedMembers(institutionMembers.filter((m: any) => m.isFeatured));
        } catch (e) {
            console.error("Failed to load alumnae members:", e);
        }
    };

    const handleBeFeatured = async () => {
        if (!window.confirm(`Become a Featured Alumna for KES ${featureFee}? This will boost your profile visibility.`)) return;
        setIsProcessingFeature(true);
        
        try {
            let res;
            if (ncbaConfig && ncbaConfig.clientId && ncbaConfig.clientSecret) {
                res = await apiService.triggerNcbaPayment({
                    amount: featureFee,
                    phoneNumber: currentAlumna.phoneNumber,
                    reference: `FEAT_${currentAlumna.id}`,
                    description: 'Featured Alumna Promotion',
                    institutionId: currentAlumna.institutionId || 'GLOBAL'
                });
            } else {
                res = await apiService.triggerMpesaStkPush({
                    amount: featureFee,
                    phoneNumber: currentAlumna.phoneNumber,
                    reference: `FEAT_${currentAlumna.id}`,
                    description: 'Featured Alumna Promotion',
                    institutionId: currentAlumna.institutionId || 'GLOBAL'
                });
            }

            if (res.success) {
                const checkoutRequestId = res.checkoutRequestId || res.requestId;
                if (!checkoutRequestId) {
                    throw new Error("Invalid response from payment gateway: Missing identifier.");
                }

                setIsVerifyingPayment(true);
                setIsProcessingFeature(false);

                // Polling Loop for Confirmation (Max 60s)
                let confirmed = false;
                let attempts = 0;
                const maxAttempts = 12; // 12 * 5s = 60s

                while (attempts < maxAttempts && !confirmed) {
                    await new Promise(r => setTimeout(r, 5000)); // Wait 5s
                    attempts++;

                    try {
                        const statusRes = await apiService.checkPaymentStatus(
                            ncbaConfig && ncbaConfig.clientId ? 'ncba' : 'mpesa',
                            checkoutRequestId
                        );

                        if (statusRes.success && (statusRes.status === 'Completed' || statusRes.status === 'Success' || statusRes.resultCode === '0')) {
                            confirmed = true;
                        } else if (statusRes.status === 'Failed' || statusRes.resultCode === '1') {
                            throw new Error("Payment was cancelled or failed at the gateway.");
                        }
                    } catch (err) {
                        console.warn("Retrying status check...", err);
                    }
                }

                if (!confirmed) {
                    throw new Error("Payment confirmation timed out. If you were charged, your status will update automatically within 24h.");
                }

                // Success - Update record
                const featuredUntil = new Date();
                featuredUntil.setMonth(featuredUntil.getMonth() + 1); // 1 month feature

                await apiService.updateModuleRecord('alumnae_members', currentAlumna.id, {
                    isFeatured: true,
                    featuredUntil: featuredUntil.toISOString()
                });

                alert("Verification Successful! You are now a Featured Alumna. Your profile is trending globally.");
                window.location.reload();
            } else {
                alert("Payment Initiation Failed: " + (res.message || "Unknown error"));
            }
        } catch (e: any) {
            console.error("Promotion Error:", e);
            alert("Security Error: " + (e.message || "Payment verification failed."));
        } finally {
            setIsProcessingFeature(false);
            setIsVerifyingPayment(false);
        }
    };

    const handleDonate = async (project: any) => {
        if (!donationAmount || isNaN(Number(donationAmount)) || Number(donationAmount) <= 0) {
            alert("Please enter a valid contribution amount.");
            return;
        }

        if (!window.confirm(`Contribute KES ${donationAmount} to "${project.title}"? Your legacy will be recorded.`)) return;
        setIsDonating(true);
        
        try {
            let res;
            if (ncbaConfig && ncbaConfig.clientId && ncbaConfig.clientSecret) {
                res = await apiService.triggerNcbaPayment({
                    amount: Number(donationAmount),
                    phoneNumber: currentAlumna.phoneNumber,
                    reference: `DON_${project.id}_${currentAlumna.id}`,
                    description: `Donation: ${project.title}`,
                    institutionId: project.institution_id || 'GLOBAL'
                });
            } else {
                res = await apiService.triggerMpesaStkPush({
                    amount: Number(donationAmount),
                    phoneNumber: currentAlumna.phoneNumber,
                    reference: `DON_${project.id}_${currentAlumna.id}`,
                    description: `Donation: ${project.title}`,
                    institutionId: project.institution_id || 'GLOBAL'
                });
            }

            if (res.success) {
                const checkoutRequestId = res.checkoutRequestId || res.requestId;
                setIsVerifyingPayment(true);
                
                let confirmed = false;
                let attempts = 0;
                while (attempts < 12 && !confirmed) {
                    await new Promise(r => setTimeout(r, 5000));
                    attempts++;
                    const statusRes = await apiService.checkPaymentStatus(
                        ncbaConfig && ncbaConfig.clientId ? 'ncba' : 'mpesa',
                        checkoutRequestId
                    );
                    if (statusRes.success && (statusRes.status === 'Completed' || statusRes.status === 'Success')) {
                        confirmed = true;
                    }
                }

                if (confirmed) {
                    // Update project amount
                    const current = project.current_amount || project.currentAmount || 0;
                    const newTotal = Number(current) + Number(donationAmount);
                    
                    await apiService.updateModuleRecord('school_projects', project.id, {
                        current_amount: newTotal,
                        currentAmount: newTotal
                    });

                    // Record contribution
                    await apiService.saveModuleRecord('alumnae_contributions', {
                        id: `don_${Date.now()}`,
                        alumna_id: currentAlumna.id,
                        institution_id: project.institution_id || null,
                        school_id: project.school_id || null,
                        amount: Number(donationAmount),
                        purpose: project.title,
                        status: 'completed'
                    });

                    // Award Loyalty Points (1 point per 100 KES)
                    const pointsEarned = Math.floor(Number(donationAmount) / 100);
                    const currentPoints = currentAlumna.loyaltyPoints || currentAlumna.loyalty_points || 0;
                    await apiService.updateModuleRecord('alumnae_members', currentAlumna.id, {
                        loyalty_points: currentPoints + pointsEarned
                    });

                    alert(`Contribution successful! You've earned ${pointsEarned} Legacy Points.`);
                    loadSchoolEngagement(project.institution_id);
                    setDonationAmount('');
                }
            }
        } catch (e: any) {
            alert("Contribution Error: " + e.message);
        } finally {
            setIsDonating(false);
            setIsVerifyingPayment(false);
        }
    };

    const handleRSVP = async (event: any, status: string = 'confirmed') => {
        try {
            await apiService.saveModuleRecord('alumni_event_rsvps', {
                id: `rsvp_${Date.now()}`,
                event_id: event.id,
                alumna_id: currentAlumna.id,
                status: status
            });
            alert(`RSVP ${status}! We've added this to your legacy calendar.`);
            loadNewModules();
        } catch (e: any) {
            alert("RSVP Error: " + e.message);
        }
    };

    const handlePostJob = async () => {
        if (!jobData.title || !jobData.company || !jobData.description) {
            alert("Please fill in essential job details.");
            return;
        }
        setIsSavingJob(true);
        try {
        const institutionId = currentAlumna.institutionId || currentAlumna.institution_id || null;
        const schoolId = currentAlumna.schoolId || currentAlumna.school_id || null;
            await apiService.saveModuleRecord('alumni_jobs', {
                id: `job_${Date.now()}`,
                title: jobData.title,
                company: jobData.company,
                location: jobData.location,
                description: jobData.description,
                salary_range: jobData.salaryRange,
                apply_url: jobData.applyUrl,
                institution_id: institutionId,
                school_id: schoolId,
                alumna_id: currentAlumna.id,
                created_at: new Date().toISOString()
            });
            setShowPostJobModal(false);
            setJobData({ title: '', company: '', location: '', description: '', salaryRange: '', applyUrl: '' });
            loadNewModules();
            alert("Job posted successfully to the network!");
        } catch (e: any) {
            alert("Post Job Error: " + e.message);
        } finally {
            setIsSavingJob(false);
        }
    };

    const handlePostBusiness = async () => {
        if (!businessData.businessName || !businessData.industry) {
            alert("Please fill in business name and industry.");
            return;
        }
        setIsSavingBusiness(true);
        try {
            let logoUrl = '';
            if (businessLogoFile) {
                const uploadRes = await apiService.uploadToGoogleDrive(businessLogoFile, 'Alumnae_Businesses', {
                    institutionId: currentAlumna.institutionId,
                    useGlobalConfig: !currentAlumna.institutionId
                });
                if (uploadRes.success) logoUrl = uploadRes.url || '';
            }

        const institutionId = currentAlumna.institutionId || currentAlumna.institution_id || null;
        const schoolId = currentAlumna.schoolId || currentAlumna.school_id || null;
            await apiService.saveModuleRecord('alumni_businesses', {
                id: `biz_${Date.now()}`,
                business_name: businessData.businessName,
                industry: businessData.industry,
                description: businessData.description,
                website_url: businessData.websiteUrl,
                exclusive_discount: businessData.exclusiveDiscount,
                logo_url: logoUrl,
                institution_id: institutionId,
                school_id: schoolId,
                owner_id: currentAlumna.id,
                created_at: new Date().toISOString()
            });
            setShowPostBusinessModal(false);
            setBusinessData({
                businessName: '',
                industry: '',
                description: '',
                websiteUrl: '',
                exclusiveDiscount: '',
                logoUrl: ''
            });
            setBusinessLogoFile(null);
            loadNewModules();
            alert("Business added to Legacy Market successfully!");
        } catch (e: any) {
            alert("Market Post Error: " + e.message);
        } finally {
            setIsSavingBusiness(false);
        }
    };

    const handleRequestDoc = async (type: string) => {
        try {
            const institutionId = currentAlumna.institutionId || currentAlumna.institution_id || null;
            const schoolId = currentAlumna.schoolId || currentAlumna.school_id || null;
            await apiService.saveModuleRecord('alumni_document_requests', {
                id: `req_${Date.now()}`,
                alumna_id: currentAlumna.id,
                institution_id: institutionId,
                school_id: schoolId,
                document_type: type,
                status: 'pending'
            });
            alert(`Request for ${type} submitted successfully.`);
            loadNewModules();
        } catch (e: any) {
            alert("Request Error: " + e.message);
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
        
        // Defensive identification of the partner ID
        const partnerId = (activeConversationPartner.id || 
                          (activeConversationPartner as any).alumna_id || 
                          (activeConversationPartner as any).student_id ||
                          (activeConversationPartner as any).recipient_id ||
                          (activeConversationPartner as any).receiver_id)?.toString();

        if (!partnerId || partnerId === 'undefined' || partnerId === 'null' || partnerId.trim() === '') {
            console.error("[Messaging] Critical Error: Identified partner has no valid ID", activeConversationPartner);
            alert("Security Error: Unable to identify message recipient. Please refresh the page and try again.");
            return;
        }

        const senderId = (currentAlumna.id || currentAlumna.alumna_id || currentAlumna.student_id)?.toString();
        if (!senderId || senderId === 'undefined' || senderId === 'null' || senderId.trim() === '') {
            console.error("[Messaging] Critical Error: Current alumna has no valid ID", currentAlumna);
            alert("Security Error: Your identity could not be verified. Please log in again.");
            return;
        }

        setIsSendingMessage(true);
        const msgId = `msg_${Date.now()}`;
        
        // We use redundant field mapping to ensure compatibility with all database schema variants (recipient_id vs receiver_id)
        // and both snake_case/camelCase to ensure toSnakeCase handles them reliably.
        const msg = {
            id: msgId,
            sender_id: senderId,
            senderId: senderId,
            recipient_id: partnerId,
            recipientId: partnerId,
            receiver_id: partnerId,
            receiverId: partnerId,
            institution_id: currentAlumna.institutionId || currentAlumna.institution_id || null,
            institutionId: currentAlumna.institutionId || currentAlumna.institution_id || null,
            school_id: currentAlumna.schoolId || currentAlumna.school_id || null,
            schoolId: currentAlumna.schoolId || currentAlumna.school_id || null,
            content: newMessage,
            is_read: false,
            isRead: false,
            created_at: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        try {
            console.log(`[Messaging] Dispatching secure message to ${partnerId}`, msg);
            const result = await apiService.saveModuleRecord('alumni_messages', msg);
            
            if (!result) {
                throw new Error("Message persistence returned empty response.");
            }

            const uiMsg = {
                id: msgId,
                senderId: senderId,
                recipientId: partnerId,
                content: newMessage,
                isRead: false,
                createdAt: msg.created_at
            };
            
            setMessages(prev => [...prev, uiMsg]);
            setNewMessage('');
            console.log(`[Messaging] Message delivered successfully. ID: ${msgId}`);
        } catch (e: any) {
            console.error("[Messaging] Delivery Failure:", e);
            alert("Message Delivery Failure: " + (e.message || "The networking engine encountered a constraint violation. Please run 'Schema Migration' in SuperAdmin settings if this persists."));
        } finally {
            setIsSendingMessage(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !postImageFile && !postVideoFile) return;
        setIsPosting(true);
        
        try {
            let photoUrl = '';
            let videoUrl = '';

            if (postImageFile) {
                const uploadRes = await apiService.uploadToGoogleDrive(postImageFile, 'Alumnae_Social', {
                    institutionId: currentAlumna.institutionId,
                    useGlobalConfig: !currentAlumna.institutionId
                });
                if (uploadRes.success) photoUrl = uploadRes.url || '';
            }

            if (postVideoFile) {
                const uploadRes = await apiService.uploadToGoogleDrive(postVideoFile, 'Alumnae_Short_Clips', {
                    institutionId: currentAlumna.institutionId,
                    useGlobalConfig: !currentAlumna.institutionId
                });
                if (uploadRes.success) videoUrl = uploadRes.url || '';
            }

            const alumnaId = currentAlumna.id || currentAlumna.alumna_id || currentAlumna.student_id;
            const post: any = {
                id: `p_${Date.now()}`,
                author_id: alumnaId || 'anonymous',
                author_name: currentAlumna.fullName || currentAlumna.name || 'Alumna',
                author_photo: currentAlumna.profilePhotoUrl,
                institution_id: currentAlumna.institutionId || currentAlumna.institution_id || null,
                school_id: currentAlumna.schoolId || currentAlumna.school_id || null,
                group_id: selectedGroupId || undefined,
                group_name: selectedGroupId ? groups.find(g => g.id === selectedGroupId)?.name : undefined,
                content: newPostContent,
                photo_url: photoUrl,
                video_url: videoUrl,
                likes: [],
                comments_count: 0,
                created_at: new Date().toISOString()
            };

            await apiService.saveModuleRecord('alumni_posts', post);
            
            // Convert to AlumniPost type for local state
            const uiPost: AlumniPost = {
                id: post.id,
                authorId: post.author_id,
                authorName: post.author_name,
                authorPhoto: post.author_photo,
                institutionId: post.institution_id,
                schoolId: post.school_id,
                groupId: post.group_id,
                groupName: post.group_name,
                content: post.content,
                photoUrl: post.photo_url,
                videoUrl: post.video_url,
                likes: post.likes,
                commentsCount: post.comments_count,
                createdAt: post.created_at
            };
            setPosts([uiPost, ...posts]);
            setNewPostContent('');
            setPostImageFile(null);
            setPostImagePreview(null);
            setPostVideoFile(null);
            setPostVideoPreview(null);
            setScheduledDate('');
            setShowEmojiPicker(false);
            setShowDatePicker(false);
        } catch (e: any) {
            console.error(e);
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

        const alumnaId = currentAlumna.id || currentAlumna.alumna_id || currentAlumna.student_id;
        const commentId = `c_${Date.now()}`;
        const commentData = {
            id: commentId,
            post_id: postId,
            author_id: alumnaId,
            author_name: currentAlumna.fullName || currentAlumna.name || 'Alumna',
            author_photo: currentAlumna.profilePhotoUrl,
            institution_id: currentAlumna.institutionId || currentAlumna.institution_id || null,
            school_id: currentAlumna.schoolId || currentAlumna.school_id || null,
            content,
            created_at: new Date().toISOString()
        };

        // UI Optimistic Update
        const uiComment = {
            id: commentId,
            postId,
            authorId: currentAlumna.id,
            authorName: currentAlumna.fullName || currentAlumna.name || 'Alumna',
            authorPhoto: currentAlumna.profilePhotoUrl,
            content,
            createdAt: commentData.created_at
        };

        const currentPost = posts.find(p => p.id === postId);
        const currentCount = currentPost ? (Number(currentPost.commentsCount) || Number(currentPost.comments_count) || 0) : 0;
        const newCount = currentCount + 1;

        try {
            console.log(`[Social] Adding comment to post ${postId}`, commentData);
            await apiService.saveModuleRecord('alumni_comments', commentData);
            
            // Sync local state
            setComments(prev => ({
                ...prev,
                [postId]: [...(prev[postId] || []), uiComment]
            }));
            
            // Update local posts count (Trigger will handle DB side, we update UI)
            setPosts(prev => prev.map(p => p.id === postId ? { 
                ...p, 
                commentsCount: newCount, 
                comments_count: newCount 
            } : p));

            // Clear input
            setCommentInputs(prev => ({ ...prev, [postId]: '' }));
            console.log(`[Social] Comment saved successfully. New count: ${newCount}`);
        } catch (e: any) {
            console.error("[Social] Failed to save comment:", e);
            alert("Failed to save reply. Please ensure your database is synchronized via the 'Schema Migration' in Settings.");
        }
    };

    const handleDeletePost = async (postId: string) => {
        const post = posts.find(p => p.id === postId);
        const isAuthor = post && (post.authorId === currentAlumna.id);
        const staffRole = getCurrentStaffRole();
        const canDelete = isAuthor || currentAlumna.isSuperAdmin || staffRole === 'Admin' || staffRole === 'Moderator';

        if (!canDelete) {
            alert("Permission denied. Only the author or school moderators can delete topics.");
            return;
        }

        if (!window.confirm("Are you sure you want to delete this legacy topic?")) return;
        try {
            await apiService.deleteModuleRecord('alumni_posts', postId);
            setPosts(posts.filter(p => p.id !== postId));
        } catch (e: any) {
            alert("Delete failed: " + e.message);
        }
    };

    const handleUpdatePost = async (postId: string) => {
        if (!editingContent.trim()) return;
        try {
            await apiService.updateModuleRecord('alumni_posts', postId, {
                content: editingContent
            } as any);
            setPosts(posts.map(p => p.id === postId ? { ...p, content: editingContent } : p));
            setEditingPostId(null);
            setEditingContent('');
        } catch (e: any) {
            alert("Update failed: " + e.message);
        }
    };

    const handleSharePost = async (post: AlumniPost) => {
        const baseUrl = 'https://almamater.eduai.co.ke';
        const shareText = `Legacy Check: ${post.authorName} shared something on Alumnae Circle! \n\n"${post.content.substring(0, 100)}..." \n\nJoin the conversation at ${baseUrl}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'EduAI Alumnae Circle',
                    text: shareText,
                    url: `${baseUrl}/?view=alumnae_social`
                });
            } catch (e) {
                copyToClipboard(shareText);
            }
        } else {
            copyToClipboard(shareText);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert("Topic reference copied to cloud clipboard!");
        });
    };

    const loadProfileContent = async (profileId: string) => {
        try {
            // Fetch Profile User Info
            const members = await apiService.fetchModuleRecords('alumnae_members', undefined, undefined, {
                filter: { id: profileId }
            });
            if (members.length > 0) setViewedProfileData(members[0]);

            // Fetch Profile Posts
            const rawPosts = await apiService.fetchModuleRecords('alumni_posts', undefined, undefined, {
                filter: { authorId: profileId },
                order: 'created_at.desc'
            });
            setProfilePosts(rawPosts);

            // Check if following
            const follows = await apiService.fetchModuleRecords('alumni_follows', undefined, undefined, {
                filter: { follower_id: currentAlumna.id, following_id: profileId }
            });
            setIsFollowing(follows.length > 0);

            // Get Stats
            const totalFollowers = await apiService.fetchModuleRecords('alumni_follows', undefined, undefined, {
                filter: { following_id: profileId }
            });
            const totalFollowing = await apiService.fetchModuleRecords('alumni_follows', undefined, undefined, {
                filter: { follower_id: profileId }
            });
            setFollowStats({ followers: totalFollowers.length, following: totalFollowing.length });
        } catch (e) {
            console.error("Failed to load profile:", e);
        }
    };

    useEffect(() => {
        if (viewedProfileId) {
            loadProfileContent(viewedProfileId);
        }
    }, [viewedProfileId]);

    const handleFollow = async () => {
        if (!viewedProfileId) return;
        const targetId = viewedProfileId;
        const currentId = currentAlumna.id;

        try {
            if (isFollowing) {
                // Unfollow - Find and delete
                const existing = await apiService.fetchModuleRecords('alumni_follows', undefined, undefined, {
                    filter: { follower_id: currentId, following_id: targetId }
                });
                if (existing.length > 0) {
                    await apiService.deleteModuleRecord('alumni_follows', existing[0].id);
                }
                setIsFollowing(false);
                setFollowStats(prev => ({ ...prev, followers: prev.followers - 1 }));
            } else {
                // Follow
                const followId = `f_${Date.now()}`;
                await apiService.saveModuleRecord('alumni_follows', {
                    id: followId,
                    follower_id: currentId,
                    following_id: targetId
                });
                setIsFollowing(true);
                setFollowStats(prev => ({ ...prev, followers: prev.followers + 1 }));
            }
        } catch (e) {
            console.error("Follow action failed:", e);
        }
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
        <div className="min-h-screen bg-[#020617] flex flex-col md:flex-row font-sans selection:bg-indigo-500/30 text-slate-300 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>
            {/* Left Sidebar - Navigation (Hidden on mobile, shown on md+) */}
            <aside className="hidden md:flex w-64 border-r border-white/5 flex-col p-4 fixed h-screen bg-white/5 backdrop-blur-3xl z-50">
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
                        { icon: Briefcase, label: 'Jobs', onClick: () => setActiveSection('jobs'), active: activeSection === 'jobs' },
                        { icon: ShoppingBag, label: 'Marketplace', onClick: () => setActiveSection('marketplace'), active: activeSection === 'marketplace' },
                        { icon: Zap, label: 'Mentorship', onClick: () => setActiveSection('mentorship'), active: activeSection === 'mentorship' },
                        { icon: Globe, label: 'Groups', onClick: () => setActiveSection('groups'), active: activeSection === 'groups' },
                        { icon: Sparkles, label: 'Funding', onClick: () => setActiveSection('funding' as any), active: activeSection === 'funding' },
                        { icon: Building2, label: 'Support', onClick: () => setActiveSection('support' as any), active: activeSection === 'support' },
                        ...(isManagementTeam ? [{ icon: ShieldCheck, label: 'Management', onClick: () => setActiveSection('management'), active: activeSection === 'management' }] : []),
                        { icon: User, label: 'Profile', onClick: () => setIsEditingProfile(true) }
                    ].map((item, idx) => (
                        <button 
                            key={idx} 
                            onClick={item.onClick}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative group ${item.active ? 'bg-indigo-600 text-white shadow-[0_10px_30px_rgba(79,70,229,0.3)] dark:shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'text-slate-500 hover:bg-white/10'}`}
                        >
                            <item.icon className={`w-6 h-6 transition-transform ${item.active ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="hidden md:block font-bold text-sm uppercase tracking-widest">{item.label}</span>
                            {item.active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-l-full blur-[2px]"></div>}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {featureFee > 0 && !currentAlumna.isFeatured && (
                        <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100 dark:shadow-none animate-pulse-slow">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-indigo-200" />
                                <span className="text-[8px] font-black uppercase tracking-[0.2em]">Legacy Boost</span>
                            </div>
                            <p className="text-[9px] font-bold leading-tight mb-3 opacity-90 uppercase">Get featured for KES {featureFee}/mo</p>
                            <button 
                                onClick={handleBeFeatured}
                                disabled={isProcessingFeature || isVerifyingPayment}
                                className="w-full py-2 bg-white text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                {isProcessingFeature || isVerifyingPayment ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Get Featured'}
                            </button>
                        </div>
                    )}

                    <button 
                        onClick={onBack}
                        className="w-full flex items-center gap-4 p-4 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-2xl transition-all"
                    >
                        <LogOut className="w-6 h-6" />
                        <span className="hidden md:block font-black uppercase text-[10px] tracking-[0.2em]">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 max-w-2xl mx-auto w-full border-x border-white/5 bg-white/5 backdrop-blur-sm min-h-screen pb-20 md:pb-0 relative z-10">
                {/* Section Controller */}
                {(() => {
                    switch (activeSection) {
                        case 'events':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                                    <header className="relative px-10 py-12 mb-12 overflow-hidden rounded-b-[4rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                                        <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-2xl"></div>
                                        <div className="absolute inset-0 opacity-20 animate-mesh"></div>
                                        <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-[80px] animate-pulse-slow"></div>
                                        
                                        <div className="relative z-10">
                                            <h2 className="text-4xl font-black uppercase tracking-tight text-white leading-none">Legacy <span className="text-indigo-200 italic opacity-80">Events</span></h2>
                                            <p className="text-[10px] text-indigo-100/60 font-black uppercase tracking-[0.5em] mt-4">Verified Social & Professional Gatherings</p>
                                        </div>
                                    </header>
                                    <div className="px-6 space-y-8">
                                        {schoolProjects.length === 0 ? ( // Reusing variable name if needed or using a new one if I loaded it
                                            <div className="py-20 text-center opacity-20">
                                                <Calendar className="w-16 h-16 mx-auto mb-6" />
                                                <p className="text-xs font-black uppercase tracking-[0.3em]">No upcoming events.</p>
                                            </div>
                                        ) : (
                                            schoolProjects.map(event => ( // Assuming events are loaded into schoolProjects or similar
                                                <div key={event.id} className="bg-white/5 border border-white/10 shadow-xl">
                                                    <div className="h-48 relative overflow-hidden">
                                                        {event.image_url ? <img src={event.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : <div className="w-full h-full bg-amber-50 flex items-center justify-center opacity-20"><Calendar className="w-12 h-12" /></div>}
                                                    </div>
                                                    <div className="p-8">
                                                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{event.title}</h3>
                                                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                            <Calendar className="w-3 h-3" /> {new Date(event.event_date).toLocaleDateString()} @ {event.location}
                                                        </p>
                                                        <p className="text-sm text-slate-500 mb-8 line-clamp-2">{event.description}</p>
                                                        <div className="flex gap-4">
                                                            <button 
                                                                onClick={() => handleRSVP(event, 'confirmed')}
                                                                className="flex-1 py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-100"
                                                            >
                                                                RSVP Confirmed
                                                            </button>
                                                            <button className="p-4 bg-white/10 text-slate-400 rounded-2xl hover:text-indigo-600 transition-all">
                                                                <Share2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );

                        case 'support':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen flex flex-col">
                                    <header className="relative px-10 py-12 mb-12 overflow-hidden rounded-b-[4rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                                        <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-2xl"></div>
                                        <div className="absolute inset-0 opacity-30 animate-mesh"></div>
                                        <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-[80px] animate-pulse-slow"></div>
                                        
                                        <div className="relative z-10">
                                            <h2 className="text-4xl font-black uppercase tracking-tight text-white leading-none">Institutional <span className="text-indigo-200 italic opacity-80">Support</span></h2>
                                            <p className="text-[10px] text-indigo-100/60 font-black uppercase tracking-[0.5em] mt-4">Direct Administrative & Document Assistance</p>
                                        </div>
                                    </header>

                                    <div className="flex-1 overflow-y-auto p-8 space-y-12 flex flex-col no-scrollbar relative z-10">
                                        {/* Document Request Section */}
                                        <div className="space-y-8">
                                            <div className="flex items-center gap-4">
                                                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-indigo-500/50"></div>
                                                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400/80">Digital Document Vault</h4>
                                                <div className="h-[1px] flex-1 bg-gradient-to-r from-indigo-500/50 to-transparent"></div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                {['Transcript', 'Certificate', 'Recommendation', 'ID Card'].map(type => (
                                                    <button 
                                                        key={type}
                                                        onClick={() => handleRequestDoc(type)}
                                                        className="relative group overflow-hidden p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] transition-all hover:scale-[1.02] active:scale-95 text-left"
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-rose-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                                        <div className="relative z-10">
                                                            <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors duration-500">
                                                                <Building2 className="w-6 h-6 text-indigo-400 group-hover:text-white group-hover:scale-110 transition-all duration-500" />
                                                            </div>
                                                            <h5 className="text-sm font-black uppercase tracking-tight text-white mb-2">{type} Request</h5>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Secure protocol for official registry documentation</p>
                                                            
                                                            <div className="mt-6 flex items-center gap-2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0 duration-500">
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Initialize Protocol</span>
                                                                <ArrowRight className="w-3 h-3" />
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="flex items-center gap-4">
                                                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-rose-500/50"></div>
                                                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-rose-400/80">Official Correspondence</h4>
                                                <div className="h-[1px] flex-1 bg-gradient-to-r from-rose-500/50 to-transparent"></div>
                                            </div>

                                            <div className="space-y-6 min-h-[300px]">
                                                {schoolInbox.length === 0 ? (
                                                    <div className="flex-1 flex flex-col items-center justify-center opacity-20 py-20">
                                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-8 border border-white/10">
                                                            <MessageSquare className="w-8 h-8 text-white" />
                                                        </div>
                                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white text-center max-w-xs leading-loose">
                                                            Establish high-priority sync with institutional administration.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    schoolInbox.map((msg, idx) => (
                                                        <div key={idx} className={`flex flex-col ${msg.direction === 'to_school' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                                            <div className={`max-w-[85%] p-6 rounded-[2rem] text-sm font-medium leading-relaxed shadow-2xl relative overflow-hidden ${msg.direction === 'to_school' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-white rounded-tl-none backdrop-blur-xl'}`}>
                                                                {msg.direction === 'to_school' && <div className="absolute inset-0 opacity-20 animate-mesh pointer-events-none"></div>}
                                                                <p className="relative z-10">{msg.content}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-3 px-4">
                                                                <div className={`w-1 h-1 rounded-full ${msg.direction === 'to_school' ? 'bg-indigo-400' : 'bg-slate-500'}`}></div>
                                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="sticky bottom-0 p-8 bg-[#020617]/80 backdrop-blur-3xl border-t border-white/10 z-30">
                                        <div className="max-w-4xl mx-auto flex items-center gap-6 relative">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-rose-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity"></div>
                                            <input 
                                                type="text" 
                                                value={newMessageToSchool}
                                                onChange={(e) => setNewMessageToSchool(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessageToSchool()}
                                                placeholder="Initialize encrypted channel message..."
                                                className="relative flex-1 h-16 px-8 bg-[#020617] border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                                            />
                                            <button 
                                                onClick={handleSendMessageToSchool}
                                                className="relative h-16 w-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-indigo-500/20 group"
                                            >
                                                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );

                        case 'funding':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                                    <header className="relative px-10 py-12 mb-12 overflow-hidden rounded-b-[4rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                                        <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-2xl"></div>
                                        <div className="absolute inset-0 opacity-20 animate-mesh"></div>
                                        <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-[80px] animate-pulse-slow"></div>

                                        <div className="relative z-10">
                                            <h2 className="text-4xl font-black uppercase tracking-tight text-white leading-none">Endowment <span className="text-emerald-100 italic opacity-80">Vault</span></h2>
                                            <p className="text-[10px] text-emerald-50 font-black uppercase tracking-[0.5em] mt-4">Empowering Institutional Longevity</p>
                                        </div>
                                    </header>

                                    <div className="px-8 space-y-16 pb-32">
                                        {schoolProjects.map((project) => (
                                            <div key={project.id} className="relative group rounded-[4rem] overflow-hidden bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] transition-all hover:border-emerald-500/30">
                                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-transparent to-rose-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                                
                                                <div className="flex flex-col lg:flex-row">
                                                    {/* Visual Hub */}
                                                    <div className="lg:w-2/5 h-80 lg:h-auto relative overflow-hidden">
                                                        {project.imageUrl ? (
                                                            <img src={project.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                                        ) : (
                                                            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                                                <Building2 className="w-20 h-20 text-white/10 animate-pulse" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent lg:bg-gradient-to-r"></div>
                                                        
                                                        <div className="absolute top-8 left-8">
                                                            <div className="px-5 py-2 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>
                                                                {project.status === 'active' ? 'Active Endowment' : 'Legacy Archive'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Content Nexus */}
                                                    <div className="lg:w-3/5 p-12 lg:p-16 flex flex-col justify-between relative z-10">
                                                        <div>
                                                            <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-6 leading-tight group-hover:text-emerald-400 transition-colors">{project.title}</h3>
                                                            <p className="text-sm text-slate-400 leading-relaxed mb-10 font-medium">{project.description}</p>
                                                            
                                                            <div className="space-y-8">
                                                                <div>
                                                                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-4">
                                                                        <span className="text-emerald-400">Raised: KES {project.current_amount || project.currentAmount || 0}</span>
                                                                        <span className="text-slate-500">Goal: KES {project.target_amount || project.targetAmount}</span>
                                                                    </div>
                                                                    <div className="relative h-4 bg-white/5 rounded-full overflow-hidden p-1 shadow-inner ring-1 ring-white/10">
                                                                        <div 
                                                                            className="h-full bg-gradient-to-r from-emerald-600 to-indigo-600 rounded-full transition-all duration-1000 ease-out" 
                                                                            style={{ width: `${Math.min(100, ((project.current_amount || project.currentAmount || 0) / (project.target_amount || project.targetAmount)) * 100)}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col sm:flex-row gap-4">
                                                                    <div className="flex-1 relative group/input">
                                                                        <div className="absolute inset-0 bg-white/5 rounded-2xl opacity-0 group-focus-within/input:opacity-100 transition-opacity"></div>
                                                                        <input 
                                                                            type="number" 
                                                                            placeholder="Legacy Amount (KES)..."
                                                                            value={donationAmount}
                                                                            onChange={(e) => setDonationAmount(e.target.value)}
                                                                            className="relative w-full h-16 pl-10 pr-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-black text-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                                                                        />
                                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-black text-[9px]">KES</div>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => handleDonate(project)}
                                                                        disabled={isDonating || !donationAmount}
                                                                        className="px-10 h-16 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-500/20 disabled:opacity-20 flex items-center justify-center gap-3 group/btn"
                                                                    >
                                                                        {isDonating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 group-hover/btn:animate-pulse" />}
                                                                        Fuel Legacy
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Milestones Terminal */}
                                                        <div className="mt-12 pt-12 border-t border-white/5">
                                                            <div className="flex items-center gap-3 mb-8">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Strategic Milestones</h4>
                                                            </div>
                                                            <div className="space-y-8">
                                                                {projectUpdates.filter(u => u.project_id === project.id).length === 0 ? (
                                                                    <div className="p-6 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center">Initial protocol initialized. Synchronization pending.</p>
                                                                    </div>
                                                                ) : (
                                                                    projectUpdates.filter(u => u.project_id === project.id).map(update => (
                                                                        <div key={update.id} className="flex gap-8 group/update">
                                                                            <div className="relative">
                                                                                <div className="w-[2px] h-full bg-emerald-500/20 group-last/update:h-0"></div>
                                                                                <div className="absolute top-0 -left-[5px] w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                                                                            </div>
                                                                            <div className="pb-8">
                                                                                <h5 className="text-[11px] font-black uppercase text-white tracking-tight mb-2 group-hover/update:text-emerald-400 transition-colors">{update.title}</h5>
                                                                                <p className="text-[11px] text-slate-500 leading-relaxed font-medium mb-4">{update.content}</p>
                                                                                <div className="flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest">
                                                                                    <Calendar className="w-3 h-3" />
                                                                                    {new Date(update.created_at).toLocaleDateString()}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );

                        case 'classmates':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                                    <header className="relative px-10 py-12 mb-12 overflow-hidden rounded-b-[4rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                                        <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-2xl border-b border-white/5"></div>
                                        <div className="absolute inset-0 opacity-10 animate-mesh"></div>
                                        <div className="absolute -left-20 -top-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>

                                        <div className="relative z-10 flex justify-between items-center">
                                            <div>
                                                <h2 className="text-4xl font-black uppercase tracking-tight text-white leading-none">Classmate <span className="text-indigo-400 italic opacity-80">Registry</span></h2>
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mt-4">Verified Professional Network Directory</p>
                                            </div>
                                            <div className="px-5 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">{alumnaeMembers.length} Verified</span>
                                            </div>
                                        </div>
                                    </header>

                                    <div className="px-8 grid grid-cols-1 md:grid-cols-2 gap-8 pb-32">
                                        {alumnaeMembers.filter(m => 
                                            (String(m.graduationYear || m.class_year) === String(currentAlumna.graduationYear || currentAlumna.class_year)) && 
                                            (m.institutionId || m.schoolId || m.institution_id) === (currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id) &&
                                            m.id !== currentAlumna.id
                                        ).map(member => (
                                            <div key={member.id} className="group relative overflow-hidden p-8 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] transition-all hover:scale-[1.02] hover:border-indigo-500/30 shadow-2xl">
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                
                                                <div className="relative z-10 flex flex-col items-center text-center">
                                                    {/* Profile Hub */}
                                                    <div className="relative mb-8">
                                                        <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-rose-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-60 transition-opacity"></div>
                                                        <div className="relative w-32 h-32 rounded-[2.25rem] bg-[#020617] border border-white/10 p-1">
                                                            {member.profile_photo_url || member.profilePhotoUrl ? (
                                                                <img src={member.profile_photo_url || member.profilePhotoUrl} className="w-full h-full object-cover rounded-[2rem]" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                                    <User className="w-12 h-12" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-[#020617] rounded-full animate-pulse"></div>
                                                    </div>

                                                    <div className="mb-8">
                                                        <div className="flex items-center justify-center gap-2 mb-2">
                                                            <h3 className="text-xl font-black text-white uppercase tracking-tight">{member.fullName || member.full_name}</h3>
                                                            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] leading-relaxed">
                                                            {member.currentJob || 'Institutional Associate'} <br/>
                                                            <span className="text-indigo-400/80">@ {member.currentCompany || 'EduAI Circle'}</span>
                                                        </p>
                                                    </div>

                                                    <div className="w-full flex gap-3">
                                                        <button 
                                                            onClick={() => { setActiveConversationPartner(member); setActiveSection('messages'); }}
                                                            className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                                                        >
                                                            Establish Link
                                                        </button>
                                                        <button 
                                                            onClick={() => setViewedProfileId(member.id)}
                                                            className="px-6 py-4 bg-white/5 text-slate-400 rounded-2xl hover:text-white hover:bg-white/10 transition-all"
                                                        >
                                                            <User className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );

                        case 'notifications':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen">
                                    <header className="relative px-10 py-12 mb-12 overflow-hidden rounded-b-[4rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                                        <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-2xl"></div>
                                        <div className="absolute inset-0 opacity-20 animate-mesh"></div>
                                        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
                                            <Bell className="w-48 h-48 text-indigo-500" />
                                        </div>
                                        
                                        <div className="relative z-10">
                                            <h2 className="text-4xl font-black uppercase tracking-tight text-white leading-none">Legacy <span className="text-indigo-400 italic opacity-80">Pulse</span></h2>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mt-4">Real-time engagement across the network</p>
                                        </div>
                                    </header>

                                    <div className="px-8 space-y-4 pb-32">
                                        {alumniNotifications.length === 0 ? (
                                            <div className="py-32 text-center opacity-10">
                                                <div className="relative inline-block mb-8">
                                                    <Bell className="w-20 h-20 mx-auto" />
                                                    <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20"></div>
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.5em]">Network Silence</p>
                                            </div>
                                        ) : (
                                            alumniNotifications.map((notif) => (
                                                <div key={notif.id} className={`group relative overflow-hidden p-8 rounded-[2.5rem] border transition-all hover:scale-[1.01] ${notif.is_read ? 'bg-white/5 border-white/5' : 'bg-indigo-600/10 border-indigo-500/30 shadow-[0_20px_40px_rgba(79,70,229,0.1)]'}`}>
                                                    {!notif.is_read && <div className="absolute inset-0 opacity-10 animate-mesh pointer-events-none"></div>}
                                                    
                                                    <div className="relative z-10 flex items-start gap-8">
                                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl transition-transform group-hover:scale-110 ${notif.is_read ? 'bg-slate-900 border border-white/10 text-slate-500' : 'bg-indigo-600 text-white shadow-indigo-500/40'}`}>
                                                            <Sparkles className="w-7 h-7" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <p className="text-sm font-medium text-white leading-relaxed">
                                                                    <span className="font-black uppercase tracking-tight text-indigo-400 mr-2">{notif.actor_name}</span> {notif.content}
                                                                </p>
                                                                {!notif.is_read && (
                                                                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_#6366f1] animate-pulse"></div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-4">
                                                                <div className="flex items-center gap-2 text-[9px] text-slate-500 font-black uppercase tracking-widest">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    {new Date(notif.created_at).toLocaleDateString()}
                                                                </div>
                                                                <div className="h-[1px] w-6 bg-white/10"></div>
                                                                <div className="text-[8px] text-slate-600 font-black uppercase tracking-[0.2em]">Institutional Pulse Alert</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );

                        case 'messages':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen flex flex-col pb-32 md:pb-0">
                                    <header className="sticky top-0 z-30">
                                        <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-3xl border-b border-white/10 shadow-2xl"></div>
                                        <div className="absolute inset-0 opacity-10 animate-mesh pointer-events-none"></div>
                                        <div className="px-8 py-8 flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                                                    <Mail className="w-6 h-6 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <h2 className="text-2xl font-black uppercase tracking-tight text-white">Secure <span className="text-indigo-400 italic">Inbox</span></h2>
                                                    <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 mt-1">Encrypted Social Infrastructure</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400/60">System Online</span>
                                            </div>
                                        </div>
                                    </header>

                                    <div className="flex-1 flex overflow-hidden">
                                        {/* Conversations List */}
                                        <aside className={`w-full md:w-80 border-r border-white/10 overflow-y-auto no-scrollbar ${activeConversationPartner ? 'hidden md:block' : 'block'} bg-white/5`}>
                                            <div className="p-4 space-y-2">
                                                {allInstitutionMembers.filter(m => m.id !== currentAlumna.id).map(member => (
                                                    <button 
                                                        key={member.id}
                                                        onClick={() => setActiveConversationPartner(member)}
                                                        className={`w-full p-5 rounded-3xl flex items-center gap-4 transition-all ${activeConversationPartner?.id === member.id ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-white/10'}`}
                                                    >
                                                        <div className="relative">
                                                            <div className="w-14 h-14 rounded-2xl bg-white/10 overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800 shadow-sm">
                                                                {member.profilePhotoUrl ? <img src={member.profilePhotoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-slate-300" />}
                                                            </div>
                                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-white dark:border-slate-950 rounded-full"></div>
                                                        </div>
                                                        <div className="text-left flex-1 min-w-0">
                                                            <p className="text-xs font-black text-white uppercase truncate tracking-tight">{member.fullName}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Start Thread</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </aside>

                                        {/* Chat Window */}
                                        <div className={`flex-1 flex flex-col bg-[#020617]/50 ${!activeConversationPartner ? 'hidden md:flex' : 'flex'}`}>
                                            {activeConversationPartner ? (
                                                <>
                                                    <header className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-between">
                                                        <button onClick={() => setActiveConversationPartner(null)} className="md:hidden p-2 text-slate-400 hover:text-indigo-600">
                                                            <ArrowLeft className="w-5 h-5" />
                                                        </button>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden"><img src={activeConversationPartner.profilePhotoUrl} className="w-full h-full object-cover" /></div>
                                                            <h5 className="text-[10px] font-black uppercase tracking-widest">{activeConversationPartner.fullName}</h5>
                                                        </div>
                                                        <div className="w-10"></div>
                                                    </header>
                                                    <div className="flex-1 p-8 overflow-y-auto space-y-6 no-scrollbar scrolling-touch">
                                                        {messages.filter(m => (m.senderId === activeConversationPartner.id && m.recipientId === currentAlumna.id) || (m.senderId === currentAlumna.id && m.recipientId === activeConversationPartner.id)).map(msg => (
                                                            <div key={msg.id} className={`flex ${msg.senderId === currentAlumna.id ? 'justify-end' : 'justify-start'}`}>
                                                                <div className={`max-w-[75%] p-5 rounded-[2.5rem] text-sm font-medium shadow-sm transition-all hover:scale-[1.01] ${msg.senderId === currentAlumna.id ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-500/20' : 'bg-white dark:bg-slate-900 text-white rounded-bl-none border border-slate-100 dark:border-slate-800'}`}>
                                                                    {msg.content}
                                                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-3 opacity-40">
                                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {messages.filter(m => (m.senderId === activeConversationPartner.id && m.recipientId === currentAlumna.id) || (m.senderId === currentAlumna.id && m.recipientId === activeConversationPartner.id)).length === 0 && (
                                                            <div className="h-full flex flex-col items-center justify-center opacity-20">
                                                                <MessageSquare className="w-20 h-20 mb-6" />
                                                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Encryption Initialized</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-8 bg-[#020617]/80 backdrop-blur-xl border-t border-white/10">
                                                        <div className="relative group">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Craft a legacy message..."
                                                                value={newMessage}
                                                                onChange={(e) => setNewMessage(e.target.value)}
                                                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                                                className="w-full h-16 pl-10 pr-20 bg-white/10 border-none rounded-[1.75rem] text-sm font-bold text-white focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner font-display"
                                                            />
                                                            <button 
                                                                onClick={handleSendMessage}
                                                                disabled={!newMessage.trim() || isSendingMessage}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:scale-105 transition-all shadow-xl shadow-indigo-200"
                                                            >
                                                                {isSendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center scrolling-touch">
                                                    <div className="w-24 h-24 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[3rem] flex items-center justify-center text-indigo-600 mb-8 animate-in zoom-in duration-500">
                                                        <MessageSquare className="w-10 h-10" />
                                                    </div>
                                                    <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-3">Secure Network Communications</h3>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.25em] max-w-sm mx-auto leading-relaxed">Select a verified alumna from the sidebar to initialize an encrypted social thread.</p>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </div>
                        );

                        case 'explore':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-8 pb-32 flex flex-col min-h-screen">
                                    <header className="relative px-10 py-16 mb-16 overflow-hidden rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.5)] group">
                                        <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-3xl border border-white/10"></div>
                                        <div className="absolute inset-0 opacity-20 animate-mesh"></div>
                                        <div className="absolute -left-20 -top-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                                        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-rose-600/10 rounded-full blur-[100px] animate-pulse-slow delay-700"></div>

                                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-indigo-500 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                                <div className="relative w-24 h-24 bg-[#020617] border border-white/20 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110 duration-700">
                                                    <Hash className="w-10 h-10 text-indigo-400 group-hover:rotate-12 transition-transform" />
                                                </div>
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
                                                <h2 className="text-5xl font-black uppercase tracking-tighter text-white leading-none">
                                                    Global <span className="text-indigo-400 italic opacity-80">Sync</span>
                                                </h2>
                                                <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.6em]">Encrypted Network Directory</p>
                                                    <div className="h-[1px] w-8 bg-white/10"></div>
                                                    <div className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">{allInstitutionMembers.length} Verified Nodes</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </header>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {allInstitutionMembers.filter(m => {
                                            if (m.id === currentAlumna.id) return false;
                                            if (!exploreSearch) return true;
                                            const q = exploreSearch.toLowerCase();
                                            return (
                                                (m.fullName || m.full_name || '').toLowerCase().includes(q) ||
                                                (m.institutionName || m.institution_name || '').toLowerCase().includes(q) ||
                                                (m.graduationYear || m.graduation_year || '').toString().includes(q) ||
                                                (m.profession || m.currentJob || m.current_job || '').toLowerCase().includes(q)
                                            );
                                        }).map(member => (
                                            <div key={member.id} className="group relative overflow-hidden p-8 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] transition-all hover:scale-[1.02] hover:border-indigo-500/30 shadow-2xl">
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                
                                                <div className="relative z-10 flex items-center gap-8">
                                                    <div className="relative shrink-0">
                                                        <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-rose-500 rounded-[2.25rem] blur opacity-20 group-hover:opacity-60 transition-opacity"></div>
                                                        <div className="relative w-24 h-24 rounded-[2rem] bg-[#020617] border border-white/10 p-1">
                                                            {member.profilePhotoUrl ? (
                                                                <img src={member.profilePhotoUrl} className="w-full h-full object-cover rounded-[1.75rem]" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                                    <User className="w-10 h-10" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-[#020617] rounded-full"></div>
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="text-xl font-black text-white uppercase tracking-tight truncate">{member.fullName}</h3>
                                                            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-4 truncate">
                                                            Class of {member.graduationYear || member.class_year} <span className="text-indigo-400 mx-1">/</span> {member.currentJob || 'Institutional Lead'}
                                                        </p>
                                                        
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => { setActiveConversationPartner(member); setActiveSection('messages'); }}
                                                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
                                                            >
                                                                Establish Link
                                                            </button>
                                                            <button 
                                                                onClick={() => setViewedProfileId(member.id)}
                                                                className="p-2.5 bg-white/5 text-slate-400 rounded-xl hover:text-white hover:bg-white/10 transition-all"
                                                            >
                                                                <User className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );

                        case 'jobs':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                                    <header className="relative px-10 py-12 mb-12 overflow-hidden rounded-b-[4rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                                        <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-2xl border-b border-white/10"></div>
                                        <div className="absolute inset-0 opacity-20 animate-mesh"></div>
                                        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                                        
                                        <div className="relative z-10 flex justify-between items-center">
                                            <div>
                                                <h2 className="text-4xl font-black uppercase tracking-tight text-white leading-none">Legacy <span className="text-indigo-400 italic opacity-80">Board</span></h2>
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mt-4">Exclusive network opportunities</p>
                                            </div>
                                            <button 
                                                onClick={() => setShowPostJobModal(true)}
                                                className="px-8 py-5 bg-indigo-600 text-white rounded-2xl flex items-center gap-4 transition-all hover:scale-105 hover:bg-indigo-500 shadow-2xl active:scale-95 group"
                                            >
                                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Publish Brief</span>
                                            </button>
                                        </div>
                                    </header>

                                    <div className="px-8 space-y-6 pb-32">
                                        {jobs.length === 0 ? (
                                            <div className="py-32 text-center opacity-10">
                                                <Briefcase className="w-20 h-20 mx-auto mb-8" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.5em]">No Opportunities Found</p>
                                            </div>
                                        ) : (
                                            jobs.map(job => (
                                                <div key={job.id} className="group relative overflow-hidden p-8 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] transition-all hover:scale-[1.01] hover:border-indigo-500/30 shadow-2xl">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    
                                                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <h3 className="text-xl font-black text-white uppercase tracking-tight">{job.title}</h3>
                                                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                                                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Verified</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                                <div className="flex items-center gap-2">
                                                                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                                                                    {job.company}
                                                                </div>
                                                                <div className="h-1 w-1 rounded-full bg-slate-700"></div>
                                                                <div className="flex items-center gap-2">
                                                                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                                                                    {job.location}
                                                                </div>
                                                                {job.salary_range && (
                                                                    <>
                                                                        <div className="h-1 w-1 rounded-full bg-slate-700"></div>
                                                                        <div className="flex items-center gap-2 text-emerald-400">
                                                                            <Zap className="w-3.5 h-3.5" />
                                                                            {job.salary_range}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <button 
                                                            onClick={() => job.apply_url && window.open(job.apply_url, '_blank')}
                                                            className="w-full md:w-auto px-10 py-5 bg-white text-indigo-950 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-indigo-600 hover:text-white transition-all shadow-2xl shadow-indigo-500/10 group/btn"
                                                        >
                                                            Access Brief <ArrowRight className="inline-block w-4 h-4 ml-3 group-hover/btn:translate-x-1 transition-transform" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );

                        case 'marketplace':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                                    <header className="relative px-10 py-12 mb-12 overflow-hidden rounded-b-[4rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                                        <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-2xl border-b border-white/10"></div>
                                        <div className="absolute inset-0 opacity-20 animate-mesh"></div>
                                        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-rose-600/10 rounded-full blur-[80px] animate-pulse-slow"></div>

                                        <div className="relative z-10 flex justify-between items-center">
                                            <div>
                                                <h2 className="text-4xl font-black uppercase tracking-tight text-white leading-none">Legacy <span className="text-rose-400 italic opacity-80">Market</span></h2>
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mt-4">Support Alumnae-owned excellence</p>
                                            </div>
                                            <button 
                                                onClick={() => setShowPostBusinessModal(true)}
                                                className="px-8 py-5 bg-rose-600 text-white rounded-2xl flex items-center gap-4 transition-all hover:scale-105 hover:bg-rose-500 shadow-2xl active:scale-95 group"
                                            >
                                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Register Venture</span>
                                            </button>
                                        </div>
                                    </header>

                                    <div className="px-8 grid grid-cols-1 md:grid-cols-2 gap-8 pb-32">
                                        {businesses.length === 0 ? (
                                            <div className="py-32 text-center opacity-10 col-span-full">
                                                <ShoppingBag className="w-20 h-20 mx-auto mb-8" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.5em]">No Ventures Active</p>
                                            </div>
                                        ) : (
                                            businesses.map(biz => (
                                                <div key={biz.id} className="group relative overflow-hidden bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] transition-all hover:scale-[1.02] hover:border-rose-500/30 shadow-2xl">
                                                    <div className="h-64 relative overflow-hidden">
                                                        {biz.logo_url ? (
                                                            <img src={biz.logo_url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                                        ) : (
                                                            <div className="w-full h-full bg-[#020617] flex items-center justify-center text-slate-800">
                                                                <ShoppingBag className="w-16 h-16" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
                                                        
                                                        <div className="absolute top-6 right-6">
                                                            <div className="px-4 py-2 bg-rose-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-2xl">
                                                                Institutional Partner
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-8">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div>
                                                                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2 leading-none group-hover:text-rose-400 transition-colors">{biz.business_name}</h3>
                                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{biz.industry}</p>
                                                            </div>
                                                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-rose-500 shadow-inner group-hover:scale-110 transition-transform">
                                                                <Crown className="w-6 h-6" />
                                                            </div>
                                                        </div>

                                                        {biz.exclusive_discount && (
                                                            <div className="mb-8 p-4 bg-rose-600/10 border border-rose-500/20 rounded-2xl">
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-1">Circle Privilege</p>
                                                                <p className="text-xs text-white font-bold">{biz.exclusive_discount}</p>
                                                            </div>
                                                        )}

                                                        <button 
                                                            onClick={() => biz.website_url && window.open(biz.website_url, '_blank')} 
                                                            className="w-full py-5 bg-[#020617] text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-rose-600 hover:border-rose-600 transition-all shadow-2xl group/btn"
                                                        >
                                                            Visit Headquarters <ArrowRight className="inline-block w-4 h-4 ml-3 group-hover/btn:translate-x-1 transition-transform" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );

                        case 'mentorship':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                                    <header className="relative px-10 py-16 mb-16 overflow-hidden rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.5)] group">
                                        <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-3xl border border-white/10"></div>
                                        <div className="absolute inset-0 opacity-20 animate-mesh"></div>
                                        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                                        
                                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-indigo-500 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                                <div className="relative w-24 h-24 bg-[#020617] border border-white/20 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110 duration-700">
                                                    <Zap className="w-10 h-10 text-indigo-400 group-hover:rotate-12 transition-transform" />
                                                </div>
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
                                                <h2 className="text-4xl font-black uppercase tracking-tight text-white leading-none">Legacy <span className="text-indigo-400 italic opacity-80">Mentors</span></h2>
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mt-4">Connecting experience with ambition</p>
                                            </div>
                                        </div>
                                    </header>

                                    <div className="px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 pb-32">
                                        {alumnaeMembers.filter(m => m.isMentorAvailable || m.is_mentor_available).length === 0 ? (
                                            <div className="py-32 text-center opacity-10 col-span-full">
                                                <Zap className="w-20 h-20 mx-auto mb-8" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.5em]">No Mentors Active</p>
                                            </div>
                                        ) : (
                                            alumnaeMembers.filter(m => (m.isMentorAvailable || m.is_mentor_available) && m.id !== currentAlumna.id).map(mentor => (
                                                <div key={mentor.id} className="group relative overflow-hidden p-8 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] transition-all hover:scale-[1.02] hover:border-indigo-500/30 shadow-2xl">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    
                                                    <div className="relative z-10 flex items-center gap-8">
                                                        <div className="relative shrink-0">
                                                            <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-rose-500 rounded-[2.25rem] blur opacity-20 group-hover:opacity-60 transition-opacity"></div>
                                                            <div className="relative w-24 h-24 rounded-[2rem] bg-[#020617] border border-white/10 p-1">
                                                                {mentor.profilePhotoUrl ? (
                                                                    <img src={mentor.profilePhotoUrl} className="w-full h-full object-cover rounded-[1.75rem]" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                                        <User className="w-10 h-10" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-[#020617] rounded-full animate-pulse"></div>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="text-xl font-black text-white uppercase tracking-tight truncate">{mentor.fullName}</h3>
                                                                <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full">
                                                                    <span className="text-[7px] font-black uppercase tracking-widest text-indigo-400">Mentor</span>
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-4 truncate">
                                                                {mentor.currentJob} <span className="text-indigo-400 mx-1">@</span> {mentor.currentCompany}
                                                            </p>
                                                            
                                                            <button 
                                                                onClick={() => { setActiveConversationPartner(mentor); setActiveSection('messages'); }}
                                                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 group/btn"
                                                            >
                                                                <MessageSquare className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                                                Request Guidance
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );

                        case 'management':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                                    <header className="relative px-10 py-12 mb-12 overflow-hidden rounded-b-[4rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                                        <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-2xl"></div>
                                        <div className="absolute inset-0 opacity-20 animate-mesh"></div>
                                        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
                                            <ShieldCheck className="w-48 h-48 text-indigo-500" />
                                        </div>
                                        
                                        <div className="relative z-10">
                                            <h2 className="text-4xl font-black uppercase tracking-tight text-white leading-none">School <span className="text-indigo-400 italic opacity-80">Control</span></h2>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mt-4">Administrative Delegation Infrastructure</p>
                                        </div>
                                    </header>

                                    <div className="px-6 space-y-8">
                                        {/* Add Member Button/Form */}
                                        {(currentAlumna.isSuperAdmin || schoolTeam.find(t => (t.member_id || t.memberId) === currentAlumna.id)?.role === 'Admin') && (
                                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-xl">
                                                {!isAddingTeamMember ? (
                                                    <button 
                                                        onClick={() => setIsAddingTeamMember(true)}
                                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-3"
                                                    >
                                                        <Plus className="w-4 h-4" /> Add Team Member
                                                    </button>
                                                ) : (
                                                    <div className="space-y-6">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">New Delegate</h4>
                                                            <button onClick={() => setIsAddingTeamMember(false)} className="text-slate-400 hover:text-rose-500 transition-all"><X className="w-4 h-4" /></button>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">Member Email</label>
                                                                <input 
                                                                    type="email" 
                                                                    value={newTeamMemberEmail}
                                                                    onChange={e => setNewTeamMemberEmail(e.target.value)}
                                                                    placeholder="member@email.com"
                                                                    className="w-full bg-white/10 border-none rounded-xl h-12 px-4 text-[10px] font-bold uppercase tracking-widest text-white focus:ring-2 ring-indigo-500"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">Assignment Role</label>
                                                                <select 
                                                                    value={newTeamMemberRole}
                                                                    onChange={e => setNewTeamMemberRole(e.target.value as any)}
                                                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4 text-[10px] font-bold uppercase tracking-widest focus:ring-2 ring-indigo-500"
                                                                >
                                                                    <option value="Admin">Admin (Full Control)</option>
                                                                    <option value="Moderator">Moderator (Feed & Comments)</option>
                                                                    <option value="Editor">Editor (Stories & Events)</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={handleAddTeamMember}
                                                            disabled={isSavingTeamMember || !newTeamMemberEmail}
                                                            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                                                        >
                                                            {isSavingTeamMember ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Delegation'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Team List */}
                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4 mb-4">Active Management Team</h3>
                                            
                                            {isTeamLoading ? (
                                                <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500" /></div>
                                            ) : schoolTeam.length === 0 ? (
                                                <div className="py-20 text-center opacity-20">
                                                    <ShieldCheck className="w-16 h-16 mx-auto mb-6" />
                                                    <p className="text-xs font-black uppercase tracking-[0.3em]">No delegates assigned yet.</p>
                                                </div>
                                            ) : (
                                                schoolTeam.map(member => (
                                                    <div key={member.id} className="bg-white/5 border border-white/10">
                                                        <div className="w-16 h-16 rounded-2xl bg-white/10 overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800 shadow-sm relative">
                                                            {member.profilePhotoUrl ? <img src={member.profilePhotoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-slate-300" />}
                                                            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${member.role === 'Admin' ? 'bg-amber-400' : member.role === 'Moderator' ? 'bg-indigo-400' : 'bg-emerald-400'}`}></div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-sm font-black text-white uppercase tracking-tight">{member.fullName}</h4>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">{member.email}</p>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                                    member.role === 'Admin' ? 'bg-amber-100 text-amber-600' : 
                                                                    member.role === 'Moderator' ? 'bg-indigo-100 text-indigo-600' : 
                                                                    'bg-emerald-100 text-emerald-600'
                                                                }`}>
                                                                    {member.role}
                                                                </span>
                                                                <span className="text-[8px] text-slate-300 font-bold uppercase tracking-widest italic">Since {new Date(member.created_at || member.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        {(currentAlumna.isSuperAdmin || (schoolTeam.find(t => (t.member_id || t.memberId) === currentAlumna.id)?.role === 'Admin' && member.member_id !== currentAlumna.id)) && (
                                                            <button 
                                                                onClick={() => handleRemoveTeamMember(member.id)}
                                                                className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );

                        case 'groups':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                                    <header className="relative px-10 py-16 mb-16 overflow-hidden rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.5)] group">
                                        <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-3xl border border-white/10"></div>
                                        <div className="absolute inset-0 opacity-20 animate-mesh"></div>
                                        <div className="absolute -left-20 -top-20 w-80 h-80 bg-emerald-600/10 rounded-full blur-[80px] animate-pulse-slow"></div>

                                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-emerald-500 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                                <div className="relative w-24 h-24 bg-[#020617] border border-white/20 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110 duration-700">
                                                    <Globe className="w-10 h-10 text-emerald-400 group-hover:rotate-12 transition-transform" />
                                                </div>
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
                                                <h2 className="text-4xl font-black uppercase tracking-tight text-white leading-none">Interest <span className="text-emerald-400 italic opacity-80">Circles</span></h2>
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mt-4">Connect through shared passions</p>
                                            </div>
                                        </div>
                                    </header>

                                    <div className="px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
                                        {groups.length === 0 ? (
                                            <div className="py-32 text-center opacity-10 col-span-full">
                                                <Globe className="w-20 h-20 mx-auto mb-8" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.5em]">No Circles Active</p>
                                            </div>
                                        ) : (
                                            groups.map(group => (
                                                <div key={group.id} className="group relative overflow-hidden bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] transition-all hover:scale-[1.02] hover:border-emerald-500/30 shadow-2xl">
                                                    <div className="h-48 relative overflow-hidden">
                                                        {group.image_url ? (
                                                            <img src={group.image_url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                                        ) : (
                                                            <div className="w-full h-full bg-[#020617] flex items-center justify-center text-slate-800">
                                                                <Globe className="w-12 h-12" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
                                                        
                                                        <div className="absolute top-6 left-6">
                                                            <div className="px-4 py-1.5 bg-emerald-600/20 backdrop-blur-md border border-emerald-500/30 rounded-full text-[8px] font-black uppercase tracking-widest text-emerald-400">
                                                                {group.category}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-8">
                                                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6 leading-tight group-hover:text-emerald-400 transition-colors">{group.name}</h3>
                                                        <button className="w-full py-4 bg-white text-[#020617] rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-emerald-600 hover:text-white transition-all shadow-2xl active:scale-95">
                                                            Join Circle
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );

                        case 'feed':
                        default:
                            return (
                                <>
                                    {/* Success Story Spotlight */}
                                    {successStories.filter(s => s.is_featured).length > 0 && (
                                        <div className="px-8 pt-8">
                                            <div className="relative group rounded-[3.5rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.5)] border border-white/10">
                                                <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-3xl"></div>
                                                <div className="absolute inset-0 opacity-40 animate-mesh"></div>
                                                <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-600/30 rounded-full blur-[100px] animate-pulse-slow"></div>
                                                <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 scale-150 transition-transform group-hover:scale-[1.8] group-hover:rotate-45 duration-1000">
                                                    <Sparkles className="w-48 h-48 text-indigo-400" />
                                                </div>
                                                
                                                <div className="relative z-10 p-12 flex flex-col md:flex-row gap-12 items-center text-center md:text-left">
                                                    <div className="relative shrink-0">
                                                        <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 rounded-[2.8rem] opacity-30 animate-pulse group-hover:opacity-100 transition-opacity duration-1000"></div>
                                                        <div className="w-40 h-40 rounded-[2.5rem] bg-slate-900 border-4 border-white/10 p-1 relative z-10 overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-700">
                                                            <img src={successStories.find(s => s.is_featured).image_url} className="w-full h-full object-cover rounded-[2.1rem]" />
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                                                            <div className="px-4 py-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded-full">
                                                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-300">Legacy Spotlight</p>
                                                            </div>
                                                            <div className="h-1 w-12 bg-white/10 rounded-full"></div>
                                                        </div>
                                                        <h3 className="text-4xl font-black uppercase tracking-tight mb-6 text-white leading-[1.1]">{successStories.find(s => s.is_featured).title}</h3>
                                                        <p className="text-sm text-slate-300/80 font-medium leading-relaxed mb-10 line-clamp-3 max-w-2xl">{successStories.find(s => s.is_featured).content}</p>
                                                        <button className="px-10 py-5 bg-white text-indigo-950 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-indigo-400 hover:text-white transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:shadow-indigo-500/40 active:scale-95">Read Full Narrative</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Header Tabs */}
                                    {/* Redesigned High-Fidelity Pulse Header */}
                                    <header className="sticky top-0 z-40">
                                        {/* Glassmorphic Base with Mesh Background Overlay */}
                                        <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-3xl border-b border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"></div>
                                        <div className="absolute inset-0 opacity-20 animate-mesh pointer-events-none"></div>
                                        
                                        <div className="px-8 py-10 flex justify-between items-center relative overflow-hidden z-10">
                                            {/* Advanced Decorative Background Glows */}
                                            <div className="absolute -left-20 -top-20 w-60 h-60 bg-indigo-600/30 rounded-full blur-[100px] animate-pulse-slow"></div>
                                            <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-rose-600/20 rounded-full blur-[100px] animate-pulse-slow delay-700"></div>
                                            
                                            <div className="flex items-center gap-8 relative z-10">
                                                {/* Hyper-Dynamic Logo Infrastructure */}
                                                <div className="relative group">
                                                    <div className="absolute inset-0 bg-indigo-600 rounded-[2rem] blur-2xl opacity-40 animate-pulse group-hover:opacity-80 transition-opacity duration-700"></div>
                                                    <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 rounded-[2.25rem] opacity-20 group-hover:opacity-100 animate-spin-slow transition-opacity duration-1000"></div>
                                                    
                                                    <div className="relative w-16 h-16 bg-[#020617] border border-white/20 rounded-[2rem] flex items-center justify-center text-white shrink-0 shadow-2xl transition-transform group-hover:scale-110 duration-700">
                                                        <div className="absolute inset-0 bg-indigo-600/10 rounded-[2rem] animate-pulse"></div>
                                                        <Atom className="w-9 h-9 text-indigo-400 animate-spin-slow" />
                                                        
                                                        {/* Status Orbital */}
                                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#020617] border border-white/10 rounded-full flex items-center justify-center shadow-lg">
                                                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                                                            <div className="absolute w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <h2 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">
                                                            EduAI <span className="relative inline-block">
                                                                <span className="bg-gradient-to-r from-indigo-400 via-white to-rose-400 bg-clip-text text-transparent italic drop-shadow-[0_0_15px_rgba(129,140,248,0.6)]">Pulse</span>
                                                                <div className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
                                                            </span>
                                                        </h2>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-4 mt-3">
                                                        <div 
                                                            className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-[0.4em] text-indigo-300 shadow-inner"
                                                            style={{ textShadow: '0 0 10px rgba(99,102,241,0.4)' }}
                                                        >
                                                            {currentAlumna.institutionName || currentAlumna.schoolName || 'Global Network'}
                                                        </div>
                                                        <div className="h-[1px] w-6 bg-white/10"></div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400/80">Active Infrastructure</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-4 relative z-10">
                                                {otherMemberships.length > 0 && (
                                                    <button 
                                                        onClick={() => setShowSwitcher(true)}
                                                        className="p-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-[1.25rem] transition-all hover:scale-105 active:scale-95 group"
                                                    >
                                                        <Repeat2 className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={onBack} 
                                                    className="p-4 bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/20 rounded-[1.25rem] transition-all hover:scale-105 active:scale-95 group"
                                                >
                                                   <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Premium Tab Navigation */}
                                        <div className="flex px-6 bg-black/20 backdrop-blur-md border-t border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
                                            {[
                                                { id: 'for-you', label: 'Global Circle', icon: Globe },
                                                { id: 'my-schools', label: 'Institutional', icon: Building2 }
                                            ].map((tab) => (
                                                <button 
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id as any)}
                                                    className={`group relative flex-1 min-w-[160px] py-6 flex items-center justify-center gap-3 transition-all duration-500 ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    <tab.icon className={`w-4 h-4 transition-transform duration-500 ${activeTab === tab.id ? 'scale-110 text-indigo-400' : 'group-hover:scale-110'}`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === tab.id ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                                                        {tab.label}
                                                    </span>
                                                    
                                                    {/* Active Indicator Infrastructure */}
                                                    {activeTab === tab.id && (
                                                        <>
                                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_20px_rgba(99,102,241,0.8)] animate-in fade-in slide-in-from-bottom-2"></div>
                                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full blur-[2px] animate-pulse"></div>
                                                        </>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </header>

                                    {/* Feed Content */}
                                    <div className="pb-32 divide-y divide-slate-100 dark:divide-slate-900">
                                        {/* Post Composer */}
                                        <div className="p-4 md:p-10 relative">
                                            <div className="absolute inset-0 bg-[#020617]/40 backdrop-blur-3xl border-y border-white/5 shadow-2xl pointer-events-none"></div>
                                            
                                            <div className="relative z-10 flex gap-6 md:gap-8 max-w-5xl mx-auto">
                                                <div className="relative group shrink-0 hidden sm:block">
                                                    <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-rose-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                                    <div className="w-16 h-16 rounded-3xl bg-[#020617] border border-white/10 p-1 relative z-10 shadow-2xl">
                                                        {currentAlumna.profilePhotoUrl ? <img src={currentAlumna.profilePhotoUrl} className="w-full h-full object-cover rounded-2xl" /> : <User className="w-full h-full p-4 text-slate-500" />}
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-[#020617] rounded-full animate-pulse"></div>
                                                </div>
                                                
                                                <div className="flex-1 space-y-8">
                                                    <div className="relative group/input">
                                                        <div className="absolute -inset-4 bg-white/5 rounded-[2.5rem] opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500"></div>
                                                        <textarea 
                                                            placeholder="Broadcast your institutional legacy..."
                                                            value={newPostContent}
                                                            onChange={(e) => setNewPostContent(e.target.value)}
                                                            className="relative w-full bg-transparent border-none focus:ring-0 text-xl md:text-2xl font-black placeholder:text-slate-600 resize-none min-h-[140px] md:min-h-[160px] text-white font-display px-0 uppercase tracking-tight leading-snug"
                                                        />
                                                    </div>
                                                    
                                                    {postImagePreview && (
                                                        <div className="relative rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.4)] group/preview animate-in zoom-in-95 duration-500">
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity duration-500"></div>
                                                            <img src={postImagePreview} className="w-full h-full object-cover max-h-[500px]" />
                                                            <button 
                                                                onClick={() => { setPostImageFile(null); setPostImagePreview(null); }}
                                                                className="absolute top-8 right-8 p-4 bg-black/40 hover:bg-rose-500 text-white rounded-full backdrop-blur-xl transition-all shadow-2xl active:scale-90"
                                                            >
                                                                <X className="w-6 h-6" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {postVideoPreview && (
                                                        <div className="relative rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.4)] group/preview animate-in zoom-in-95 duration-500">
                                                            <video src={postVideoPreview} controls className="w-full h-full object-cover max-h-[500px]" />
                                                            <button 
                                                                onClick={() => { setPostVideoFile(null); setPostVideoPreview(null); }}
                                                                className="absolute top-8 right-8 p-4 bg-black/40 hover:bg-rose-500 text-white rounded-full backdrop-blur-xl transition-all shadow-2xl z-10 active:scale-90"
                                                            >
                                                                <X className="w-6 h-6" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-white/5 relative z-10">
                                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                                            <button 
                                                                onClick={() => document.getElementById('post-media-upload-main')?.click()} 
                                                                className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 border border-white/5 hover:border-indigo-500/30 rounded-2xl transition-all group shrink-0 active:scale-95"
                                                            >
                                                                <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Media Hub</span>
                                                                <input 
                                                                    type="file" 
                                                                    id="post-media-upload-main" 
                                                                    className="hidden" 
                                                                    accept="image/*,video/*" 
                                                                    onChange={(e) => { 
                                                                        const file = e.target.files?.[0]; 
                                                                        if (file) { 
                                                                            if (file.type.startsWith('image/')) {
                                                                                setPostImageFile(file); 
                                                                                setPostImagePreview(URL.createObjectURL(file)); 
                                                                                setPostVideoFile(null); 
                                                                                setPostVideoPreview(null); 
                                                                            } else if (file.type.startsWith('video/')) {
                                                                                setPostVideoFile(file);
                                                                                setPostVideoPreview(URL.createObjectURL(file));
                                                                                setPostImageFile(null);
                                                                                setPostImagePreview(null);
                                                                            }
                                                                        } 
                                                                    }} 
                                                                />
                                                            </button>

                                                            {groups.length > 0 && (
                                                                <div className="relative group/select">
                                                                    <select 
                                                                        value={selectedGroupId || ''} 
                                                                        onChange={(e) => setSelectedGroupId(e.target.value || null)}
                                                                        className="appearance-none bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/10 focus:ring-2 focus:ring-indigo-600 transition-all cursor-pointer h-[56px] px-8 pr-12 min-w-[200px]"
                                                                    >
                                                                        <option value="">Global Broadcast</option>
                                                                        {groups.map(g => (
                                                                            <option key={g.id} value={g.id}>{g.name}</option>
                                                                        ))}
                                                                    </select>
                                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 group-hover/select:text-indigo-400 transition-colors">
                                                                        <ChevronDown className="w-4 h-4" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <button 
                                                            onClick={handleCreatePost}
                                                            disabled={(!newPostContent.trim() && !postImageFile && !postVideoFile) || isPosting}
                                                            className="w-full sm:w-auto relative group/broadcast overflow-hidden px-12 py-5 bg-indigo-600 text-white rounded-[1.5rem] shadow-[0_20px_40px_rgba(79,70,229,0.3)] disabled:opacity-20 transition-all active:scale-95"
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/broadcast:translate-x-full transition-transform duration-1000"></div>
                                                            <div className="relative flex items-center justify-center gap-4">
                                                                {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover/broadcast:translate-x-1 group-hover/broadcast:-translate-y-1 transition-transform" />} 
                                                                <span className="text-[11px] font-black uppercase tracking-[0.4em]">Initialize Broadcast</span>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/30 dark:bg-slate-950/30">
                                            {loadingPosts ? (
                                                <div className="p-32 text-center">
                                                    <div className="relative inline-block">
                                                        <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                                                        <Atom className="absolute inset-0 m-auto w-6 h-6 text-indigo-600 animate-pulse" />
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] mt-8 animate-pulse">Syncing Pulse infrastructure...</p>
                                                </div>
                                            ) : posts.length === 0 ? (
                                                <div className="p-32 text-center opacity-20">
                                                    <Hash className="w-20 h-20 mx-auto mb-6" />
                                                    <p className="text-sm font-black uppercase tracking-[0.4em]">Quiet on the network.</p>
                                                </div>
                                            ) : posts.map((post) => (
                                                <div key={post.id} className="p-8 hover:bg-white dark:hover:bg-slate-900 transition-all group/post">
                                                    <div className="flex gap-6">
                                                        <div 
                                                            className="w-14 h-14 rounded-2xl bg-white/10 overflow-hidden shrink-0 cursor-pointer shadow-sm group-hover/post:scale-105 transition-transform" 
                                                            onClick={post.authorId ? () => setViewedProfileId(post.authorId) : undefined}
                                                        >
                                                            {post.authorPhoto ? <img src={post.authorPhoto} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-slate-300" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <span 
                                                                    className="font-black text-white uppercase tracking-tight text-lg cursor-pointer hover:text-indigo-600 transition-colors" 
                                                                    onClick={post.authorId ? () => setViewedProfileId(post.authorId) : undefined}
                                                                >
                                                                    {post.authorName}
                                                                </span>
                                                                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                                                {post.groupName && (
                                                                    <div className="flex items-center gap-2 px-3 py-1 bg-white/10 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                                                        <Globe className="w-3 h-3 text-indigo-500" />
                                                                        {post.groupName}
                                                                    </div>
                                                                )}
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base mb-6 font-medium">{post.content}</p>
                                                            {post.photoUrl && (
                                                                <div 
                                                                    className="mb-6 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 cursor-zoom-in shadow-xl hover:shadow-2xl transition-all duration-500" 
                                                                    onClick={() => setZoomedImage(post.photoUrl || null)}
                                                                >
                                                                    <img src={post.photoUrl} className="w-full max-h-[500px] object-cover group-hover/post:scale-[1.02] transition-transform duration-1000" />
                                                                </div>
                                                            )}
                                                            {post.videoUrl && (
                                                                <div className="mb-6 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xl">
                                                                    <video 
                                                                        src={post.videoUrl} 
                                                                        controls 
                                                                        className="w-full max-h-[500px] object-cover"
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="flex items-center justify-between max-w-sm ml-[-8px]">
                                                                <button 
                                                                    onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)} 
                                                                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${selectedPost?.id === post.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-400'}`}
                                                                >
                                                                    <MessageSquare className="w-5 h-5" />
                                                                    <span className="text-xs font-black">{(comments[post.id]?.length || post.commentsCount || 0)}</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleLike(post.id)} 
                                                                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${currentAlumna && (post.likes || []).includes(currentAlumna.id) ? 'bg-rose-500/10 text-rose-400' : 'text-slate-400 hover:bg-rose-500/10 hover:text-rose-400'}`}
                                                                >
                                                                    <Heart className={`w-5 h-5 ${currentAlumna && (post.likes || []).includes(currentAlumna.id) ? 'fill-current' : ''}`} />
                                                                    <span className="text-xs font-black">{(post.likes || []).length}</span>
                                                                </button>
                                                                <button onClick={() => handleSharePost(post)} className="p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all">
                                                                    <Share2 className="w-5 h-5" />
                                                                </button>
                                                            </div>

                                                            {selectedPost?.id === post.id && (
                                                                <div className="mt-8 pt-8 border-t border-white/5 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                                                    <div className="space-y-6 max-h-96 overflow-y-auto no-scrollbar pr-4">
                                                                        {(comments[post.id] || []).map((comment) => (
                                                                            <div key={comment.id} className="flex gap-4 group/comment">
                                                                                <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-50">
                                                                                    {comment.authorPhoto ? <img src={comment.authorPhoto} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-300" />}
                                                                                </div>
                                                                                <div className="bg-white/5 rounded-[1.75rem] px-6 py-4 flex-1 shadow-sm group-hover/comment:bg-white/10 transition-colors">
                                                                                    <div className="flex justify-between items-center mb-1">
                                                                                        <p className="text-[10px] font-black uppercase text-indigo-600 tracking-tight">{comment.authorName}</p>
                                                                                        <span className="text-[8px] text-slate-400 font-bold uppercase">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                    </div>
                                                                                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{comment.content}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        {(comments[post.id] || []).length === 0 && (
                                                                            <p className="text-[10px] font-black uppercase text-slate-400 text-center py-4 tracking-widest opacity-30">No replies yet. Be the first to spark legacy.</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex gap-4 items-center">
                                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0 overflow-hidden"><img src={currentAlumna.profilePhotoUrl} className="w-full h-full object-cover" /></div>
                                                                        <div className="relative flex-1">
                                                                            <input 
                                                                                type="text" 
                                                                                placeholder="Share your thoughts..." 
                                                                                value={commentInputs[post.id] || ''}
                                                                                onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                                                className="w-full h-14 pl-6 pr-16 bg-white/5 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-600 transition-all font-display"
                                                                                onKeyDown={(e) => { 
                                                                                    if (e.key === 'Enter' && commentInputs[post.id]?.trim()) { 
                                                                                        handleAddComment(post.id, commentInputs[post.id]); 
                                                                                        setCommentInputs(prev => ({ ...prev, [post.id]: '' }));
                                                                                    } 
                                                                                }}
                                                                            />
                                                                            <button 
                                                                                onClick={() => {
                                                                                    if (commentInputs[post.id]?.trim()) {
                                                                                        handleAddComment(post.id, commentInputs[post.id]);
                                                                                        setCommentInputs(prev => ({ ...prev, [post.id]: '' }));
                                                                                    }
                                                                                }}
                                                                                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 hover:scale-105 transition-all"
                                                                            >
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
                                    </div>
                                </>
                            );
                    }
                })()}
            </main>

            {/* Right Sidebar - Recommendations (Hidden on mobile) */}
            <aside className="hidden lg:block w-80 p-6 sticky top-0 h-screen overflow-y-auto no-scrollbar relative z-10 bg-[#020617]/50 backdrop-blur-xl border-l border-white/5">
                <div className="space-y-8">
                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Explore Network..." 
                            value={exploreSearch}
                            onChange={(e) => {
                                setExploreSearch(e.target.value);
                                if (activeTab !== 'explore') setActiveTab('explore');
                            }}
                            className="w-full h-14 pl-14 pr-8 bg-slate-100 dark:bg-slate-900 border-none rounded-[1.75rem] text-xs font-bold focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner"
                        />
                    </div>

                    {/* My Circles */}
                    <div className="bg-white/5 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/20">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center justify-between">
                            Verified Circles
                            <button onClick={() => setShowSwitcher(true)} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-colors">
                                <Repeat2 className="w-4 h-4" />
                            </button>
                        </h3>
                        <div className="space-y-6">
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
                                        className={`flex items-center justify-between group cursor-pointer p-3 rounded-2xl transition-all ${isActive ? 'bg-white dark:bg-slate-800 shadow-lg ring-1 ring-slate-100 dark:ring-slate-700' : 'hover:bg-slate-100'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all ${isActive ? 'bg-indigo-600 text-white animate-pulse-slow' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                                                {inst!.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className={`text-[11px] font-black uppercase tracking-tight truncate max-w-[140px] ${isActive ? 'text-indigo-600' : 'text-white'}`}>{inst!.name}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{isActive ? 'Current' : 'Social Circle'}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Trending Metrics */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Pulse Highlights</h3>
                        <div className="space-y-8">
                            {[
                                { tag: '#ClassOf' + currentAlumna.graduationYear, stats: '342 Members online' },
                                { tag: '#ImpactDay', stats: '2.4k contributions' },
                                { tag: '#LegacyNetworking', stats: '890 active threads' }
                            ].map((topic, idx) => (
                                <div key={topic.tag} className="group cursor-pointer">
                                    <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></div>
                                        {topic.stats}
                                    </div>
                                    <p className="text-base font-black text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{topic.tag}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Featured Members Showcase */}
                    {featuredMembers.length > 0 && (
                        <div className="bg-indigo-600 rounded-[3rem] p-8 text-white shadow-2xl shadow-indigo-200 dark:shadow-none overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12 transition-transform group-hover:scale-110"><Sparkles className="w-32 h-32" /></div>
                            <h3 className="text-sm font-black uppercase tracking-widest mb-10 flex items-center gap-3 relative z-10">
                                <div className="p-2 bg-white/20 rounded-xl"><Sparkles className="w-4 h-4" /></div>
                                Merit Spotlight
                            </h3>
                            <div className="space-y-8 relative z-10">
                                {featuredMembers.map((member) => (
                                    <div key={member.id} className="flex items-center gap-5 p-3 rounded-3xl hover:bg-white/10 transition-all cursor-pointer" onClick={() => member.id && setViewedProfileId(member.id)}>
                                        <div className="w-14 h-14 rounded-2xl bg-white/20 p-1 ring-2 ring-white/50">
                                            {member.profilePhotoUrl ? <img src={member.profilePhotoUrl} className="w-full h-full object-cover rounded-xl" /> : <User className="w-full h-full p-2 text-white/50" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black uppercase truncate tracking-tight">{member.fullName}</p>
                                            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mt-1 truncate">{member.currentJob} at {member.currentCompany}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Mobile Bottom Navigation - High Fidelity Thumb Reach Interactivity */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 h-20 bg-[#020617]/90 backdrop-blur-3xl border-t border-white/10 flex items-center justify-around px-4 z-[60] pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {[
                    { icon: Home, label: 'Pulse', section: 'feed' },
                    { icon: Users, label: 'Circle', section: 'classmates' },
                    { icon: Hash, label: 'Net', section: 'explore' },
                    { icon: MessageSquare, label: 'Inbox', section: 'messages' },
                    { icon: MoreHorizontal, label: 'More', onClick: () => setShowMoreMobileMenu(!showMoreMobileMenu) }
                ].map((item, idx) => (
                    <button 
                        key={idx} 
                        onClick={item.onClick || (() => { setActiveSection(item.section as any); setShowMoreMobileMenu(false); })}
                        className={`flex flex-col items-center justify-center gap-2 transition-all flex-1 h-full relative group ${activeSection === item.section ? 'text-indigo-500' : 'text-slate-400'}`}
                    >
                        <div className={`p-2.5 rounded-2xl transition-all relative ${activeSection === item.section ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] scale-110' : 'group-hover:bg-slate-50 dark:group-hover:bg-slate-900'}`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                        {activeSection === item.section && (
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,1)]"></div>
                        )}
                    </button>
                ))}

                {/* Mobile More Popover */}
                {showMoreMobileMenu && (
                    <div className="absolute bottom-24 right-4 w-56 bg-[#020617]/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/10 p-4 animate-in slide-in-from-bottom-5 duration-300 z-[70]">
                        <div className="space-y-2">
                            <button 
                                onClick={() => { setActiveSection('notifications'); setShowMoreMobileMenu(false); }}
                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                <Bell className="w-5 h-5 text-indigo-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Pulse Alerts</span>
                            </button>
                            <button 
                                onClick={() => { setActiveSection('funding' as any); setShowMoreMobileMenu(false); }}
                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                <Sparkles className="w-5 h-5 text-indigo-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Funding</span>
                            </button>
                            <button 
                                onClick={() => { setActiveSection('jobs'); setShowMoreMobileMenu(false); }}
                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                <Briefcase className="w-5 h-5 text-indigo-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Jobs</span>
                            </button>
                            <button 
                                onClick={() => { setActiveSection('marketplace'); setShowMoreMobileMenu(false); }}
                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                <ShoppingBag className="w-5 h-5 text-indigo-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Marketplace</span>
                            </button>
                            <button 
                                onClick={() => { setActiveSection('support' as any); setShowMoreMobileMenu(false); }}
                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                <Building2 className="w-5 h-5 text-indigo-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Support</span>
                            </button>
                            <button 
                                onClick={() => { setIsEditingProfile(true); setShowMoreMobileMenu(false); }}
                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-t border-slate-50 dark:border-slate-800 mt-2 pt-4"
                            >
                                <User className="w-5 h-5 text-indigo-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Profile Identity</span>
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Overlays & Modals */}
            
            {/* Post Job Modal */}
            {showPostJobModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-xl bg-white/5 backdrop-blur-3xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/10">
                        <header className="p-8 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">Post <span className="text-indigo-600 italic">Opportunity</span></h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1">Hire excellence from the network</p>
                            </div>
                            <button onClick={() => setShowPostJobModal(false)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </header>
                        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Job Title</label>
                                <input 
                                    type="text" 
                                    value={jobData.title}
                                    onChange={(e) => setJobData({...jobData, title: e.target.value})}
                                    placeholder="e.g. Senior Software Engineer"
                                    className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Company</label>
                                    <input 
                                        type="text" 
                                        value={jobData.company}
                                        onChange={(e) => setJobData({...jobData, company: e.target.value})}
                                        placeholder="Company Name"
                                        className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Location</label>
                                    <input 
                                        type="text" 
                                        value={jobData.location}
                                        onChange={(e) => setJobData({...jobData, location: e.target.value})}
                                        placeholder="e.g. Nairobi, Remote"
                                        className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Job Description</label>
                                <textarea 
                                    value={jobData.description}
                                    onChange={(e) => setJobData({...jobData, description: e.target.value})}
                                    placeholder="Describe the role and requirements..."
                                    className="w-full h-32 p-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Salary Range</label>
                                    <input 
                                        type="text" 
                                        value={jobData.salaryRange}
                                        onChange={(e) => setJobData({...jobData, salaryRange: e.target.value})}
                                        placeholder="e.g. 150k - 200k"
                                        className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Application URL/Email</label>
                                    <input 
                                        type="text" 
                                        value={jobData.applyUrl}
                                        onChange={(e) => setJobData({...jobData, applyUrl: e.target.value})}
                                        placeholder="Link or email"
                                        className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 dark:bg-slate-950/50">
                            <button 
                                onClick={handlePostJob}
                                disabled={isSavingJob}
                                className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-xl shadow-indigo-200"
                            >
                                {isSavingJob ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                Publish Opportunity
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Post Business Modal */}
            {showPostBusinessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-xl bg-white/5 backdrop-blur-3xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/10">
                        <header className="p-8 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight text-rose-500">Legacy <span className="italic">Business</span></h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1">Promote your brand to the circle</p>
                            </div>
                            <button onClick={() => setShowPostBusinessModal(false)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </header>
                        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center relative overflow-hidden group border-2 border-dashed border-slate-200">
                                    {businessLogoFile ? (
                                        <img src={URL.createObjectURL(businessLogoFile)} className="w-full h-full object-cover" />
                                    ) : (
                                        <ShoppingBag className="w-8 h-8 text-slate-300" />
                                    )}
                                    <label className="absolute inset-0 bg-rose-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-all">
                                        <Plus className="w-6 h-6" />
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => setBusinessLogoFile(e.target.files?.[0] || null)} />
                                    </label>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Business Name</label>
                                    <input 
                                        type="text" 
                                        value={businessData.businessName}
                                        onChange={(e) => setBusinessData({...businessData, businessName: e.target.value})}
                                        className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Industry</label>
                                    <input 
                                        type="text" 
                                        value={businessData.industry}
                                        onChange={(e) => setBusinessData({...businessData, industry: e.target.value})}
                                        placeholder="e.g. Tech, Fashion"
                                        className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Website URL</label>
                                    <input 
                                        type="text" 
                                        value={businessData.websiteUrl}
                                        onChange={(e) => setBusinessData({...businessData, websiteUrl: e.target.value})}
                                        className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Description</label>
                                <textarea 
                                    value={businessData.description}
                                    onChange={(e) => setBusinessData({...businessData, description: e.target.value})}
                                    className="w-full h-24 p-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500 resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Exclusive Alumnae Discount</label>
                                <input 
                                    type="text" 
                                    value={businessData.exclusiveDiscount}
                                    onChange={(e) => setBusinessData({...businessData, exclusiveDiscount: e.target.value})}
                                    placeholder="e.g. 15% off with code ALUMNI15"
                                    className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500"
                                />
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 dark:bg-slate-950/50">
                            <button 
                                onClick={handlePostBusiness}
                                disabled={isSavingBusiness}
                                className="w-full h-16 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-rose-600 transition-all disabled:opacity-50 shadow-xl shadow-rose-200"
                            >
                                {isSavingBusiness ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                Launch on Market
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Profile Modal */}
            {isEditingProfile && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-500">
                        <header className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight text-white">Profile <span className="text-indigo-600 italic">Persona</span></h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Sculpt your institutional presence</p>
                            </div>
                            <button onClick={() => setIsEditingProfile(false)} className="w-12 h-12 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar scrolling-touch">
                            {/* Visual Branding */}
                            <div className="space-y-6">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Institutional Identity</label>
                                <div className="flex flex-col items-center gap-8">
                                    <div className="w-full h-40 bg-white/10 rounded-[2.5rem] relative overflow-hidden group shadow-inner">
                                        {profileCoverPhotoFile ? (
                                            <img src={URL.createObjectURL(profileCoverPhotoFile)} className="w-full h-full object-cover" />
                                        ) : profileData.coverPhotoUrl ? (
                                            <img src={profileData.coverPhotoUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-10"><Building2 className="w-16 h-16" /></div>
                                        )}
                                        <label className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-all backdrop-blur-sm">
                                            <div className="flex items-center gap-3 px-8 py-3 bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl">
                                                <ImageIcon className="w-5 h-5" /> Update Background Photo
                                            </div>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => setProfileCoverPhotoFile(e.target.files?.[0] || null)} />
                                        </label>
                                    </div>

                                    <div className="relative mt-[-5rem] z-10 group">
                                        <div className="w-32 h-32 rounded-[2.5rem] bg-white dark:bg-slate-900 p-2 shadow-2xl">
                                            <div className="w-full h-full rounded-[2.25rem] bg-white/10 overflow-hidden ring-4 ring-indigo-500/10 transition-transform group-hover:scale-105">
                                                {profilePhotoUrlFile ? (
                                                    <img src={URL.createObjectURL(profilePhotoUrlFile)} className="w-full h-full object-cover" />
                                                ) : profileData.profilePhotoUrl ? (
                                                    <img src={profileData.profilePhotoUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-full h-full p-8 text-slate-300" />
                                                )}
                                            </div>
                                        </div>
                                        <label className="absolute -bottom-2 -right-2 w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center cursor-pointer hover:rotate-12 transition-all shadow-xl shadow-indigo-200">
                                            <ImageIcon className="w-6 h-6" />
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && setProfilePhotoFile(e.target.files[0])} />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Full Signature Name</label>
                                    <input type="text" value={profileData.fullName} onChange={(e) => setProfileData({...profileData, fullName: e.target.value})} className="w-full h-14 px-8 bg-white/10 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all font-display shadow-inner" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Designation</label>
                                        <input type="text" value={profileData.currentJob} onChange={(e) => setProfileData({...profileData, currentJob: e.target.value})} className="w-full h-14 px-8 bg-white/10 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner" />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Current Institution</label>
                                        <input type="text" value={profileData.currentCompany} onChange={(e) => setProfileData({...profileData, currentCompany: e.target.value})} className="w-full h-14 px-8 bg-white/10 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                                <Zap className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-tight text-white">Mentorship Availability</h4>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Volunteer to guide junior alumnae</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setProfileData({...profileData, isMentorAvailable: !profileData.isMentorAvailable})}
                                            className={`w-14 h-8 rounded-full transition-all relative ${profileData.isMentorAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${profileData.isMentorAvailable ? 'left-7 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>


                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Professional Narrative</label>
                                    <textarea value={profileData.bio} onChange={(e) => setProfileData({...profileData, bio: e.target.value})} className="w-full h-40 p-8 bg-white/10 border-none rounded-[2rem] text-sm font-medium focus:ring-2 focus:ring-indigo-600 transition-all resize-none shadow-inner leading-relaxed" />
                                </div>
                            </div>
                        </div>

                        <footer className="p-10 bg-slate-50 dark:bg-slate-800/50 flex gap-6">
                            <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-5 bg-white dark:bg-slate-900 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-rose-500 transition-all shadow-sm">Cancel</button>
                            <button onClick={handleUpdateProfile} disabled={isSavingProfile} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-2xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-3 active:scale-95 transition-all">
                                {isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                Commit Changes
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Circle Switcher Modal */}
            {showSwitcher && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-3xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                        <header className="p-12 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50/20">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-white font-display">Switch <span className="text-indigo-600 italic">Circle</span></h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Jump between verified institutions</p>
                            </div>
                            <button onClick={() => setShowSwitcher(false)} className="w-14 h-14 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shadow-sm">
                                <X className="w-6 h-6" />
                            </button>
                        </header>
                        
                        <div className="p-12 space-y-6 max-h-[500px] overflow-y-auto no-scrollbar scrolling-touch">
                            <div className="p-8 bg-indigo-600 rounded-[3rem] text-white shadow-2xl shadow-indigo-500/30 border border-indigo-400 flex items-center justify-between relative overflow-hidden group">
                                <Sparkles className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150 transition-transform group-hover:scale-[1.7]" />
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner border border-white/10 uppercase">
                                        {currentAlumna.institutionName?.charAt(0) || 'A'}
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-60 mb-2">Currently Active</p>
                                        <h4 className="font-black uppercase tracking-tight text-xl">{currentAlumna.institutionName}</h4>
                                    </div>
                                </div>
                                <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-[0_0_20px_white]"></div>
                            </div>

                            {otherMemberships.map((membership) => (
                                <button key={membership.id} onClick={() => handleSwitchCircle(membership)} className="w-full flex items-center justify-between p-8 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-[3rem] hover:bg-white dark:hover:bg-slate-700 hover:border-indigo-400 hover:shadow-2xl transition-all group">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-2xl shadow-sm border border-slate-100 dark:border-slate-800 group-hover:scale-110 transition-transform uppercase">
                                            {membership.institutionName?.charAt(0) || 'A'}
                                        </div>
                                        <div className="text-left">
                                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-lg">{membership.institutionName || 'Legacy Member'}</h4>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Verified Graduate Circle</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-6 h-6 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-2 transition-all" />
                                </button>
                            ))}

                            {onJoinAnother && (
                                <button onClick={onJoinAnother} className="w-full flex items-center gap-6 p-8 bg-white dark:bg-slate-900 border-2 border-dashed border-indigo-100 dark:border-indigo-900/30 rounded-[3rem] hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group">
                                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:rotate-90 transition-transform">
                                        <Plus className="w-8 h-8" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-black text-indigo-600 uppercase tracking-tight text-lg">Join New Instituion</h4>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Expand your global legacy</p>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Detail Overlay */}
            {viewedProfileId && (
                <div className="fixed inset-0 bg-[#020617] z-[110] md:ml-64 flex flex-col animate-in slide-in-from-right duration-500 scrolling-touch selection:bg-indigo-500/30">
                    {/* Background Decorative Elements for Profile */}
                    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
                        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px]"></div>
                    </div>

                    <header className="sticky top-0 bg-[#020617]/80 backdrop-blur-3xl z-50 border-b border-white/10 px-6 py-6 flex items-center gap-6">
                        <button onClick={() => { setViewedProfileId(null); setViewedProfileData(null); }} className="p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl hover:bg-indigo-600 hover:text-white hover:scale-105 transition-all group shadow-sm">
                            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-white truncate font-display">{viewedProfileData?.fullName || 'Legacy Member'}</h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">{profilePosts.length} Network Contributions</p>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto no-scrollbar scrolling-touch">
                        <div className="relative">
                            <div className="h-64 md:h-80 bg-white/10 relative overflow-hidden group">
                                {viewedProfileData?.coverPhotoUrl ? (
                                    <img src={viewedProfileData.coverPhotoUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-900 relative">
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="px-8 -mt-20 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="w-40 h-40 md:w-56 md:h-56 rounded-[4rem] bg-[#020617] p-3 shadow-2xl border border-white/10">
                                    <div className="w-full h-full rounded-[3.5rem] bg-white/5 overflow-hidden ring-1 ring-indigo-500/20 shadow-inner">
                                        {viewedProfileData?.profilePhotoUrl ? (
                                            <img src={viewedProfileData.profilePhotoUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-full h-full p-12 text-slate-200" />
                                        )}
                                    </div>
                                </div>
                                <div className="mb-6 flex flex-wrap gap-4">
                                    <button 
                                        onClick={() => setActiveConversationPartner(viewedProfileData)}
                                        className="p-5 bg-white/5 text-indigo-400 border border-white/10 rounded-3xl hover:bg-indigo-600 hover:text-white hover:scale-105 transition-all shadow-2xl"
                                    >
                                        <MessageSquare className="w-8 h-8" />
                                    </button>
                                    <button 
                                        onClick={handleFollow}
                                        className={`px-12 py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.25em] hover:scale-105 transition-all shadow-2xl active:scale-95 ${isFollowing ? 'bg-white/10 text-slate-400 border border-white/10' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}
                                    >
                                        {isFollowing ? 'Legacy Following' : 'Claim Follow'}
                                    </button>
                                </div>
                            </div>

                            <div className="px-10 mt-10 space-y-10">
                                <div>
                                    <div className="flex items-center gap-4 mb-3">
                                        <h1 className="text-3xl font-black text-white uppercase tracking-tight font-display">{viewedProfileData?.fullName}</h1>
                                        <CheckCircle2 className="w-8 h-8 text-indigo-600 fill-indigo-50" />
                                    </div>
                                    <p className="text-[12px] text-slate-400 font-black uppercase tracking-[0.4em] mb-8">@{viewedProfileData?.fullName?.split(' ')[0].toLowerCase()}_infrastructure</p>
                                    <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-3xl border-l-4 border-indigo-600/10 pl-8 ml-[-32px]">
                                        {viewedProfileData?.bio || `${viewedProfileData?.fullName} is a verified elite member. Building high-impact legacy across the infrastructure since joining in ${new Date(viewedProfileData?.createdAt || Date.now()).getFullYear()}.`}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-10 border-y border-slate-50 dark:border-slate-900">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Sphere</p>
                                        <h4 className="text-base font-black text-white uppercase tracking-tight truncate">{viewedProfileData?.currentCompany || 'EduAI Global'}</h4>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Designation</p>
                                        <h4 className="text-base font-black text-white uppercase tracking-tight truncate">{viewedProfileData?.currentJob || 'Premium Alumna'}</h4>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Class Year</p>
                                        <h4 className="text-base font-black text-indigo-600 uppercase tracking-tight">{viewedProfileData?.graduationYear || viewedProfileData?.class_year}</h4>
                                    </div>
                                    <div className="space-y-2 text-right">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Legacy Points</p>
                                        <h4 className="text-base font-black text-indigo-600 uppercase tracking-tight flex items-center justify-end gap-2">
                                            <Medal className="w-4 h-4" />
                                            {viewedProfileData?.loyalty_points || viewedProfileData?.loyaltyPoints || 0}
                                        </h4>
                                    </div>
                                </div>

                                <div className="flex gap-10">
                                    <div className="flex items-center gap-3 cursor-pointer group">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black group-hover:bg-white/10">{followStats.following}</div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-indigo-600">Following</span>
                                    </div>
                                    <div className="flex items-center gap-3 cursor-pointer group">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black group-hover:bg-white/10">{followStats.followers}</div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-indigo-600">Followers</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Profile Social Layer */}
                        <div className="sticky top-0 bg-[#020617]/80 backdrop-blur-3xl z-40 border-b border-white/10 mt-12 px-10">
                            <div className="flex gap-12">
                                {['Pulse', 'Media', 'Affiliations'].map((tab) => (
                                    <button 
                                        key={tab}
                                        onClick={() => setProfileActiveTab(tab.toLowerCase() as any)}
                                        className={`py-8 text-[11px] font-black uppercase tracking-[0.4em] relative transition-all ${profileActiveTab === tab.toLowerCase() ? 'text-indigo-600' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {tab}
                                        {profileActiveTab === tab.toLowerCase() && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-indigo-600 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.4)] animate-in slide-in-from-bottom-1" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pb-32 divide-y divide-slate-100 dark:divide-slate-900 px-4 md:px-0">
                            {profileActiveTab === 'pulse' && (
                                profilePosts.length > 0 ? profilePosts.map(post => (
                                    <div key={post.id} className="p-10 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-all">
                                        <div className="flex gap-8 max-w-4xl mx-auto">
                                            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg ring-4 ring-white dark:ring-slate-950">{post.authorName?.charAt(0)}</div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="font-black text-white uppercase tracking-tight text-lg">{post.authorName}</span>
                                                    {post.groupName && (
                                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                                            <Globe className="w-3 h-3 text-indigo-500" />
                                                            {post.groupName}
                                                        </div>
                                                    )}
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base mb-6 font-medium">{post.content}</p>
                                                {post.photoUrl && (
                                                    <div className="mb-6 rounded-[3rem] overflow-hidden border-4 border-white dark:border-slate-900 shadow-2xl shadow-slate-200/50 group cursor-zoom-in" onClick={() => setZoomedImage(post.photoUrl || null)}>
                                                        <img src={post.photoUrl} className="w-full max-h-[500px] object-cover group-hover:scale-[1.03] transition-transform duration-1000" />
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-10 text-slate-400 ml-[-8px]">
                                                    <div className="flex items-center gap-3 px-4 py-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all cursor-pointer"><MessageSquare className="w-5 h-5" /><span className="text-xs font-black">{(comments[post.id]?.length || post.commentsCount || 0)}</span></div>
                                                    <div className="flex items-center gap-3 px-4 py-2 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all cursor-pointer"><Heart className="w-5 h-5" /><span className="text-xs font-black">{(post.likes?.length) || 0}</span></div>
                                                    <Share2 className="w-5 h-5 hover:text-indigo-600 cursor-pointer transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-32 text-center opacity-30">
                                        <Hash className="w-20 h-20 mx-auto mb-8 text-slate-200" />
                                        <p className="text-sm font-black uppercase tracking-[0.4em]">Broadcast history is currently empty.</p>
                                    </div>
                                )
                            )}

                            {profileActiveTab === 'media' && (
                                <div className="p-12 grid grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                                    {profilePosts.filter(p => p.photoUrl || p.videoUrl).map((post, idx) => (
                                        <div key={idx} className="aspect-square rounded-[3rem] overflow-hidden bg-slate-100 group cursor-pointer relative shadow-2xl shadow-slate-200/50 hover:scale-105 transition-all duration-500 ring-1 ring-slate-100 group">
                                            {post.photoUrl ? (
                                                <img src={post.photoUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-950 flex items-center justify-center"><Video className="w-10 h-10 text-white/50" /></div>
                                            )}
                                            <div 
                                                onClick={(e) => { e.stopPropagation(); if (post.photoUrl) setZoomedImage(post.photoUrl); }}
                                                className="absolute inset-0 bg-indigo-600/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-md"
                                            >
                                                <div className="flex gap-8 text-white scale-90 group-hover:scale-100 transition-transform duration-500">
                                                    <div className="flex flex-col items-center gap-2"><Heart className="w-7 h-7 fill-white" /><span className="font-black text-sm">{post.likes?.length || 0}</span></div>
                                                    <div className="flex flex-col items-center gap-2"><MessageSquare className="w-7 h-7" /><span className="font-black text-sm">{(comments[post.id]?.length || post.commentsCount || 0)}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {profilePosts.filter(p => p.photoUrl || p.videoUrl).length === 0 && (
                                        <div className="col-span-full p-32 text-center opacity-20">
                                            <ImageIcon className="w-20 h-20 mx-auto mb-8 text-slate-300" />
                                            <p className="text-sm font-black uppercase tracking-[0.4em]">Media infrastructure is currently empty.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Global Lightbox Component */}
            {zoomedImage && (
                <div 
                    className="fixed inset-0 z-[200] bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-8 md:p-24 animate-in fade-in duration-500 cursor-zoom-out"
                    onClick={() => setZoomedImage(null)}
                >
                    <button onClick={() => setZoomedImage(null)} className="absolute top-10 right-10 w-16 h-16 bg-white/10 hover:bg-rose-600 text-white rounded-[1.75rem] flex items-center justify-center transition-all group z-10 hover:rotate-90">
                        <X className="w-8 h-8" />
                    </button>
                    
                    <div className="relative max-w-full max-h-full flex items-center justify-center animate-in zoom-in-95 duration-700 group">
                        <img 
                            src={zoomedImage} 
                            className="max-w-full max-h-full object-contain rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-105" 
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="absolute inset-0 rounded-[3rem] ring-1 ring-white/20 pointer-events-none"></div>
                    </div>
                </div>
            )}

            {/* Payment Verification Overlay */}
            {isVerifyingPayment && (
                <div className="fixed inset-0 z-[210] bg-indigo-600 flex flex-col items-center justify-center text-white p-10 animate-in fade-in duration-500">
                    <div className="relative mb-12">
                        <div className="w-32 h-32 border-8 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <Sparkles className="absolute inset-0 m-auto w-12 h-12 animate-pulse" />
                    </div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 text-center">Verifying Legacy Boost</h2>
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-100 opacity-60 text-center max-w-xs leading-relaxed">
                        Communicating with the secure financial infrastructure. Please remain on this pulse line.
                    </p>
                    <div className="mt-12 flex gap-2">
                        {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlumnaePortalView;
