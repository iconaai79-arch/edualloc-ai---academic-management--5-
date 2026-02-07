
import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse } from '../services/geminiService';
import { XIcon, SparklesIcon, PaperAirplaneIcon, ChatBubbleBottomCenterTextIcon } from './icons';

import { Institution } from '../types';

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

interface ChatBotProps {
    welcomeMessage?: string;
    currentInstitution?: Institution | null;
}

export const ChatBot: React.FC<ChatBotProps> = ({ welcomeMessage, currentInstitution }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessages([
            { role: 'model', text: welcomeMessage || 'Hello! I am the EduAi Assistant. How can I help you today?' }
        ]);
    }, [welcomeMessage]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

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

        // Prepare history for API (exclude the very last user message as it's sent as 'message')
        // The API expects history in specific format { role: string, parts: { text: string }[] }
        const history = newMessages.slice(0, -1).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const responseText = await getChatResponse(history, userMessage, currentInstitution?.aiModelTier);

        setMessages(prev => [
            ...prev,
            { role: 'model', text: responseText }
        ]);
        setIsLoading(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 print:hidden">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-[var(--color-primary)] hover:brightness-110 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center justify-center"
                    aria-label="Open Support Chat"
                >
                    <ChatBubbleBottomCenterTextIcon className="w-8 h-8" />
                </button>
            )}

            {isOpen && (
                <div className="bg-white dark:bg-slate-800 w-80 sm:w-96 h-[500px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                    {/* Header */}
                    <div className="bg-[var(--color-primary)] p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5" />
                            <h3 className="font-bold text-lg">EduAi Assistant</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                        ? 'bg-[var(--color-primary)] text-white rounded-br-none'
                                        : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-bl-none shadow-sm'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-700 p-3 rounded-lg rounded-bl-none border border-slate-200 dark:border-slate-600 shadow-sm flex items-center gap-1">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask a question..."
                            className="flex-grow px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] dark:bg-slate-700 dark:text-white"
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isLoading}
                            className="bg-[var(--color-primary)] text-white p-2 rounded-full hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
