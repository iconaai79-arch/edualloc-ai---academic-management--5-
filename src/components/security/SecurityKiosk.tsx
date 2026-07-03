import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import type { Institution, Visitor } from '../../types';

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
        vehiclePlate: ''
    });

    // Check-out Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeVisitors, setActiveVisitors] = useState<Visitor[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    
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
                vehiclePlate: formData.vehiclePlate.toUpperCase(),
                status: 'checked_in',
                timeIn: new Date().toISOString(),
                institutionId: institution.id
            };

            await apiService.saveModuleRecord('visitors', newVisitor);
            setView('success');
            
            // Reset Form
            setFormData({
                name: '',
                phone: '',
                idNumber: '',
                purpose: 'Official',
                hostName: '',
                vehiclePlate: ''
            });

            // Auto return to home after 5s
            setTimeout(() => {
                setView('home');
            }, 5000);
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between p-4 md:p-8 select-none">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-black shadow-lg shadow-indigo-600/30">
                        {institution.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">{institution.name}</h1>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gate Security Terminal</p>
                    </div>
                </div>
                <button
                    onClick={() => triggerPinAction('exit')}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:scale-105 active:scale-95 transition-all shadow-sm"
                    title="Exit Kiosk Mode"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>

            {/* Main Content Area */}
            <div className="my-auto py-8 max-w-4xl mx-auto w-full">
                {view === 'home' && (
                    <div className="space-y-12 text-center animate-fade-in">
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter sm:text-5xl">Welcome to our Campus</h2>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Please select an action below to proceed</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                            <button
                                onClick={() => setView('checkin')}
                                className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border-2 border-indigo-150 dark:border-slate-800/80 rounded-[3rem] shadow-xl hover:border-indigo-600 hover:scale-102 active:scale-98 transition-all group"
                            >
                                <div className="p-5 bg-indigo-50 dark:bg-indigo-950/40 rounded-3xl text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </div>
                                <span className="font-black text-lg uppercase tracking-widest text-slate-900 dark:text-white">Visitor Check-In</span>
                                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tight">Tap to register your entry</p>
                            </button>

                            <button
                                onClick={() => setView('checkout')}
                                className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border-2 border-emerald-150 dark:border-slate-800/80 rounded-[3rem] shadow-xl hover:border-emerald-600 hover:scale-102 active:scale-98 transition-all group"
                            >
                                <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </div>
                                <span className="font-black text-lg uppercase tracking-widest text-slate-900 dark:text-white">Visitor Check-Out</span>
                                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tight">Tap when exiting the gate</p>
                            </button>
                        </div>
                    </div>
                )}

                {view === 'checkin' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 p-8 rounded-[3rem] shadow-xl animate-fade-in-up max-w-xl mx-auto">
                        <div className="flex items-center gap-4 mb-6">
                            <button
                                onClick={() => setView('home')}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Visitor Registration</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Please provide your details below</p>
                            </div>
                        </div>

                        <form onSubmit={handleCheckInSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter your name"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="e.g. 0712345678"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">National ID / Passport</label>
                                    <input
                                        type="text"
                                        value={formData.idNumber}
                                        onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                                        placeholder="Enter document no."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose of Visit</label>
                                    <select
                                        value={formData.purpose}
                                        onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                    >
                                        <option value="Official">Official Business</option>
                                        <option value="Guest">Personal Guest</option>
                                        <option value="Delivery">Courier / Delivery</option>
                                        <option value="Repair">Maintenance / Repair</option>
                                        <option value="Student Visit">Visit Student</option>
                                        <option value="Other">Other Purpose</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Host / Office to Visit</label>
                                    <input
                                        type="text"
                                        value={formData.hostName}
                                        onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                                        placeholder="e.g. Admin / Class teacher"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehicle Plate (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.vehiclePlate}
                                        onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                                        placeholder="e.g. KAA 123A"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 pt-4"
                            >
                                Register Visit Check-In
                            </button>
                        </form>
                    </div>
                )}

                {view === 'checkout' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 p-8 rounded-[3rem] shadow-xl animate-fade-in-up max-w-2xl mx-auto">
                        <div className="flex items-center gap-4 mb-6">
                            <button
                                onClick={() => setView('home')}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gate Exit Check-Out</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Find your name to verify exit</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by Name, Phone, ID or Plate..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl pl-12 pr-5 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>

                            {searchLoading ? (
                                <div className="py-20 text-center flex flex-col items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-4">Retrieving gate records...</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                                    {activeVisitors
                                        .filter(v => 
                                            (v.name || v.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (v.phoneNumber || '').includes(searchQuery) ||
                                            v.idNumber?.includes(searchQuery) ||
                                            v.vehiclePlate?.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map(v => (
                                            <div key={v.id} className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center justify-between group hover:border-emerald-500/40 transition-all">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-black text-sm uppercase text-slate-900 dark:text-white">{v.name || v.fullName || 'Visitor'}</h4>
                                                        {v.vehiclePlate && (
                                                            <span className="px-2 py-0.5 bg-slate-950 dark:bg-slate-900 text-white dark:text-slate-300 font-mono text-[9px] border border-slate-800 rounded font-black shadow-sm">{v.vehiclePlate}</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-medium mt-1">Purpose: {v.purpose} · In: {new Date(v.timeIn || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleCheckOut(v)}
                                                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                                                >
                                                    Check-Out
                                                </button>
                                            </div>
                                        ))
                                    }
                                    {activeVisitors.length === 0 && (
                                        <div className="py-20 text-center text-slate-400">
                                            <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                            <p className="font-bold text-[10px] uppercase tracking-widest">No active visitors currently on campus</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {view === 'success' && (
                    <div className="text-center py-16 space-y-6 animate-fade-in">
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Check-In Successful</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Please collect your gate pass card from the officer</p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">This screen will auto-reset in a few seconds...</p>
                        <button
                            onClick={() => setView('home')}
                            className="px-6 py-2.5 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                        >
                            Back Home
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center border-t border-slate-100 dark:border-slate-900/60 pt-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Powered by Eduai Kiosk OS · Secure Encryption Enabled</p>
            </div>

            {/* PIN Verification Modal */}
            {pinModalOpen && renderPinModal()}
        </div>
    );
};
