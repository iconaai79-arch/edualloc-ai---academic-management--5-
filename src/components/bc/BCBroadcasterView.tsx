import React, { useState, useEffect, useCallback } from 'react';
import { 
    Plus, Megaphone, Send, Volume2, Users, BookOpen, Sparkles, CheckCircle, 
    X, AlertTriangle, Search, Bell, Info, Mail
} from 'lucide-react';
import { apiService } from '../../services/apiService';

interface Broadcast {
    id: string;
    title: string;
    message: string;
    type: 'Practical' | 'Class' | 'Emergency' | 'Promo';
    priority: 'Critical' | 'High' | 'Medium';
    timestamp: string;
}

interface BCBroadcasterViewProps {
    currentInstitution?: any;
    students?: any[];
    trainers?: any[];
    onNewBroadcast?: () => void;
}

const MOCK_MESSAGES: Broadcast[] = [
    { id: 'b1', title: 'Nail Art Practical Session', message: 'Advanced Gel Polish and Acrylic Extension practical class begins at Lab 1 in 15 mins.', type: 'Practical', priority: 'Medium', timestamp: '5 mins ago' },
    { id: 'b2', title: 'Emergency Water Disruption', message: 'Main reservoir water levels low. Stylist washing bay 2 closed. Please use bay 1.', type: 'Emergency', priority: 'Critical', timestamp: '10 mins ago' },
    { id: 'b3', title: 'Hairdressing Theory Exam', message: 'Course evaluation exam for Level 1 Hairdressing scheduled for Monday 9:00 AM at Hall A.', type: 'Class', priority: 'High', timestamp: '2 hours ago' },
    { id: 'b4', title: 'Bridal Makeup Masterclass', message: 'Special demonstration by guest instructor starts at 2:00 PM today. Attendance mandatory.', type: 'Promo', priority: 'Medium', timestamp: '4 hours ago' },
];

const extractUrl = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
};

const calculateSmsPages = (msg: string) => {
    if (!msg) return 1;
    const isUnicode = /[^\u0000-\u007F\u0080-\u00FF,]/.test(msg);
    const charCount = msg.length;
    if (isUnicode) {
        return charCount <= 70 ? 1 : Math.ceil(charCount / 67);
    }
    return charCount <= 160 ? 1 : Math.ceil(charCount / 153);
};

