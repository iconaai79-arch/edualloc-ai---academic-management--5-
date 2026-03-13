import React, { useState, useEffect } from 'react';
import { 
    ClockIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    ArrowRightOnRectangleIcon,
    CalendarDaysIcon,
    UserIcon,
    SparklesIcon,
    MapPinIcon
} from '../icons/index';
import { ActivityIcon, FireIcon } from './HealthIcons';

interface AttendanceSession {
    id: string;
    staffId: string;
    staffName: string;
    checkIn: string;
    checkOut?: string;
    status: 'Available' | 'Busy' | 'Out of Office' | 'On Emergency';
    location: string;
}

interface StaffAttendanceProps {
    userName?: string;
}

export const StaffAttendanceView: React.FC<StaffAttendanceProps> = ({ userName }) => {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [status, setStatus] = useState<'Available' | 'Busy' | 'Out of Office' | 'On Emergency'>('Available');
    const [sessions, setSessions] = useState<AttendanceSession[]>([
        { id: '1', staffId: 'D001', staffName: userName || 'Dr. Smith', checkIn: '08:00 AM', status: 'Available', location: 'OPD - Room 12' },
        { id: '2', staffId: 'D001', staffName: userName || 'Dr. Smith', checkIn: '08:00 AM', checkOut: '04:00 PM', status: 'Out of Office', location: 'Home' },
    ]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleCheckIn = () => {
        setIsCheckedIn(true);
        const newSession: AttendanceSession = {
            id: Date.now().toString(),
            staffId: 'D001',
            staffName: userName || 'Current User',
            checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: status,
            location: 'Main Hospital'
        };
        setSessions([newSession, ...sessions]);
    };

    const handleCheckOut = () => {
        setIsCheckedIn(false);
        setSessions(sessions.map((s, i) => i === 0 ? { ...s, checkOut: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } : s));
    };

    const statusColors = {
        'Available': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        'Busy': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        'Out of Office': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        'On Emergency': 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    };

    return (
        <div className="animate-fade-in-up space-y-10">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-indigo-400">Duty <span className="text-white">Central</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Real-time Presence & Shift Management</p>
                </div>
                <div className="text-right">
                    <p className="text-4xl font-black tracking-tighter tabular-nums">{currentTime}</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Friday, March 13, 2026</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Control Panel */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 space-y-8 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] rounded-full -mr-16 -mt-16 transition-colors duration-1000 ${isCheckedIn ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}></div>
                        
                        <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                            <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center transition-all shadow-2xl relative ${isCheckedIn ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-500'}`}>
                                <UserIcon className="w-10 h-10" />
                                {isCheckedIn && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-slate-950 animate-pulse"></div>}
                            </div>
                            <div>
                                <h3 className="text-lg font-black">{userName || 'Practitioner'}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Medical Staff ID: D001</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            {(['Available', 'Busy', 'Out of Office', 'On Emergency'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className={`px-4 py-3 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                                        status === s 
                                        ? statusColors[s] 
                                        : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                            className={`w-full py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl flex items-center justify-center gap-3 ${
                                isCheckedIn 
                                ? 'bg-rose-500 text-white shadow-rose-500/20 hover:scale-105' 
                                : 'bg-emerald-500 text-white shadow-emerald-500/20 hover:scale-105'
                            }`}
                        >
                            {isCheckedIn ? (
                                <> <ArrowRightOnRectangleIcon className="w-4 h-4" /> End Shift </>
                            ) : (
                                <> <CheckCircleIcon className="w-4 h-4" /> Start Shift </>
                            )}
                        </button>
                    </div>

                    <div className="p-10 rounded-[3rem] bg-gradient-to-br from-indigo-600 to-violet-700 shadow-xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-24 translate-x-24 blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-8">Shift Metrics</p>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <div>
                                    <p className="text-2xl font-black">7.5 <span className="text-xs font-bold opacity-60">Hrs</span></p>
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Today's Duration</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black">15</p>
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Patients Seen</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-4">
                                <SparklesIcon className="w-5 h-5 text-indigo-200" />
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest">Peak Activity</p>
                                    <p className="text-xs font-bold">10:00 AM - 12:30 PM</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Presence Ledger */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="glass-morphism rounded-[3rem] border border-white/5 overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest">Attendance Ledger</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Clock logs & availability status history</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-400 px-4 py-1.5 rounded-full border border-indigo-500/20 uppercase tracking-widest italic underline underline-offset-4 decoration-2">March 2026</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Check-In</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Check-Out</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Location</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Status at Hand</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((session) => (
                                        <tr key={session.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                                        <ClockIcon className="w-3 h-3" />
                                                    </div>
                                                    <span className="text-sm font-black">{session.checkIn}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {session.checkOut ? (
                                                    <span className="text-sm font-bold text-slate-400">{session.checkOut}</span>
                                                ) : (
                                                    <span className="text-[10px] font-black uppercase text-emerald-500 animate-pulse tracking-widest">Current Shift</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <MapPinIcon className="w-3 h-3" />
                                                    <span className="text-xs font-bold uppercase tracking-tight">{session.location}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${statusColors[session.status]}`}>
                                                    {session.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="glass-morphism p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 group-hover:scale-110 transition-transform">
                                    <CalendarDaysIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-black uppercase tracking-tight">Shift Calendar</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">View monthly rotations</p>
                                </div>
                            </div>
                        </div>
                        <div className="glass-morphism p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 group-hover:scale-110 transition-transform">
                                    <FireIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-black uppercase tracking-tight">Request Leave</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Submit absence request</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
