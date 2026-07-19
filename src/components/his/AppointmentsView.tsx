import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon } from '../icons/PlusIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XCircleIcon as XMarkIcon } from '../icons/XCircleIcon';
import { BellIcon } from '../icons/BellIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';

import { AddAppointmentModal } from './AddAppointmentModal';
import { Role, HISAppointment } from '../../types';
import { apiService } from '../../services/apiService';

interface AppointmentsViewProps {
    activeRole?: Role;
    userName?: string;
    institutionId?: string;
    demoAppointments?: HISAppointment[];
    isEdu?: boolean;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({ activeRole, userName, institutionId, demoAppointments, isEdu }) => {
    // In hospital/clinic context, lecturers (doctors) see a read-only mode with no scheduling button.
    // In EduPulse (school) context, 'lecturer' is a school teacher — they should still be able to add visits.
    const isDoctor = !isEdu && activeRole === 'lecturer';
    const [searchTerm, setSearchTerm] = useState('');
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<HISAppointment | null>(null);
    const [notification, setNotification] = useState<{ show: boolean, message: string }>({ show: false, message: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [appointments, setAppointments] = useState<HISAppointment[]>(demoAppointments || []);

    const fetchAppointments = async () => {
        if (!institutionId) return;
        setIsLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<HISAppointment>('his_appointments', institutionId);
            if (data && data.length > 0) {
                setAppointments(data);
            } else if (demoAppointments) {
                setAppointments(demoAppointments);
            }
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
            if (demoAppointments) setAppointments(demoAppointments);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [institutionId]);

    const filteredAppointments = appointments.filter(app => {
        const matchesSearch = app.reason?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             app.patientId?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const handleReschedule = (app: HISAppointment) => {
        setSelectedAppointment(app);
        setIsRescheduleModalOpen(true);
    };

    const confirmReschedule = async (newDate: string, newTime: string) => {
        if (!selectedAppointment || !institutionId) return;
        
        try {
            const updated = { ...selectedAppointment, date: newDate, time: newTime, status: 'Rescheduled' };
            await apiService.saveModuleRecord('his_appointments', updated);
            
            setAppointments(appointments.map(app => 
                app.id === selectedAppointment.id ? updated : app
            ));

            setIsRescheduleModalOpen(false);
            setNotification({ 
                show: true, 
                message: `Notification sent: Appointment rescheduled to ${newDate} at ${newTime}` 
            });

            setTimeout(() => setNotification({ show: false, message: '' }), 5000);
        } catch (error) {
            console.error('Failed to reschedule:', error);
            alert('Failed to reschedule appointment.');
        }
    };

    const handleCreateAppointment = async (data: any) => {
        if (!institutionId) return;
        try {
            const newApp = { 
                ...data, 
                institution_id: institutionId, 
                id: `app_${Date.now()}` 
            };
            await apiService.saveModuleRecord('his_appointments', newApp);
            setAppointments(prev => [newApp, ...prev]);
            setNotification({ show: true, message: 'Appointment Scheduled Successfully' });
            setTimeout(() => setNotification({ show: false, message: '' }), 5000);
        } catch (error) {
            console.error(error);
            alert("Failed to schedule appointment");
        }
    };

    const statusStyles = {
        'Scheduled': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        'Arrived': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        'In-Progress': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        'Completed': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        'Rescheduled': 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    };

    return (
        <div className="space-y-10">
            {notification.show && (
                <div className="fixed top-24 right-8 z-[100] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce-in ring-4 ring-indigo-400/30">
                    <BellIcon className="w-6 h-6" />
                    <p className="text-[11px] font-black uppercase tracking-widest">{notification.message}</p>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Master Visit Registry</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {isDoctor ? `Practitioner: ${userName}` : 'Global Patient Scheduling Control'}
                    </p>
                </div>
                <div className="flex gap-4">
                    {!isDoctor ? (
                        <button 
                            onClick={() => setIsAddAppointmentOpen(true)}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-600/20"
                        >
                            <PlusIcon className="w-4 h-4" /> Add Visit
                        </button>
                    ) : (
                        <div className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                             <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest italic tracking-tight underline underline-offset-4 decoration-2 decoration-emerald-500">Live Practice Mode</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
                        {/* Desktop Table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Details</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Provider</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timing</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {filteredAppointments.map((app) => (
                                        <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div>
                                                    <p className="text-sm font-black italic tracking-tight">{app.patientName}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">{app.type}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                        <UsersIcon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black italic">{app.doctorName}</p>
                                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{app.specialty}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">
                                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                                                    <CalendarDaysIcon className="w-3.5 h-3.5" /> {app.date}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <ClockIcon className="w-3.5 h-3.5" /> {app.time}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-tighter ${(statusStyles as any)[app.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                                {app.status}
                                            </div>
                                            </td>
                                            <td className="px-8 py-6 text-right space-x-2">
                                                <button 
                                                    onClick={() => handleReschedule(app)}
                                                    className="p-2.5 text-slate-400 hover:text-indigo-600 bg-slate-100 dark:bg-white/5 rounded-xl transition-all"
                                                    title="Reschedule"
                                                >
                                                    <ArrowPathIcon className="w-4 h-4" />
                                                </button>
                                                <button className="p-2.5 text-slate-400 hover:text-indigo-600 bg-slate-100 dark:bg-white/5 rounded-xl transition-all">
                                                    <ChevronRightIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden divide-y divide-slate-100 dark:divide-white/5">
                            {filteredAppointments.map(app => (
                                <div key={app.id} className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600">
                                                <UsersIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black uppercase italic">{app.patientName}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{app.type}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border italic ${(statusStyles as any)[app.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{app.status}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Provider</p>
                                            <p className="text-[10px] font-black italic">{app.doctorName}</p>
                                            <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-tight mt-1">{app.specialty}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Schedule</p>
                                            <p className="text-[10px] font-black">{app.date}</p>
                                            <p className="text-[8px] font-bold text-slate-500 mt-1">{app.time}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <button onClick={() => handleReschedule(app)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest italic">Reschedule</button>
                                        <button className="p-3 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-xl"><ChevronRightIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-xl">
                        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] mb-8 italic underline underline-offset-4 decoration-2 decoration-indigo-500">Active Practitioners</p>
                        <div className="space-y-6">
                            {[
                                { name: 'Dr. Sarah Smith', status: 'On Shift', specialty: 'General', color: 'text-emerald-400' },
                                { name: 'Dr. Mike Omondi', status: 'Busy', specialty: 'Optical', color: 'text-rose-400' },
                                { name: 'Dr. Jane Doe', status: 'Checked Out', specialty: 'Dental', color: 'text-slate-500' },
                                { name: 'Nurse Joy', status: 'On Shift', specialty: 'Triage', color: 'text-emerald-400' }
                            ].map((doc, i) => (
                                <div key={i} className="flex justify-between items-center group cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2.5 h-2.5 rounded-full bg-current animate-pulse text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ color: doc.color === 'text-emerald-400' ? '#34d399' : (doc.color === 'text-rose-400' ? '#fb7185' : '#64748b') }}></div>
                                        <div>
                                            <p className="text-xs font-black italic">{doc.name}</p>
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{doc.specialty}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${doc.color} italic underline underline-offset-4`}>{doc.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-10 rounded-[3rem] bg-gradient-to-br from-indigo-600 to-violet-700 shadow-2xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
                        <DocumentTextIcon className="w-10 h-10 mb-6 opacity-40 group-hover:rotate-12 transition-transform" />
                        <h4 className="text-xl font-black mb-2 relative z-10 italic">Signal Queue</h4>
                        <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest relative z-10">Real-time Wait Metrics</p>
                        <p className="text-4xl font-black mt-4 relative z-10 italic underline decoration-white/20">~15 <span className="text-xs font-bold text-indigo-200">mins</span></p>
                        <button className="mt-8 w-full py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all italic underline underline-offset-4 decoration-2">Broadcast Signal</button>
                    </div>
                </div>
            </div>

            {/* Reschedule Modal - Standardized PM Style */}
            {isRescheduleModalOpen && selectedAppointment && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-8 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setIsRescheduleModalOpen(false)}></div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-lg rounded-[3rem] p-12 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <button onClick={() => setIsRescheduleModalOpen(false)} className="absolute top-10 right-10 text-slate-400 hover:text-rose-500 transition-all">
                            <XMarkIcon className="w-8 h-8" />
                        </button>
                        
                        <div className="mb-10 text-slate-950 dark:text-white">
                            <h3 className="text-2xl font-black uppercase tracking-tight italic">Reschedule <span className="text-indigo-600">Patient</span></h3>
                            <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-widest leading-relaxed italic">Shifting timeline for <span className="text-indigo-500 underline decoration-2">{selectedAppointment.patientName}</span></p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Target Date</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-5 text-sm outline-none transition-all text-slate-900 dark:text-white shadow-inner font-black"
                                    defaultValue="2026-03-20"
                                    id="reschedule-date"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Target Time</label>
                                <input 
                                    type="time" 
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-5 text-sm outline-none transition-all text-slate-900 dark:text-white shadow-inner font-black"
                                    defaultValue="10:00"
                                    id="reschedule-time"
                                />
                            </div>
                            <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/20 italic">
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-relaxed">
                                    <BellIcon className="w-4 h-4 inline mr-2 align-middle" />
                                    This adjustment triggers an automated SHA-compliant notification to the patient.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button 
                                onClick={() => setIsRescheduleModalOpen(false)}
                                className="flex-1 py-5 border-2 border-slate-100 dark:border-white/5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all outline-none"
                            >
                                Abandon
                            </button>
                            <button 
                                onClick={() => {
                                    const date = (document.getElementById('reschedule-date') as HTMLInputElement).value;
                                    const time = (document.getElementById('reschedule-time') as HTMLInputElement).value;
                                    confirmReschedule(date, time);
                                }}
                                className="flex-1 py-5 bg-indigo-600 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] text-white hover:scale-105 transition-all shadow-2xl shadow-indigo-600/30 ring-4 ring-indigo-500/20 outline-none italic"
                            >
                                Confirm & Notify
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            {createPortal(
                <AddAppointmentModal 
                    isOpen={isAddAppointmentOpen} 
                    onClose={() => setIsAddAppointmentOpen(false)} 
                    onAdd={handleCreateAppointment}
                />,
                document.body
            )}
        </div>
    );
};

