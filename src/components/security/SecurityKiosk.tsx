import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import type { Institution, Visitor } from '../../types';
import { printService } from '../../services/printService';

interface SecurityKioskProps {
    institution: Institution;
    onRefreshInstitution?: () => void;
}

export const SecurityKiosk: React.FC<SecurityKioskProps> = ({ institution, onRefreshInstitution }) => {
    const [view, setView] = useState<'home' | 'checkin' | 'checkout' | 'success'>('home');
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [pinAction, setPinAction] = useState<'exit' | 'unlock' | null>(null);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    
    // Check-in Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        idNumber: '',
        purpose: 'Official',
        hostName: '',
        hostPhone: '',
        vehiclePlate: ''
    });

    // Check-out Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeVisitors, setActiveVisitors] = useState<Visitor[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    
    // Printer/Visitor State
    const [lastVisitor, setLastVisitor] = useState<Visitor | null>(null);
    
    const isLocked = institution?.kioskStatus === 'locked';
    const systemPin = institution?.kioskSecurityPin || '1234';

    // Fetch active visitors for check-out
    const fetchActiveVisitors = async () => {
        if (!institution?.id) return;
        setSearchLoading(true);
        try {
            const list = await apiService.fetchModuleRecords<Visitor>('visitors', institution.id);
            // Filter only checked-in visitors (status is not checked_out)
            const active = list.filter(v => v.status === 'checked_in' || v.status === 'pending');
            setActiveVisitors(active);
        } catch (e) {
            console.error("Failed to fetch visitors:", e);
        } finally {
            setSearchLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'checkout') {
            fetchActiveVisitors();
        }
    }, [view]);

    // Handle Kiosk Pin Submit
    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pinInput === systemPin) {
            setPinInput('');
            setPinError('');
            setPinModalOpen(false);
            
            if (pinAction === 'exit') {
                // Exit Kiosk Mode -> Go to home page
                window.location.href = '/';
            } else if (pinAction === 'unlock') {
                // Unlock Kiosk
                try {
                    await apiService.saveModuleRecord('institutions', {
                        id: institution.id,
                        kioskStatus: 'active'
                    });
                    if (onRefreshInstitution) onRefreshInstitution();
                } catch (err: any) {
                    setPinError("Failed to update status on server.");
                }
            }
        } else {
            setPinError("Invalid Security PIN. Access Denied.");
            setPinInput('');
        }
    };

    // Handle Check-in Submit
    const handleCheckInSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            alert("Name and Phone Number are required.");
            return;
        }

        try {
            const newVisitor: Visitor = {
                id: `vis_${Date.now()}`,
                name: formData.name,
                fullName: formData.name,
                phoneNumber: formData.phone,
                idNumber: formData.idNumber,
                purpose: formData.purpose,
                hostName: formData.hostName,
                hostPhone: formData.hostPhone || undefined,
                vehiclePlate: formData.vehiclePlate.toUpperCase(),
                status: 'checked_in',
                timeIn: new Date().toISOString(),
                institutionId: institution.id
            };

            await apiService.saveModuleRecord('visitors', newVisitor);
            setLastVisitor(newVisitor);

            // Auto-print Visitor Pass on thermal printer
            try {
                await printService.printVisitorPass({
                    visitorData: newVisitor,
                    institution
                });
            } catch (printErr) {
                console.error("Auto-printing visitor pass failed:", printErr);
            }

            // Dispatch live host SMS notification if enabled
            if ((formData.hostPhone || formData.hostName) && institution?.notifyHostOnVisitorArrival !== false) {
                (async () => {
                    try {
                        let targetHostPhone = formData.hostPhone?.trim();
                        let hostDisplayName = formData.hostName?.trim() || 'Host';

                        if (!targetHostPhone && formData.hostName) {
                            const hostSearch = formData.hostName.trim().toLowerCase();
                            const instUsers = await apiService.fetchModuleRecords<any>('users', institution.id).catch(() => []);
                            const matchedHost = (instUsers || []).find((u: any) => 
                                u.name && (
                                    u.name.trim().toLowerCase() === hostSearch ||
                                    hostSearch.includes(u.name.trim().toLowerCase()) ||
                                    u.name.trim().toLowerCase().includes(hostSearch)
                                )
                            );
                            if (matchedHost) {
                                targetHostPhone = matchedHost.phoneNumber || matchedHost.phone || matchedHost.telephone;
                                hostDisplayName = matchedHost.name;
                            }
                        }

                        if (targetHostPhone) {
                            const link = `${window.location.origin}/?view=visitor-auth&id=${newVisitor.id}`;
                            let smsMsg = `Hi ${hostDisplayName}, visitor ${newVisitor.name} has checked in at the gate kiosk for ${newVisitor.purpose || 'a visit'}. Tap here to authorize: ${link}`;

                            if (institution?.visitorArrivalSmsTemplate) {
                                smsMsg = institution.visitorArrivalSmsTemplate
                                    .replace(/\{host\}/gi, hostDisplayName)
                                    .replace(/\{visitor\}/gi, newVisitor.name || 'Visitor')
                                    .replace(/\{purpose\}/gi, newVisitor.purpose || 'Visit')
                                    .replace(/\{institution\}/gi, institution.name || 'Security')
                                    .replace(/\{link\}/gi, link);
                            }

                            await apiService.sendSms(targetHostPhone, smsMsg, institution.smsConfig, 1, institution.id);
                            console.info('[Security Kiosk] Sent visitor arrival SMS to host:', targetHostPhone);
                        }
                    } catch (smsErr) {
                        console.warn('[Security Kiosk] Failed to dispatch host SMS:', smsErr);
                    }
                })();
            }

            setView('success');
            
            // Reset Form
            setFormData({
                name: '',
                phone: '',
                idNumber: '',
                purpose: 'Official',
                hostName: '',
                hostPhone: '',
                vehiclePlate: ''
            });

            // Auto return to home after 10s to allow time for print/reprint
            setTimeout(() => {
                setView('home');
                setLastVisitor(null);
            }, 10000);
        } catch (err: any) {
            alert("Error registering check-in: " + err.message);
        }
    };

    // Handle Check-out Submit
    const handleCheckOut = async (visitor: Visitor) => {
        try {
            const updatedVisitor = {
                ...visitor,
                status: 'checked_out',
                timeOut: new Date().toISOString()
            };
            await apiService.saveModuleRecord('visitors', updatedVisitor);
            fetchActiveVisitors();
            alert(`Thank you ${visitor.name || visitor.fullName}, you have checked out successfully.`);
        } catch (err: any) {
            alert("Error checking out: " + err.message);
        }
    };

    const triggerPinAction = (action: 'exit' | 'unlock') => {
        setPinAction(action);
        setPinError('');
        setPinInput('');
        setPinModalOpen(true);
    };

    // ── Locked Overlay Render ──
    if (isLocked) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse"></div>
                    <div className="relative w-24 h-24 bg-red-950/50 border border-red-500/40 rounded-full flex items-center justify-center text-red-500 shadow-xl shadow-red-900/30">
                        <svg className="w-12 h-12 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                </div>

                <h2 className="text-3xl font-black text-white uppercase tracking-tighter sm:text-4xl">Terminal Lockdown</h2>
                <p className="mt-3 text-red-400 font-bold uppercase text-xs tracking-widest">SECURITY PROTOCOL ENGAGED</p>
                <p className="mt-4 text-slate-400 text-sm max-w-md leading-relaxed">
                    This self-service gate terminal has been locked remotely by the security administration. Visitor registration and check-outs are temporarily disabled.
                </p>

                <div className="mt-8 flex gap-3">
                    <button
                        onClick={() => triggerPinAction('unlock')}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-600/30"
                    >
                        Unlock Kiosk
                    </button>
                </div>

                {/* PIN Verification Modal */}
                {pinModalOpen && renderPinModal()}
            </div>
        );
    }

    function renderPinModal() {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] w-full max-w-sm text-center space-y-6 shadow-2xl">
                    <div className="space-y-1">
                        <h4 className="text-lg font-black text-white uppercase tracking-tight">Security PIN Required</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Enter gate security passcode to proceed</p>
                    </div>

                    <form onSubmit={handlePinSubmit} className="space-y-4">
                        <input
                            type="password"
                            required
                            maxLength={8}
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••"
                            className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-4 text-center text-2xl font-black text-white tracking-widest focus:border-red-500 outline-none transition-all"
                        />
                        {pinError && (
                            <p className="text-xs font-bold text-red-500">{pinError}</p>
                        )}
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setPinModalOpen(false)}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black py-3 rounded-2xl text-[10px] uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-600/20"
                            >
                                Confirm
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/50 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/80 text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between p-6 md:p-10 select-none relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] pointer-events-none"></div>

            {/* Header */}
            <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-600/30 dark:shadow-none border border-indigo-400/20">
                        {institution.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">{institution.name}</h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Terminal ID: Gate-Kiosk-1</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Kiosk Online
                    </span>
                    <button
                        onClick={() => triggerPinAction('exit')}
                        className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center justify-center"
                        title="Exit Kiosk Mode"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="my-auto py-8 max-w-4xl mx-auto w-full z-10">
                {view === 'home' && (
                    <div className="space-y-16 text-center animate-fade-in">
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight sm:text-6xl max-w-3xl mx-auto leading-tight">
                                Gate Entry <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Terminal</span>
                            </h2>
                            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Select an option to register your gate transaction</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                            {/* Check-In Card */}
                            <button
                                onClick={() => setView('checkin')}
                                className="flex flex-col items-center justify-center p-12 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border-2 border-indigo-100/60 dark:border-slate-800/80 rounded-[3rem] shadow-xl hover:border-indigo-500 hover:scale-[1.03] active:scale-[0.98] transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
                                <div className="p-6 bg-gradient-to-tr from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/20 rounded-[2rem] text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 group-hover:shadow-lg transition-all border border-indigo-200/20">
                                    <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </div>
                                <span className="font-black text-xl uppercase tracking-widest text-slate-900 dark:text-white">Visitor Check-In</span>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2.5 font-black uppercase tracking-wider">Tap to register your entry pass</p>
                            </button>

                            {/* Check-Out Card */}
                            <button
                                onClick={() => setView('checkout')}
                                className="flex flex-col items-center justify-center p-12 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border-2 border-emerald-100/60 dark:border-slate-800/80 rounded-[3rem] shadow-xl hover:border-emerald-500 hover:scale-[1.03] active:scale-[0.98] transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>
                                <div className="p-6 bg-gradient-to-tr from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/20 rounded-[2rem] text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 group-hover:shadow-lg transition-all border border-emerald-200/20">
                                    <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </div>
                                <span className="font-black text-xl uppercase tracking-widest text-slate-900 dark:text-white">Visitor Check-Out</span>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2.5 font-black uppercase tracking-wider">Tap to register gate exit</p>
                            </button>
                        </div>
                    </div>
                )}

                {view === 'checkin' && (
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 p-8 rounded-[3.5rem] shadow-2xl animate-fade-in-up max-w-2xl mx-auto relative overflow-hidden">
                        {/* Header Details */}
                        <div className="flex items-center gap-4 mb-8">
                            <button
                                onClick={() => setView('home')}
                                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-500 flex items-center justify-center"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Visitor Registration</h3>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Fill in details for gate authorization</p>
                            </div>
                        </div>

                        <form onSubmit={handleCheckInSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="First & Last Name"
                                        className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all h-14"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="e.g. 0712345678"
                                        className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all h-14"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                        ID Number / Passport
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.idNumber}
                                        onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                                        placeholder="National ID or Doc No."
                                        className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all h-14"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 00-2-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                        Purpose of Visit
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={formData.purpose}
                                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                            className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all appearance-none h-14"
                                        >
                                            <option value="Official">Official Business</option>
                                            <option value="Guest">Personal Guest</option>
                                            <option value="Delivery">Courier / Delivery</option>
                                            <option value="Repair">Maintenance / Repair</option>
                                            <option value="Student Visit">Visit Student</option>
                                            <option value="Other">Other Purpose</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                        Host / Office to Visit
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.hostName}
                                        onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                                        placeholder="Who are you visiting?"
                                        className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all h-14"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        Host Phone for SMS Alert (Optional)
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.hostPhone}
                                        onChange={(e) => setFormData({ ...formData, hostPhone: e.target.value })}
                                        placeholder="e.g. 0712345678"
                                        className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all h-14"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                                    Vehicle Plate (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.vehiclePlate}
                                    onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                                    placeholder="e.g. KAA 123A"
                                    className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all h-14"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black py-4.5 rounded-2xl text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-xl shadow-indigo-600/20 dark:shadow-none border border-indigo-400/20 flex items-center justify-center gap-2 mt-4"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Register Visit Check-In
                            </button>
                        </form>
                    </div>
                )}

                {view === 'checkout' && (
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 p-8 rounded-[3.5rem] shadow-2xl animate-fade-in-up max-w-2xl mx-auto relative overflow-hidden">
                        {/* Header Details */}
                        <div className="flex items-center gap-4 mb-8">
                            <button
                                onClick={() => setView('home')}
                                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-500 flex items-center justify-center"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gate Exit Check-Out</h3>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Select your name to register checkout</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by Name, Phone, ID or Plate..."
                                    className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 rounded-2xl pl-12 pr-5 py-4.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-14"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>

                            {searchLoading ? (
                                <div className="py-20 text-center flex flex-col items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-4">Retrieving gate records...</p>
                                </div>
                            ) : (
                                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    {activeVisitors
                                        .filter(v => 
                                            (v.name || v.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (v.phoneNumber || '').includes(searchQuery) ||
                                            v.idNumber?.includes(searchQuery) ||
                                            v.vehiclePlate?.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map(v => {
                                            const name = v.name || v.fullName || 'Visitor';
                                            const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                            return (
                                                <div key={v.id} className="p-5 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/80 rounded-2xl flex items-center justify-between group hover:border-emerald-500/40 hover:bg-white dark:hover:bg-slate-950 transition-all shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black flex items-center justify-center uppercase shadow-inner">
                                                            {initials || "VI"}
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-black text-sm uppercase text-slate-900 dark:text-white leading-tight">{name}</h4>
                                                                {v.vehiclePlate && (
                                                                    <span className="px-2 py-0.5 bg-slate-900 dark:bg-slate-800 text-slate-300 dark:text-slate-400 font-mono text-[9px] border border-slate-800 dark:border-slate-750 rounded font-black shadow-inner">{v.vehiclePlate}</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">
                                                                {v.purpose} · Checked In: {new Date(v.timeIn || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCheckOut(v)}
                                                        className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-750 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-600/10 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                        Check-Out
                                                    </button>
                                                </div>
                                            );
                                        })
                                    }
                                    {activeVisitors.length === 0 && (
                                        <div className="py-20 text-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-950/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800/80">
                                            <svg className="w-14 h-14 mx-auto text-slate-350 dark:text-slate-700 mb-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                            <p className="font-black text-[10px] uppercase tracking-widest">No active visitors currently on campus</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {view === 'success' && (
                    <div className="text-center py-16 space-y-6 animate-fade-in bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/80 rounded-[3rem] p-10 max-w-xl mx-auto shadow-2xl">
                        <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 border border-emerald-400/20 animate-bounce">
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Check-In Successful</h3>
                            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">Please collect your gate pass card from the officer</p>
                        </div>
                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button
                                onClick={() => {
                                    setLastVisitor(null);
                                    setView('home');
                                }}
                                className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.03] active:scale-[0.97] transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                Back Home
                            </button>

                            {lastVisitor && (
                                <button
                                    onClick={async () => {
                                        try {
                                            await printService.printVisitorPass({
                                                visitorData: lastVisitor,
                                                institution
                                            });
                                        } catch (err: any) {
                                            alert("Printing failed: " + (err.message || err));
                                        }
                                    }}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.03] active:scale-[0.97] transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Reprint Pass
                                </button>
                            )}
                        </div>
                        <p className="text-[9px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider animate-pulse mt-3">Auto-resetting in a few seconds...</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center border-t border-slate-200/50 dark:border-slate-900/60 pt-6 z-10">
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">Powered by Eduai Kiosk OS · Secure Encryption Enabled</p>
            </div>

            {/* PIN Verification Modal */}
            {pinModalOpen && renderPinModal()}
        </div>
    );
};
