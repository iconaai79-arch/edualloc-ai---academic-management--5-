import React, { useState } from 'react';
import { 
    PlusIcon, 
    SearchIcon, 
    ChevronRightIcon, 
    UsersIcon, 
    ArrowPathIcon,
    CalendarDaysIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon as XMarkIcon,
    BellIcon,
    DocumentTextIcon
} from '../icons/index';
import { Role } from '../../types';

interface Appointment {
    id: string;
    patientName: string;
    doctorName: string;
    specialty: string;
    time: string;
    date: string;
    status: 'Scheduled' | 'Arrived' | 'In-Progress' | 'Completed' | 'Rescheduled';
    type: 'Consultation' | 'Follow-up' | 'Procedure';
}

interface AppointmentsViewProps {
    activeRole?: Role;
    userName?: string;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({ activeRole, userName }) => {
    const isDoctor = activeRole === 'lecturer';
    const [searchTerm, setSearchTerm] = useState('');
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [notification, setNotification] = useState<{ show: boolean, message: string }>({ show: false, message: '' });

    const [appointments, setAppointments] = useState<Appointment[]>([
        { id: '1', patientName: 'John Doe', doctorName: 'Dr. Sarah Smith', specialty: 'General Practice', time: '09:00 AM', date: 'Mar 13, 2026', status: 'Scheduled', type: 'Consultation' },
        { id: '2', patientName: 'Mary Awino', doctorName: 'Dr. Sarah Smith', specialty: 'Dental', time: '10:30 AM', date: 'Mar 13, 2026', status: 'Arrived', type: 'Follow-up' },
        { id: '3', patientName: 'Peter Kamau', doctorName: 'Dr. Mike Omondi', specialty: 'Optical', time: '11:15 AM', date: 'Mar 13, 2026', status: 'Scheduled', type: 'Procedure' },
        { id: '4', patientName: 'Alice Wambui', doctorName: 'Dr. Sarah Smith', specialty: 'General Practice', time: '02:00 PM', date: 'Mar 13, 2026', status: 'Scheduled', type: 'Consultation' },
    ]);

    const filteredAppointments = appointments.filter(app => {
        const matchesSearch = app.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             app.doctorName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDoctor = isDoctor ? app.doctorName === userName : true;
        return matchesSearch && matchesDoctor;
    });

    const handleReschedule = (app: Appointment) => {
        setSelectedAppointment(app);
        setIsRescheduleModalOpen(true);
    };

    const confirmReschedule = (newDate: string, newTime: string) => {
        if (!selectedAppointment) return;
        
        setAppointments(appointments.map(app => 
            app.id === selectedAppointment.id 
            ? { ...app, date: newDate, time: newTime, status: 'Rescheduled' } 
            : app
        ));

        setIsRescheduleModalOpen(false);
        setNotification({ 
            show: true, 
            message: `Notification sent to ${selectedAppointment.patientName}: Appointment rescheduled to ${newDate} at ${newTime}` 
        });

        setTimeout(() => setNotification({ show: false, message: '' }), 5000);
    };

    const statusStyles = {
        'Scheduled': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        'Arrived': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        'In-Progress': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        'Completed': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        'Rescheduled': 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    };

    return (
        <div className="animate-fade-in-up space-y-10">
            {notification.show && (
                <div className="fixed top-24 right-8 z-[100] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce-in ring-4 ring-indigo-400/30">
                    <BellIcon className="w-6 h-6" />
                    <p className="text-[11px] font-black uppercase tracking-widest">{notification.message}</p>
                </div>
            )}

            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Visit <span className="text-indigo-400">Ledger</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">
                        {isDoctor ? `Schedule for ${userName}` : 'Global Patient Scheduling & Doctor Availability'}
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text"
                            placeholder="Find patient or doctor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all w-64"
                        />
                    </div>
                    {!isDoctor && (
                        <button className="bg-indigo-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                            <PlusIcon className="w-4 h-4" /> Book Appointment
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <div className="glass-morphism rounded-[3rem] border border-white/5 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient Details</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigned To</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timing</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredAppointments.map((app) => (
                                    <tr key={app.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div>
                                                <p className="text-sm font-black tracking-tight">{app.patientName}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">{app.type}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-indigo-400">
                                                    <UsersIcon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black">{app.doctorName}</p>
                                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{app.specialty}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-indigo-400">
                                                    <CalendarDaysIcon className="w-3 h-3" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{app.date}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500 pb-2">
                                                    <ClockIcon className="w-3 h-3" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{app.time}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusStyles[app.status]}`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleReschedule(app)}
                                                    className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all"
                                                    title="Reschedule"
                                                >
                                                    <ArrowPathIcon className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 bg-white/5 text-slate-500 rounded-xl hover:text-white transition-all">
                                                    <ChevronRightIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/5">
                        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mb-8 italic underline underline-offset-4 decoration-2">Active Practitioners</p>
                        <div className="space-y-6">
                            {[
                                { name: 'Dr. Sarah Smith', status: 'On Shift', specialty: 'General', color: 'text-emerald-400' },
                                { name: 'Dr. Mike Omondi', status: 'Busy', specialty: 'Optical', color: 'text-rose-400' },
                                { name: 'Dr. Jane Doe', status: 'Checked Out', specialty: 'Dental', color: 'text-slate-500' },
                                { name: 'Nurse Joy', status: 'On Shift', specialty: 'Triage', color: 'text-emerald-400' }
                            ].map((doc, i) => (
                                <div key={i} className="flex justify-between items-center group cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 rounded-full bg-current animate-pulse text-emerald-400" style={{ color: doc.color === 'text-emerald-400' ? '#34d399' : (doc.color === 'text-rose-400' ? '#fb7185' : '#64748b') }}></div>
                                        <div>
                                            <p className="text-xs font-black">{doc.name}</p>
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{doc.specialty}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${doc.color}`}>{doc.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-8 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                        <h4 className="text-xl font-black mb-2 relative z-10">Queue Status</h4>
                        <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest relative z-10">Current wait time</p>
                        <p className="text-4xl font-black mt-4 relative z-10">~15 <span className="text-xs font-bold text-indigo-200">mins</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
};
