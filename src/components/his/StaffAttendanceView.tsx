import React, { useState, useEffect } from 'react';
import { 
    ClockIcon, 
    ArrowPathIcon,
    CalendarDaysIcon as CalendarIcon,
    UserIcon,
    SparklesIcon,
    MapPinIcon,
    ClipboardListIcon as HistoryIcon
} from '../icons/index';

import { HISStaffAttendance } from '../../types';
import { apiService } from '../../services/apiService';

type StaffPresenceStatus = 'Available' | 'Busy' | 'Out of Office' | 'On Emergency';

interface StaffAttendanceProps {
    userName?: string;
    institutionId?: string;
    demoAttendance?: HISStaffAttendance[];
}

export const StaffAttendanceView: React.FC<StaffAttendanceProps> = ({ userName, institutionId, demoAttendance }) => {
    const [isOnShift, setIsOnShift] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<string>('Available');
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
    const [isLoading, setIsLoading] = useState(true);
    
    const [presenceLogs, setPresenceLogs] = useState<HISStaffAttendance[]>(demoAttendance || []);

    const fetchLogs = async () => {
        if (!institutionId) return;
        setIsLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<HISStaffAttendance>('his_staff_attendance', institutionId);
            if (data && data.length > 0) {
                setPresenceLogs(data);
                // Check if user is currently on shift (latest log has no checkOut)
                const activeLog = data.find(l => !l.checkOut);
                if (activeLog) {
                    setIsOnShift(true);
                    setCurrentStatus(activeLog.status || 'Available');
                }
            } else if (demoAttendance) {
                setPresenceLogs(demoAttendance);
            }
        } catch (error) {
            console.error('Failed to fetch attendance:', error);
            if (demoAttendance) setPresenceLogs(demoAttendance);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [institutionId]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleToggleShift = async () => {
        if (!institutionId) return;

        try {
            if (!isOnShift) {
                const newLog: Partial<HISStaffAttendance> = {
                    id: `his_att_${Date.now()}`,
                    staffId: userName || 'Unknown',
                    date: new Date().toISOString().split('T')[0],
                    checkIn: new Date().toISOString(),
                    status: 'Available',
                    institutionId: institutionId
                };
                await apiService.saveModuleRecord('his_staff_attendance', newLog);
                setIsOnShift(true);
                setCurrentStatus('Available');
                fetchLogs();
            } else {
                const activeLog = presenceLogs.find(l => !l.checkOut);
                if (activeLog) {
                    const updated = { ...activeLog, checkOut: new Date().toISOString(), status: 'Out of Office' };
                    await apiService.saveModuleRecord('his_staff_attendance', updated);
                }
                setIsOnShift(false);
                setCurrentStatus('Out of Office');
                fetchLogs();
            }
        } catch (error) {
            console.error('Failed to toggle shift:', error);
        }
    };

    const statusColors: Record<StaffPresenceStatus, string> = {
        'Available': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        'Busy': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        'Out of Office': 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        'On Emergency': 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    };

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Presence Control Hub</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time status management for {userName || 'Clinical Staff'}</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block mr-4">
                        <p className="text-2xl font-black tracking-tighter tabular-nums">{currentTime}</p>
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Quantum System Time</p>
                    </div>
                    <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 border ${isOnShift ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5'}`}>
                        <div className={`w-2 h-2 rounded-full ${isOnShift ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isOnShift ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {isOnShift ? 'Live On Shift' : 'Off Duty'}
                        </span>
                    </div>
                    <button 
                        onClick={handleToggleShift}
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl ${
                            isOnShift 
                            ? 'bg-rose-600 text-white shadow-rose-600/20 hover:bg-rose-700' 
                            : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700'
                        }`}
                    >
                        {isOnShift ? 'End Clinical Shift' : 'Initiate Shift'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Historical Shift Ledger</h4>
                            <HistoryIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-white/5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-4">Shift Date</th>
                                        <th className="px-8 py-4">Timeline</th>
                                        <th className="px-8 py-4">Duration</th>
                                        <th className="px-8 py-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {presenceLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="px-8 py-5 text-xs font-black italic">{log.checkIn?.split('T')[0] || log.date}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase">
                                                    <span>{log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                                    <ArrowPathIcon className="w-3 h-3 rotate-90 text-indigo-400" />
                                                    <span>{log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-[10px] font-black text-indigo-500 uppercase">{log.totalHours || '0'} hrs</td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-tighter ${(statusColors as any)[log.status || 'Available'] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
                            {presenceLogs.map(log => (
                                <div key={log.id} className="p-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-xs font-black italic">{log.checkIn?.split('T')[0] || log.date}</p>
                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border italic ${(statusColors as any)[log.status || 'Available'] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{log.status}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">
                                            {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'} - {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                                        </div>
                                        <div className="text-[10px] font-black text-indigo-500 uppercase">{log.totalHours || '0'} hrs</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-xl bg-gradient-to-br from-indigo-500/5 to-transparent">
                        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] mb-8 italic underline underline-offset-4 decoration-2 decoration-indigo-500">Live Status Override</p>
                        <div className="grid grid-cols-1 gap-4">
                            {(['Available', 'Busy', 'On Emergency', 'Out of Office']).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setCurrentStatus(status)}
                                    disabled={!isOnShift && status !== 'Out of Office'}
                                    className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                                        currentStatus === status 
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                                        : 'bg-slate-100 dark:bg-white/5 border-transparent text-slate-500 hover:border-indigo-500/30'
                                    } ${(!isOnShift && status !== 'Out of Office') ? 'opacity-30 cursor-not-allowed' : ''}`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
                                    <div className={`w-1.5 h-1.5 rounded-full ${currentStatus === status ? 'bg-white' : 'bg-slate-400'} group-hover:scale-150 transition-transform`}></div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:scale-125 transition-all"></div>
                        <h4 className="text-xl font-black mb-1 italic">Week Progress</h4>
                        <p className="text-indigo-200 text-[9px] font-bold uppercase tracking-widest">Target: 40 hrs</p>
                        <div className="mt-8 space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase italic">
                                <span>Completed</span>
                                <span>17.25 hrs</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-white w-[43%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
