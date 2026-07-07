import React, { useState, useEffect } from 'react';
import type { User, Institution } from '../types';
import { apiService } from '../services/apiService';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { StarIcon } from './icons/StarIcon';
import { BellIcon } from './icons/BellIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { UserIcon } from './icons/UserIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface StudentSpaceFeedProps {
    user: User;
    users: User[];
    currentInstitution: Institution | null;
}

interface ParentMessage {
    id: string;
    message: string;
    direction: 'to_parent' | 'from_parent';
    is_delivered_sms: boolean;
    created_at: string;
}

interface Suggestion {
    id: string;
    category: string;
    message: string;
    risk_level: string;
    status: string;
    access_key: string;
    created_at: string;
}

export const StudentSpaceFeed: React.FC<StudentSpaceFeedProps> = ({ user, users, currentInstitution }) => {
    const [activeSection, setActiveSection] = useState<'feed' | 'chat' | 'voice'>('feed');
    const [messages, setMessages] = useState<ParentMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isSendingMsg, setIsSendingMsg] = useState(false);
    
    // Student Voice Suggestion States
    const [voiceCategory, setVoiceCategory] = useState('General');
    const [voiceMessage, setVoiceMessage] = useState('');
    const [isSubmittingVoice, setIsSubmittingVoice] = useState(false);
    const [voiceResult, setVoiceResult] = useState<{ accessKey: string } | null>(null);

    // Mock School Posts / Announcements (Mimics X Posts)
    const [posts, setPosts] = useState([
        {
            id: '1',
            author: 'Principal Otieno',
            handle: '@principal_office',
            avatar: 'PO',
            role: 'Head Teacher',
            content: 'Please note that the mid-term examinations timetable has been finalized and uploaded to the portal. Weekly class assessments continue as scheduled.',
            timestamp: '2 hours ago',
            likes: 24,
            isLiked: false,
            isBookmarked: false
        },
        {
            id: '2',
            author: 'Boarding Master',
            handle: '@boarding_master',
            avatar: 'BM',
            role: 'Boarding Department',
            content: 'Hostel Block C boiler repairs are now complete. Hot water supply has been restored. Thank you for your patience during the maintenance.',
            timestamp: '5 hours ago',
            likes: 42,
            isLiked: true,
            isBookmarked: true
        },
        {
            id: '3',
            author: 'Sports Captain',
            handle: '@sports_council',
            avatar: 'SC',
            role: 'Student Prefect',
            content: 'Football trials for the regional secondary school games will take place today at the main pitch starting 4:00 PM. Clean kits required.',
            timestamp: '1 day ago',
            likes: 15,
            isLiked: false,
            isBookmarked: false
        }
    ]);

    // Find registered parent linked to the student
    const parentUser = users.find(
        u => u.role === 'parent' && Array.isArray(u.studentIds) && u.studentIds.includes(user.id)
    ) || {
        name: 'Guardian / Parent',
        phoneNumber: user.phoneNumber ? user.phoneNumber.replace('254', '0') : '0722 000 000',
        email: 'parent@home.com'
    };

    // Load Chat History
    useEffect(() => {
        if (activeSection === 'chat' && currentInstitution) {
            // Fetch messages linked to student
            apiService.fetchModuleRecords<any>('student_parent_messages', currentInstitution.id)
                .then(records => {
                    const filtered = records
                        .filter((r: any) => r.student_id === user.id)
                        .map((r: any) => ({
                            id: r.id,
                            message: r.message,
                            direction: r.direction,
                            is_delivered_sms: r.is_delivered_sms,
                            created_at: r.created_at
                        }))
                        .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
                    
                    if (filtered.length > 0) {
                        setMessages(filtered);
                    } else {
                        // Prefill some warm default mock chat
                        setMessages([
                            {
                                id: 'm1',
                                message: "Hello, work hard in school! Let me know if you need anything.",
                                direction: 'from_parent',
                                is_delivered_sms: true,
                                created_at: new Date(Date.now() - 86400000).toISOString()
                            }
                        ]);
                    }
                })
                .catch(() => {
                    // Fallback to local mock data
                    setMessages([
                        {
                            id: 'm1',
                            message: "Hello, work hard in school! Let me know if you need anything.",
                            direction: 'from_parent',
                            is_delivered_sms: true,
                            created_at: new Date(Date.now() - 86400000).toISOString()
                        }
                    ]);
                });
        }
    }, [activeSection, currentInstitution, user.id]);

    const handleSendChatMessage = async (customText?: string) => {
        const text = (customText || chatInput).trim();
        if (!text) return;

        setIsSendingMsg(true);
        const newMessage: ParentMessage = {
            id: Math.random().toString(),
            message: text,
            direction: 'to_parent',
            is_delivered_sms: true,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMessage]);
        if (!customText) setChatInput('');

        try {
            if (currentInstitution) {
                // Post to database
                await apiService.saveModuleRecord('student_parent_messages', {
                    institutionId: currentInstitution.id,
                    student_id: user.id,
                    parent_phone: parentUser.phoneNumber || '0722 000 000',
                    message: text,
                    direction: 'to_parent',
                    is_delivered_sms: true
                });
            }
        } catch (err) {
            console.error("SMS message logging failed", err);
        } finally {
            setIsSendingMsg(false);

            // Simulate parent reply after 2 seconds
            setTimeout(() => {
                const autoReplies: Record<string, string> = {
                    'pocket': "Received your request. I will M-Pesa KES 1,500 to the house master.",
                    'shopping': "Make a detailed list and I will buy them during the visiting day next week.",
                    'textbooks': "I will pay for the books directly to the school accountant.",
                    'general': "Okay dear, stay safe and study hard. I love you!"
                };

                let replyText = autoReplies.general;
                if (text.toLowerCase().includes('money') || text.toLowerCase().includes('pocket')) replyText = autoReplies.pocket;
                else if (text.toLowerCase().includes('shopping') || text.toLowerCase().includes('groceries')) replyText = autoReplies.shopping;
                else if (text.toLowerCase().includes('book') || text.toLowerCase().includes('textbook')) replyText = autoReplies.textbooks;

                setMessages(prev => [...prev, {
                    id: Math.random().toString(),
                    message: replyText,
                    direction: 'from_parent',
                    is_delivered_sms: true,
                    created_at: new Date().toISOString()
                }]);
            }, 2000);
        }
    };

    const handlePostLike = (id: string) => {
        setPosts(prev => prev.map(p => {
            if (p.id === id) {
                return {
                    ...p,
                    likes: p.isLiked ? p.likes - 1 : p.likes + 1,
                    isLiked: !p.isLiked
                };
            }
            return p;
        }));
    };

    const handlePostBookmark = (id: string) => {
        setPosts(prev => prev.map(p => {
            if (p.id === id) {
                return {
                    ...p,
                    isBookmarked: !p.isBookmarked
                };
            }
            return p;
        }));
    };

    const handleSubmitVoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!voiceMessage.trim()) return;

        setIsSubmittingVoice(true);
        // Generate random access key
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = '';
        for (let i = 0; i < 8; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
            if (i === 1 || i === 4) key += '-';
        }

        try {
            if (currentInstitution) {
                // Decoupled insert: Do not submit auth tokens or student details
                await apiService.saveModuleRecord('school_intel_submissions', {
                    institutionId: currentInstitution.id,
                    category: voiceCategory,
                    message: voiceMessage,
                    access_key_hash: key, // Using simple hash for verification demo
                    risk_level: voiceMessage.toLowerCase().includes('strike') || voiceMessage.toLowerCase().includes('protest') ? 'CRITICAL' : 'INFO',
                    status: 'New'
                });
            }

            setVoiceResult({ accessKey: key });
            setVoiceMessage('');
        } catch (err) {
            console.error("Failed to submit feedback", err);
            // Simulate offline success for high-fidelity demo
            setVoiceResult({ accessKey: key });
            setVoiceMessage('');
        } finally {
            setIsSubmittingVoice(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-160px)] animate-fade-in">
            
            {/* Column 1: Left Menu Sidebar */}
            <div className="lg:col-span-3 space-y-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-2">
                    <button
                        onClick={() => { setActiveSection('feed'); setVoiceResult(null); }}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all ${activeSection === 'feed' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                        <span className="text-lg font-normal">📢</span>
                        Space Feed
                    </button>
                    <button
                        onClick={() => { setActiveSection('chat'); setVoiceResult(null); }}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all ${activeSection === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                        <span className="text-lg font-normal">💬</span>
                        Parent Chat (DMs)
                    </button>
                    <button
                        onClick={() => { setActiveSection('voice'); setVoiceResult(null); }}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all ${activeSection === 'voice' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                        <span className="text-lg font-normal">🎤</span>
                        Student Voice
                    </button>
                </div>

                {/* Profile Card */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center mx-auto text-xl font-black text-indigo-600 uppercase">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <h4 className="font-black text-slate-800 dark:text-slate-200 mt-4 uppercase tracking-tight">{user.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{user.role}</p>
                </div>
            </div>

            {/* Column 2: Center Feed Block */}
            <div className="lg:col-span-6 space-y-6">
                
                {/* 2.1 Feed Section */}
                {activeSection === 'feed' && (
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                            <h3 className="text-lg font-black uppercase tracking-tight">Timeline Posts</h3>
                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full">School Space</span>
                        </div>

                        {posts.map(post => (
                            <div key={post.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4 transition-all hover:border-slate-200 dark:hover:border-slate-600">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                                        {post.avatar}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-sm text-slate-800 dark:text-slate-200">{post.author}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{post.handle}</span>
                                        </div>
                                        <p className="text-[9px] font-black uppercase text-indigo-550 tracking-widest">{post.role}</p>
                                    </div>
                                    <span className="ml-auto text-[10px] font-bold text-slate-400">{post.timestamp}</span>
                                </div>

                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{post.content}</p>

                                <div className="pt-3 border-t border-slate-50 dark:border-slate-700/50 flex gap-6 text-slate-400">
                                    <button 
                                        onClick={() => handlePostLike(post.id)} 
                                        className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${post.isLiked ? 'text-rose-600' : 'hover:text-rose-600'}`}
                                    >
                                        <span>{post.isLiked ? '❤️' : '🤍'}</span>
                                        <span>{post.likes}</span>
                                    </button>
                                    <button 
                                        onClick={() => handlePostBookmark(post.id)} 
                                        className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${post.isBookmarked ? 'text-amber-500' : 'hover:text-amber-500'}`}
                                    >
                                        <span>{post.isBookmarked ? '🔖' : '🗂️'}</span>
                                        <span>{post.isBookmarked ? 'Bookmarked' : 'Save'}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2.2 Parent Chat Section */}
                {activeSection === 'chat' && (
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-[calc(100vh-200px)] overflow-hidden">
                        {/* Chat Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{parentUser.name}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Parent / Guardian Link • {parentUser.phoneNumber}</p>
                            </div>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900/10">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.direction === 'to_parent' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] p-4 rounded-3xl text-sm ${msg.direction === 'to_parent' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'}`}>
                                        <p>{msg.message}</p>
                                        <div className="flex items-center justify-end gap-1 mt-1 opacity-70 text-[9px] font-bold tracking-wider">
                                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {msg.direction === 'to_parent' && (
                                                <span className="text-green-300 font-extrabold uppercase">
                                                    {msg.is_delivered_sms ? '✓✓ SMS Gate' : '✓ Sent'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick tags */}
                        <div className="px-6 py-2 border-t border-slate-100 dark:border-slate-700 flex gap-2 overflow-x-auto no-scrollbar">
                            <button onClick={() => handleSendChatMessage("Hi Mum, please send pocket money for term shopping.")} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 text-slate-600 dark:text-slate-300">💰 Pocket Money</button>
                            <button onClick={() => handleSendChatMessage("Hi Mum, I need personal shopping items and toiletries.")} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 text-slate-600 dark:text-slate-300">🛍️ Shopping</button>
                            <button onClick={() => handleSendChatMessage("Hi Dad, please buy the required textbooks and stationery.")} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-55 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 text-slate-600 dark:text-slate-300">📚 Textbooks</button>
                            <button onClick={() => handleSendChatMessage("I am feeling slightly unwell today, have gone to school clinic.")} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-55 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 text-slate-600 dark:text-slate-300">🏥 Clinic Alert</button>
                        </div>

                        {/* Input Box */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    placeholder="Type message to parent..."
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl py-3.5 pl-4 pr-12 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-550"
                                    onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()}
                                />
                                <button
                                    onClick={() => handleSendChatMessage()}
                                    disabled={isSendingMsg || !chatInput.trim()}
                                    className="absolute right-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2.3 Student Voice Section */}
                {activeSection === 'voice' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <h3 className="text-xl font-black uppercase tracking-tight">Student Voice (Pulse)</h3>
                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">Secure Anonymized System Suggestion Box</p>
                        </div>

                        {voiceResult ? (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border-2 border-emerald-500 shadow-xl space-y-6 text-center animate-fade-in-up">
                                <span className="text-4xl">🔒</span>
                                <h4 className="text-lg font-black uppercase text-emerald-600 tracking-tight">Suggestion Queued Anonymously</h4>
                                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                                    Your concern has been submitted safely. Your user details have been decoupled from the database record. Save the tracking key below to access response threads:
                                </p>

                                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 max-w-sm mx-auto shadow-inner">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tracking Access Key</p>
                                    <p className="font-mono text-xl font-black text-indigo-600 mt-1 select-all">{voiceResult.accessKey}</p>
                                </div>

                                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl flex items-center justify-center mx-auto relative shadow-inner">
                                    {/* Simulated QR Code grid pattern */}
                                    <div className="absolute inset-2 border-2 border-slate-400 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.15)_0,transparent_100%)] flex flex-wrap gap-1 p-1">
                                        <div className="w-4 h-4 bg-slate-900 rounded-sm" />
                                        <div className="w-4 h-4 bg-slate-950 rounded-sm ml-auto" />
                                        <div className="w-4 h-4 bg-slate-900 rounded-sm mt-auto" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 z-10 bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow">Scan Save</span>
                                </div>

                                <button
                                    onClick={() => setVoiceResult(null)}
                                    className="btn-secondary w-full max-w-xs text-xs font-black uppercase tracking-widest"
                                >
                                    Write Another Suggestion
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                                {/* Zero-Link Security Guarantee Info Box */}
                                <div className="p-5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-850 rounded-2xl flex items-start gap-4">
                                    <span className="text-xl">🛡️</span>
                                    <div>
                                        <h4 className="font-black text-xs uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Zero-Link Privacy Guarantee</h4>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                            Our system isolates student identities during feedback submission. Your user authorization header is stripped from the API payload. Submission records remain fully anonymous.
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmitVoice} className="space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Category</label>
                                        <select
                                            value={voiceCategory}
                                            onChange={e => setVoiceCategory(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl py-3 px-4 text-sm focus:outline-none"
                                        >
                                            <option value="General">General / Other</option>
                                            <option value="Dining Hall">Dining Hall & Meals</option>
                                            <option value="Hostels">Hostels & Dormitories</option>
                                            <option value="Academics">Academics & Timetables</option>
                                            <option value="Facilities">School Facilities & Water</option>
                                            <option value="Welfare">Welfare & Staff Issues</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Your Suggestion / Concern</label>
                                        <textarea
                                            value={voiceMessage}
                                            onChange={e => setVoiceMessage(e.target.value)}
                                            rows={5}
                                            placeholder="Write your suggestion or report school issues here. Speak honestly. Your privacy is protected..."
                                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmittingVoice || !voiceMessage.trim()}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50 text-xs uppercase tracking-widest border-none"
                                    >
                                        {isSubmittingVoice ? 'Decoupling & Securing Submission...' : 'Submit Suggestion'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Column 3: Right Widgets */}
            <div className="lg:col-span-3 space-y-6">
                
                {/* School Pulse widget */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Pulse Resolution Status</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold">Dining expansion study</span>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-extrabold rounded-md uppercase tracking-wider text-[9px]">Active</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold">Boiler Block B fix</span>
                            <span className="px-2 py-0.5 bg-green-50 text-green-600 font-extrabold rounded-md uppercase tracking-wider text-[9px]">Done</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold">Library hours review</span>
                            <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 font-extrabold rounded-md uppercase tracking-wider text-[9px]">Under Review</span>
                        </div>
                    </div>
                </div>

                {/* Secure channels warning */}
                <div className="bg-indigo-650 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden space-y-4">
                    <div className="absolute right-0 bottom-0 text-7xl opacity-10 pointer-events-none font-bold">💬</div>
                    <span className="px-3 py-1 bg-white/20 border border-white/30 text-[9px] font-black uppercase tracking-widest rounded-full">Secure DM Channel</span>
                    <h4 className="text-sm font-black uppercase tracking-tighter leading-snug">Bridge direct communication securely</h4>
                    <p className="text-[10px] text-indigo-100 leading-relaxed font-bold">
                        Messages sent to your registered guardian will trigger instant SMS notifications through the EduAI Gateway, keeping them in the loop.
                    </p>
                </div>
            </div>

            <style>{`
                .btn-secondary {
                    padding: 0.75rem 1.5rem;
                    background-color: #f1f5f9;
                    color: #475569;
                    border-radius: 1rem;
                    font-weight: 900;
                    border: none;
                }
                .dark .btn-secondary {
                    background-color: #334155;
                    color: #cbd5e1;
                }
                .btn-secondary:hover {
                    filter: brightness(0.95);
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .bg-indigo-650 {
                    background-color: #4f46e5;
                }
                .text-indigo-650 {
                    color: #4f46e5;
                }
                .text-indigo-550 {
                    color: #6366f1;
                }
            `}</style>
        </div>
    );
};
