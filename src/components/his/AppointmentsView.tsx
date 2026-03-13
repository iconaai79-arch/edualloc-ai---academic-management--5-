import React, { useState } from 'react';
import { 
    UserIcon, 
    PlusIcon, 
    SearchIcon, 
    ChevronRightIcon,
    UsersIcon
} from '../icons/index';
import { CalendarIcon, ClockIcon } from './HealthIcons';

interface Appointment {
    id: string;
    patientName: string;
    doctorName: string;
    time: string;
    date: string;
    type: string;
    status: 'scheduled' | 'arrived' | 'in-progress' | 'completed';
}

export const AppointmentsView: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [appointments, setAppointments] = useState<Appointment[]>([
        { id: '1', patientName: 'John Doe', doctorName: 'Dr. Smith', time: '09:00 AM', date: '2026-03-14', type: 'General Checkup', status: 'scheduled' },
        { id: '2', patientName: 'Jane Wilson', doctorName: 'Dr. Omondi', time: '10:30 AM', date: '2026-03-14', type: 'Dental Sync', status: 'arrived' },
        { id: '3', patientName: 'Mike Ross', doctorName: 'Dr. Sarah', time: '11:15 AM', date: '2026-03-14', type: 'Follow-up', status: 'in-progress' },
    ]);

    const statusColors = {
        scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        arrived: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        'in-progress': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    };

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Medical <span className="text-indigo-400">Scheduling</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Information Desk & Doctor Registry</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text"
                            placeholder="Search appointments..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all w-64"
                        />
                    </div>
                    <button className="bg-indigo-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-500/20">
                        <PlusIcon className="w-4 h-4" /> Book Appointment
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Doctor Availability Mini-Grid */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-morphism p-8 rounded-[2.5rem] border border-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <UsersIcon className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Active Doctors</h3>
                        </div>
                        <div className="space-y-4">
                            {[
                                { name: 'Dr. Smith', specialty: 'General', status: 'available' },
                                { name: 'Dr. Omondi', specialty: 'Dental', status: 'busy' },
                                { name: 'Dr. Sarah', specialty: 'OPD', status: 'available' }
                            ].map((doc, i) => (
                                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold">{doc.name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{doc.specialty}</p>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${doc.status === 'available' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
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

                {/* Appointment Registry */}
                <div className="lg:col-span-3">
                    <div className="glass-morphism rounded-[3rem] border border-white/5 overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-widest">Daily Appointment Ledger</h3>
                            <div className="flex gap-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase px-3 py-1 bg-white/5 rounded-full border border-white/5 underline underline-offset-4 decoration-indigo-500">Today</span>
                                <span className="text-[10px] font-black text-slate-500 uppercase px-3 py-1 hover:text-white transition-colors cursor-pointer">Tomorrow</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Doctor</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Schedule</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments.map((apt) => (
                                        <tr key={apt.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                                                        {apt.patientName.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-bold">{apt.patientName}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-sm font-medium text-slate-300">{apt.doctorName}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black">{apt.time}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold">{apt.date}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{apt.type}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColors[apt.status]}`}>
                                                    {apt.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
