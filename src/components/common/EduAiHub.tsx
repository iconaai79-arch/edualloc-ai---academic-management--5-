import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Sparkles, Send, Loader2, Bot, User, Copy, Check,
    RotateCcw, BookOpen, DollarSign, Car, Scissors,
    TrendingUp, ChevronRight, Zap, MessageSquare
} from 'lucide-react';
import { getInstitutionAwareChatResponse } from '../../services/geminiService';
import { apiService } from '../../services/apiService';

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

interface EduAiHubProps {
    currentUser: any;
    currentInstitution: any;
}

// Simple markdown renderer
function renderMarkdown(text: string): React.ReactNode {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let key = 0;

    const renderInline = (line: string): React.ReactNode => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) =>
            part.startsWith('**') && part.endsWith('**')
                ? <strong key={i} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>
                : <span key={i}>{part}</span>
        );
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) {
            elements.push(<div key={key++} className="h-2" />);
        } else if (line.match(/^#{1,3}\s/)) {
            elements.push(<p key={key++} className="font-black text-slate-900 dark:text-white text-sm mt-2 mb-1">{renderInline(line.replace(/^#{1,3}\s/, ''))}</p>);
        } else if (line.match(/^[-\u2022*]\s/)) {
            elements.push(
                <div key={key++} className="flex gap-2 items-start my-0.5">
                    <span className="text-indigo-400 mt-1 shrink-0">&bull;</span>
                    <span className="text-sm">{renderInline(line.replace(/^[-\u2022*]\s/, ''))}</span>
                </div>
            );
        } else if (line.match(/^\d+\.\s/)) {
            const match = line.match(/^(\d+)\.\s(.*)/)!;
            elements.push(
                <div key={key++} className="flex gap-2 items-start my-0.5">
                    <span className="text-indigo-400 font-bold text-xs mt-0.5 shrink-0 w-4">{match[1]}.</span>
                    <span className="text-sm">{renderInline(match[2])}</span>
                </div>
            );
        } else {
            elements.push(<p key={key++} className="text-sm leading-relaxed">{renderInline(line)}</p>);
        }
    }
    return <div className="space-y-0.5">{elements}</div>;
}

const QUICK_PROMPTS = [
    { category: 'Academic', icon: BookOpen, color: 'indigo', prompts: ['How many students are currently enrolled?', 'Which students have incomplete registrations?', 'Summarize active courses and departments'] },
    { category: 'Finance', icon: DollarSign, color: 'emerald', prompts: ['What is the total outstanding fee balance?', 'How many invoices have unpaid balances?', 'Which module collects the most revenue?'] },
    { category: 'Driving School', icon: Car, color: 'amber', prompts: ['How many DS students have pending practicals?', 'Summarize DS fee collection status', 'Which DS students have overdue payments?'] },
    { category: 'Beauty College', icon: Scissors, color: 'pink', prompts: ['How many BC students are awaiting kit?', 'Summarize BC practical hours progress', 'What is the BC outstanding balance?'] },
    { category: 'Analytics', icon: TrendingUp, color: 'violet', prompts: ['Give me a full institution health summary', 'What are the top 3 action items for today?', 'Compare revenue across all modules'] },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; chip: string }> = {
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', chip: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 border-indigo-200 dark:border-indigo-700' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', chip: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 border-emerald-200 dark:border-emerald-700' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', chip: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 border-amber-200 dark:border-amber-700' },
    pink: { bg: 'bg-pink-50 dark:bg-pink-950/30', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800', chip: 'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-900 border-pink-200 dark:border-pink-700' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', chip: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900 border-violet-200 dark:border-violet-700' },
};

const STORAGE_KEY = 'eduai_hub_chat_history';

export const EduAiHub: React.FC<EduAiHubProps> = ({ currentUser, currentInstitution }) => {
    const instId = currentInstitution?.id || 'GLOBAL';
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [contextSnapshot, setContextSnapshot] = useState<string>('');
    const [contextLoading, setContextLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load chat history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`${STORAGE_KEY}_${instId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
            } catch { /* ignore */ }
        }
    }, [instId]);

    // Build live context snapshot
    useEffect(() => {
        const buildContext = async () => {
            setContextLoading(true);
            try {
                const [students, invoices, payments, courses, bcStudents, bcInvoices, bcPayments, bcCourses, dsStudents, dsInvoices, dsPayments] = await Promise.all([
                    apiService.fetchModuleRecords('students', instId).catch(() => []),
                    apiService.fetchModuleRecords('invoices', instId).catch(() => []),
                    apiService.fetchModuleRecords('payments', instId).catch(() => []),
                    apiService.fetchModuleRecords('courses', instId).catch(() => []),
                    apiService.fetchModuleRecords('bc_students', instId).catch(() => []),
                    apiService.fetchModuleRecords('bc_invoices', instId).catch(() => []),
                    apiService.fetchModuleRecords('bc_payments', instId).catch(() => []),
                    apiService.fetchModuleRecords('bc_courses', instId).catch(() => []),
                    apiService.fetchModuleRecords('ds_students', instId).catch(() => []),
                    apiService.fetchModuleRecords('ds_invoices', instId).catch(() => []),
                    apiService.fetchModuleRecords('ds_payments', instId).catch(() => []),
                ]);

                const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                const totalBalance = invoices.reduce((s: number, inv: any) => s + Number(inv.balance || 0), 0);
                const overdueInvoices = invoices.filter((inv: any) => Number(inv.balance || 0) > 0).length;
                const bcPaid = bcPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                const bcBalance = bcInvoices.reduce((s: number, inv: any) => s + Number(inv.balance || 0), 0);
                const bcKitPending = bcStudents.filter((s: any) => s.kitIssuedStatus !== 'Issued').length;
                const dsPaid = dsPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                const dsBalance = dsInvoices.reduce((s: number, inv: any) => s + Number(inv.balance || 0), 0);

                const snap = `You are EduAI, an intelligent assistant for ${currentInstitution?.name || 'this institution'}.
Institution Type: ${currentInstitution?.type || 'Educational'}
Current User: ${currentUser?.name || 'Admin'} (${currentUser?.role || 'admin'})

=== MAIN CAMPUS / EDUFLOW ===
Total Students: ${students.length} | Active Courses: ${courses.length}
Fees Collected: KES ${totalPaid.toLocaleString()} | Outstanding: KES ${totalBalance.toLocaleString()}
Invoices with unpaid balance: ${overdueInvoices}

=== BEAUTY COLLEGE (BC) ===
BC Students: ${bcStudents.length} | BC Courses: ${bcCourses.length}
Kit Not Issued: ${bcKitPending} students
BC Collected: KES ${bcPaid.toLocaleString()} | BC Outstanding: KES ${bcBalance.toLocaleString()}

=== DRIVING SCHOOL (DS) ===
DS Students: ${dsStudents.length}
DS Collected: KES ${dsPaid.toLocaleString()} | DS Outstanding: KES ${dsBalance.toLocaleString()}

Answer all questions based on this live data. Be concise and professional. Use bullet points and numbers where appropriate. Format amounts in KES.`;

                setContextSnapshot(snap);
                setMessages(prev => {
                    if (prev.length === 0) {
                        return [{
                            id: 'welcome',
                            role: 'model',
                            text: `Hello ${currentUser?.name?.split(' ')[0] || 'there'}! I am **EduAI**, your intelligent institution assistant for **${currentInstitution?.name || 'your institution'}**.\n\nI have live access to your data across all modules. Ask me anything or pick a quick prompt from the right panel!`,
                            timestamp: new Date()
                        }];
                    }
                    return prev;
                });
            } catch (e) {
                setContextSnapshot(`Institution: ${currentInstitution?.name || 'Unknown'}. Answer general questions helpfully.`);
            } finally {
                setContextLoading(false);
            }
        };
        buildContext();
    }, [instId, currentInstitution, currentUser]);

    // Persist messages
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(`${STORAGE_KEY}_${instId}`, JSON.stringify(messages.slice(-20)));
        }
    }, [messages, instId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = useCallback(async (messageText?: string) => {
        const text = (messageText || input).trim();
        if (!text || isLoading) return;
        setInput('');
        const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', text, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        try {
            const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
            const response = await getInstitutionAwareChatResponse(contextSnapshot, history, text);
            setMessages(prev => [...prev, { id: `m_${Date.now()}`, role: 'model', text: response, timestamp: new Date() }]);
        } catch {
            setMessages(prev => [...prev, { id: `err_${Date.now()}`, role: 'model', text: 'I encountered an error. Please try again.', timestamp: new Date() }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, contextSnapshot]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleCopy = async (id: string, text: string) => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleClear = () => {
        localStorage.removeItem(`${STORAGE_KEY}_${instId}`);
        setMessages([{ id: 'welcome_new', role: 'model', text: `Chat cleared! Ask me anything about **${currentInstitution?.name || 'your institution'}**.`, timestamp: new Date() }]);
    };

    return (
        <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[600px] animate-in fade-in-50 duration-300">
            {/* Chat Panel */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">EduAI Intelligence Hub</h2>
                            <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-wider">
                                {contextLoading ? 'Loading institution context...' : `Live data \u00b7 ${currentInstitution?.name || 'your institution'}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {contextLoading && <Loader2 className="w-5 h-5 text-white/70 animate-spin" />}
                        <button onClick={handleClear} title="Clear conversation" className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-1 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'}`}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={`group max-w-[80%] relative ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                                <div className={`px-5 py-4 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 shadow-sm rounded-tl-sm'}`}>
                                    {msg.role === 'model' ? renderMarkdown(msg.text) : <p className="text-sm">{msg.text}</p>}
                                </div>
                                <div className={`flex items-center gap-2 mt-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <span className="text-[9px] text-slate-400 font-medium">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {msg.role === 'model' && (
                                        <button onClick={() => handleCopy(msg.id, msg.text)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-600 rounded">
                                            {copied === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-1 bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="flex gap-3 items-end">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about students, fees, DS, BC, analytics... (Enter to send)"
                            rows={2}
                            disabled={isLoading || contextLoading}
                            className="flex-1 resize-none px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading || contextLoading}
                            className="p-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 rounded-2xl transition-all shadow-md disabled:shadow-none shrink-0"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-2 font-medium text-center uppercase tracking-wider">
                        Powered by Gemini 3.0 Pro &middot; Live institution context injected
                    </p>
                </div>
            </div>

            {/* Quick Prompts Panel */}
            <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">
                {/* Status card */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[2rem] p-6 text-white shadow-lg shadow-indigo-600/20 shrink-0">
                    <div className="flex items-center gap-3 mb-3">
                        <Zap className="w-5 h-5 text-indigo-200" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">AI Status</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-indigo-200">Data Context</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${contextLoading ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-400/20 text-emerald-300'}`}>
                                {contextLoading ? 'Loading...' : 'Live \u2713'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-indigo-200">Engine</span>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-white">Gemini 3.0 Pro</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-indigo-200">Messages</span>
                            <span className="text-[9px] font-black text-white">{messages.length}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Prompts */}
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 p-6 flex-1">
                    <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quick Prompts</h3>
                    </div>
                    <div className="space-y-5">
                        {QUICK_PROMPTS.map(group => {
                            const colors = COLOR_MAP[group.color];
                            const Icon = group.icon;
                            return (
                                <div key={group.category}>
                                    <div className={`flex items-center gap-2 mb-2 p-2 rounded-xl ${colors.bg} border ${colors.border}`}>
                                        <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                                        <span className={`text-[9px] font-black uppercase tracking-wider ${colors.text}`}>{group.category}</span>
                                    </div>
                                    <div className="space-y-1.5 pl-1">
                                        {group.prompts.map(prompt => (
                                            <button
                                                key={prompt}
                                                onClick={() => handleSend(prompt)}
                                                disabled={isLoading || contextLoading}
                                                className={`w-full text-left text-[11px] font-medium px-3 py-2.5 rounded-xl border transition-all flex items-start gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${colors.chip}`}
                                            >
                                                <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                                                <span>{prompt}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