export const BCBroadcasterView: React.FC<BCBroadcasterViewProps> = ({ currentInstitution, students = [], trainers = [] }) => {
    const [activeTab, setActiveTab] = useState<'Live Feed' | 'Sent' | 'Outbox'>('Live Feed');
    const [sentBroadcasts, setSentBroadcasts] = useState<any[]>([]);
    const [loadingSent, setLoadingSent] = useState(false);
    
    // Composer Modal state
    const [showComposer, setShowComposer] = useState(false);
    const [sending, setSending] = useState(false);
    const [form, setForm] = useState({
        title: '',
        message: '',
        target: 'All Beauty Academy' as 'BC Students' | 'BC Trainers' | 'All Beauty Academy',
        priority: 'Medium' as 'Critical' | 'High' | 'Medium',
        channels: {
            Portal: true,
            SMS: false,
            Email: false
        },
        includeShortlink: false
    });

    const instId = currentInstitution?.id || 'GLOBAL';

    const fetchSentBroadcasts = useCallback(async () => {
        if (!instId) return;
        setLoadingSent(true);
        try {
            const res = await apiService.fetchModuleRecords<any>('broadcaster_messages', instId, undefined, { limit: 100 });
            // Sort by created_at descending
            const sorted = (res || [])
                .filter((msg: any) => msg.target && (msg.target.startsWith('BC ') || msg.target === 'All Beauty Academy' || currentInstitution?.institutionType === 'Beauty College'))
                .sort((a: any, b: any) => {
                    const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
                    const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
                    return timeB - timeA;
                });
            setSentBroadcasts(sorted);
        } catch (e) {
            console.error("Failed to load sent broadcaster messages:", e);
        } finally {
            setLoadingSent(false);
        }
    }, [instId, currentInstitution?.institutionType]);

    useEffect(() => {
        if (activeTab === 'Sent') {
            fetchSentBroadcasts();
        }
    }, [activeTab, fetchSentBroadcasts]);

    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.message) {
            alert("Please fill in the title and message fields.");
            return;
        }

        setSending(true);
        try {
            // Determine targets
            let targetUsers: any[] = [];
            if (form.target === 'BC Students') {
                targetUsers = students;
            } else if (form.target === 'BC Trainers') {
                targetUsers = trainers;
            } else {
                targetUsers = [...students, ...trainers];
            }

            const channelsList: string[] = [];
            if (form.channels.Portal) channelsList.push('Portal');
            if (form.channels.SMS) channelsList.push('SMS');
            if (form.channels.Email) channelsList.push('Email');

            const priorityPrefix = form.priority === 'Critical' ? '🚨 [CRITICAL ALERT] ' : form.priority === 'High' ? '⚠️ [URGENT] ' : '';
            const broadcastId = `bc_${Date.now()}`;
            let finalMessage = form.message;

            // Shortlink options
            if (form.includeShortlink && (form.channels.SMS || form.channels.Email)) {
                const longUrl = `${window.location.origin}/?view=bc-booking&instId=${instId}&bc=${broadcastId}`;
                let shortUrl = '';
                try {
                    shortUrl = await apiService.shortenUrl(longUrl);
                } catch (urlErr) {
                    console.error("URL shortener failed, falling back to long URL:", urlErr);
                    shortUrl = longUrl;
                }
                finalMessage = `${form.message}\n\nBook / View Details: ${shortUrl}`;
            }

            const phones: string[] = [];
            const emails: string[] = [];

            targetUsers.forEach(u => {
                const phone = u.phone || u.phoneNumber;
                const email = u.email;
                if (form.channels.SMS && phone) phones.push(phone);
                if (form.channels.Email && email) emails.push(email);
            });

            const currentBalance = currentInstitution?.smsBalance || 0;
            const fullMsg = `${priorityPrefix}${form.title}: ${finalMessage}`;
            const pages = calculateSmsPages(fullMsg);
            const requiredUnits = phones.length * pages;

            if (form.channels.SMS && phones.length > 0) {
                if (currentBalance < requiredUnits) {
                    alert(`Insufficient SMS units. Required: ${requiredUnits}, Available: ${currentBalance}. Please top up.`);
                    setSending(false);
                    return;
                }
                await apiService.sendSms(phones, fullMsg, currentInstitution?.smsConfig, pages, instId);
            }

            if (form.channels.Email && emails.length > 0) {
                await Promise.all(emails.map(email => apiService.sendEmail(email, `${priorityPrefix}${form.title}`, finalMessage)));
            }

            // Log broadcast history
            const logRecord = {
                id: broadcastId,
                institutionId: instId,
                target: form.target,
                channel: channelsList.join(' / '),
                subject: form.title,
                body: finalMessage,
                recipientsCount: targetUsers.length,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('broadcaster_messages', logRecord);

            alert(`Broadcast successfully sent to ${targetUsers.length} recipients.`);
            setShowComposer(false);
            setForm({
                title: '',
                message: '',
                target: 'All Beauty Academy',
                priority: 'Medium',
                channels: { Portal: true, SMS: false, Email: false },
                includeShortlink: false
            });
            if (activeTab === 'Sent') {
                fetchSentBroadcasts();
            } else {
                setActiveTab('Sent');
            }
        } catch (error) {
            console.error("Broadcaster error:", error);
            alert("An error occurred while sending the broadcast message.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-8 text-left">
            {/* Header section with Rose accent */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                        Academy <span className="text-rose-600">Broadcaster</span>
                    </h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">
                        Push messaging and SMS gateway hub for beauty training centers
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-4 w-full md:w-auto">
                    <button 
                        onClick={() => {
                            setForm(f => ({ ...f, priority: 'Critical' }));
                            setShowComposer(true);
                        }}
                        className="flex-1 md:flex-none bg-rose-600 text-white px-6 md:px-8 py-3 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-rose-600/25"
                    >
                        <AlertTriangle className="w-4 h-4" /> Trigger Alert
                    </button>
                    <button 
                        onClick={() => setShowComposer(true)}
                        className="flex-1 md:flex-none bg-indigo-600 text-white px-6 md:px-8 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-600/25"
                    >
                        <Plus className="w-4 h-4" /> New Broadcast
                    </button>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Main Content Pane */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 text-slate-900 dark:text-white">
                                <Volume2 className="w-6 h-6 text-rose-600 animate-pulse" /> Signal <span className="text-rose-600">Mixer</span>
                            </h3>
                            <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100">
                                SMS Status: Connected
                            </span>
                        </div>

                        {/* Subtabs */}
                        <div className="flex gap-2 mb-8 border-b border-slate-100 dark:border-slate-800 pb-4 overflow-x-auto scrollbar-hide">
                            {['Live Feed', 'Sent', 'Outbox'].map(tab => (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all ${
                                        activeTab === tab 
                                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-900/50' 
                                        : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab Contents */}
                        <div className="space-y-4">
                            {activeTab === 'Outbox' ? (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        <Megaphone className="w-8 h-8 opacity-50" />
                                    </div>
                                    <h4 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Outbox is Empty</h4>
                                    <p className="text-xs text-slate-400 mt-2">All queued hair, beauty, and makeup broadcasts are dispatched.</p>
                                </div>
                            ) : activeTab === 'Sent' ? (
                                loadingSent ? (
                                    <div className="text-center py-12">
                                        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading campaign log...</p>
                                    </div>
                                ) : sentBroadcasts.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <Megaphone className="w-8 h-8 opacity-50" />
                                        </div>
                                        <h4 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">No sent logs found</h4>
                                        <p className="text-xs text-slate-400 mt-2">Historical SMS and student portal campaigns will be saved here.</p>
                                    </div>
                                ) : (
                                    sentBroadcasts.map((msg, idx) => {
                                        const dateStr = new Date(msg.created_at || msg.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                                        return (
                                            <div key={idx} className="p-6 rounded-[2rem] border bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:shadow-md transition-all">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                                    <div className="flex gap-4">
                                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50 text-rose-600">
                                                            <Megaphone className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">{msg.subject || 'Academy Campaign'}</h4>
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{dateStr}</span>
                                                                <span className="text-[9px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-md uppercase tracking-wider">{msg.channel}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 rounded-xl text-[9px] font-black uppercase tracking-wider">
                                                        👥 {msg.recipientsCount || msg.recipients_count || 0} Targets
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 pl-0 sm:pl-16 whitespace-pre-line leading-relaxed">{msg.body}</p>
                                            </div>
                                        );
                                    })
                                )
                            ) : (
                                MOCK_MESSAGES.map((msg, idx) => (
                                    <div key={idx} className={`p-6 rounded-[2rem] border transition-all ${
                                        msg.type === 'Emergency' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                                    }`}>
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                            <div className="flex gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                                    msg.type === 'Emergency' ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50 text-rose-600'
                                                }`}>
                                                    {msg.type === 'Practical' ? <BookOpen className="w-5 h-5" /> : 
                                                     msg.type === 'Class' ? <Users className="w-5 h-5" /> : 
                                                     msg.type === 'Promo' ? <Sparkles className="w-5 h-5" /> :
                                                     <Megaphone className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">{msg.title}</h4>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{msg.timestamp}</p>
                                                </div>
                                            </div>
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                msg.priority === 'Critical' ? 'bg-rose-600 text-white' : 
                                                msg.priority === 'High' ? 'bg-amber-150 text-amber-700' :
                                                'bg-white/50 dark:bg-slate-850 text-slate-400'
                                            }`}>
                                                {msg.priority} Priority
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 pl-0 sm:pl-16 leading-relaxed">{msg.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side Control Hub */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic text-slate-900 dark:text-white">
                            Paging <span className="text-rose-600">Nodes</span>
                        </h3>
                        
                        <div className="space-y-6">
                            {[
                                { label: 'Main Styling Studio', status: 'Casting', icon: Volume2 },
                                { label: 'Makeup Laboratory', status: 'Casting', icon: Volume2 },
                                { label: 'Hairdressing Salon', status: 'Silent', icon: Volume2 },
                                { label: 'Reception Area', status: 'Casting', icon: Bell },
                                { label: 'Student Mobile Alert', status: 'Casting', icon: Search }
                            ].map((node, idx) => (
                                <div key={idx} className="flex justify-between items-center group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl transition-all">
                                    <div className="flex items-center gap-3">
                                        <node.icon className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                            {node.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${node.status === 'Casting' ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {node.status}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full ${node.status === 'Casting' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic text-slate-900 dark:text-white">
                            Audience <span className="text-rose-600">Reach</span>
                        </h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-rose-600" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Academy Students</p>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-450 mt-0.5">Active Learners</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{students.length}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Trainers / Faculty</p>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-450 mt-0.5">Academy Instructors</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{trainers.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Composer Modal */}
            {showComposer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-8 md:p-10 text-left animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-8 border-b pb-4 border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    <Megaphone className="w-6 h-6 text-rose-600" /> Academy Broadcast
                                </h3>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">Send priority announcements and target group alerts</p>
                            </div>
                            <button 
                                onClick={() => setShowComposer(false)}
                                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSendBroadcast} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Target Audience</label>
                                    <select 
                                        value={form.target} 
                                        onChange={e => setForm(f => ({ ...f, target: e.target.value as any }))}
                                        className="w-full bg-slate-50 dark:bg-slate-850 border-2 border-transparent focus:border-rose-500 rounded-2xl p-4 font-bold outline-none text-xs"
                                    >
                                        <option value="All Beauty Academy">All Academy (Students & Staff)</option>
                                        <option value="BC Students">Academy Students ({students.length})</option>
                                        <option value="BC Trainers">Academy Trainers ({trainers.length})</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Broadcast Priority</label>
                                    <select 
                                        value={form.priority} 
                                        onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}
                                        className="w-full bg-slate-50 dark:bg-slate-850 border-2 border-transparent focus:border-rose-500 rounded-2xl p-4 font-bold outline-none text-xs"
                                    >
                                        <option value="Medium">Medium Priority</option>
                                        <option value="High">High Priority ⚠️</option>
                                        <option value="Critical">Critical Alert 🚨</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Announcement Subject</label>
                                <input 
                                    type="text"
                                    placeholder="e.g. Schedule Update or Practical Session Alert"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-855 border-2 border-transparent focus:border-rose-500 rounded-2xl p-4 font-bold outline-none text-xs"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message Body</label>
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                        Chars: {form.message.length} | Pages: {calculateSmsPages(form.message)}
                                    </span>
                                </div>
                                <textarea 
                                    placeholder="Write your announcement or alert message details here..."
                                    value={form.message}
                                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                    required
                                    rows={5}
                                    className="w-full bg-slate-50 dark:bg-slate-855 border-2 border-transparent focus:border-rose-500 rounded-2xl p-4 font-bold outline-none text-xs leading-relaxed"
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-3xl space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Transmission Channels</p>
                                <div className="flex flex-wrap gap-6">
                                    <label className="flex items-center gap-3 font-bold text-xs cursor-pointer select-none text-slate-700 dark:text-slate-300">
                                        <input 
                                            type="checkbox"
                                            checked={form.channels.Portal}
                                            onChange={e => setForm(f => ({ ...f, channels: { ...f.channels, Portal: e.target.checked } }))}
                                            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                                        />
                                        Student Portal Feed
                                    </label>
                                    <label className="flex items-center gap-3 font-bold text-xs cursor-pointer select-none text-slate-700 dark:text-slate-300">
                                        <input 
                                            type="checkbox"
                                            checked={form.channels.SMS}
                                            onChange={e => setForm(f => ({ ...f, channels: { ...f.channels, SMS: e.target.checked } }))}
                                            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                                        />
                                        SMS Gateway
                                    </label>
                                    <label className="flex items-center gap-3 font-bold text-xs cursor-pointer select-none text-slate-700 dark:text-slate-300">
                                        <input 
                                            type="checkbox"
                                            checked={form.channels.Email}
                                            onChange={e => setForm(f => ({ ...f, channels: { ...f.channels, Email: e.target.checked } }))}
                                            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                                        />
                                        Email Campaign
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-2">
                                <label className="flex items-center gap-3 font-bold text-xs cursor-pointer select-none text-slate-700 dark:text-slate-300">
                                    <input 
                                        type="checkbox"
                                        checked={form.includeShortlink}
                                        onChange={e => setForm(f => ({ ...f, includeShortlink: e.target.checked }))}
                                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                                    />
                                    Shorten and attach booking / registration shortlink
                                </label>
                            </div>

                            <button 
                                type="submit"
                                disabled={sending}
                                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 shadow-xl shadow-rose-600/25 mt-4"
                            >
                                {sending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Dispatching...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" /> Trigger Academy Broadcast
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
