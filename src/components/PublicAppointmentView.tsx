
import React, { useState, useMemo } from 'react';
import type { User, TimetableEntry, TimetableSettings, Unavailability, Institution, Appointment } from '../types';
import { UserIcon } from './icons/UserIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { CheckIcon } from './icons/CheckIcon';

import { timeToMinutes, minutesToTime } from '../utils/timeUtils';

interface PublicAppointmentViewProps {
    users: User[];
    timetable: TimetableEntry[];
    timetableSettings: TimetableSettings;
    onClose: () => void;
    onBookAppointment: (appointment: Omit<Appointment, 'id' | 'status' | 'createdAt'>) => void;
    institutions: Institution[];
}

export const PublicAppointmentView: React.FC<PublicAppointmentViewProps> = ({ users, timetable, timetableSettings, onClose, onBookAppointment, institutions }) => {
    const [step, setStep] = useState(1);
    const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('');
    const [institutionSearch, setInstitutionSearch] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [guestForm, setGuestForm] = useState({ name: '', email: '', phoneNumber: '', purpose: '' });

    // Filter institutions based on search
    const filteredInstitutions = useMemo(() => {
        const lower = institutionSearch.toLowerCase();
        return institutions.filter(i => i.name.toLowerCase().includes(lower));
    }, [institutions, institutionSearch]);

    // Filter staff based on institution and search
    const filteredStaff = useMemo(() => {
        if (!selectedInstitutionId) return [];
        
        let staff = users.filter(u => u.institutionId === selectedInstitutionId && (u.role === 'lecturer' || u.role === 'admin' || u.role === 'hod' || u.role === 'head_teacher'));
        
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            staff = staff.filter(u => u.name.toLowerCase().includes(lower) || u.role.toLowerCase().includes(lower));
        }
        return staff.slice(0, 20);
    }, [users, selectedInstitutionId, searchTerm]);

    // Calculate available slots for selected staff on selected date
    const availableSlots = useMemo(() => {
        if (!selectedStaff || !selectedDate) return [];

        const dayName = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }) as 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
        
        // 1. Get base operating hours (assume 08:00 to 17:00 if not set, or use settings)
        const startMin = timeToMinutes(timetableSettings.startTime || '08:00');
        const endMin = timeToMinutes(timetableSettings.endTime || '17:00');
        
        // 2. Get conflicting timetable entries
        const lessons = timetable.filter(t => t.lecturerId === selectedStaff.id && t.day === dayName);
        
        // 3. Get recurring unavailability
        const unavailabilities = selectedStaff.unavailability?.filter(u => u.day === dayName && u.status === 'active') || [];

        const slots: string[] = [];
        const slotDuration = 30; // 30 min slots

        for (let time = startMin; time + slotDuration <= endMin; time += slotDuration) {
            const slotStart = time;
            const slotEnd = time + slotDuration;
            
            // Check conflicts
            const hasConflict = lessons.some(l => {
                const lStart = timeToMinutes(l.startTime);
                const lEnd = timeToMinutes(l.endTime);
                return (slotStart < lEnd && slotEnd > lStart);
            }) || unavailabilities.some(u => {
                const uStart = timeToMinutes(u.startTime);
                const uEnd = timeToMinutes(u.endTime);
                return (slotStart < uEnd && slotEnd > uStart);
            });

            if (!hasConflict) {
                slots.push(minutesToTime(slotStart));
            }
        }
        return slots;
    }, [selectedStaff, selectedDate, timetable, timetableSettings]);

    const handleBook = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedStaff && selectedDate && selectedSlot) {
            const [hours, mins] = selectedSlot.split(':').map(Number);
            const endTimeMin = hours * 60 + mins + 30;
            const endTime = minutesToTime(endTimeMin);

            onBookAppointment({
                hostId: selectedStaff.id,
                hostName: selectedStaff.name,
                guestName: guestForm.name,
                guestEmail: guestForm.email,
                guestPhone: guestForm.phoneNumber,
                date: selectedDate,
                startTime: selectedSlot,
                endTime: endTime,
                purpose: guestForm.purpose,
                institutionId: selectedStaff.institutionId
            });
            setStep(4); // Success
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans">
            <header className="bg-white dark:bg-slate-800 shadow-sm p-4 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold text-[var(--color-primary)]">Guest Appointment Portal</h1>
                    <button onClick={onClose} className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">Close</button>
                </div>
            </header>

            <main className="flex-grow p-6">
                <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                    {/* Progress Bar */}
                    <div className="bg-slate-100 dark:bg-slate-700 h-2 w-full">
                        <div className="h-full bg-[var(--color-primary)] transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }}></div>
                    </div>

                    <div className="p-8">
                        {step === 1 && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Step 1: Select Institution</h2>
                                    
                                    {!selectedInstitutionId ? (
                                        <>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Search and select the institution you wish to visit.</p>
                                            
                                            <input 
                                                type="text"
                                                placeholder="Search institution..."
                                                value={institutionSearch}
                                                onChange={e => setInstitutionSearch(e.target.value)}
                                                className="block w-full rounded-md border-slate-300 dark:border-slate-600 p-3 dark:bg-slate-700 mb-2 shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                                autoFocus
                                            />
                                            
                                            <div className="border border-slate-200 dark:border-slate-600 rounded-md max-h-48 overflow-y-auto bg-slate-50 dark:bg-slate-700/50">
                                                {filteredInstitutions.length > 0 ? (
                                                    <ul className="divide-y divide-slate-200 dark:divide-slate-600">
                                                        {filteredInstitutions.map(inst => (
                                                            <li 
                                                                key={inst.id} 
                                                                onClick={() => setSelectedInstitutionId(inst.id)}
                                                                className="p-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-600 flex justify-between items-center transition-colors"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <BuildingOfficeIcon className="w-5 h-5 text-slate-400" />
                                                                    <span className="font-medium text-slate-700 dark:text-slate-200">{inst.name}</span>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="p-4 text-sm text-slate-500 text-center">No institutions found.</p>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex justify-between items-center animate-fade-in-up">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
                                                    <BuildingOfficeIcon className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">Selected Institution</p>
                                                    <p className="font-bold text-slate-900 dark:text-white text-lg">{institutions.find(i => i.id === selectedInstitutionId)?.name}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => { setSelectedInstitutionId(''); setSelectedStaff(null); }} 
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className={`transition-all duration-500 ${selectedInstitutionId ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4 pointer-events-none'}`}>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 border-t border-slate-200 dark:border-slate-700 pt-6">Search Staff</h2>
                                    
                                    <input 
                                        type="text" 
                                        placeholder="Search staff by name or role..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        disabled={!selectedInstitutionId}
                                        className="block w-full rounded-md border-slate-300 dark:border-slate-600 p-3 dark:bg-slate-700 mb-4 shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent disabled:bg-slate-100 dark:disabled:bg-slate-800"
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-80 overflow-y-auto">
                                        {filteredStaff.map(user => (
                                            <div 
                                                key={user.id} 
                                                onClick={() => { setSelectedStaff(user); setStep(2); }}
                                                className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 hover:border-[var(--color-primary)] cursor-pointer transition-all hover:shadow-md flex items-center gap-3 bg-white dark:bg-slate-700/50"
                                            >
                                                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 flex-shrink-0">
                                                    <UserIcon className="w-6 h-6" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">{user.role.replace('_', ' ')}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {selectedInstitutionId && filteredStaff.length === 0 && (
                                            <p className="text-slate-500 text-center col-span-2 py-4">No staff members found matching your search.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && selectedStaff && (
                            <div className="space-y-6">
                                <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:underline mb-2">&larr; Back to Staff</button>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Step 2: Choose a Time</h2>
                                <p className="text-slate-600 dark:text-slate-300">Booking with <span className="font-bold">{selectedStaff.name}</span></p>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Date</label>
                                    <input 
                                        type="date" 
                                        value={selectedDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
                                        className="block w-full rounded-md border-slate-300 dark:border-slate-600 p-2 dark:bg-slate-700"
                                    />
                                </div>

                                {selectedDate && (
                                    <div>
                                        <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">Available Slots (30 min)</h3>
                                        {availableSlots.length > 0 ? (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                                {availableSlots.map(slot => (
                                                    <button
                                                        key={slot}
                                                        onClick={() => setSelectedSlot(slot)}
                                                        className={`py-2 px-3 rounded-md text-sm font-medium border transition-colors ${
                                                            selectedSlot === slot 
                                                                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' 
                                                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                                        }`}
                                                    >
                                                        {slot}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 italic text-sm bg-slate-100 dark:bg-slate-700/50 p-4 rounded-md text-center">
                                                No available slots found for this date. The staff member may be fully booked, teaching classes, or unavailable.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end mt-6">
                                    <button 
                                        onClick={() => setStep(3)} 
                                        disabled={!selectedSlot}
                                        className="btn-primary px-6 py-2 rounded-md bg-[var(--color-primary)] text-white disabled:opacity-50"
                                    >
                                        Next Step
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <button onClick={() => setStep(2)} className="text-sm text-slate-500 hover:underline mb-2">&larr; Back to Time</button>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Step 3: Your Details</h2>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-md border border-slate-200 dark:border-slate-600 mb-4">
                                    <p className="text-sm font-semibold">Summary:</p>
                                    <p className="text-sm">Meeting with: {selectedStaff?.name}</p>
                                    <p className="text-sm">Date: {selectedDate} at {selectedSlot}</p>
                                </div>

                                <form onSubmit={handleBook} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Your Name</label>
                                        <input required type="text" value={guestForm.name} onChange={e => setGuestForm({...guestForm, name: e.target.value})} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Your Email</label>
                                            <input required type="email" value={guestForm.email} onChange={e => setGuestForm({...guestForm, email: e.target.value})} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Phone Number</label>
                                            <input required type="tel" value={guestForm.phoneNumber} onChange={e => setGuestForm({...guestForm, phoneNumber: e.target.value})} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" placeholder="e.g. 07..." />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Purpose of Meeting</label>
                                        <textarea required value={guestForm.purpose} onChange={e => setGuestForm({...guestForm, purpose: e.target.value})} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" rows={3}></textarea>
                                    </div>
                                    <div className="pt-4">
                                        <button type="submit" className="w-full btn-primary bg-[var(--color-primary)] text-white py-3 rounded-md font-bold text-lg shadow-lg hover:shadow-xl transition-all">Confirm Booking</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="text-center py-10">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-6">
                                    <CheckCircleIcon className="w-12 h-12" />
                                </div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Booking Confirmed!</h2>
                                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                                    Your appointment with <strong>{selectedStaff?.name}</strong> has been scheduled for <strong>{selectedDate} at {selectedSlot}</strong>.
                                </p>
                                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 p-4 rounded-lg mb-8 text-left max-w-md mx-auto">
                                    <h4 className="font-bold text-blue-800 dark:text-blue-200 text-sm mb-2">Next Steps</h4>
                                    <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                        <li>A confirmation email has been sent to <strong>{guestForm.email}</strong>.</li>
                                        <li>Please arrive 10 minutes early for security check-in.</li>
                                        <li>After your visit, you will receive a link to rate your experience.</li>
                                    </ul>
                                </div>
                                <button onClick={onClose} className="px-6 py-2 border border-slate-300 rounded-md hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700 text-slate-700 dark:text-white transition-colors">
                                    Return to Home
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
