import React, { useState, useEffect, useMemo } from 'react';
import {
    User, Institution, BedAllocationWithDetails,
    BoardingCheckIn, BoardingCheckOut, ClearanceStatus
} from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { Edit2Icon } from './icons/Edit2Icon';
import { Trash2Icon } from './icons/Trash2Icon';
import { BedIcon } from './icons/BedIcon';
import { XIcon } from './icons/XIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { GridIcon } from './icons/GridIcon';
import { ListIcon } from './icons/ListIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { HomeIcon } from './icons/HomeIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { ShieldIcon } from './icons/ShieldIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { SearchIcon } from './icons/SearchIcon';
import { ClockIcon } from './icons/ClockIcon';
import { UserIcon } from './icons/UserIcon';
import { ArrowRightOnRectangleIcon as DepartureIcon } from './icons/ArrowRightOnRectangleIcon';
import { ArrowTrendingUpIcon as ArrivalIcon } from './icons/ArrowTrendingUpIcon';
import { CameraIcon } from './icons/CameraIcon';
import { UploadIcon } from './icons/UploadIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

import { apiService } from '../services/apiService';

interface CheckInOutManagerProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

const CheckInOutManager: React.FC<CheckInOutManagerProps> = ({
    currentUser,
    currentInstitution,
    onLogAction,
    onDataChange
}) => {
    const [activeView, setActiveView] = useState<'arrival' | 'departure'>('arrival');
    const [allocations, setAllocations] = useState<BedAllocationWithDetails[]>([]);
    const [checkIns, setCheckIns] = useState<BoardingCheckIn[]>([]);
    const [checkOuts, setCheckOuts] = useState<BoardingCheckOut[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [selectedAllocation, setSelectedAllocation] = useState<BedAllocationWithDetails | null>(null);

    const [checkInForm, setCheckInForm] = useState({
        conditionNotes: '',
        itemsInventory: {
            mattress: 'Good',
            pillow: 'Present',
            blanket: 'Present',
            bedsheet: 'Present',
            desk: 'Good',
            chair: 'Good'
        },
        photoUrl: ''
    });

    const [checkOutForm, setCheckOutForm] = useState({
        conditionNotes: '',
        damageReport: '',
        clearanceStatus: 'Pending' as ClearanceStatus,
        photoUrl: ''
    });

    useEffect(() => {
        loadData();
    }, [currentInstitution.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadAllocations(),
                loadCheckIns(),
                loadCheckOuts()
            ]);
        } catch (error) {
            console.error('Error synchronizing logistics:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAllocations = async () => {
        const data = await apiService.fetchBedAllocations(currentInstitution.id);
        const transformed = (data || []).map((a: any) => ({
            ...a,
            studentName: a.usersStudentIdFkey?.name || 'Anonymous Student',
            allocatedByName: a.usersAllocatedByFkey?.name || 'System Admin',
            bedNumber: a.boardingBeds?.bedNumber || 'N/A',
            roomNumber: a.boardingBeds?.boardingRooms?.roomNumber || 'N/A',
            houseName: a.boardingBeds?.boardingRooms?.boardingHouses?.name || 'N/A',
            hasCheckedIn: (a.boardingCheckins?.length || 0) > 0,
            hasCheckedOut: (a.boardingCheckouts?.length || 0) > 0
        }));
        setAllocations(transformed);
    };

    const loadCheckIns = async () => {
        const data = await apiService.fetchBoardingCheckIns(currentInstitution.id);
        setCheckIns(data || []);
    };

    const loadCheckOuts = async () => {
        const data = await apiService.fetchBoardingCheckOuts(currentInstitution.id);
        setCheckOuts(data || []);
    };

    const handleOpenProcessModal = (allocation: BedAllocationWithDetails) => {
        setSelectedAllocation(allocation);
        if (activeView === 'arrival') {
            setCheckInForm({
                conditionNotes: '',
                itemsInventory: {
                    mattress: 'Good',
                    pillow: 'Present',
                    blanket: 'Present',
                    bedsheet: 'Present',
                    desk: 'Good',
                    chair: 'Good'
                },
                photoUrl: ''
            });
        } else {
            setCheckOutForm({
                conditionNotes: '',
                damageReport: '',
                clearanceStatus: 'Pending',
                photoUrl: ''
            });
        }
        setShowProcessModal(true);
    };

    const handleCheckIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAllocation) return;

        try {
            const now = new Date();
            const payload = {
                allocationId: selectedAllocation.id,
                studentId: selectedAllocation.studentId,
                institutionId: currentInstitution.id,
                checkInDate: now.toISOString().split('T')[0],
                checkInTime: now.toTimeString().split(' ')[0],
                checkedInBy: currentUser.id,
                conditionNotes: checkInForm.conditionNotes,
                itemsInventory: checkInForm.itemsInventory,
                photoUrl: checkInForm.photoUrl,
                id: crypto.randomUUID?.() || `checkin_${Date.now()}`
            };

            await apiService.saveModuleRecord('boarding_checkins', payload);
            await onLogAction(`Security: Confirmed check -in for ${selectedAllocation.studentName}`);

            setShowProcessModal(false);
            loadData();
            onDataChange();
        } catch (error) {
            alert('Logistics failure: Unable to commit check-in record.');
        }
    };

    const handleCheckOut = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAllocation) return;

        try {
            const now = new Date();
            const payload = {
                allocationId: selectedAllocation.id,
                studentId: selectedAllocation.studentId,
                institutionId: currentInstitution.id,
                checkOutDate: now.toISOString().split('T')[0],
                checkOutTime: now.toTimeString().split(' ')[0],
                checkedOutBy: currentUser.id,
                conditionNotes: checkOutForm.conditionNotes,
                damageReport: checkOutForm.damageReport,
                clearanceStatus: checkOutForm.clearanceStatus,
                photoUrl: checkOutForm.photoUrl,
                id: crypto.randomUUID?.() || `checkout_${Date.now()}`
            };

            await apiService.saveModuleRecord('boarding_checkouts', payload);

            // Auto-complete allocation
            await apiService.saveModuleRecord('bed_allocations', {
                ...selectedAllocation,
                institutionId: currentInstitution.id,
                status: 'Completed' as const
            } as any);

            await onLogAction(`Security: Confirmed check - out for ${selectedAllocation.studentName}`);

            setShowProcessModal(false);
            loadData();
            onDataChange();
        } catch (error) {
            alert('Logistics failure: Unable to commit check-out record.');
        }
    };

    const filteredRecords = useMemo(() => {
        return allocations.filter(a => {
            const matchesSearch = a.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.bedNumber.toLowerCase().includes(searchTerm.toLowerCase());
            if (activeView === 'arrival') return matchesSearch && !a.hasCheckedIn;
            return matchesSearch && a.hasCheckedIn && !a.hasCheckedOut;
        });
    }, [allocations, activeView, searchTerm]);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return {
            pendingArrivals: allocations.filter(a => !a.hasCheckedIn).length,
            pendingDepartures: allocations.filter(a => a.hasCheckedIn && !a.hasCheckedOut).length,
            completedToday: checkIns.filter(c => c.checkInDate === today).length +
                checkOuts.filter(c => c.checkOutDate === today).length
        };
    }, [allocations, checkIns, checkOuts]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-emerald-600"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synchronizing Logistics Gateway...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in">
            {/* Mission Control Header */}
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-200 dark:shadow-none">
                            <ShieldIcon className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Security Gateway</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black mt-2">Occupancy Arrival & Departure Logistics</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-8 items-center bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem]">
                        <div className="flex items-center gap-4 border-r border-slate-200 dark:border-slate-700 pr-8">
                            <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                                <ArrowRightIcon className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Pend. Arrival</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{stats.pendingArrivals}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 border-r border-slate-200 dark:border-slate-700 pr-8">
                            <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
                                <ArrowPathIcon className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Pend. Departure</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{stats.pendingDepartures}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
                                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Session Flux</p>
                                <p className="text-xl font-black text-emerald-600">+{stats.completedToday}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Architecture */}
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-80 space-y-4">
                    <button
                        onClick={() => setActiveView('arrival')}
                        className={`w-full p-8 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all ${activeView === 'arrival'
                            ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-200 dark:shadow-none translate-x-2'
                            : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            } `}
                    >
                        <ArrowRightIcon className={`w - 8 h - 8 ${activeView === 'arrival' ? 'text-white' : 'text-emerald-500'} `} />
                        <span className="text-xs font-black uppercase tracking-[0.25em]">Arrival Control</span>
                    </button>
                    <button
                        onClick={() => setActiveView('departure')}
                        className={`w-full p-8 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all ${activeView === 'departure'
                            ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 dark:shadow-none translate-x-2'
                            : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            } `}
                    >
                        <ArrowPathIcon className={`w - 8 h - 8 ${activeView === 'departure' ? 'text-white' : 'text-indigo-500'} `} />
                        <span className="text-xs font-black uppercase tracking-[0.25em]">Departure Control</span>
                    </button>

                    <div className="bg-amber-50 dark:bg-amber-900/10 p-8 rounded-[2.5rem] border border-amber-100 dark:border-amber-900/20">
                        <div className="flex items-center gap-3 mb-4">
                            <InformationCircleIcon className="w-5 h-5 text-amber-600" />
                            <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Protocol Notice</h5>
                        </div>
                        <p className="text-[10px] text-amber-800 dark:text-amber-200 font-bold leading-relaxed uppercase tracking-widest">
                            Ensure all inventory items are verified before committing a check-in or check-out record.
                        </p>
                    </div>
                </div>

                <div className="flex-grow space-y-6">
                    <div className="relative mb-8">
                        <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300" />
                        <input
                            type="text"
                            placeholder="SEARCH BY STUDENT NAME OR BED IDENTIFIER..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-16 pr-8 py-6 bg-white dark:bg-slate-800 border-none rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-100/50 dark:shadow-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredRecords.map((allocation) => (
                            <div key={allocation.id} className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700 group hover:-translate-y-2 transition-all flex flex-col">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center font-black text-xl text-slate-900 dark:text-white">
                                            {allocation.studentName.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{allocation.studentName}</h4>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{allocation.houseName} • ROOM {allocation.roomNumber}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="px-3 py-1 bg-slate-50 dark:bg-slate-900 rounded-lg text-[8px] font-black text-slate-500 uppercase tracking-widest border border-slate-100 dark:border-slate-800">
                                            BED {allocation.bedNumber}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`w - 2 h - 2 rounded - full ${allocation.hasCheckedIn ? 'bg-emerald-500' : 'bg-amber-500'} `}></span>
                                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{allocation.hasCheckedIn ? 'IN' : 'PENDING'}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Clearance</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{allocation.hasCheckedOut ? 'CLEARED' : 'PENDING'}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleOpenProcessModal(allocation)}
                                    className={`w-full py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-lg ${activeView === 'arrival'
                                        ? 'bg-emerald-600 text-white shadow-emerald-100 dark:shadow-none hover:bg-emerald-700'
                                        : 'bg-indigo-600 text-white shadow-indigo-100 dark:shadow-none hover:bg-indigo-700'
                                        } `}
                                >
                                    {activeView === 'arrival' ? (
                                        <>START ARRIVAL <ArrowRightIcon className="w-5 h-5" /></>
                                    ) : (
                                        <>START DEPARTURE <ArrowPathIcon className="w-5 h-5" /></>
                                    )}
                                </button>
                            </div>
                        ))}
                        {filteredRecords.length === 0 && (
                            <div className="col-span-full py-40 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <ClipboardListIcon className="w-20 h-20 text-slate-200 mx-auto mb-8" />
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No pending logistics matching current state filters</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Logistics Execution Modal */}
            {showProcessModal && selectedAllocation && (
                <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-3xl z-[600] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300" onClick={() => setShowProcessModal(false)}>
                    <div className="bg-white dark:bg-slate-950 rounded-[4rem] shadow-2xl w-full max-w-5xl overflow-hidden border border-white/5" onClick={e => e.stopPropagation()}>
                        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[90vh]">
                            {/* Identity Pillar */}
                            <div className={`lg: col - span - 4 p - 16 text - white flex flex - col items - center justify - center text - center ${activeView === 'arrival' ? 'bg-emerald-600' : 'bg-indigo-600'} `}>
                                <div className="w-32 h-32 bg-white/20 rounded-[3.5rem] flex items-center justify-center mb-10 backdrop-blur-2xl">
                                    {activeView === 'arrival' ? <ArrowRightIcon className="w-16 h-16" /> : <ArrowPathIcon className="w-16 h-16" />}
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tight mb-4">{selectedAllocation.studentName}</h3>
                                <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.4em] mb-12">Logistics Gateway Phase</p>

                                <div className="w-full space-y-6 pt-10 border-t border-white/10 text-left">
                                    <div>
                                        <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">House Station</p>
                                        <p className="text-xs font-black uppercase">{selectedAllocation.houseName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">Grid Coordinates</p>
                                        <p className="text-xs font-black uppercase">ROOM {selectedAllocation.roomNumber} • BED {selectedAllocation.bedNumber}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Logistics Form */}
                            <div className="lg:col-span-8 p-16 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                                <div className="flex justify-between items-center mb-12">
                                    <div>
                                        <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{activeView === 'arrival' ? 'Arrival Inventory' : 'Departure Audit'}</h4>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.25em] mt-2">Comprehensive Unit Status Confirmation</p>
                                    </div>
                                    <button onClick={() => setShowProcessModal(false)} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 transition-all text-slate-400">
                                        <XIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={activeView === 'arrival' ? handleCheckIn : handleCheckOut} className="space-y-10">
                                    {activeView === 'arrival' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {Object.entries(checkInForm.itemsInventory).map(([item, status]) => (
                                                <div key={item} className="p-5 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-3 group hover:border-emerald-200 transition-all">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.replace('_', ' ')}</label>
                                                    <select
                                                        value={status}
                                                        onChange={(e) => setCheckInForm({
                                                            ...checkInForm,
                                                            itemsInventory: { ...checkInForm.itemsInventory, [item]: e.target.value }
                                                        })}
                                                        className="bg-transparent border-none p-0 text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight outline-none"
                                                    >
                                                        <option value="Good">In Good Condition</option>
                                                        <option value="Present">Present</option>
                                                        <option value="Fair">Fair</option>
                                                        <option value="Missing">Missing / Damaged</option>
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">General Condition Assessment</label>
                                        <textarea
                                            value={activeView === 'arrival' ? checkInForm.conditionNotes : checkOutForm.conditionNotes}
                                            onChange={(e) => activeView === 'arrival'
                                                ? setCheckInForm({ ...checkInForm, conditionNotes: e.target.value })
                                                : setCheckOutForm({ ...checkOutForm, conditionNotes: e.target.value })}
                                            className="w-full p-8 bg-slate-50 dark:bg-slate-950 rounded-3xl border-none text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[140px]"
                                            placeholder="Enter comprehensive unit state notes..."
                                        />
                                    </div>

                                    {activeView === 'departure' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clearance Protocol</label>
                                                <select
                                                    value={checkOutForm.clearanceStatus}
                                                    onChange={(e) => setCheckOutForm({ ...checkOutForm, clearanceStatus: e.target.value as ClearanceStatus })}
                                                    className="w-full p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="Pending">Awaiting System Audit</option>
                                                    <option value="Cleared">Full Security Clearance</option>
                                                    <option value="Issues Reported">Flagged for Audit</option>
                                                </select>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Damage Vector Report</label>
                                                <input
                                                    type="text"
                                                    value={checkOutForm.damageReport}
                                                    onChange={(e) => setCheckOutForm({ ...checkOutForm, damageReport: e.target.value })}
                                                    placeholder="NIL / IDENTIFIED AS..."
                                                    className="w-full p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row gap-6 pt-10 border-t border-slate-50 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setShowProcessModal(false)}
                                            className="flex-1 py-6 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-[0.4em] tracking-widest"
                                        >
                                            CANCEL
                                        </button>
                                        <button
                                            type="submit"
                                            className={`flex-[2] py-6 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl transition-all flex items-center justify-center gap-4 ${activeView === 'arrival'
                                                ? 'bg-emerald-600 shadow-emerald-100 dark:shadow-none hover:bg-emerald-700'
                                                : 'bg-indigo-600 shadow-indigo-100 dark:shadow-none hover:bg-indigo-700'
                                                } `}
                                        >
                                            <ShieldIcon className="w-6 h-6" />
                                            COMMIT GATEWAY ACTION
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
`}</style>
        </div>
    );
};

export default CheckInOutManager;

