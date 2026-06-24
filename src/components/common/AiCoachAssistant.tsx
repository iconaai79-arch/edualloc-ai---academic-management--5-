import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse } from '../../services/geminiService';
import { 
    Sparkles, 
    Send, 
    Loader2, 
    MessageSquare, 
    BookOpen, 
    Compass, 
    CheckCircle,
    User
} from 'lucide-react';
import { User as UserType } from '../../types';

interface AiCoachAssistantProps {
    child: UserType;
    childPerformanceSummary?: string;
    onClose?: () => void;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export const AiCoachAssistant: React.FC<AiCoachAssistantProps> = ({ child, childPerformanceSummary }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const PRESETS = [
        { label: 'Create a Math revision exercise', query: `Could you give me a simple revision exercise in Math appropriate for ${child.name}?` },
        { label: 'Focus and study tips', query: `What are 3 ways I can help ${child.name} stay focused during homework at home?` },
        { label: 'Active questioning guide', query: `How can I ask ${child.name} questions about their science notes without sounding like a test?` },
        { label: 'Motivation tips', query: `Give me an encouraging script or phrase I can tell ${child.name} to boost their confidence.` }
    ];

    useEffect(() => {
        setMessages([
            { 
                role: 'model', 
                text: `Hello! I am your EduAI Home-Learning Coach. I am here to help you support ${child.name}'s learning journey. Ask me for study techniques, simple revision quizzes, or ways to help ${child.name} review today's syllabus at home!` 
            }
        ]);
    }, [child]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const newMessages: ChatMessage[] = [
            ...messages,
            { role: 'user', text }
        ];
        setMessages(newMessages);
        setIsLoading(true);

        const history = newMessages.slice(0, -1).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        // Include child context in systemic prompt instructions implicitly
        const systemIntro = `Context: You are helping the parent of ${child.name}. ${childPerformanceSummary ? `Student Performance: ${childPerformanceSummary}` : ''}\n\n`;
        const enrichedMessage = systemIntro + text;

        try {
            const responseText = await getChatResponse(history, enrichedMessage, 'flash');
            setMessages(prev => [
                ...prev,
                { role: 'model', text: responseText }
            ]);
        } catch (e) {
            setMessages(prev => [
                ...prev,
                { role: 'model', text: "I apologize, I encountered a connection issue. Please try sending your coaching query again." }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
        const msg = inputValue;
        setInputValue('');
        handleSendMessage(msg);
    };

    return (
        <div className="flex flex-col h-[550px] bg-slate-900 dark:bg-slate-950 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 px-6 py-5 flex items-center justify-between text-white border-b border-indigo-500/20">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
                        <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                    </div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-wider">Home-Learning AI Coach</h4>
                        <p className="text-[10px] text-indigo-150 uppercase tracking-widest font-black">Active Context: {child.name}</p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4 no-scrollbar bg-slate-950">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role !== 'user' && (
                            <div className="w-8 h-8 rounded-xl bg-indigo-900/50 flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                            </div>
                        )}
                        <div className={`max-w-[80%] p-4 rounded-3xl text-sm leading-relaxed ${
                            msg.role === 'user'
                                ? 'bg-gradient-to-tr from-indigo-650 to-violet-650 text-white rounded-tr-none shadow-lg'
                                : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                        }`}>
                            <p className="whitespace-pre-line">{msg.text}</p>
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 flex-shrink-0">
                                <User className="w-4 h-4 text-slate-400" />
                            </div>
                        )}
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex gap-3.5 justify-start">
                        <div className="w-8 h-8 rounded-xl bg-indigo-900/50 flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
                            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Presets Grid */}
            {messages.length === 1 && !isLoading && (
                <div className="px-6 py-4 bg-slate-950 border-t border-slate-900">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5" />
                        Coaching Starters
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {PRESETS.map((preset, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleSendMessage(preset.query)}
                                className="text-left px-4 py-3 bg-slate-900 hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-800 text-xs font-bold text-slate-300 hover:text-indigo-400 rounded-2xl transition-all shadow-sm flex items-center gap-2 group"
                            >
                                <BookOpen className="w-3.5 h-3.5 text-indigo-500 group-hover:text-indigo-400 flex-shrink-0" />
                                <span className="truncate">{preset.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleFormSubmit} className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`Ask the Coach about ${child.name}...`}
                    disabled={isLoading}
                    className="flex-grow px-5 py-3.5 bg-slate-950 border border-slate-850 hover:border-slate-700 text-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-medium transition-all"
                />
                <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-2xl transition-all active:scale-95 disabled:opacity-40 disabled:scale-100 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-550/20"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
};
