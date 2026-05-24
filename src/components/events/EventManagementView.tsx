import React, { useState, useEffect, useMemo } from 'react';
import { User, Institution, SportEvent, EventCategory, EventParticipant, EventSplit, EventMedicalLog, EventPledge } from '../../types';
import { apiService } from '../../services/apiService';
import { EventRegistrationModal } from './EventRegistrationModal';
import { RaceDayControl } from './RaceDayControl';
import { EventLeaderboard } from './EventLeaderboard';
import { FundraisingTracker } from './FundraisingTracker';
import { 
    CalendarDaysIcon, SparklesIcon, UserGroupIcon, MapPinIcon, 
    BanknotesIcon, PlusIcon, Trash2Icon, AlertTriangleIcon, CheckCircleIcon,
    ChartBarIcon, ClockIcon, Edit2Icon, XIcon, ShareIcon
} from '../icons';

interface EventManagementViewProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction?: (actionType: string, details: string) => void;
}

export const EventManagementView: React.FC<EventManagementViewProps> = ({
    currentUser,
    currentInstitution,
    onLogAction
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'events' | 'runners' | 'raceday' | 'medical' | 'fundraising' | 'leaderboard'>('dashboard');
    const [isLoading, setIsLoading] = useState(true);

    // Module entities states
    const [events, setEvents] = useState<SportEvent[]>([]);
    const [categories, setCategories] = useState<EventCategory[]>([]);
    const [participants, setParticipants] = useState<EventParticipant[]>([]);
    const [splits, setSplits] = useState<EventSplit[]>([]);
    const [medicalLogs, setMedicalLogs] = useState<EventMedicalLog[]>([]);
    const [pledges, setPledges] = useState<EventPledge[]>([]);

    // Form modals
    const [isRegModalOpen, setIsRegModalOpen] = useState(false);
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

    // Active selected Event context
    const [selectedEventId, setSelectedEventId] = useState<string>('');

    // New Event / Category Form States
    const [eventForm, setEventForm] = useState({ name: '', description: '', date: '', location: '' });
    const [categoryForm, setCategoryForm] = useState({ name: '', distanceKm: '', registrationFee: '', capacity: '', genderRestriction: 'any' as 'any' | 'male' | 'female', startTime: '' });

    // Fetch and Sync
    const loadEventData = async () => {
        setIsLoading(true);
        try {
            // Load from mock API or local storage fallback
            let evs = await apiService.fetchModuleRecords<SportEvent>('events').catch(() => []);
            let cats = await apiService.fetchModuleRecords<EventCategory>('event_categories').catch(() => []);
            let parts = await apiService.fetchModuleRecords<EventParticipant>('event_participants').catch(() => []);
            let spls = await apiService.fetchModuleRecords<EventSplit>('event_splits').catch(() => []);
            let med = await apiService.fetchModuleRecords<EventMedicalLog>('event_medical_logs').catch(() => []);
            let plg = await apiService.fetchModuleRecords<EventPledge>('event_pledges').catch(() => []);

            // Check if we need to seed demo data
            if (evs.length === 0) {
                const demoEventId = 'evt_' + Date.now();
                const demoEvent: SportEvent = {
                    id: demoEventId,
                    institutionId: currentInstitution.id,
                    name: 'Nairobi City Elite Marathon 2026',
                    description: 'The annual regional marathon promoting environmental sustainability and athletic development.',
                    date: '2026-06-20',
                    location: 'Nairobi National Park Circuit, Kenya',
                    status: 'planning',
                    createdAt: new Date().toISOString()
                };

                const demoCats: EventCategory[] = [
                    { id: 'cat_42k_' + Date.now(), eventId: demoEventId, name: 'Full Marathon', distanceKm: 42.2, registrationFee: 2000, capacity: 500, genderRestriction: 'any', startTime: '06:00:00' },
                    { id: 'cat_21k_' + Date.now(), eventId: demoEventId, name: 'Half Marathon', distanceKm: 21.1, registrationFee: 1500, capacity: 1000, genderRestriction: 'any', startTime: '06:30:00' },
                    { id: 'cat_10k_' + Date.now(), eventId: demoEventId, name: '10K Fun Run', distanceKm: 10, registrationFee: 1000, capacity: 1500, genderRestriction: 'any', startTime: '07:00:00' }
                ];

                const demoParts: EventParticipant[] = [
                    { id: 'part_1', categoryId: demoCats[0].id, bibNumber: '1001', firstName: 'Kipchoge', lastName: 'Keino', email: 'kipchoge.keino@sports.ke', phone: '0711223344', gender: 'male', age: 34, tShirtSize: 'M', status: 'checked_in', waiverSigned: true, paymentStatus: 'paid', mpesaReference: 'MPK908123', emergencyContactName: 'Jane Keino', emergencyContactPhone: '0722334455' },
                    { id: 'part_2', categoryId: demoCats[0].id, bibNumber: '1002', firstName: 'Brigid', lastName: 'Kosgei', email: 'brigid.kosgei@sports.ke', phone: '0722445566', gender: 'female', age: 29, tShirtSize: 'S', status: 'checked_in', waiverSigned: true, paymentStatus: 'paid', mpesaReference: 'MPK781902', emergencyContactName: 'Sam Kosgei', emergencyContactPhone: '0711902819' },
                    { id: 'part_3', categoryId: demoCats[1].id, bibNumber: '2001', firstName: 'David', lastName: 'Rudisha', email: 'david@sports.ke', phone: '0733556677', gender: 'male', age: 31, tShirtSize: 'L', status: 'checked_in', waiverSigned: true, paymentStatus: 'paid', mpesaReference: 'MPK610928', emergencyContactName: 'Ruth Rudisha', emergencyContactPhone: '0722883399' },
                    { id: 'part_4', categoryId: demoCats[2].id, bibNumber: '3001', firstName: 'Tegla', lastName: 'Loroupe', email: 'tegla@loroupe.org', phone: '0700112233', gender: 'female', age: 45, tShirtSize: 'S', status: 'checked_in', waiverSigned: true, paymentStatus: 'paid', mpesaReference: 'MPK309102', emergencyContactName: 'Albert Loroupe', emergencyContactPhone: '0722309102' }
                ];

                const demoPledges: EventPledge[] = [
                    { id: 'plg_1', participantId: 'part_1', sponsorName: 'Safaricom Ltd', amount: 15000, paymentStatus: 'paid', createdAt: new Date().toISOString() },
                    { id: 'plg_2', participantId: 'part_2', sponsorName: 'Kenya Airways', amount: 25000, paymentStatus: 'pending', createdAt: new Date().toISOString() },
                    { id: 'plg_3', participantId: 'part_3', sponsorName: 'KCB Bank', amount: 10000, paymentStatus: 'paid', createdAt: new Date().toISOString() }
                ];

                await apiService.saveModuleRecord('events', demoEvent);
                for (const c of demoCats) await apiService.saveModuleRecord('event_categories', c);
                for (const p of demoParts) await apiService.saveModuleRecord('event_participants', p);
                for (const pl of demoPledges) await apiService.saveModuleRecord('event_pledges', pl);

                evs = [demoEvent];
                cats = demoCats;
                parts = demoParts;
                plg = demoPledges;
            }

            setEvents(evs);
            setCategories(cats);
            setParticipants(parts);
            setSplits(evs.length > 0 ? spls : []);
            setMedicalLogs(evs.length > 0 ? med : []);
            setPledges(evs.length > 0 ? plg : []);

            if (evs.length > 0) {
                setSelectedEventId(evs[0].id);
            }
        } catch (error) {
            console.error('Failed to load event module data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadEventData();
    }, [currentInstitution.id]);

    const activeEvent = events.find(e => e.id === selectedEventId);

    const activeEventCategories = useMemo(() => {
        return categories.filter(c => c.eventId === selectedEventId);
    }, [categories, selectedEventId]);

    const activeEventParticipants = useMemo(() => {
        const catIds = activeEventCategories.map(c => c.id);
        return participants.filter(p => catIds.includes(p.categoryId)).map(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            return {
                ...p,
                categoryName: cat?.name,
                distanceKm: cat?.distanceKm
            };
        });
    }, [participants, activeEventCategories, categories]);

    const activeEventSplits = useMemo(() => {
        const partIds = activeEventParticipants.map(p => p.id);
        return splits.filter(s => partIds.includes(s.participantId));
    }, [splits, activeEventParticipants]);

    const activeEventMedicalLogs = useMemo(() => {
        return medicalLogs.filter(m => m.eventId === selectedEventId).map(m => {
            const p = participants.find(part => part.id === m.participantId);
            return {
                ...m,
                participantName: p ? `${p.firstName} ${p.lastName}` : 'Unknown Runner',
                bibNumber: p?.bibNumber
            };
        });
    }, [medicalLogs, selectedEventId, participants]);

    const activeEventPledges = useMemo(() => {
        const partIds = activeEventParticipants.map(p => p.id);
        return pledges.filter(pl => partIds.includes(pl.participantId)).map(pl => {
            const p = participants.find(part => part.id === pl.participantId);
            return {
                ...pl,
                participantName: p ? `${p.firstName} ${p.lastName}` : 'Unknown Runner',
                bibNumber: p?.bibNumber
            };
        });
    }, [pledges, activeEventParticipants, participants]);

    // Handlers
    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        const newEvent: SportEvent = {
            id: 'evt_' + Date.now(),
            institutionId: currentInstitution.id,
            name: eventForm.name,
            description: eventForm.description,
            date: eventForm.date,
            location: eventForm.location,
            status: 'planning',
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('events', newEvent);
            setEventForm({ name: '', description: '', date: '', location: '' });
            setIsAddEventOpen(false);
            if (onLogAction) onLogAction('create_event', `Created event: ${newEvent.name}`);
            await loadEventData();
            setSelectedEventId(newEvent.id);
            alert('Event created successfully!');
        } catch (err: any) {
            alert('Failed to save event: ' + (err.message || err));
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEventId) return;

        const distanceVal = parseFloat(categoryForm.distanceKm);
        if (isNaN(distanceVal) || distanceVal <= 0) {
            alert('Please enter a valid distance in kilometers (greater than 0).');
            return;
        }

        const newCategory: EventCategory = {
            id: 'cat_' + Date.now(),
            eventId: selectedEventId,
            name: categoryForm.name,
            distanceKm: distanceVal,
            registrationFee: parseFloat(categoryForm.registrationFee || '0'),
            capacity: categoryForm.capacity ? parseInt(categoryForm.capacity) : undefined,
            genderRestriction: categoryForm.genderRestriction,
            startTime: categoryForm.startTime || undefined,
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('event_categories', newCategory);
            setCategoryForm({ name: '', distanceKm: '', registrationFee: '', capacity: '', genderRestriction: 'any', startTime: '' });
            setIsAddCategoryOpen(false);
            if (onLogAction) onLogAction('create_event_category', `Created category: ${newCategory.name}`);
            await loadEventData();
            alert('Category created successfully!');
        } catch (err: any) {
            alert('Failed to save category: ' + (err.message || err));
        }
    };

    const handleRegisterRunner = async (data: Partial<EventParticipant>) => {
        // Find highest BIB number and increment
        const existingBibs = participants
            .map(p => parseInt(p.bibNumber || '0'))
            .filter(b => !isNaN(b));
        const maxBib = existingBibs.length > 0 ? Math.max(...existingBibs) : 1000;
        const newBib = String(maxBib + 1);

        const newParticipant: EventParticipant = {
            ...(data as any),
            id: 'part_' + Date.now(),
            bibNumber: newBib,
            createdAt: new Date().toISOString()
        };

        await apiService.saveModuleRecord('event_participants', newParticipant);
        if (onLogAction) onLogAction('register_runner', `Registered runner BIB ${newBib}: ${newParticipant.firstName} ${newParticipant.lastName}`);
        await loadEventData();
        return newParticipant;
    };

    const handleUpdateEventStatus = async (status: SportEvent['status']) => {
        if (!activeEvent) return;
        const updated = {
            ...activeEvent,
            status,
            updatedAt: new Date().toISOString()
        };
        await apiService.saveModuleRecord('events', updated);
        if (onLogAction) onLogAction('update_event_status', `Updated event status to ${status}`);
        await loadEventData();
    };

    const handleRecordSplit = async (data: Partial<EventSplit>) => {
        const newSplit: EventSplit = {
            ...(data as any),
            id: 'split_' + Date.now(),
            recordedAt: new Date().toISOString()
        };
        await apiService.saveModuleRecord('event_splits', newSplit);
        await loadEventData();
    };

    const handleUpdateParticipantStatus = async (id: string, status: EventParticipant['status']) => {
        const participant = participants.find(p => p.id === id);
        if (!participant) return;
        const updated = {
            ...participant,
            status,
            updatedAt: new Date().toISOString()
        };
        await apiService.saveModuleRecord('event_participants', updated);
        await loadEventData();
    };

    const handleLogMedical = async (data: Partial<EventMedicalLog>) => {
        if (!selectedEventId) return;
        const newLog: EventMedicalLog = {
            ...(data as any),
            id: 'med_' + Date.now(),
            eventId: selectedEventId,
            recordedAt: new Date().toISOString()
        };
        await apiService.saveModuleRecord('event_medical_logs', newLog);
        if (onLogAction) onLogAction('log_medical_incident', `Logged medical incident for participant ${newLog.participantId}`);
        await loadEventData();
    };

    const handleAddPledge = async (data: Partial<EventPledge>) => {
        const newPledge: EventPledge = {
            ...(data as any),
            id: 'pledge_' + Date.now(),
            createdAt: new Date().toISOString()
        };
        await apiService.saveModuleRecord('event_pledges', newPledge);
        if (onLogAction) onLogAction('add_pledge', `Logged pledge of KES ${newPledge.amount} by ${newPledge.sponsorName}`);
        await loadEventData();
    };

    const handleConfirmPledgePayment = async (id: string) => {
        const pledge = pledges.find(pl => pl.id === id);
        if (!pledge) return;
        const updated = {
            ...pledge,
            paymentStatus: 'paid' as const
        };
        await apiService.saveModuleRecord('event_pledges', updated);
        if (onLogAction) onLogAction('confirm_pledge_payment', `Confirmed payment for pledge ${id}`);
        await loadEventData();
    };

    const handleDeleteEvent = async (id: string) => {
        if (confirm('Are you sure you want to delete this event? This will erase all categories, participants, splits, and medical logs associated with it.')) {
            await apiService.deleteModuleRecord('events', id);
            await loadEventData();
        }
    };

    // Dashboard calculations
    const totals = useMemo(() => {
        const revenue = activeEventParticipants
            .filter(p => p.paymentStatus === 'paid')
            .reduce((sum, p) => {
                const cat = categories.find(c => c.id === p.categoryId);
                return sum + (cat ? Number(cat.registrationFee) : 0);
            }, 0);

        const checkedInCount = activeEventParticipants.filter(p => p.status === 'checked_in' || p.status === 'started' || p.status === 'completed').length;
        const completedCount = activeEventParticipants.filter(p => p.status === 'completed').length;
        const activeCount = activeEventParticipants.filter(p => p.status === 'started').length;

        return {
            revenue,
            totalRunners: activeEventParticipants.length,
            checkedIn: checkedInCount,
            completed: completedCount,
            running: activeCount
        };
    }, [activeEventParticipants, categories]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-slate-500">Loading Sports Event Command Desk...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            
            {/* Event Selector & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <CalendarDaysIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Active Event Desk</span>
                        <select
                            value={selectedEventId}
                            onChange={e => setSelectedEventId(e.target.value)}
                            className="bg-transparent text-lg font-bold text-slate-800 dark:text-white border-none p-0 focus:ring-0 cursor-pointer"
                        >
                            {events.map(ev => (
                                <option key={ev.id} value={ev.id} className="text-slate-800 dark:text-white bg-white dark:bg-slate-800">{ev.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsRegModalOpen(true)}
                        disabled={!selectedEventId || activeEventCategories.length === 0}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:bg-slate-200"
                    >
                        Register Runner
                    </button>
                    <button
                        onClick={() => setIsAddCategoryOpen(true)}
                        disabled={!selectedEventId}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                        Add Race Category
                    </button>
                    <button
                        onClick={() => setIsAddEventOpen(true)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                        New Event
                    </button>
                    {activeEvent && (
                        <button
                            onClick={() => handleDeleteEvent(activeEvent.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-xl transition-all"
                            title="Delete Event"
                        >
                            <Trash2Icon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Dashboard Sub Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto whitespace-nowrap scrollbar-hide py-1">
                {(['dashboard', 'events', 'runners', 'raceday', 'medical', 'fundraising', 'leaderboard'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                            activeTab === tab 
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
                        }`}
                    >
                        {tab === 'raceday' ? 'Race Day Control' : tab}
                    </button>
                ))}
            </div>

            {/* View Switching */}
            <div className="animate-fade-in">
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Registration Revenue</span>
                                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">KES {totals.revenue.toLocaleString()}</div>
                                </div>
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600">
                                    <BanknotesIcon className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Registered Participants</span>
                                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totals.totalRunners}</div>
                                </div>
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600">
                                    <UserGroupIcon className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kit Collected & Checked-In</span>
                                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totals.checkedIn}</div>
                                </div>
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600">
                                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                </div>
                            </div>
                            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Charity Raised</span>
                                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                                        KES {activeEventPledges.reduce((sum, pl) => sum + Number(pl.amount), 0).toLocaleString()}
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600">
                                    <SparklesIcon className="w-5 h-5 text-amber-500" />
                                </div>
                            </div>
                        </div>

                        {/* Split layouts */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Active Event details */}
                            <div className="lg:col-span-2 space-y-6">
                                {activeEvent ? (
                                    <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm relative overflow-hidden">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="text-lg font-bold text-slate-800 dark:text-white">{activeEvent.name}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{activeEvent.description}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const link = `${window.location.origin}/?view=event-register&id=${activeEvent.id}`;
                                                    navigator.clipboard.writeText(link);
                                                    alert(`Public self-registration link copied to clipboard:\n${link}`);
                                                }}
                                                className="ml-4 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-650 dark:text-indigo-400 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                                                title="Copy public self-registration link"
                                            >
                                                <ShareIcon className="w-4 h-4" />
                                                <span>Share Link</span>
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 mt-6 text-xs border-t border-slate-100 dark:border-slate-700 pt-4">
                                            <div>
                                                <span className="block text-slate-400">Date</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{activeEvent.date}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400">Location</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{activeEvent.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-3xl">No Event Selected. Click "New Event" above.</div>
                                )}

                                {/* Category overview */}
                                <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Race Categories Configured</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {activeEventCategories.map(cat => (
                                            <div key={cat.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                                <h5 className="font-bold text-slate-800 dark:text-white text-sm">{cat.name}</h5>
                                                <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1">{cat.distanceKm} KM</div>
                                                <div className="text-[10px] text-slate-400 mt-2">KES {Number(cat.registrationFee).toLocaleString()} entry fee</div>
                                            </div>
                                        ))}
                                        {activeEventCategories.length === 0 && (
                                            <div className="col-span-3 text-center py-6 text-slate-400 text-xs">No categories setup. Click "Add Race Category" above.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Urgent Bulletins & Recent medical log */}
                            <div className="space-y-6">
                                {/* Medical tent logs */}
                                <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm space-y-4">
                                    <h4 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <AlertTriangleIcon className="w-4 h-4" /> Medical Dispatch Desk
                                    </h4>

                                    <div className="space-y-3">
                                        {activeEventMedicalLogs.slice(0, 3).map(med => (
                                            <div key={med.id} className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-2xl text-xs space-y-1">
                                                <div className="flex items-center justify-between font-bold">
                                                    <span className="text-red-700 dark:text-red-400">BIB {med.bibNumber} - {med.participantName}</span>
                                                    <span className="text-[10px] text-slate-400">{med.tentNumber}</span>
                                                </div>
                                                <p className="text-slate-600 dark:text-slate-400">{med.diagnosis}</p>
                                                <div className="text-[9px] font-bold uppercase text-red-600">{med.status.replace(/_/g, ' ')}</div>
                                            </div>
                                        ))}
                                        {activeEventMedicalLogs.length === 0 && (
                                            <div className="text-center py-6 text-slate-400 text-xs">No active medical incidents logged.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'events' && (
                    <div className="space-y-6">
                        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Event Categories List</h4>
                            <div className="overflow-x-auto text-xs">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                                            <th className="pb-2">Category Name</th>
                                            <th className="pb-2">Distance (KM)</th>
                                            <th className="pb-2">Entry Fee</th>
                                            <th className="pb-2">Max Capacity</th>
                                            <th className="pb-2">Gender Restriction</th>
                                            <th className="pb-2">Start Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeEventCategories.map(cat => (
                                            <tr key={cat.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="py-3 font-bold text-slate-800 dark:text-white">{cat.name}</td>
                                                <td className="py-3 font-bold text-indigo-600 font-mono">{cat.distanceKm} KM</td>
                                                <td className="py-3 font-mono">KES {Number(cat.registrationFee).toLocaleString()}</td>
                                                <td className="py-3">{cat.capacity || 'Unlimited'}</td>
                                                <td className="py-3 uppercase">{cat.genderRestriction}</td>
                                                <td className="py-3 font-mono">{cat.startTime || 'TBD'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'runners' && (
                    <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Runner Registration Database</h4>
                            <button
                                onClick={() => setIsRegModalOpen(true)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                                <PlusIcon className="w-4 h-4" /> Add Runner
                            </button>
                        </div>

                        <div className="overflow-x-auto text-xs">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                                        <th className="pb-2">BIB</th>
                                        <th className="pb-2">Runner Name</th>
                                        <th className="pb-2">Category</th>
                                        <th className="pb-2">Age/Gender</th>
                                        <th className="pb-2">Shirt Size</th>
                                        <th className="pb-2">Payment Status</th>
                                        <th className="pb-2">Status</th>
                                        <th className="pb-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeEventParticipants.map(runner => (
                                        <tr key={runner.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="py-3 font-mono font-bold text-slate-500">{runner.bibNumber}</td>
                                            <td className="py-3 font-bold text-slate-800 dark:text-white">{runner.firstName} {runner.lastName}</td>
                                            <td className="py-3 text-slate-500">{runner.categoryName}</td>
                                            <td className="py-3">{runner.age} / <span className="uppercase">{runner.gender}</span></td>
                                            <td className="py-3 font-mono font-bold">{runner.tShirtSize}</td>
                                            <td className="py-3">
                                                {runner.paymentStatus === 'paid' ? (
                                                    <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-600 rounded text-[9px] font-bold">PAID</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded text-[9px] font-bold">PENDING</span>
                                                )}
                                            </td>
                                            <td className="py-3 uppercase font-bold text-[10px]">
                                                {runner.status === 'registered' && <span className="text-slate-500">Registered</span>}
                                                {runner.status === 'checked_in' && <span className="text-blue-500">Checked-in</span>}
                                                {runner.status === 'started' && <span className="text-indigo-600 animate-pulse">On Course</span>}
                                                {runner.status === 'completed' && <span className="text-green-600">Finished</span>}
                                            </td>
                                            <td className="py-3 text-right">
                                                {runner.status === 'registered' && (
                                                    <button
                                                        onClick={() => handleUpdateParticipantStatus(runner.id, 'checked_in')}
                                                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold rounded text-[9px]"
                                                    >
                                                        Collect Kit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {activeEventParticipants.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-slate-400">No runners registered yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'raceday' && (
                    <RaceDayControl
                        eventStatus={activeEvent?.status || 'planning'}
                        onUpdateEventStatus={handleUpdateEventStatus}
                        categories={activeEventCategories}
                        participants={activeEventParticipants}
                        splits={activeEventSplits}
                        onRecordSplit={handleRecordSplit}
                        onUpdateParticipantStatus={handleUpdateParticipantStatus}
                        onLogMedicalIssue={handleLogMedical}
                    />
                )}

                {activeTab === 'medical' && (
                    <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">Medical Log Cases</h4>
                        <div className="overflow-x-auto text-xs">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                                        <th className="pb-2">Tent</th>
                                        <th className="pb-2">Runner Name</th>
                                        <th className="pb-2">BIB</th>
                                        <th className="pb-2">Diagnosis</th>
                                        <th className="pb-2">Treatment</th>
                                        <th className="pb-2">Status</th>
                                        <th className="pb-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeEventMedicalLogs.map(log => (
                                        <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="py-3 font-bold text-slate-800 dark:text-white">{log.tentNumber}</td>
                                            <td className="py-3 font-bold">{log.participantName}</td>
                                            <td className="py-3 font-mono text-slate-500">{log.bibNumber}</td>
                                            <td className="py-3">{log.diagnosis}</td>
                                            <td className="py-3 text-slate-500">{log.treatment || '-'}</td>
                                            <td className="py-3">
                                                {log.status === 'treated_and_released' && <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-bold">RELEASED</span>}
                                                {log.status === 'under_observation' && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-bold">OBSERVATION</span>}
                                                {log.status === 'referred_to_hospital' && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-bold">REFERRED (ER)</span>}
                                            </td>
                                            <td className="py-3 text-right">
                                                {log.status === 'under_observation' && (
                                                    <button
                                                        onClick={() => {
                                                            const updated = { ...log, status: 'treated_and_released' as const };
                                                            apiService.saveModuleRecord('event_medical_logs', updated).then(() => loadEventData());
                                                        }}
                                                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-[9px]"
                                                    >
                                                        Clear Patient
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {activeEventMedicalLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-400">No medical cases logged.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'fundraising' && (
                    <FundraisingTracker
                        participants={activeEventParticipants}
                        pledges={activeEventPledges}
                        onAddPledge={handleAddPledge}
                        onConfirmPledgePayment={handleConfirmPledgePayment}
                    />
                )}

                {activeTab === 'leaderboard' && (
                    <EventLeaderboard
                        categories={activeEventCategories}
                        participants={activeEventParticipants}
                        splits={activeEventSplits}
                        eventName={activeEvent?.name || ''}
                    />
                )}
            </div>

            {/* Registration Modal */}
            <EventRegistrationModal
                isOpen={isRegModalOpen}
                onClose={() => setIsRegModalOpen(false)}
                categories={activeEventCategories}
                eventName={activeEvent?.name || ''}
                onRegister={handleRegisterRunner}
            />

            {/* Add Event Modal */}
            {isAddEventOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Configure New Event</h3>
                            <button onClick={() => setIsAddEventOpen(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddEvent} className="p-6 space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Event Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={eventForm.name}
                                    onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                                    placeholder="e.g. County Charity Marathon 2026"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Description</label>
                                <textarea
                                    value={eventForm.description}
                                    onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                                    placeholder="Brief event outline..."
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Event Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={eventForm.date}
                                        onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={eventForm.location}
                                        onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                                        placeholder="e.g. Athletic Stadium"
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md">Create Event</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            {isAddCategoryOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Add Race Category</h3>
                            <button onClick={() => setIsAddCategoryOpen(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddCategory} className="p-6 space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Category Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={categoryForm.name}
                                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    placeholder="e.g. 21K Half Marathon"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Distance (KM) *</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={categoryForm.distanceKm}
                                        onChange={e => setCategoryForm({ ...categoryForm, distanceKm: e.target.value })}
                                        placeholder="21.1"
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Entry Fee (KES)</label>
                                    <input
                                        type="number"
                                        value={categoryForm.registrationFee}
                                        onChange={e => setCategoryForm({ ...categoryForm, registrationFee: e.target.value })}
                                        placeholder="1000"
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Max Capacity</label>
                                    <input
                                        type="number"
                                        value={categoryForm.capacity}
                                        onChange={e => setCategoryForm({ ...categoryForm, capacity: e.target.value })}
                                        placeholder="e.g. 500"
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Gender Restriction</label>
                                    <select
                                        value={categoryForm.genderRestriction}
                                        onChange={e => setCategoryForm({ ...categoryForm, genderRestriction: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="any">Open / Any</option>
                                        <option value="male">Male Only</option>
                                        <option value="female">Female Only</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Race Start Time</label>
                                <input
                                    type="text"
                                    value={categoryForm.startTime}
                                    onChange={e => setCategoryForm({ ...categoryForm, startTime: e.target.value })}
                                    placeholder="e.g. 06:00:00"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                            </div>
                            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md">Add Category</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
