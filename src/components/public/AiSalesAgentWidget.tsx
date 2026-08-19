import React, { useState, useRef, useEffect } from 'react';
import type { Institution } from '../../types';
import { querySalesAgent, AgentMessage, SalesAgentContext } from '../../services/salesAgentService';
import { apiService } from '../../services/apiService';
import { SparklesIcon } from '../icons/SparklesIcon';
import { XIcon } from '../icons/XIcon';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { ShoppingCartIcon } from '../icons/ShoppingCartIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { ChatBubbleBottomCenterTextIcon } from '../icons/ChatBubbleBottomCenterTextIcon';

interface AiSalesAgentWidgetProps {
    institution: Institution;
    catalogItems?: Array<{
        id: string;
        name: string;
        price: number;
        category?: string;
        inStock?: boolean | number;
        description?: string;
    }>;
    services?: Array<{
        id: string;
        name: string;
        price: number;
        duration?: string;
        description?: string;
    }>;
    agentName?: string;
    agentAvatarUrl?: string;
    welcomeMessage?: string;
    contactPhone?: string;
    contactEmail?: string;
    whatsappNumber?: string;
    onOrderProduct?: (item: any) => void;
    onBookService?: (service: any) => void;
}

export const AiSalesAgentWidget: React.FC<AiSalesAgentWidgetProps> = ({
    institution,
    catalogItems = [],
    services = [],
    agentName = 'Sales & Support AI',
    agentAvatarUrl,
    welcomeMessage,
    contactPhone,
    contactEmail,
    whatsappNumber,
    onOrderProduct,
    onBookService
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [leadName, setLeadName] = useState('');
    const [leadPhone, setLeadPhone] = useState('');
    const [leadSaved, setLeadSaved] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const currency = institution?.currency || 'KES';
    const initialGreeting = welcomeMessage || `Hello! 👋 Welcome to ${institution.name}. I am your automated Sales & Support Assistant. How can I help you today?`;

    useEffect(() => {
        setMessages([
            { role: 'model', text: initialGreeting }
        ]);
    }, [initialGreeting]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen, isLoading]);

    const context: SalesAgentContext = {
        institution,
        catalogItems,
        services,
        contactPhone: contactPhone || institution.phone,
        contactEmail: contactEmail || institution.email,
        whatsappNumber: whatsappNumber || institution.phone
    };

    const handleSendMessage = async (textToSend?: string) => {
        const text = (textToSend || inputValue).trim();
        if (!text || isLoading) return;

        const newMessages: AgentMessage[] = [
            ...messages,
            { role: 'user', text }
        ];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        const responseMsg = await querySalesAgent(newMessages, text, context);
        setMessages(prev => [...prev, responseMsg]);
        setIsLoading(false);
    };

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leadPhone.trim()) return;

        try {
            const leadData = {
                name: leadName.trim() || 'Website Visitor',
                phoneNumber: leadPhone.trim(),
                role: 'lead',
                institutionId: institution.id,
                source: 'AI Sales Agent',
                notes: `Inquiry via AI Sales Assistant on ${new Date().toLocaleDateString()}`,
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('leads', leadData);
            setLeadSaved(true);
            setShowLeadForm(false);
            setMessages(prev => [
                ...prev,
                {
                    role: 'model',
                    text: `Thank you, ${leadName || 'there'}! 🎉 Your request has been recorded. Our team will contact you at ${leadPhone} shortly.`
                }
            ]);
        } catch (err) {
            console.error('Failed to log lead:', err);
            setShowLeadForm(false);
            setMessages(prev => [
                ...prev,
                {
                    role: 'model',
                    text: `Thank you! We have noted your contact number ${leadPhone} and our team will get in touch with you.`
                }
            ]);
        }
    };

    const isSchool = !institution.institutionType || ['Education', 'Primary', 'Secondary', 'Tertiary', 'Higher Education', 'TVET', 'College', 'University'].includes(institution.institutionType);

    const quickChips = isSchool ? [
        { label: '🎓 Courses & Levels', query: 'What academic programs and grade levels do you offer?' },
        { label: '📋 Admissions & Intake', query: 'What are the admission requirements and intake dates?' },
        { label: '💰 Fee Schedules', query: 'Can you provide the fee structure and tuition costs?' },
        { label: '📍 Location & Visits', query: 'Where is the campus located and what are your visiting hours?' }
    ] : [
        { label: '🔥 Popular Products', query: 'What are your most popular products and prices?' },
        { label: '💼 Available Services', query: 'What services or packages do you offer?' },
        { label: '📅 Book an Appointment', query: 'I would like to book a service or appointment.' },
        { label: '📞 Contact Human Agent', query: 'Can I speak with a sales agent or get a callback?' }
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans print:hidden">
            {/* Floating Launcher Button */}
            {!isOpen && (
                <div className="relative group">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-600 text-white px-5 py-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 group-hover:shadow-indigo-500/40"
                        aria-label="Open AI Assistant"
                    >
                        <div className="relative">
                            <SparklesIcon className="w-6 h-6 animate-pulse" />
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full"></span>
                        </div>
                        <span className="font-bold text-sm tracking-wide hidden sm:inline">
                            {isSchool ? 'Ask Campus AI' : 'Ask Sales AI'}
                        </span>
                    </button>
                </div>
            )}

            {/* Expanded Chat Drawer */}
            {isOpen && (
                <div className="bg-white dark:bg-slate-900 w-[92vw] sm:w-[400px] h-[580px] max-h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-fade-in-up">
                    {/* Drawer Header */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 px-5 flex justify-between items-center border-b border-indigo-500/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-black text-white shadow-md">
                                {agentAvatarUrl ? (
                                    <img src={agentAvatarUrl} alt={agentName} className="w-full h-full rounded-2xl object-cover" />
                                ) : (
                                    <SparklesIcon className="w-5 h-5 text-white" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-black text-sm tracking-tight">{agentName}</h4>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300">
                                        Active AI
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-300 truncate max-w-[200px] font-medium">{institution.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {whatsappNumber && (
                                <a
                                    href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(institution.name)},%20I%20am%20inquiring%20about%20your%20services`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 text-emerald-400 hover:bg-white/10 rounded-xl transition-colors"
                                    title="Chat on WhatsApp"
                                >
                                    <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                                </a>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                                aria-label="Close"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70 dark:bg-slate-950/60 backdrop-blur-sm">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}>
                                <div
                                    className={`p-3.5 px-4 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-sm ${
                                        msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-br-none font-medium'
                                            : 'bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-bl-none font-normal'
                                    }`}
                                >
                                    {msg.text.split('\n').map((line, i) => (
                                        <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
                                    ))}
                                </div>

                                {/* Rich Action Trigger: Product Recommendations */}
                                {msg.actionType === 'show_products' && Array.isArray(msg.actionData) && (
                                    <div className="w-full space-y-2 pl-2 animate-fade-in-up">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Featured Items</p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {msg.actionData.map((item: any) => (
                                                <div
                                                    key={item.id}
                                                    className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-indigo-100 dark:border-indigo-950/50 shadow-sm flex items-center justify-between gap-3"
                                                >
                                                    <div className="min-w-0">
                                                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</h5>
                                                        <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                                                            {currency} {item.price?.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            if (onOrderProduct) onOrderProduct(item);
                                                            else handleSendMessage(`I would like to order "${item.name}". What is the next step?`);
                                                        }}
                                                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 dark:bg-indigo-950/40 text-indigo-600 hover:text-white dark:text-indigo-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                                    >
                                                        Order
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Rich Action Trigger: Callback / Lead Request Form */}
                                {msg.actionType === 'create_lead' && !leadSaved && (
                                    <div className="w-full pl-2">
                                        {!showLeadForm ? (
                                            <button
                                                onClick={() => setShowLeadForm(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                                            >
                                                <PhoneIcon className="w-3.5 h-3.5" />
                                                Request Quick Callback
                                            </button>
                                        ) : (
                                            <form onSubmit={handleLeadSubmit} className="p-3 bg-white dark:bg-slate-850 rounded-2xl border border-emerald-500/30 shadow-md space-y-2.5">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                    Enter details for instant callback:
                                                </p>
                                                <input
                                                    type="text"
                                                    value={leadName}
                                                    onChange={e => setLeadName(e.target.value)}
                                                    placeholder="Your Name (Optional)"
                                                    className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                                                />
                                                <input
                                                    type="tel"
                                                    value={leadPhone}
                                                    onChange={e => setLeadPhone(e.target.value)}
                                                    placeholder="Your Phone / WhatsApp Number *"
                                                    required
                                                    className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-medium"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        type="submit"
                                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                                                    >
                                                        Submit Request
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowLeadForm(false)}
                                                        className="px-3 py-2 text-xs text-slate-400 hover:text-slate-600"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isLoading && (
                            <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-850 rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-800 w-fit text-slate-400 text-xs shadow-sm">
                                <SparklesIcon className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                <span className="font-medium animate-pulse">Sales Assistant is typing...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Suggestion Chips */}
                    {messages.length <= 2 && (
                        <div className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
                            {quickChips.map((chip, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSendMessage(chip.query)}
                                    className="whitespace-nowrap px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-full text-[10px] font-bold tracking-tight transition-colors flex-shrink-0"
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Footer */}
                    <form onSubmit={e => { e.preventDefault(); handleSendMessage(); }} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            placeholder="Ask about products, prices, bookings..."
                            className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isLoading}
                            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-full transition-transform active:scale-95 shadow-md flex-shrink-0"
                            aria-label="Send message"
                        >
                            <PaperAirplaneIcon className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
