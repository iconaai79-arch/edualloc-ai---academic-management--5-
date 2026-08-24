
import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse } from '../services/geminiService';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { Cog8ToothIcon } from './icons/Cog8ToothIcon';
import { CheckIcon } from './icons/CheckIcon';
import { KeyIcon } from './icons/KeyIcon';
import { Institution } from '../types';

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    isError?: boolean;
}

interface ChatBotProps {
    welcomeMessage?: string;
    currentInstitution?: Institution | null;
}

export const ChatBot: React.FC<ChatBotProps> = ({ welcomeMessage, currentInstitution }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // AI Engine settings state
    const [aiProvider, setAiProvider] = useState<'openai' | 'gemini' | 'auto'>(() => {
        return (localStorage.getItem('eduai_ai_provider') as any) || (localStorage.getItem('eduai_openai_key') ? 'openai' : 'auto');
    });
    const [openAiKey, setOpenAiKey] = useState<string>(() => {
        return localStorage.getItem('eduai_openai_key') || localStorage.getItem('custom_openai_api_key') || '';
    });
    const [geminiKey, setGeminiKey] = useState<string>(() => {
        return localStorage.getItem('eduai_gemini_key') || localStorage.getItem('custom_gemini_api_key') || '';
    });
    const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessages([
            { role: 'model', text: welcomeMessage || 'Hello! I am your EduAI Assistant. How can I help you today?' }
        ]);
    }, [welcomeMessage]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, showSettings]);

    const handleSaveAiSettings = (e: React.FormEvent) => {
        e.preventDefault();
        if (openAiKey.trim()) {
            localStorage.setItem('eduai_openai_key', openAiKey.trim());
            localStorage.setItem('custom_openai_api_key', openAiKey.trim());
        } else {
            localStorage.removeItem('eduai_openai_key');
            localStorage.removeItem('custom_openai_api_key');
        }

        if (geminiKey.trim()) {
            localStorage.setItem('eduai_gemini_key', geminiKey.trim());
            localStorage.setItem('custom_gemini_api_key', geminiKey.trim());
        } else {
            localStorage.removeItem('eduai_gemini_key');
            localStorage.removeItem('custom_gemini_api_key');
        }

        localStorage.setItem('eduai_ai_provider', aiProvider);

        setSaveFeedback('AI settings saved successfully!');
        setTimeout(() => {
            setSaveFeedback(null);
            setShowSettings(false);
        }, 1200);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMessage = inputValue.trim();
        setInputValue('');

        const newMessages: ChatMessage[] = [
            ...messages,
            { role: 'user', text: userMessage }
        ];
        setMessages(newMessages);
        setIsLoading(true);

        const history = newMessages.slice(0, -1).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const responseText = await getChatResponse(history, userMessage, currentInstitution?.aiModelTier);
        const isErrorAlert = responseText.includes('Service Alert') || responseText.includes('suspended') || responseText.includes('Authentication:');

        setMessages(prev => [
            ...prev,
            { role: 'model', text: responseText, isError: isErrorAlert }
        ]);
        setIsLoading(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 print:hidden">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-105 flex items-center justify-center cursor-pointer active:scale-95"
                    aria-label="Open Support Chat"
                >
                    <ChatBubbleBottomCenterTextIcon className="w-8 h-8" />
                </button>
            )}

            {isOpen && (
                <div className="bg-white dark:bg-slate-900 w-84 sm:w-96 h-[540px] max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 flex justify-between items-center text-white shadow-md">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                                <SparklesIcon className="w-4 h-4 text-amber-300" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm tracking-tight">EduAI Assistant</h3>
                                <span className="text-[10px] text-indigo-200 font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    {aiProvider === 'openai' ? 'OpenAI (GPT-4o)' : aiProvider === 'gemini' ? 'Google Gemini' : 'Auto Engine'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setShowSettings(!showSettings)} 
                                title="AI Engine & API Key Settings"
                                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${showSettings ? 'bg-white/20 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'}`}
                            >
                                <Cog8ToothIcon className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setIsOpen(false)} 
                                className="hover:bg-white/20 p-1.5 rounded-xl text-indigo-200 hover:text-white transition-colors cursor-pointer"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Settings Overlay Drawer */}
                    {showSettings ? (
                        <div className="flex-grow overflow-y-auto p-5 bg-slate-50 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 flex flex-col justify-between">
                            <form onSubmit={handleSaveAiSettings} className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                                        <KeyIcon className="w-4 h-4 text-indigo-600" /> AI Engine Configuration
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Choose your preferred AI provider or supply your custom API keys.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">
                                        Active AI Engine
                                    </label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setAiProvider('openai')}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                                                aiProvider === 'openai' 
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            OpenAI
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAiProvider('gemini')}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                                                aiProvider === 'gemini' 
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            Gemini
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAiProvider('auto')}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                                                aiProvider === 'auto' 
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            Auto
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">
                                        OpenAI API Key (sk-...)
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="sk-proj-..."
                                        value={openAiKey}
                                        onChange={(e) => setOpenAiKey(e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <p className="text-[9px] text-slate-400 mt-1">
                                        Used for GPT-4o-mini, GPT-4o, Whisper audio, and TTS voice.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">
                                        Google Gemini API Key (AIzaSy...)
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="AIzaSy..."
                                        value={geminiKey}
                                        onChange={(e) => setGeminiKey(e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                {saveFeedback && (
                                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                        <CheckIcon className="w-4 h-4 text-emerald-600" />
                                        {saveFeedback}
                                    </div>
                                )}

                                <div className="pt-2 flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowSettings(false)}
                                        className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-500/25 cursor-pointer"
                                    >
                                        Save Settings
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <>
                            {/* Messages Area */}
                            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                                                msg.role === 'user'
                                                ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                                                : msg.isError
                                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 rounded-bl-none shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 rounded-bl-none shadow-sm'
                                            }`}
                                        >
                                            <p className="whitespace-pre-line">{msg.text}</p>
                                            {msg.isError && (
                                                <div className="mt-2.5 pt-2 border-t border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAiProvider('openai');
                                                            setShowSettings(true);
                                                        }}
                                                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition-all cursor-pointer shadow-xs"
                                                    >
                                                        ⚡ Switch to OpenAI (GPT-4o)
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center gap-1.5">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Ask anything about fees, students, schedules..."
                                    className="flex-grow px-4 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || isLoading}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/25 active:scale-95 cursor-pointer shrink-0"
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};


