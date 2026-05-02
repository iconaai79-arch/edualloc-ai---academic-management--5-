import React, { useState, useEffect, useMemo } from 'react';
import {
    User, Institution, BoardingHouse, BoardingRoom, BoardingBed,
    RoomType, RoomStatus, BedStatus, BedCondition, BoardingRoomWithBeds
} from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { BedIcon } from './icons/BedIcon';
import { XIcon } from './icons/XIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { GridIcon } from './icons/GridIcon';
import { ListIcon } from './icons/ListIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { HomeIcon } from './icons/HomeIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';

import { apiService } from '../services/apiService';

interface RoomBedManagerProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

const RoomBedManager: React.FC<RoomBedManagerProps> = ({
    currentUser,
    currentInstitution,
    onLogAction,
    onDataChange
}) => {
    const [houses, setHouses] = useState<BoardingHouse[]>([]);
    const [selectedHouseId, setSelectedHouseId] = useState<string>('');
    const [rooms, setRooms] = useState<BoardingRoomWithBeds[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [loadingRooms, setLoadingRooms] = useState(false);

    // Modal states
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [showBedModal, setShowBedModal] = useState(false);
    const [showBulkBedModal, setShowBulkBedModal] = useState(false);

    const [editingRoom, setEditingRoom] = useState<BoardingRoom | null>(null);
    const [roomFormData, setRoomFormData] = useState({
        roomNumber: '',
        roomType: 'Dormitory' as RoomType,
        capacity: 10,
        floorLevel: 0,
        status: 'Active' as RoomStatus,
        amenities: ''
    });

    const [editingBed, setEditingBed] = useState<BoardingBed | null>(null);
    const [bedFormData, setBedFormData] = useState({
        bedNumber: '',
        status: 'Available' as BedStatus,
        condition: 'Good' as BedCondition,
        notes: ''
    });

    const [bulkBedData, setBulkBedData] = useState({
        count: 1,
        startNumber: 1,
        prefix: 'B'
    });

    const selectedRoom = useMemo(() =>
        rooms.find(r => r.id === selectedRoomId),
        [rooms, selectedRoomId]);

    useEffect(() => {
        loadHouses();
    }, [currentInstitution.id]);

    useEffect(() => {
        if (selectedHouseId) {
            loadRooms();
            setSelectedRoomId('');
        } else {
            setRooms([]);
        }
    }, [selectedHouseId]);

    const loadHouses = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<BoardingHouse>('boarding_houses', currentInstitution.id);
            const activeHouses = data?.filter(h => h.status === 'Active') || [];
            setHouses(activeHouses);
            if (activeHouses.length > 0 && !selectedHouseId) {
                // Don't auto-select if we already have a selection or it's empty
            }
        } catch (error) {
            console.error('Error loading houses:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRooms = async () => {
        if (!selectedHouseId) return;
        setLoadingRooms(true);
        try {
            // Using the specific API call that joins beds and house info
            const data = await apiService.fetchBoardingRooms(selectedHouseId);

            // Map to our expected type BoardingRoomWithBeds
            const mappedRooms: BoardingRoomWithBeds[] = (data || []).map((room: any) => ({
                ...room,
                houseName: room.boardingHouses?.name || '',
                beds: room.boardingBeds || [],
                availableBeds: (room.boardingBeds || []).filter((b: any) => b.status === 'Available').length,
                occupiedBeds: (room.boardingBeds || []).filter((b: any) => b.status === 'Occupied').length
            }));

            setRooms(mappedRooms);
        } catch (error) {
            console.error('Error loading rooms:', error);
        } finally {
            setLoadingRooms(false);
        }
    };

    // Room Handlers
    const handleOpenRoomModal = (room?: BoardingRoom) => {
        if (room) {
            setEditingRoom(room);
            setRoomFormData({
                roomNumber: room.roomNumber,
                roomType: room.roomType,
                capacity: room.capacity,
                floorLevel: room.floorLevel,
                status: room.status,
                amenities: room.amenities || ''
            });
        } else {
            setEditingRoom(null);
            setRoomFormData({
                roomNumber: '',
                roomType: 'Dormitory',
                capacity: 10,
                floorLevel: 0,
                status: 'Active',
                amenities: ''
            });
        }
        setShowRoomModal(true);
    };

    const handleRoomSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedHouseId) {
            alert('Please select a house first.');
            return;
        }

        if (!currentInstitution.id) {
            alert('Error: Institution ID is missing. Please refresh and try again.');
            return;
        }

        try {
            const payload = {
                ...roomFormData,
                houseId: selectedHouseId,
                institutionId: currentInstitution.id,
                id: editingRoom ? editingRoom.id : `room_${Math.random().toString(36).substring(2, 10)}`
            };

            await apiService.saveModuleRecord('boarding_rooms', payload);
            await onLogAction(`${editingRoom ? 'Updated' : 'Created'} room: ${roomFormData.roomNumber}`);

            setShowRoomModal(false);
            loadRooms();
            onDataChange();
        } catch (error: any) {
            console.error('Error saving room:', error);
            alert(`Failed to save room details: ${error.message || 'Unknown error'}`);
        }
    };

    const handleDeleteRoom = async (room: BoardingRoom) => {
        const canManage = ['admin', 'super_admin', 'boarding_master'].includes(currentUser.role || '');
        if (!canManage) {
            alert('Access Denied: Requisite security clearance for unit decommission not detected.');
            return;
        }

        if (!confirm(`Are you sure you want to delete room ${room.roomNumber}? This will permanently remove all beds within this room.`)) return;
        try {
            await apiService.deleteModuleRecord('boarding_rooms', room.id);
            await onLogAction(`Deleted room: ${room.roomNumber}`);
            loadRooms();
            onDataChange();
            if (selectedRoomId === room.id) setSelectedRoomId('');
        } catch (error) {
            alert('Failed to delete room. It might have active allocations.');
        }
    };

    // Bed Handlers
    const handleOpenBedModal = (bed?: BoardingBed) => {
        if (bed) {
            setEditingBed(bed);
            setBedFormData({
                bedNumber: bed.bedNumber,
                status: bed.status,
                condition: bed.condition,
                notes: bed.notes || ''
            });
        } else {
            setEditingBed(null);
            setBedFormData({
                bedNumber: '',
                status: 'Available',
                condition: 'Good',
                notes: ''
            });
        }
        setShowBedModal(true);
    };

    const handleBedSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoom) return;

        if (!currentInstitution.id) {
            alert('Error: Institution ID is missing. Please refresh and try again.');
            return;
        }

        try {
            const payload = {
                ...bedFormData,
                roomId: selectedRoomId,
                institutionId: currentInstitution.id,
                id: editingBed ? editingBed.id : `bed_${Math.random().toString(36).substring(2, 10)}`
            };

            await apiService.saveModuleRecord('boarding_beds', payload);
            await onLogAction(`${editingBed ? 'Updated' : 'Created'} bed: ${bedFormData.bedNumber}`);

            setShowBedModal(false);
            loadRooms();
            onDataChange();
        } catch (error: any) {
            console.error('Error saving bed:', error);
            alert(`Failed to save bed details: ${error.message || 'Unknown error'}`);
        }
    };

    const handleBulkBedSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const canManage = ['admin', 'super_admin', 'boarding_master'].includes(currentUser.role || '');
        if (!canManage) {
            alert('Access Denied: Bulk provisioning restricted to administrative profiles.');
            return;
        }

        if (!selectedRoomId || !selectedRoom) return;
        if (!currentInstitution.id) {
            alert('Error: Institution ID is missing. Please refresh and try again.');
            return;
        }

        const currentBedCount = selectedRoom.beds.length;
        if (currentBedCount + bulkBedData.count > selectedRoom.capacity) {
            alert(`Cannot add ${bulkBedData.count} beds. Room capacity is ${selectedRoom.capacity} and current bed count is ${currentBedCount}.`);
            return;
        }

        try {
            const currentBedNumbers = selectedRoom.beds.map(b => b.bedNumber.toLowerCase());
            const newBeds = [];
            for (let i = 0; i < bulkBedData.count; i++) {
                const num = bulkBedData.startNumber + i;
                const newBedNumber = `${bulkBedData.prefix}${String(num).padStart(2, '0')}`;

                if (currentBedNumbers.includes(newBedNumber.toLowerCase())) {
                    alert(`Validation Failed: Bed number "${newBedNumber}" already exists in this room. Please choose a different start number or prefix.`);
                    return;
                }

                newBeds.push({
                    id: `bed_${Date.now()}_${i}`,
                    roomId: selectedRoomId,
                    institutionId: currentInstitution.id,
                    bedNumber: newBedNumber,
                    status: 'Available' as BedStatus,
                    condition: 'Good' as BedCondition,
                    notes: 'Bulk created'
                });
            }

            // Simple iterative save to ensure reliability
            for (const bed of newBeds) {
                await apiService.saveModuleRecord('boarding_beds', bed);
            }

            await onLogAction(`Bulk provisioned ${bulkBedData.count} beds in room ${selectedRoom.roomNumber}`);
            setShowBulkBedModal(false);
            loadRooms();
            onDataChange();
        } catch (error: any) {
            console.error('Bulk provision failed:', error);
            alert(`Mass provisioning failed: ${error.message || 'Unknown error'}`);
        }
    };

    const handleDeleteBed = async (bed: BoardingBed) => {
        const canManage = ['admin', 'super_admin', 'boarding_master'].includes(currentUser.role || '');
        if (!canManage) {
            alert('Access Denied: Item decommission restricted.');
            return;
        }

        if (bed.status === 'Occupied') {
            alert('Cannot delete an occupied bed. Please deallocate the student first.');
            return;
        }
        if (!confirm(`Delete bed ${bed.bedNumber}?`)) return;
        try {
            await apiService.deleteModuleRecord('boarding_beds', bed.id);
            await onLogAction(`Deleted bed: ${bed.bedNumber}`);
            loadRooms();
            onDataChange();
        } catch (error) {
            alert('Failed to delete bed.');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Synchronizing Inventory...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* House Selector Interface */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                        <GridIcon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Room & Bed Master</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Architecture Management System</p>
                    </div>
                </div>
                <div className="flex-grow max-w-md">
                    <div className="relative group">
                        <select
                            value={selectedHouseId}
                            onChange={(e) => setSelectedHouseId(e.target.value)}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent group-hover:bg-white dark:group-hover:bg-slate-950 group-hover:border-indigo-100 transition-all rounded-2xl text-sm font-black focus:ring-0 outline-none appearance-none cursor-pointer pr-10"
                        >
                            <option value="">-- SELECT BOARDING HOUSE --</option>
                            {houses.map(h => (
                                <option key={h.id} value={h.id}>{h.name} ({h.gender})</option>
                            ))}
                        </select>
                        <ChevronRightIcon className="w-5 h-5 text-indigo-600 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                    </div>
                </div>
            </div>

            {!selectedHouseId ? (
                <div className="py-32 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/40 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <HomeIcon className="w-20 h-20 text-slate-200 mb-6" />
                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Inventory Management</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 max-w-sm text-center px-4">
                        Please select an active boarding house from the master selector above to view and manage room allocations
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Level Selector: Rooms Column */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="flex items-center justify-between px-4">
                            <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Levels Provisioned ({rooms.length})</h4>
                            </div>
                            <button
                                onClick={() => handleOpenRoomModal()}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none hover:-translate-y-0.5"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Add Room</span>
                            </button>
                        </div>

                        {loadingRooms ? (
                            <div className="py-24 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Loading Configuration...</p>
                            </div>
                        ) : rooms.length === 0 ? (
                            <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                <InformationCircleIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No rooms found in house architecture</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 max-h-[65vh] overflow-y-auto pr-4 custom-scrollbar px-1">
                                {rooms.map(room => (
                                    <div
                                        key={room.id}
                                        onClick={() => setSelectedRoomId(room.id)}
                                        className={`group relative p-6 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between ${selectedRoomId === room.id
                                            ? 'bg-indigo-600 border-indigo-600 shadow-2xl shadow-indigo-100 dark:shadow-none translate-x-3'
                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-none'
                                            }`}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${selectedRoomId === room.id ? 'bg-white/20 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white'
                                                }`}>
                                                {room.roomNumber}
                                            </div>
                                            <div>
                                                <p className={`text-base font-black uppercase tracking-tight ${selectedRoomId === room.id ? 'text-white' : 'text-slate-900 dark:text-slate-200'}`}>
                                                    {room.roomType}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedRoomId === room.id ? 'text-white/70' : 'text-slate-400'}`}>
                                                            {room.beds.length}
                                                        </span>
                                                        <BedIcon className={`w-3 h-3 ${selectedRoomId === room.id ? 'text-white/50' : 'text-slate-400'}`} />
                                                    </div>
                                                    <span className={`w-1 h-1 rounded-full ${selectedRoomId === room.id ? 'bg-white/30' : 'bg-slate-300'}`}></span>
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedRoomId === room.id ? 'text-white/70' : 'text-slate-400'}`}>
                                                        Floor {room.floorLevel}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleOpenRoomModal(room); }}
                                                className={`p-2.5 rounded-xl transition-colors ${selectedRoomId === room.id ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'}`}
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room); }}
                                                className={`p-2.5 rounded-xl transition-colors ${selectedRoomId === room.id ? 'bg-white/10 text-white hover:bg-rose-500' : 'bg-slate-50 text-slate-400 hover:text-rose-600'}`}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                            <ChevronRightIcon className={`w-6 h-6 ml-1 ${selectedRoomId === room.id ? 'text-white' : 'text-slate-200'}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Inventory Level: Beds Grid */}
                    <div className="lg:col-span-7 space-y-6">
                        {selectedRoom ? (
                            <div className="bg-slate-50/50 dark:bg-slate-900/20 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 animate-fade-in min-h-full">
                                <div className="flex items-center justify-between mb-8 px-2">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-xl text-indigo-600 shadow-sm">
                                            {selectedRoom.roomNumber}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Bed Inventory</h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">{selectedRoom.availableBeds} Free</span>
                                                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md">{selectedRoom.occupiedBeds} Taken</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">/ {selectedRoom.capacity} MAX</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowBulkBedModal(true)}
                                            className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
                                        >
                                            Bulk Add
                                        </button>
                                        <button
                                            onClick={() => handleOpenBedModal()}
                                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                                        >
                                            <PlusIcon className="w-3 h-3 inline-block mr-1 mb-0.5" /> Add Bed
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-5 pr-2 max-h-[60vh] overflow-y-auto custom-scrollbar px-1">
                                    {selectedRoom.beds.map(bed => (
                                        <div
                                            key={bed.id}
                                            className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 group hover:shadow-2xl hover:-translate-y-1 transition-all relative overflow-hidden"
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${bed.status === 'Available' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                                                    bed.status === 'Occupied' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20' :
                                                        'bg-orange-50 text-orange-600 dark:bg-orange-900/20'
                                                    }`}>
                                                    <BedIcon className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-col gap-1.5 items-end">
                                                    <button
                                                        onClick={() => handleOpenBedModal(bed)}
                                                        className="p-2 bg-slate-50 dark:bg-slate-900 text-slate-300 hover:text-indigo-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBed(bed)}
                                                        className="p-2 bg-slate-50 dark:bg-slate-900 text-slate-300 hover:text-rose-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-slate-900 dark:text-white tracking-widest">{bed.bedNumber}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`w-2 h-2 rounded-full ${bed.status === 'Available' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' :
                                                        bed.status === 'Occupied' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.4)]' :
                                                            'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]'
                                                        }`}></span>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{bed.status}</p>
                                                </div>
                                                <div className="mt-4 flex items-center justify-between">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${bed.condition === 'Excellent' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' :
                                                        bed.condition === 'Good' ? 'border-blue-200 text-blue-600 bg-blue-50' :
                                                            bed.condition === 'Poor' ? 'border-rose-200 text-rose-600 bg-rose-50' :
                                                                'border-slate-200 text-slate-500 bg-slate-50'
                                                        }`}>
                                                        {bed.condition}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedRoom.beds.length === 0 && (
                                        <div className="col-span-full py-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                                            <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No inventory provisioned for this level</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/10 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 py-32 group hover:border-indigo-100 transition-all">
                                <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-all">
                                    <BedIcon className="w-10 h-10 text-indigo-600 opacity-20" />
                                </div>
                                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">Inventory Management</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 max-w-xs text-center">
                                    Please select a room from the list on the left to add or manage beds within that unit.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Room Architecture Modal */}
            {showRoomModal && (
                <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowRoomModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                        <div className="p-10 pb-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {editingRoom ? 'Configuration' : 'New Unit'}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Room Architectural Protocol</p>
                            </div>
                            <button onClick={() => setShowRoomModal(false)} className="p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                                <XIcon className="w-7 h-7" />
                            </button>
                        </div>
                        <form onSubmit={handleRoomSubmit} className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Unit Identifier *</label>
                                    <input
                                        type="text"
                                        value={roomFormData.roomNumber}
                                        onChange={e => setRoomFormData({ ...roomFormData, roomNumber: e.target.value })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-base font-black outline-none transition-all"
                                        placeholder="R-101"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Floor Vertical</label>
                                    <input
                                        type="number"
                                        value={roomFormData.floorLevel}
                                        onChange={e => setRoomFormData({ ...roomFormData, floorLevel: parseInt(e.target.value) || 0 })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-base font-black outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Typology</label>
                                    <select
                                        value={roomFormData.roomType}
                                        onChange={e => setRoomFormData({ ...roomFormData, roomType: e.target.value as RoomType })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-black outline-none transition-all appearance-none"
                                    >
                                        <option value="Single">Single Suite</option>
                                        <option value="Double">Double Unit</option>
                                        <option value="Triple">Triple Unit</option>
                                        <option value="Quad">Quad Unit</option>
                                        <option value="Dormitory">Master Dormitory</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Max Capacity</label>
                                    <input
                                        type="number"
                                        value={roomFormData.capacity}
                                        onChange={e => setRoomFormData({ ...roomFormData, capacity: parseInt(e.target.value) || 1 })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-base font-black outline-none transition-all"
                                        min="1"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Operational Status</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Active', 'Inactive', 'Under Maintenance'].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setRoomFormData({ ...roomFormData, status: status as RoomStatus })}
                                            className={`p-3 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${roomFormData.status === status
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-indigo-100'
                                                }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowRoomModal(false)}
                                    className="flex-1 p-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950 transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 p-5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-none"
                                >
                                    {editingRoom ? 'UPDATE LEVEL' : 'INITIALIZE'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bed Detail Modal */}
            {showBedModal && (
                <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[600] flex items-center justify-center p-4" onClick={() => setShowBedModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white/20" onClick={e => e.stopPropagation()}>
                        <div className="p-10 pb-4 text-center bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">
                                {editingBed ? 'Inventory Config' : 'Item Provision'}
                            </h3>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Bed Management Protocol</p>
                        </div>
                        <form onSubmit={handleBedSubmit} className="p-10 space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Reference Code *</label>
                                <input
                                    type="text"
                                    value={bedFormData.bedNumber}
                                    onChange={e => setBedFormData({ ...bedFormData, bedNumber: e.target.value })}
                                    className="w-full p-5 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-lg font-black text-center outline-none transition-all uppercase"
                                    placeholder="B12"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Status</label>
                                    <select
                                        value={bedFormData.status}
                                        onChange={e => setBedFormData({ ...bedFormData, status: e.target.value as BedStatus })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-[10px] font-black focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                                    >
                                        <option value="Available">Free</option>
                                        <option value="Occupied">Taken</option>
                                        <option value="Reserved">Reserved</option>
                                        <option value="Under Maintenance">Repair</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Health</label>
                                    <select
                                        value={bedFormData.condition}
                                        onChange={e => setBedFormData({ ...bedFormData, condition: e.target.value as BedCondition })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-[10px] font-black focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                                    >
                                        <option value="Excellent">Pristine</option>
                                        <option value="Good">Optimal</option>
                                        <option value="Fair">Fair</option>
                                        <option value="Poor">Degraded</option>
                                        <option value="Needs Replacement">Terminal</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full p-6 bg-indigo-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.3em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-none"
                            >
                                Confirm Snapshot
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Provisioning Modal */}
            {showBulkBedModal && (
                <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-2xl z-[700] flex items-center justify-center p-4 animate-in zoom-in-95 duration-200" onClick={() => setShowBulkBedModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl w-full max-w-sm overflow-hidden border border-indigo-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                        <div className="p-10 pb-6 bg-indigo-600 text-white text-center">
                            <h3 className="text-2xl font-black uppercase tracking-[0.15em] mb-1">Mass Deployment</h3>
                            <p className="text-[10px] text-indigo-100/70 font-bold uppercase tracking-[0.25em]">Automated Inventory Generator</p>
                        </div>
                        <form onSubmit={handleBulkBedSubmit} className="p-10 space-y-10">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 text-center">Tag Prefix</label>
                                    <input
                                        type="text"
                                        value={bulkBedData.prefix}
                                        onChange={e => setBulkBedData({ ...bulkBedData, prefix: e.target.value })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-lg font-black text-center focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="B"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 text-center">Start Id</label>
                                    <input
                                        type="number"
                                        value={bulkBedData.startNumber}
                                        onChange={e => setBulkBedData({ ...bulkBedData, startNumber: parseInt(e.target.value) || 1 })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-lg font-black text-center focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 text-center">Quantity</label>
                                    <input
                                        type="number"
                                        value={bulkBedData.count}
                                        onChange={e => setBulkBedData({ ...bulkBedData, count: parseInt(e.target.value) || 1 })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-lg font-black text-center focus:ring-2 focus:ring-indigo-500 transition-all"
                                        min="1"
                                        max="50"
                                    />
                                </div>
                            </div>

                            <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/20 text-center">
                                <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.15em]">
                                    Generating: {bulkBedData.prefix}{bulkBedData.startNumber} ... {bulkBedData.prefix}{bulkBedData.startNumber + bulkBedData.count - 1}
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="w-full p-6 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.4em] hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 dark:shadow-none flex items-center justify-center gap-3"
                            >
                                EXECUTE DEPLOYMENT <CheckCircleIcon className="w-5 h-5 text-indigo-400" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
                
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div >
    );
};

export default RoomBedManager;

