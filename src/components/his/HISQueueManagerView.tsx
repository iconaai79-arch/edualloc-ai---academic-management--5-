import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { UsersIcon } from '../icons/UsersIcon';
import { ClockIcon, ActivityIcon } from './HealthIcons';
import { BellIcon } from '../icons/BellIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XIcon } from '../icons/XIcon';

interface HISQueueManagerViewProps {
    institutionId?: string;
    userName?: string;
    activeRole?: string;
}

export function HISQueueManagerView({ institutionId, userName, activeRole }: HISQueueManagerViewProps) {
    const [queueCalls, setQueueCalls] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isTvMode, setIsTvMode] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState('Consultation Room 1');
    const [lastCalledCall, setLastCalledCall] = useState<any | null>(null);

    const ROOMS = [
        'Consultation Room 1 (OPD Main)',
        'Consultation Room 2 (Paediatrics)',
        'Consultation Room 3 (Specialist)',
        'Dental Suite 1',
        'Eye Clinic Room A',
        'Triage / Vitals Station'
    ];

    const loadQueue = async () => {
        if (!institutionId) return;
        setIsLoading(true);
        try {
            const data = await apiService.fetchModuleRecords('his_queue_calls', institutionId);
            if (data && data.length > 0) {
                setQueueCalls(data);
            } else {
                // Seed initial sample queue items if empty
                const initialQueue = [
                    { id: 'q_1', tokenNo: 'TK-101', patientName: 'Jane Wanjiku', roomNo: 'Consultation Room 1', doctorName: 'Dr. John Smith', status: 'In Consultation', waitMins: 5, priority: 'Routine', createdAt: new Date().toISOString() },
                    { id: 'q_2', tokenNo: 'TK-102', patientName: 'David Ochieng', roomNo: 'Consultation Room 2', doctorName: 'Dr. Sarah Omondi', status: 'In Consultation', waitMins: 12, priority: 'Urgent', createdAt: new Date().toISOString() },
                    { id: 'q_3', tokenNo: 'TK-103', patientName: 'Mercy Cherono', roomNo: 'Waiting Area', doctorName: 'Unassigned', status: 'Waiting', waitMins: 18, priority: 'Routine', createdAt: new Date().toISOString() },
                    { id: 'q_4', tokenNo: 'TK-104', patientName: 'Peter Kamau', roomNo: 'Waiting Area', doctorName: 'Unassigned', status: 'Waiting', waitMins: 25, priority: 'Routine', createdAt: new Date().toISOString() },
                    { id: 'q_5', tokenNo: 'TK-105', patientName: 'Amin Hassan', roomNo: 'Waiting Area', doctorName: 'Unassigned', status: 'Waiting', waitMins: 32, priority: 'Urgent', createdAt: new Date().toISOString() }
                ];
                setQueueCalls(initialQueue);
                for (const item of initialQueue) {
                    await apiService.saveModuleRecord('his_queue_calls', { ...item, institutionId }).catch(() => null);
                }
            }
        } catch (err) {
            console.error('Error fetching HIS queue calls:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadQueue();
        const interval = setInterval(loadQueue, 10000); // Auto-refresh live queue every 10s
        return () => clearInterval(interval);
    }, [institutionId]);

    // Audio Voice Call-Out Announcement Generator
    const announceQueueCall = (item: any) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel(); // Clear any ongoing audio

        const text = `Attention please. Token ${item.tokenNo?.replace('-', ' ')}. Patient ${item.patientName}. Please proceed to ${item.roomNo || 'Consultation Room 1'}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
        setLastCalledCall(item);
    };

    // Doctor / Reception Checkout & Call Next Patient
    const handleCheckoutAndCallNext = async (room: string) => {
        const roomName = room.split(' (')[0];
        
        // 1. Mark current patient in this room as Completed
        const updatedQueue = [...queueCalls];
        const currentInRoom = updatedQueue.find(q => q.roomNo?.includes(roomName) && q.status === 'In Consultation');
        if (currentInRoom) {
            currentInRoom.status = 'Completed';
            await apiService.saveModuleRecord('his_queue_calls', currentInRoom).catch(() => null);
        }

        // 2. Find next waiting patient
        const nextWaiting = updatedQueue.find(q => q.status === 'Waiting');
        if (nextWaiting) {
            nextWaiting.status = 'In Consultation';
            nextWaiting.roomNo = roomName;
            nextWaiting.doctorName = userName || 'Attending Physician';
            nextWaiting.calledAt = new Date().toISOString();

            await apiService.saveModuleRecord('his_queue_calls', nextWaiting).catch(() => null);
            setQueueCalls(updatedQueue);

            // 3. Trigger Audio Voice Call-Out
            announceQueueCall(nextWaiting);
        } else {
            setQueueCalls(updatedQueue);
            alert(`✓ Current consultation checked out. Zero waiting patients in queue!`);
        }
    };

    // Manual Call Patient
    const handleCallPatient = async (patient: any) => {
        const updated = {
            ...patient,
            status: 'In Consultation',
            roomNo: selectedRoom.split(' (')[0],
            doctorName: userName || patient.doctorName || 'Attending Physician',
            calledAt: new Date().toISOString()
        };

        await apiService.saveModuleRecord('his_queue_calls', updated).catch(() => null);
        setQueueCalls(prev => prev.map(q => q.id === patient.id ? updated : q));
        announceQueueCall(updated);
    };

    const inConsultationList = queueCalls.filter(q => q.status === 'In Consultation');
    const waitingList = queueCalls.filter(q => q.status === 'Waiting');
    const completedToday = queueCalls.filter(q => q.status === 'Completed');

    return (
        <div className="space-y-8 text-slate-900 dark:text-white animate-fade-in p-2 md:p-6">

            {/* ── TOP HEADER BANNER ── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 border border-indigo-500/20 shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/30 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Patient Flow
                        </span>
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white italic">
                        HIS Queuing &amp; <span className="text-indigo-400">Voice Call-Out Dashboard</span>
                    </h1>
                    <p className="text-xs text-indigo-200/70 font-bold uppercase tracking-wider mt-1">
                        Real-time token management, automated room calling &amp; waiting room TV display
                    </p>
                </div>

                <div className="flex items-center gap-3 relative z-10 flex-wrap">
                    <button
                        onClick={() => setIsTvMode(true)}
                        className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-purple-950/50 transition-all flex items-center gap-2"
                    >
                        <ActivityIcon className="w-4 h-4" /> Launch Waiting Room TV Display
                    </button>
                </div>
            </div>

            {/* ── STATS ROW ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-400 mb-1">Waiting in Queue</p>
                    <p className="text-4xl font-black text-indigo-400">{waitingList.length}</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase">Estimated wait: ~15 mins</p>
                </div>
                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400 mb-1">In Consultation</p>
                    <p className="text-4xl font-black text-emerald-400">{inConsultationList.length}</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase">Active Doctor Rooms</p>
                </div>
                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-blue-400 mb-1">Checked Out Today</p>
                    <p className="text-4xl font-black text-blue-400">{completedToday.length}</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase">Completed Visits</p>
                </div>
                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-purple-400 mb-1">Total Daily Tokens</p>
                    <p className="text-4xl font-black text-purple-400">{queueCalls.length}</p>
                    <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase">OPD Patients Registered</p>
                </div>
            </div>

            {/* ── DOCTOR QUICK CHECKOUT & CALL NEXT PANEL ── */}
            <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/40 border border-indigo-500/30 rounded-[2.5rem] p-8 shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight italic text-white">
                            Doctor Consultation <span className="text-indigo-400">Checkout &amp; Next Patient Dispatch</span>
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Finish current patient &amp; automatically broadcast next patient voice call-out
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <select
                            value={selectedRoom}
                            onChange={(e) => setSelectedRoom(e.target.value)}
                            className="bg-black/50 border border-indigo-500/40 rounded-2xl px-5 py-3 text-xs font-bold text-white outline-none focus:border-indigo-400 uppercase"
                        >
                            {ROOMS.map((r, i) => (
                                <option key={i} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <button
                        onClick={() => handleCheckoutAndCallNext(selectedRoom)}
                        className="w-full md:w-auto flex-1 py-5 px-8 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-slate-950 hover:text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 italic"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        <span>Checkout Current Patient &amp; Call Next Patient</span>
                    </button>
                    {lastCalledCall && (
                        <button
                            onClick={() => announceQueueCall(lastCalledCall)}
                            className="px-6 py-5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2"
                            title="Re-announce token over voice synthesizer"
                        >
                            <BellIcon className="w-4 h-4 text-indigo-400" />
                            <span>Repeat Announcement</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── MAIN QUEUE COLUMNS ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* IN CONSULTATION ROOMS */}
                <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-6 md:p-8 space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-white/10">
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight italic">
                                🏥 Active <span className="text-emerald-400">Consultation Rooms</span>
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Patients currently inside doctor suites</p>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-500/30">
                            {inConsultationList.length} Active
                        </span>
                    </div>

                    <div className="space-y-4">
                        {inConsultationList.length > 0 ? (
                            inConsultationList.map((q) => (
                                <div key={q.id} className="p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between gap-4 shadow-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-mono font-black text-emerald-400 text-sm">
                                            {q.tokenNo}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase text-white tracking-tight">{q.patientName}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                                {q.roomNo} • <span className="text-indigo-400 italic">{q.doctorName}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => announceQueueCall(q)}
                                            className="p-2.5 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-500/30 transition-all flex items-center gap-1"
                                            title="Call out over speaker"
                                        >
                                            <BellIcon className="w-3.5 h-3.5" /> Call
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center opacity-40">
                                <UsersIcon className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">All consultation suites available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* WAITING QUEUE */}
                <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-6 md:p-8 space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-white/10">
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight italic">
                                ⏳ Waiting <span className="text-indigo-400">Patient Queue</span>
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Next in line to be called</p>
                        </div>
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-500/30">
                            {waitingList.length} Waiting
                        </span>
                    </div>

                    <div className="space-y-4">
                        {waitingList.length > 0 ? (
                            waitingList.map((q) => (
                                <div key={q.id} className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-mono font-black text-indigo-300 text-sm">
                                            {q.tokenNo}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase text-white tracking-tight">{q.patientName}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                                Wait: ~{q.waitMins} mins • <span className={q.priority === 'Urgent' ? 'text-rose-400 font-black' : 'text-slate-400'}>{q.priority}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleCallPatient(q)}
                                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1"
                                    >
                                        <BellIcon className="w-3.5 h-3.5" /> Call In
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center opacity-40">
                                <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Zero waiting patients in queue</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* ── FULL SCREEN TV WAITING ROOM PROJECTOR DISPLAY MODAL ── */}
            {isTvMode && (
                <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col justify-between p-8 md:p-12 animate-fade-in font-sans">
                    {/* Header */}
                    <div className="flex justify-between items-center pb-6 border-b border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl">
                                🏥
                            </div>
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-white italic">
                                    QUANTUM <span className="text-indigo-400">PATIENT QUEUE TV</span>
                                </h2>
                                <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">
                                    Outpatient Consultation &amp; Specialist Calling System
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-3xl font-mono font-black text-white">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                            <button
                                onClick={() => setIsTvMode(false)}
                                className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Active Calling Banner */}
                    {lastCalledCall && (
                        <div className="my-6 p-8 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 rounded-[3rem] shadow-2xl border-4 border-white/20 flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse">
                            <div className="flex items-center gap-6">
                                <div className="px-8 py-4 bg-black/40 rounded-3xl font-mono font-black text-5xl text-white border border-white/20 shadow-inner">
                                    {lastCalledCall.tokenNo}
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-200">NOW SERVING PATIENT</p>
                                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white italic">
                                        {lastCalledCall.patientName}
                                    </h1>
                                </div>
                            </div>
                            <div className="text-right bg-black/30 px-8 py-5 rounded-3xl border border-white/10">
                                <p className="text-xs font-black uppercase tracking-widest text-indigo-200">PROCEED TO</p>
                                <p className="text-3xl font-black uppercase tracking-tight text-white italic">{lastCalledCall.roomNo}</p>
                                <p className="text-xs font-bold text-emerald-300 uppercase mt-0.5">{lastCalledCall.doctorName}</p>
                            </div>
                        </div>
                    )}

                    {/* Active Rooms Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-4">
                        {inConsultationList.slice(0, 3).map((q) => (
                            <div key={q.id} className="p-8 rounded-[2.5rem] bg-slate-900 border border-indigo-500/30 flex flex-col justify-between shadow-xl">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-2xl font-mono font-black text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20">
                                        {q.tokenNo}
                                    </span>
                                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                                        IN CONSULTATION
                                    </span>
                                </div>
                                <div>
                                    <p className="text-2xl font-black uppercase text-white tracking-tight">{q.patientName}</p>
                                    <p className="text-sm font-bold text-slate-400 uppercase mt-1">{q.roomNo}</p>
                                    <p className="text-xs font-black text-indigo-400 uppercase mt-0.5">{q.doctorName}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer Waiting List Bar */}
                    <div className="pt-6 border-t border-white/10 flex items-center justify-between text-slate-400">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-300">NEXT IN QUEUE:</span>
                            <div className="flex gap-2">
                                {waitingList.slice(0, 5).map((w) => (
                                    <span key={w.id} className="px-4 py-2 bg-slate-900 rounded-xl text-xs font-mono font-bold text-white border border-white/10">
                                        {w.tokenNo} ({w.patientName.split(' ')[0]})
                                    </span>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                            QUANTUM HEALTHCARE HIS • LIVE QUEUE DISPLAY
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
}

export default HISQueueManagerView;
