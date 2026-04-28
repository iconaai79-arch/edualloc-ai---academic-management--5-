
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
    const [activeSection, setActiveSection] = useState<'feed' | 'messages' | 'explore' | 'notifications' | 'classmates' | 'funding' | 'support' | 'jobs' | 'marketplace' | 'mentorship' | 'groups'>('feed');
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
        fullName: currentAlumna?.fullName || '',
        email: currentAlumna?.email || '',
        currentJob: currentAlumna?.currentJob || '',
        currentCompany: currentAlumna?.currentCompany || '',
        bio: currentAlumna?.bio || '',
        linkedinUrl: currentAlumna?.linkedinUrl || '',
        twitterUrl: currentAlumna?.twitterUrl || '',
        profilePhotoUrl: currentAlumna?.profilePhotoUrl || '',
        coverPhotoUrl: currentAlumna?.coverPhotoUrl || '',
        isMentorAvailable: currentAlumna?.isMentorAvailable || false
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
    const [profileActiveTab, setProfileActiveTab] = useState<'posts' | 'replies' | 'media' | 'highlights'>('posts');
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

    const COMMON_EMOJIS = ['😊', '🎓', '✨', '🙌', '🎉', '💙', '🏛️', '💼', '💪', '👩‍🎓', '🏫', '💡', '🥂', '🔥', '📚', '🤝'];

    const addEmoji = (emoji: string) => {
        setNewPostContent(prev => prev + emoji);
        setShowEmojiPicker(false);
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
            setSchoolProjects(projects);

            if (projects.length > 0) {
                const projectIds = projects.map((p: any) => p.id);
                const updates = await apiService.fetchModuleRecords('project_updates', undefined, undefined, {
                    filter: { project_id: { in: projectIds } },
                    order: 'created_at.desc'
                });
                setProjectUpdates(updates);
            }

            const messages = await apiService.fetchModuleRecords('alumni_school_inbox', undefined, undefined, {
                filter: { alumna_id: currentAlumna.id, institution_id: instId },
                order: 'created_at.asc'
            });
            setSchoolInbox(messages);
        } catch (e) {
            console.error("Engagement load failed:", e);
        }
    };

    const loadNotifications = async () => {
        try {
            const raw = await apiService.fetchModuleRecords('alumni_notifications', undefined, undefined, {
                filter: { recipient_id: currentAlumna.id },
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
            setJobs(jobData);

            // Load Businesses
            const bizData = await apiService.fetchModuleRecords('alumni_businesses', undefined, undefined, {
                filter: { institution_id: instId },
                order: 'created_at.desc'
            });
            setBusinesses(bizData);

            // Load Groups
            const groupData = await apiService.fetchModuleRecords('alumni_groups', undefined, undefined, {
                filter: { institution_id: instId },
                order: 'created_at.desc'
            });
            setGroups(groupData);

            // Load Success Stories
            const storyData = await apiService.fetchModuleRecords('alumni_success_stories', undefined, undefined, {
                filter: { institution_id: instId },
                order: 'created_at.desc'
            });
            setSuccessStories(storyData);

            // Load Doc Requests
            const reqData = await apiService.fetchModuleRecords('alumni_document_requests', undefined, undefined, {
                filter: { alumna_id: currentAlumna.id },
                order: 'created_at.desc'
            });
            setDocRequests(reqData);

            // Load RSVPs
            const rsvpData = await apiService.fetchModuleRecords('alumni_event_rsvps', undefined, undefined, {
                filter: { alumna_id: currentAlumna.id }
            });
            setRsvps(rsvpData);

        } catch (e) {
            console.error("New modules load failed:", e);
        } finally {
            setLoadingNewModules(false);
        }
    };

    useEffect(() => {
        const instId = currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id;
        if (instId) {
            loadSchoolEngagement(instId as string);
            loadNewModules();
        }
        
        loadNotifications();
        detectNewClassmates();

        // Real-time simulation check every 5 mins
        const timer = setInterval(loadNotifications, 300000);
        return () => clearInterval(timer);
    }, [currentAlumna]);

    const handleSendMessageToSchool = async () => {
        if (!newMessageToSchool.trim()) return;
        const instId = currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id;
        if (!instId) return;

        const msg = {
            id: `sm_${Date.now()}`,
            alumna_id: currentAlumna.id,
            institution_id: instId,
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
                id: currentAlumna.id
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

            // Frontend Post-Filter for Edge Cases
            let processedPosts = data || [];
            if (activeTab === 'my-schools') {
                processedPosts = (data || []).filter((p: any) => {
                    if (currentAlumna.isSuperAdmin) return true; // Super admin sees all for this context
                    return (p.institution_id === instId) || (p.school_id === schoolRegId);
                });
            }

            setPosts(processedPosts);
            
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

    const [allInstitutionMembers, setAllInstitutionMembers] = useState<any[]>([]);

    const loadAlumnaeMembers = async () => {
        try {
            const instId = currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id;
            const gradYear = currentAlumna.graduationYear || currentAlumna.graduation_year;
            const schoolRegId = currentAlumna.schoolId || currentAlumna.school_id;
            
            // Fetch all members associated with this institution/school
            const data = await apiService.fetchModuleRecords('alumnae_members', instId);
            
            // STRICT FILTER: Ensure they belong to THIS institution or school registry entry
            const institutionMembers = (data || []).filter((m: any) => {
                const memberInstId = m.institutionId || m.institution_id;
                const memberSchoolRegId = m.schoolId || m.school_id;
                
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
                (String(m.graduationYear) === String(gradYear) || String(m.graduation_year) === String(gradYear))
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
                        institution_id: project.institution_id,
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

    const handleRequestDoc = async (type: string) => {
        try {
            const instId = currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id;
            await apiService.saveModuleRecord('alumni_document_requests', {
                id: `req_${Date.now()}`,
                alumna_id: currentAlumna.id,
                institution_id: instId,
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
        setIsSendingMessage(true);
        
        const msg = {
            id: `msg_${Date.now()}`,
            senderId: currentAlumna.id,
            receiverId: activeConversationPartner.id,
            institutionId: currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id,
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

            const post: AlumniPost = {
                id: `p_${Date.now()}`,
                authorId: currentAlumna.id || 'anonymous',
                authorName: currentAlumna.fullName || currentAlumna.name || 'Alumna',
                authorPhoto: currentAlumna.profilePhotoUrl,
                institutionId: currentAlumna.institutionId || 'GLOBAL',
                schoolId: (currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id || 'GLOBAL') as string,
                content: newPostContent,
                photoUrl: photoUrl,
                videoUrl: videoUrl,
                likes: [],
                commentsCount: 0,
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('alumni_posts', post);
            setPosts([post, ...posts]);
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
        
        const comment: AlumniComment = {
            id: `c_${Date.now()}`,
            postId,
            authorId: currentAlumna.id,
            authorName: currentAlumna.fullName || currentAlumna.name,
            authorPhoto: currentAlumna.profilePhotoUrl,
            institutionId: currentAlumna.institutionId || currentAlumna.schoolId || currentAlumna.institution_id || 'GLOBAL',
            content,
            createdAt: new Date().toISOString()
        };

        const currentPost = posts.find(p => p.id === postId);
        const currentCount = currentPost ? (currentPost.commentsCount || currentPost.comments_count || 0) : 0;
        const newCount = currentCount + 1;

        try {
            await apiService.saveModuleRecord('alumni_comments', comment);
            setComments(prev => ({
                ...prev,
                [postId]: [...(prev[postId] || []), comment]
            }));
            
            // Update local posts count
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: newCount, comments_count: newCount } : p));

            // Update remote posts count
            await apiService.saveModuleRecord('alumni_posts', { 
                id: postId, 
                comments_count: newCount,
                commentsCount: newCount 
            } as any);

            // Clear input
            setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        } catch (e: any) {
            console.error("Comment Save Error:", e);
            alert("Failed to save reply. Please run the 'Alumni Schema Migration' in Settings to ensure your database is up to date.");
        }
    };

    const handleDeletePost = async (postId: string) => {
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
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col md:flex-row font-display">
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
                        { icon: Briefcase, label: 'Jobs', onClick: () => setActiveSection('jobs'), active: activeSection === 'jobs' },
                        { icon: ShoppingBag, label: 'Marketplace', onClick: () => setActiveSection('marketplace'), active: activeSection === 'marketplace' },
                        { icon: Zap, label: 'Mentorship', onClick: () => setActiveSection('mentorship'), active: activeSection === 'mentorship' },
                        { icon: Globe, label: 'Groups', onClick: () => setActiveSection('groups'), active: activeSection === 'groups' },
                        { icon: Sparkles, label: 'Funding', onClick: () => setActiveSection('funding' as any), active: activeSection === 'funding' },
                        { icon: Building2, label: 'Support', onClick: () => setActiveSection('support' as any), active: activeSection === 'support' },
                        { icon: User, label: 'Profile', onClick: () => setIsEditingProfile(true) }
                    ].map((item, idx) => (
                        <button 
                            key={idx} 
                            onClick={item.onClick}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative group ${item.active ? 'bg-indigo-600 text-white shadow-[0_10px_30px_rgba(79,70,229,0.3)] dark:shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
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
            <main className="flex-1 md:ml-64 max-w-2xl mx-auto w-full border-x border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 min-h-screen pb-20 md:pb-0">
                {/* Section Controller */}
                {(() => {
                    switch (activeSection) {
                        case 'events':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                                    <header className="px-8 py-10 bg-amber-500 text-white rounded-b-[3rem] shadow-2xl mb-12">
                                        <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Legacy <span className="opacity-40 italic">Events</span></h2>
                                        <p className="text-[10px] text-amber-100 font-bold uppercase tracking-[0.4em]">Reunions & Networking Assemblies</p>
                                    </header>
                                    <div className="px-6 space-y-8">
                                        {schoolProjects.length === 0 ? ( // Reusing variable name if needed or using a new one if I loaded it
                                            <div className="py-20 text-center opacity-20">
                                                <Calendar className="w-16 h-16 mx-auto mb-6" />
                                                <p className="text-xs font-black uppercase tracking-[0.3em]">No upcoming events.</p>
                                            </div>
                                        ) : (
                                            schoolProjects.map(event => ( // Assuming events are loaded into schoolProjects or similar
                                                <div key={event.id} className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl group">
                                                    <div className="h-48 relative overflow-hidden">
                                                        {event.image_url ? <img src={event.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : <div className="w-full h-full bg-amber-50 flex items-center justify-center opacity-20"><Calendar className="w-12 h-12" /></div>}
                                                    </div>
                                                    <div className="p-8">
                                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{event.title}</h3>
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
                                                            <button className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-indigo-600 transition-all">
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
                                    <header className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl z-20">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Institutional Response Network</h4>
                                            <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Priority Line Active
                                            </p>
                                        </div>
                                    </header>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-10 flex flex-col no-scrollbar">
                                        {/* Document Request Section */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                                                <div className="w-8 h-px bg-slate-100" />
                                                Digital Document Vault
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                {['Transcript', 'Certificate', 'Recommendation', 'ID Card'].map(type => (
                                                    <button 
                                                        key={type}
                                                        onClick={() => handleRequestDoc(type)}
                                                        className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] hover:bg-white hover:border-indigo-400 transition-all text-left group"
                                                    >
                                                        <Building2 className="w-6 h-6 text-slate-300 mb-4 group-hover:text-indigo-600 group-hover:scale-110 transition-all" />
                                                        <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-white">{type}</p>
                                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Formal Request</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                                                <div className="w-8 h-px bg-slate-100" />
                                                Official Correspondence
                                            </h4>
                                            {schoolInbox.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center opacity-30 mt-20">
                                                <MessageSquare className="w-16 h-16 mb-6" />
                                                <p className="text-xs font-black uppercase tracking-[0.3em] text-center max-w-xs">
                                                    Start an official conversation with your alma mater's administration.
                                                </p>
                                            </div>
                                        ) : (
                                            schoolInbox.map((msg, idx) => (
                                                <div key={idx} className={`flex flex-col ${msg.direction === 'to_school' ? 'items-end' : 'items-start'}`}>
                                                    <div className={`max-w-[85%] p-5 rounded-3xl text-sm font-medium leading-relaxed shadow-sm ${msg.direction === 'to_school' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-none'}`}>
                                                        {msg.content}
                                                    </div>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2 px-2">
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="sticky bottom-0 p-6 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                        <input 
                                            type="text" 
                                            value={newMessageToSchool}
                                            onChange={(e) => setNewMessageToSchool(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessageToSchool()}
                                            placeholder="Type your official request..."
                                            className="flex-1 h-14 px-8 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner"
                                        />
                                        <button 
                                            onClick={handleSendMessageToSchool}
                                            className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:scale-105 transition-all shadow-xl shadow-indigo-100 dark:shadow-none"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );

                        case 'funding':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                                    <header className="px-8 py-10 bg-indigo-600 text-white rounded-b-[3rem] shadow-2xl mb-12 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><Building2 className="w-40 h-40" /></div>
                                        <h2 className="text-3xl font-black uppercase tracking-tight mb-3">Institutional <span className="opacity-60 italic text-indigo-200">Projects</span></h2>
                                        <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-[0.4em]">Propelling growth through collective legacy</p>
                                    </header>

                                    <div className="px-6 space-y-12">
                                        {schoolProjects.map((project) => (
                                            <div key={project.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl shadow-indigo-500/5">
                                                <div className="h-64 relative overflow-hidden group">
                                                    {project.imageUrl ? <img src={project.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : <div className="w-full h-full bg-slate-100 items-center justify-center flex"><Building2 className="w-12 h-12 opacity-20" /></div>}
                                                    <div className="absolute top-6 left-6 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-xl">
                                                        {project.status === 'active' ? 'Developmental' : 'Legacy Project'}
                                                    </div>
                                                </div>
                                                <div className="p-10">
                                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">{project.title}</h3>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">{project.description}</p>
                                                    <div className="space-y-8">
                                                        <div>
                                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                                                                <span className="text-slate-400">Raised: KES {project.current_amount || project.currentAmount || 0}</span>
                                                                <span className="text-indigo-600">{Math.round(((project.current_amount || project.currentAmount || 0) / (project.target_amount || project.targetAmount)) * 100)}% Complete</span>
                                                            </div>
                                                            <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
                                                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(100, ((project.current_amount || project.currentAmount || 0) / (project.target_amount || project.targetAmount)) * 100)}%` }}></div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="pt-8 border-t border-slate-50 dark:border-slate-800">
                                                            <div className="flex flex-col sm:flex-row gap-4 mb-10">
                                                                <div className="flex-1 relative">
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder="Legacy Amount (KES)..."
                                                                        value={donationAmount}
                                                                        onChange={(e) => setDonationAmount(e.target.value)}
                                                                        className="w-full h-16 pl-10 pr-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner"
                                                                    />
                                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px]">KES</div>
                                                                </div>
                                                                <button 
                                                                    onClick={() => handleDonate(project)}
                                                                    disabled={isDonating || !donationAmount}
                                                                    className="px-10 h-16 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:scale-105 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3"
                                                                >
                                                                    {isDonating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" />}
                                                                    Fuel Legacy
                                                                </button>
                                                            </div>

                                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                                                                <div className="w-1 h-1 rounded-full bg-indigo-600"></div>
                                                                Developmental Milestones
                                                            </h4>
                                                            <div className="space-y-8">
                                                                {projectUpdates.filter(u => u.project_id === project.id).map(update => (
                                                                    <div key={update.id} className="flex gap-6 group">
                                                                        <div className="w-px bg-slate-100 dark:bg-slate-800 relative">
                                                                            <div className="absolute top-0 -left-1.5 w-3 h-3 rounded-full bg-indigo-600 ring-8 ring-white dark:ring-slate-950"></div>
                                                                        </div>
                                                                        <div className="pb-4 flex-1">
                                                                            <h5 className="text-[12px] font-black uppercase text-slate-900 dark:text-white tracking-tight">{update.title}</h5>
                                                                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{update.content}</p>
                                                                            <p className="text-[8px] text-slate-400 uppercase font-black mt-3 flex items-center gap-2">
                                                                                <Calendar className="w-3 h-3" />
                                                                                {new Date(update.created_at).toLocaleDateString()}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {projectUpdates.filter(u => u.project_id === project.id).length === 0 && (
                                                                    <div className="py-6 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl">
                                                                        <p className="text-[10px] italic font-bold text-slate-400 uppercase tracking-widest px-4">Initial planning phase in progress. Updates arriving shortly.</p>
                                                                    </div>
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
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-8 pb-32">
                                    <header className="mb-12 flex flex-col gap-8">
                                        <div className="relative">
                                            <div className="absolute -left-12 top-0 w-2 h-20 bg-indigo-600 rounded-full blur-lg opacity-40"></div>
                                            <h2 className="text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Class of <span className="text-indigo-400 italic drop-shadow-[0_0_15px_rgba(129,140,248,0.4)]">{currentAlumna.graduationYear}</span></h2>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-3">Your Verified Alumnae Circle</p>
                                            <div 
                                                className="text-[12px] font-black uppercase tracking-[0.6em] text-indigo-500 mt-4 drop-shadow-xl"
                                                style={{ 
                                                    textShadow: '1px 1px 0px #4f46e5, 2px 2px 0px #3730a3, 0 0 25px rgba(79,70,229,0.3)',
                                                    transform: 'perspective(500px) rotateX(5deg)'
                                                }}
                                            >
                                                {currentAlumna.institutionName || currentAlumna.schoolName || 'Global Network'}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Reconnect with our classmates at the Alumnae Circle! Join here: ' + window.location.origin)}`, '_blank')}
                                            className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-[0_20px_40px_rgba(16,185,129,0.2)] dark:shadow-none flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all group overflow-hidden relative"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                            <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Recall My Classmates
                                        </button>
                                    </header>

                                    <div className="space-y-6">
                                        {alumnaeMembers.filter(m => (m.graduationYear || m.class_year) == currentAlumna.graduationYear && m.id !== currentAlumna.id).map(member => (
                                            <div key={member.id} className="p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] flex items-center gap-6 shadow-xl shadow-slate-100/50 dark:shadow-none hover:border-indigo-400 transition-all group">
                                                <div className="w-20 h-20 rounded-[1.75rem] bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                                    {member.profile_photo_url || member.profilePhotoUrl ? <img src={member.profile_photo_url || member.profilePhotoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-6 text-slate-300" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{member.fullName || member.full_name}</h3>
                                                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mb-4 truncate">{member.currentJob || 'Premium Alumna'} at {member.currentCompany || 'EduAI Network'}</p>
                                                    <button 
                                                        onClick={() => { setActiveConversationPartner(member); setActiveSection('messages'); }}
                                                        className="px-6 py-2.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <MessageSquare className="w-3.5 h-3.5" /> Start Thread
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );

                        case 'notifications':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen">
                                    <header className="px-8 py-10 bg-slate-900 text-white rounded-b-[3rem] shadow-2xl mb-12 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150"><Bell className="w-40 h-40" /></div>
                                        <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Legacy <span className="opacity-60 italic text-indigo-400">Pulse</span></h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">Real-time engagement across the network</p>
                                    </header>

                                    <div className="px-6 space-y-4 pb-32">
                                        {alumniNotifications.length === 0 ? (
                                            <div className="py-20 text-center opacity-30">
                                                <Bell className="w-20 h-20 mx-auto mb-6 text-slate-200" />
                                                <p className="text-xs font-black uppercase tracking-[0.3em]">No pulse activity detected.</p>
                                            </div>
                                        ) : (
                                            alumniNotifications.map((notif) => (
                                                <div key={notif.id} className={`p-8 rounded-[2.5rem] border transition-all flex items-start gap-6 ${notif.is_read ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm' : 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30 ring-2 ring-indigo-50 dark:ring-indigo-900/20 shadow-xl shadow-indigo-500/5'}`}>
                                                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
                                                        <Sparkles className="w-7 h-7" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                                                            <span className="font-black uppercase tracking-tight mr-2">{notif.actor_name}</span> {notif.content}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-3 flex items-center gap-2">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(notif.created_at).toLocaleDateString()}
                                                        </p>
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
                                    <header className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between">
                                        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-display">Secure <span className="text-indigo-600 italic">Inbox</span></h2>
                                    </header>

                                    <div className="flex-1 flex overflow-hidden">
                                        {/* Conversations List */}
                                        <aside className={`w-full md:w-80 border-r border-slate-100 dark:border-slate-800 overflow-y-auto no-scrollbar ${activeConversationPartner ? 'hidden md:block' : 'block'}`}>
                                            <div className="p-4 space-y-2">
                                                {allInstitutionMembers.filter(m => m.id !== currentAlumna.id).map(member => (
                                                    <button 
                                                        key={member.id}
                                                        onClick={() => setActiveConversationPartner(member)}
                                                        className={`w-full p-5 rounded-3xl flex items-center gap-4 transition-all ${activeConversationPartner?.id === member.id ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-100 shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                                                    >
                                                        <div className="relative">
                                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800 shadow-sm">
                                                                {member.profilePhotoUrl ? <img src={member.profilePhotoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-slate-300" />}
                                                            </div>
                                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-white dark:border-slate-950 rounded-full"></div>
                                                        </div>
                                                        <div className="text-left flex-1 min-w-0">
                                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate tracking-tight">{member.fullName}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Start Thread</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </aside>

                                        {/* Chat Window */}
                                        <div className={`flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/20 ${!activeConversationPartner ? 'hidden md:flex' : 'flex'}`}>
                                            {activeConversationPartner ? (
                                                <>
                                                    <header className="p-4 border-b border-slate-100 bg-white/50 backdrop-blur-sm flex items-center justify-between">
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
                                                        {messages.filter(m => (m.senderId === activeConversationPartner.id && m.receiverId === currentAlumna.id) || (m.senderId === currentAlumna.id && m.receiverId === activeConversationPartner.id)).map(msg => (
                                                            <div key={msg.id} className={`flex ${msg.senderId === currentAlumna.id ? 'justify-end' : 'justify-start'}`}>
                                                                <div className={`max-w-[75%] p-5 rounded-[2.5rem] text-sm font-medium shadow-sm transition-all hover:scale-[1.01] ${msg.senderId === currentAlumna.id ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-500/20' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-bl-none border border-slate-100 dark:border-slate-800'}`}>
                                                                    {msg.content}
                                                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-3 opacity-40">
                                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {messages.filter(m => (m.senderId === activeConversationPartner.id && m.receiverId === currentAlumna.id) || (m.senderId === currentAlumna.id && m.receiverId === activeConversationPartner.id)).length === 0 && (
                                                            <div className="h-full flex flex-col items-center justify-center opacity-20">
                                                                <MessageSquare className="w-20 h-20 mb-6" />
                                                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Encryption Initialized</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-8 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800">
                                                        <div className="relative group">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Craft a legacy message..."
                                                                value={newMessage}
                                                                onChange={(e) => setNewMessage(e.target.value)}
                                                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                                                className="w-full h-16 pl-10 pr-20 bg-slate-100 dark:bg-slate-900 border-none rounded-[1.75rem] text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner font-display"
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
                                                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-3">Secure Network Communications</h3>
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
                                    <header className="mb-12 relative">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white"><Hash className="w-7 h-7" /></div>
                                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Explore <span className="text-indigo-600 italic">Net</span></h2>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Discover talent across the global alumni infrastructure</p>
                                    </header>

                                    <div className="grid grid-cols-1 gap-6">
                                        {allInstitutionMembers.filter(m => m.id !== currentAlumna.id).map(member => (
                                            <div key={member.id} className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-2xl shadow-indigo-500/5 flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left transition-all hover:border-indigo-400 group">
                                                <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 ring-12 ring-slate-50 dark:ring-slate-950 group-hover:scale-105 transition-transform">
                                                    {member.profilePhotoUrl ? <img src={member.profilePhotoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-10 text-slate-300" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{member.fullName}</h3>
                                                        <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                                                        <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Class of {member.graduationYear || member.class_year}</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">{member.currentJob || 'Social Alumna'} at {member.currentCompany || 'EduAI Network'}</p>
                                                    <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                                                        <button 
                                                            onClick={member.id ? () => setViewedProfileId(member.id) : undefined}
                                                            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-950 transition-all shadow-xl shadow-indigo-500/20"
                                                        >
                                                            View Profile
                                                        </button>
                                                        <button 
                                                            onClick={() => { setActiveConversationPartner(member); setActiveSection('messages'); }}
                                                            className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all"
                                                        >
                                                            <MessageSquare className="w-7 h-7" />
                                                        </button>
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
                                    <header className="px-8 py-10 bg-indigo-600 text-white rounded-b-[3rem] shadow-2xl mb-12">
                                        <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Legacy <span className="opacity-60 italic">Careers</span></h2>
                                        <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-[0.4em]">Exclusive opportunities within the network</p>
                                    </header>
                                    <div className="px-6 space-y-6">
                                        {jobs.length === 0 ? (
                                            <div className="py-20 text-center opacity-20">
                                                <Briefcase className="w-16 h-16 mx-auto mb-6" />
                                                <p className="text-xs font-black uppercase tracking-[0.3em]">No career posts yet.</p>
                                            </div>
                                        ) : (
                                            jobs.map(job => (
                                                <div key={job.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 hover:border-indigo-400 transition-all">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{job.title}</h3>
                                                            <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mt-1">{job.company}</p>
                                                        </div>
                                                        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl text-[8px] font-black uppercase tracking-widest">
                                                            {job.location}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8 line-clamp-3">{job.description}</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{job.salary_range}</span>
                                                        <button 
                                                            onClick={() => job.apply_url && window.open(job.apply_url, '_blank')}
                                                            className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl"
                                                        >
                                                            Apply via Portal
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
                                    <header className="px-8 py-10 bg-rose-500 text-white rounded-b-[3rem] shadow-2xl mb-12">
                                        <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Legacy <span className="opacity-60 italic">Market</span></h2>
                                        <p className="text-[10px] text-rose-100 font-bold uppercase tracking-[0.4em]">Support Alumnae-owned businesses</p>
                                    </header>
                                    <div className="px-6 grid grid-cols-1 gap-6">
                                        {businesses.length === 0 ? (
                                            <div className="py-20 text-center opacity-20">
                                                <ShoppingBag className="w-16 h-16 mx-auto mb-6" />
                                                <p className="text-xs font-black uppercase tracking-[0.3em]">Marketplace is currently empty.</p>
                                            </div>
                                        ) : (
                                            businesses.map(biz => (
                                                <div key={biz.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl flex gap-6 hover:border-rose-400 transition-all">
                                                    <div className="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-slate-800 overflow-hidden shrink-0">
                                                        {biz.logo_url ? <img src={biz.logo_url} className="w-full h-full object-cover" /> : <ShoppingBag className="w-full h-full p-6 text-slate-200" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{biz.business_name}</h3>
                                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1 mb-4">{biz.industry}</p>
                                                        <div className="px-4 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl text-[9px] font-black uppercase tracking-widest mb-6 inline-block">
                                                            Exclusive: {biz.exclusive_discount}
                                                        </div>
                                                        <button 
                                                            onClick={() => biz.website_url && window.open(biz.website_url, '_blank')}
                                                            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all"
                                                        >
                                                            Visit Store
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
                                    <header className="px-8 py-10 bg-indigo-900 text-white rounded-b-[3rem] shadow-2xl mb-12">
                                        <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Legacy <span className="opacity-40 italic">Mentors</span></h2>
                                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-[0.4em]">Connecting experience with ambition</p>
                                    </header>
                                    <div className="px-6 space-y-6">
                                        {alumnaeMembers.filter(m => m.isMentorAvailable || m.is_mentor_available).length === 0 ? (
                                            <div className="py-20 text-center opacity-20">
                                                <Zap className="w-16 h-16 mx-auto mb-6" />
                                                <p className="text-xs font-black uppercase tracking-[0.3em]">No mentors available yet.</p>
                                            </div>
                                        ) : (
                                            alumnaeMembers.filter(m => (m.isMentorAvailable || m.is_mentor_available) && m.id !== currentAlumna.id).map(mentor => (
                                                <div key={mentor.id} className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl flex items-center gap-8 hover:border-indigo-400 transition-all group">
                                                    <div className="w-24 h-24 rounded-[2rem] bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                                        {mentor.profilePhotoUrl ? <img src={mentor.profilePhotoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-6 text-slate-300" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{mentor.fullName}</h3>
                                                        <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-1 mb-4">{mentor.currentJob} at {mentor.currentCompany}</p>
                                                        <button 
                                                            onClick={() => { setActiveConversationPartner(mentor); setActiveSection('messages'); }}
                                                            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-200"
                                                        >
                                                            Request Guidance
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );

                        case 'groups':
                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                                    <header className="px-8 py-10 bg-slate-800 text-white rounded-b-[3rem] shadow-2xl mb-12">
                                        <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Interest <span className="opacity-40 italic">Circles</span></h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">Connect through shared passions</p>
                                    </header>
                                    <div className="px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {groups.length === 0 ? (
                                            <div className="py-20 text-center opacity-20 col-span-2">
                                                <Globe className="w-16 h-16 mx-auto mb-6" />
                                                <p className="text-xs font-black uppercase tracking-[0.3em]">No groups founded yet.</p>
                                            </div>
                                        ) : (
                                            groups.map(group => (
                                                <div key={group.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl hover:border-indigo-400 transition-all group">
                                                    <div className="h-32 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                                                        {group.image_url ? <img src={group.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><Globe className="w-12 h-12" /></div>}
                                                    </div>
                                                    <div className="p-6">
                                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{group.name}</h3>
                                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-6">{group.category}</p>
                                                        <button className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Join Circle</button>
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
                                            <div className="bg-indigo-900 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl">
                                                <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150 transition-transform group-hover:scale-[1.7]"><Sparkles className="w-40 h-40" /></div>
                                                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center text-center md:text-left">
                                                    <div className="w-32 h-32 rounded-[2.5rem] bg-white/20 p-2 shrink-0 ring-4 ring-white/10">
                                                        <img src={successStories.find(s => s.is_featured).image_url} className="w-full h-full object-cover rounded-[2rem]" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-300 mb-2">Legacy Spotlight</p>
                                                        <h3 className="text-2xl font-black uppercase tracking-tight mb-4">{successStories.find(s => s.is_featured).title}</h3>
                                                        <p className="text-xs text-indigo-100/70 font-medium leading-relaxed mb-6 line-clamp-2">{successStories.find(s => s.is_featured).content}</p>
                                                        <button className="px-8 py-3 bg-white text-indigo-900 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-400 hover:text-white transition-all shadow-xl">Full Narrative</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Header Tabs */}
                                    <header className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl border-b border-slate-100 dark:border-slate-800 z-40 shadow-[0_10px_40px_rgba(79,70,229,0.05)]">
                                        <div className="px-8 py-6 flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-[0_0_20px_rgba(79,70,229,0.4)]"><Atom className="w-6 h-6 animate-spin-slow" /></div>
                                                <div className="flex flex-col">
                                                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">EduAI <span className="text-indigo-400 italic drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]">Pulse</span></h2>
                                                    <div 
                                                        className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-500 mt-1.5"
                                                        style={{ 
                                                            textShadow: '0.5px 0.5px 0px #4f46e5, 1px 1px 0px #3730a3, 0 0 15px rgba(99,102,241,0.3)',
                                                            transform: 'skewX(-5deg)'
                                                        }}
                                                    >
                                                        {currentAlumna.institutionName || currentAlumna.schoolName || 'Global Network'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                {otherMemberships.length > 0 && (
                                                    <button 
                                                        onClick={() => setShowSwitcher(true)}
                                                        className="md:hidden p-3 bg-indigo-600 text-white rounded-2xl transition-all hover:scale-105 shadow-lg shadow-indigo-200 dark:shadow-none"
                                                    >
                                                        <Repeat2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button onClick={onBack} className="md:hidden p-3 bg-white dark:bg-slate-900 text-rose-500 border border-rose-100 dark:border-rose-900/30 rounded-2xl transition-all hover:scale-105 shadow-sm">
                                                   <LogOut className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex px-4 overflow-x-auto no-scrollbar scroll-smooth border-t border-slate-50 dark:border-slate-900/50">
                                            <button 
                                                onClick={() => setActiveTab('for-you')}
                                                className={`flex-1 py-5 text-[11px] font-black uppercase tracking-[0.3em] relative transition-all whitespace-nowrap min-w-[120px] ${activeTab === 'for-you' ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Global Circle
                                                {activeTab === 'for-you' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-in slide-in-from-bottom-1" />}
                                            </button>
                                            <button 
                                                onClick={() => setActiveTab('my-schools')}
                                                className={`flex-1 py-5 text-[11px] font-black uppercase tracking-[0.3em] relative transition-all whitespace-nowrap min-w-[120px] ${activeTab === 'my-schools' ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Institutional
                                                {activeTab === 'my-schools' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-in slide-in-from-bottom-1" />}
                                            </button>
                                        </div>
                                    </header>

                                    {/* Feed Content */}
                                    <div className="pb-32 divide-y divide-slate-100 dark:divide-slate-900">
                                        {/* Post Composer */}
                                        <div className="p-4 md:p-8 bg-white dark:bg-slate-950">
                                            <div className="flex gap-4 md:gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 shadow-sm border border-slate-100 dark:border-slate-800">
                                                    {currentAlumna.profilePhotoUrl ? <img src={currentAlumna.profilePhotoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-slate-300" />}
                                                </div>
                                                <div className="flex-1 space-y-6">
                                                    <textarea 
                                                        placeholder="What's your institutional legacy today?"
                                                        value={newPostContent}
                                                        onChange={(e) => setNewPostContent(e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-lg md:text-xl font-medium placeholder:text-slate-300 resize-none min-h-[120px] md:min-h-[140px] text-slate-900 dark:text-white font-display px-0"
                                                    />
                                                    
                                                    {postImagePreview && (
                                                        <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-slate-50 dark:border-slate-900 shadow-2xl group">
                                                            <img src={postImagePreview} className="w-full h-full object-cover max-h-96" />
                                                            <button 
                                                                onClick={() => { setPostImageFile(null); setPostImagePreview(null); }}
                                                                className="absolute top-6 right-6 p-3 bg-black/60 text-white rounded-full hover:bg-rose-600 backdrop-blur-xl transition-all shadow-xl"
                                                            >
                                                                <X className="w-6 h-6" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {postVideoPreview && (
                                                        <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-slate-50 dark:border-slate-900 shadow-2xl group">
                                                            <video src={postVideoPreview} controls className="w-full h-full object-cover max-h-96" />
                                                            <button 
                                                                onClick={() => { setPostVideoFile(null); setPostVideoPreview(null); }}
                                                                className="absolute top-6 right-6 p-3 bg-black/60 text-white rounded-full hover:bg-rose-600 backdrop-blur-xl transition-all shadow-xl z-10"
                                                            >
                                                                <X className="w-6 h-6" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-50 dark:border-slate-900">
                                                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar">
                                                            <button 
                                                                onClick={() => document.getElementById('post-photo-upload-main')?.click()} 
                                                                className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 hover:text-indigo-600 rounded-2xl transition-all group shrink-0"
                                                            >
                                                                <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Photo</span>
                                                                <input type="file" id="post-photo-upload-main" className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setPostImageFile(file); setPostImagePreview(URL.createObjectURL(file)); setPostVideoFile(null); setPostVideoPreview(null); } }} />
                                                            </button>

                                                            <button 
                                                                onClick={() => document.getElementById('post-video-upload-main')?.click()} 
                                                                className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 hover:text-indigo-600 rounded-2xl transition-all group shrink-0"
                                                            >
                                                                <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Video</span>
                                                                <input type="file" id="post-video-upload-main" className="hidden" accept="video/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setPostVideoFile(file); setPostVideoPreview(URL.createObjectURL(file)); setPostImageFile(null); setPostImagePreview(null); } }} />
                                                            </button>
                                                        </div>
                                                        
                                                        <button 
                                                            onClick={handleCreatePost}
                                                            disabled={(!newPostContent.trim() && !postImageFile && !postVideoFile) || isPosting}
                                                            className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-2xl shadow-indigo-500/20 disabled:opacity-20 transition-all flex items-center justify-center gap-3 hover:scale-105 active:scale-95 group/broadcast"
                                                        >
                                                            {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />} 
                                                            Broadcast
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
                                                            className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 cursor-pointer shadow-sm group-hover/post:scale-105 transition-transform" 
                                                            onClick={post.authorId ? () => setViewedProfileId(post.authorId) : undefined}
                                                        >
                                                            {post.authorPhoto ? <img src={post.authorPhoto} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-slate-300" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <span 
                                                                    className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg cursor-pointer hover:text-indigo-600 transition-colors" 
                                                                    onClick={post.authorId ? () => setViewedProfileId(post.authorId) : undefined}
                                                                >
                                                                    {post.authorName}
                                                                </span>
                                                                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
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
                                                            <div className="flex items-center justify-between max-w-sm ml-[-8px]">
                                                                <button 
                                                                    onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)} 
                                                                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${selectedPost?.id === post.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                                                >
                                                                    <MessageSquare className="w-5 h-5" />
                                                                    <span className="text-xs font-black">{post.commentsCount || 0}</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleLike(post.id)} 
                                                                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${currentAlumna && (post.likes || []).includes(currentAlumna.id) ? 'bg-rose-50 text-rose-500' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-500'}`}
                                                                >
                                                                    <Heart className={`w-5 h-5 ${currentAlumna && (post.likes || []).includes(currentAlumna.id) ? 'fill-current' : ''}`} />
                                                                    <span className="text-xs font-black">{(post.likes || []).length}</span>
                                                                </button>
                                                                <button onClick={() => handleSharePost(post)} className="p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all">
                                                                    <Share2 className="w-5 h-5" />
                                                                </button>
                                                            </div>

                                                            {selectedPost?.id === post.id && (
                                                                <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-900 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                                                    <div className="space-y-6 max-h-96 overflow-y-auto no-scrollbar pr-4">
                                                                        {(comments[post.id] || []).map((comment) => (
                                                                            <div key={comment.id} className="flex gap-4 group/comment">
                                                                                <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-50">
                                                                                    {comment.authorPhoto ? <img src={comment.authorPhoto} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-300" />}
                                                                                </div>
                                                                                <div className="bg-slate-50 dark:bg-slate-900 rounded-[1.75rem] px-6 py-4 flex-1 shadow-sm group-hover/comment:bg-white dark:group-hover/comment:bg-slate-800 transition-colors">
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
                                                                                className="w-full h-14 pl-6 pr-16 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-600 transition-all font-display"
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
            <aside className="hidden lg:block w-80 p-6 sticky top-0 h-screen overflow-y-auto no-scrollbar">
                <div className="space-y-8">
                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Explore Network..." 
                            className="w-full h-14 pl-14 pr-8 bg-slate-100 dark:bg-slate-900 border-none rounded-[1.75rem] text-xs font-bold focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner"
                        />
                    </div>

                    {/* My Circles */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/20">
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
                                                <p className={`text-[11px] font-black uppercase tracking-tight truncate max-w-[140px] ${isActive ? 'text-indigo-600' : 'text-slate-900 dark:text-white'}`}>{inst!.name}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{isActive ? 'Current' : 'Social Circle'}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Trending Metrics */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Pulse Highlights</h3>
                        <div className="space-y-8">
                            {[
                                { tag: '#ClassOf' + currentAlumna.graduationYear, stats: '342 Members online' },
                                { tag: '#ImpactDay', stats: '2.4k contributions' },
                                { tag: '#LegacyNetworking', stats: '890 active threads' }
                            ].map((topic, idx) => (
                                <div key={topic.tag} className="group cursor-pointer">
                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></div>
                                        {topic.stats}
                                    </p>
                                    <p className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{topic.tag}</p>
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
            <nav className="md:hidden fixed bottom-0 inset-x-0 h-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl border-t border-slate-100 dark:border-slate-800 flex items-center justify-around px-4 z-[60] pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
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
                    <div className="absolute bottom-24 right-4 w-56 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-4 animate-in slide-in-from-bottom-5 duration-300 z-[70]">
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
            
            {/* Edit Profile Modal */}
            {isEditingProfile && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-500">
                        <header className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Profile <span className="text-indigo-600 italic">Persona</span></h2>
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
                                    <div className="w-full h-40 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] relative overflow-hidden group shadow-inner">
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
                                            <div className="w-full h-full rounded-[2.25rem] bg-slate-100 dark:bg-slate-800 overflow-hidden ring-4 ring-indigo-500/10 transition-transform group-hover:scale-105">
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
                                    <input type="text" value={profileData.fullName} onChange={(e) => setProfileData({...profileData, fullName: e.target.value})} className="w-full h-14 px-8 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all font-display shadow-inner" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Designation</label>
                                        <input type="text" value={profileData.currentJob} onChange={(e) => setProfileData({...profileData, currentJob: e.target.value})} className="w-full h-14 px-8 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner" />
                                    </div>
                                        <input type="text" value={profileData.currentCompany} onChange={(e) => setProfileData({...profileData, currentCompany: e.target.value})} className="w-full h-14 px-8 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                                <Zap className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">Mentorship Availability</h4>
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
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Professional Narrative</label>
                                    <textarea value={profileData.bio} onChange={(e) => setProfileData({...profileData, bio: e.target.value})} className="w-full h-40 p-8 bg-slate-100 dark:bg-slate-800 border-none rounded-[2rem] text-sm font-medium focus:ring-2 focus:ring-indigo-600 transition-all resize-none shadow-inner leading-relaxed" />
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
                                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-display">Switch <span className="text-indigo-600 italic">Circle</span></h3>
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
                <div className="fixed inset-0 bg-white dark:bg-slate-950 z-[110] md:ml-64 flex flex-col animate-in slide-in-from-right duration-500 scrolling-touch">
                    <header className="sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl z-50 border-b border-slate-100 dark:border-slate-800 px-6 py-6 flex items-center gap-6">
                        <button onClick={() => { setViewedProfileId(null); setViewedProfileData(null); }} className="p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl hover:bg-indigo-600 hover:text-white hover:scale-105 transition-all group shadow-sm">
                            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white truncate font-display">{viewedProfileData?.fullName || 'Legacy Member'}</h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">{profilePosts.length} Network Contributions</p>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto no-scrollbar scrolling-touch">
                        <div className="relative">
                            <div className="h-64 md:h-80 bg-slate-100 dark:bg-slate-800 relative overflow-hidden group">
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
                                <div className="w-40 h-40 md:w-56 md:h-56 rounded-[4rem] bg-white dark:bg-slate-950 p-3 shadow-2xl border border-white dark:border-slate-900">
                                    <div className="w-full h-full rounded-[3.5rem] bg-slate-50 dark:bg-slate-900 overflow-hidden ring-1 ring-indigo-500/20 shadow-inner">
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
                                        className="p-5 bg-white dark:bg-slate-900 text-indigo-600 border border-slate-100 dark:border-slate-800 rounded-3xl hover:bg-indigo-600 hover:text-white hover:scale-105 transition-all shadow-xl shadow-slate-100/50"
                                    >
                                        <MessageSquare className="w-8 h-8" />
                                    </button>
                                    <button 
                                        onClick={handleFollow}
                                        className={`px-12 py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.25em] hover:scale-105 transition-all shadow-2xl active:scale-95 ${isFollowing ? 'bg-slate-50 text-slate-400 border border-slate-100' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-indigo-500/20'}`}
                                    >
                                        {isFollowing ? 'Legacy Following' : 'Claim Follow'}
                                    </button>
                                </div>
                            </div>

                            <div className="px-10 mt-10 space-y-10">
                                <div>
                                    <div className="flex items-center gap-4 mb-3">
                                        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-display">{viewedProfileData?.fullName}</h1>
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
                                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{viewedProfileData?.currentCompany || 'EduAI Global'}</h4>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Designation</p>
                                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{viewedProfileData?.currentJob || 'Premium Alumna'}</h4>
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
                                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center font-black group-hover:bg-indigo-50 transition-all">{followStats.following}</div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-indigo-600">Following</span>
                                    </div>
                                    <div className="flex items-center gap-3 cursor-pointer group">
                                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center font-black group-hover:bg-indigo-50 transition-all">{followStats.followers}</div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-indigo-600">Followers</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Profile Social Layer */}
                        <div className="sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl z-40 border-b border-slate-100 dark:border-slate-800 mt-12 px-10">
                            <div className="flex gap-12">
                                {['Pulse', 'Media', 'Affiliations'].map((tab) => (
                                    <button 
                                        key={tab}
                                        onClick={() => setProfileActiveTab(tab.toLowerCase() as any)}
                                        className={`py-8 text-[11px] font-black uppercase tracking-[0.4em] relative transition-all ${profileActiveTab === tab.toLowerCase() ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'}`}
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
                                                    <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">{post.authorName}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base mb-6 font-medium">{post.content}</p>
                                                {post.photoUrl && (
                                                    <div className="mb-6 rounded-[3rem] overflow-hidden border-4 border-white dark:border-slate-900 shadow-2xl shadow-slate-200/50 group cursor-zoom-in" onClick={() => setZoomedImage(post.photoUrl || null)}>
                                                        <img src={post.photoUrl} className="w-full max-h-[500px] object-cover group-hover:scale-[1.03] transition-transform duration-1000" />
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-10 text-slate-400 ml-[-8px]">
                                                    <div className="flex items-center gap-3 px-4 py-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all cursor-pointer"><MessageSquare className="w-5 h-5" /><span className="text-xs font-black">{post.commentsCount}</span></div>
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
                                                    <div className="flex flex-col items-center gap-2"><MessageSquare className="w-7 h-7" /><span className="font-black text-sm">{post.commentsCount}</span></div>
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
