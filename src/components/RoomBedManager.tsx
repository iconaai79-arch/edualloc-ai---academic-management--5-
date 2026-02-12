import React, { useState, useEffect } from 'react';
import { User, Institution, BoardingHouse, BoardingRoom, BoardingBed, RoomType, RoomStatus, BedStatus, BedCondition } from '../types';
import { BedIcon, PlusIcon, Edit2Icon, Trash2Icon, HomeIcon, GridIcon, ListIcon, XIcon, ExclamationTriangleIcon } from './icons';
import { apiService } from '../services/apiService';

interface RoomBedManagerProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

interface RoomWithBeds extends BoardingRoom {
    houseName: string;
    beds: BoardingBed[];
}

const RoomBedManager: React.FC<RoomBedManagerProps> = ({
    currentUser,
    currentInstitution,
    onLogAction,
    onDataChange
}) => {
    const [houses, setHouses] = useState<BoardingHouse[]>([]);
    const [selectedHouseId, setSelectedHouseId] = useState<string>('');
    const [rooms, setRooms] = useState<RoomWithBeds[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [showBedModal, setShowBedModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState<BoardingRoom | null>(null);
    const [editingBed, setEditingBed] = useState<BoardingBed | null>(null);
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [roomFormData, setRoomFormData] = useState({
        roomNumber: '',
        roomType: 'Dormitory' as RoomType,
        capacity: 0,
        floorLevel: 0,
        amenities: '',
        status: 'Active' as RoomStatus
    });

    const [bedFormData, setBedFormData] = useState({
        bedNumber: '',
        status: 'Available' as BedStatus,
        condition: 'Good' as BedCondition,
        notes: ''
    });

    const [bulkBedCount, setBulkBedCount] = useState(1);
    const [bulkBedPrefix, setBulkBedPrefix] = useState('');

    useEffect(() => {
        loadHouses();
    }, [currentInstitution.id]);

    useEffect(() => {
        if (selectedHouseId) {
            loadRooms();
        }
    }, [selectedHouseId]);

    const loadHouses = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<BoardingHouse>('boarding_houses', currentInstitution.id);
            setHouses(data.filter(h => h.status === 'Active') || []);
            await onLogAction('Viewed room & bed manager');
        } catch (error) {
            console.error('Error loading houses:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRooms = async () => {
        if (!selectedHouseId) return;

        setLoading(true);
        try {
            const data = await apiService.fetchBoardingRooms(selectedHouseId);
            const roomsWithBeds = data?.map((room: any) => ({
                ...room,
                houseName: room.boardingHouses.name,
                beds: room.boardingBeds || []
            })) || [];

            setRooms(roomsWithBeds);
        } catch (error) {
            console.error('Error loading rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenRoomModal = (room?: BoardingRoom) => {
        if (room) {
            setEditingRoom(room);
            setRoomFormData({
                roomNumber: room.roomNumber,
                roomType: room.roomType,
                capacity: room.capacity,
                floorLevel: room.floorLevel,
                amenities: room.amenities || '',
                status: room.status
            });
        } else {
            setEditingRoom(null);
            setRoomFormData({
                roomNumber: '',
                roomType: 'Dormitory',
                capacity: 0,
                floorLevel: 0,
                amenities: '',
                status: 'Active'
            });
        }
        setShowRoomModal(true);
    };

    const handleOpenBedModal = (roomId: string, bed?: BoardingBed) => {
        setSelectedRoomId(roomId);
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

    const handleSubmitRoom = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedHouseId) {
            alert('Please select a house first');
            return;
        }

        if (!roomFormData.roomNumber.trim()) {
            alert('Please enter a room number');
            return;
        }

        if (roomFormData.capacity <= 0) {
            alert('Capacity must be greater than 0');
            return;
        }

        try {
            const payload = {
                ...roomFormData,
                houseId: selectedHouseId,
                ...(editingRoom ? { id: editingRoom.id } : { id: `room_${Date.now()}` })
            };

            await apiService.saveModuleRecord('boarding_rooms', payload);

            if (editingRoom) {
                await onLogAction(`Updated room: ${roomFormData.roomNumber}`);
                alert('Room updated successfully!');
            } else {
                await onLogAction(`Created room: ${roomFormData.roomNumber}`);
                alert('Room created successfully!');
            }

            setShowRoomModal(false);
            loadRooms();
            onDataChange();
        } catch (error: any) {
            console.error('Error saving room:', error);
            alert(`Failed to save room: ${error.message || 'Unknown error'}`);
        }
    };

    const handleSubmitBed = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!bedFormData.bedNumber.trim()) {
            alert('Please enter a bed number');
            return;
        }

        try {
            const payload = {
                ...bedFormData,
                roomId: selectedRoomId,
                ...(editingBed ? { id: editingBed.id } : { id: `bed_${Date.now()}` })
            };

            await apiService.saveModuleRecord('boarding_beds', payload);

            if (editingBed) {
                await onLogAction(`Updated bed: ${bedFormData.bedNumber}`);
                alert('Bed updated successfully!');
            } else {
                await onLogAction(`Created bed: ${bedFormData.bedNumber}`);
                alert('Bed created successfully!');
            }

            setShowBedModal(false);
            loadRooms();
            onDataChange();
        } catch (error: any) {
            console.error('Error saving bed:', error);
            alert(`Failed to save bed: ${error.message || 'Unknown error'}`);
        }
    };

    const handleBulkCreateBeds = async (roomId: string) => {
        if (bulkBedCount <= 0) {
            alert('Please enter a valid number of beds');
            return;
        }

        if (!bulkBedPrefix.trim()) {
            alert('Please enter a bed number prefix');
            return;
        }

        try {
            const beds = Array.from({ length: bulkBedCount }, (_, i) => ({
                room_id: roomId,
                bed_number: `${bulkBedPrefix}${String(i + 1).padStart(2, '0')}`,
                status: 'Available' as BedStatus,
                condition: 'Good' as BedCondition
            }));

            // Bulk insert is not directly supported by saveModuleRecord yet, 
            // but we can loop or add a bulk method.
            // For now, let's loop to reuse the existing logic.
            for (const bed of beds) {
                await apiService.saveModuleRecord('boarding_beds', {
                    ...bed,
                    id: `bed_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
                });
            }

            await onLogAction(`Bulk created ${bulkBedCount} beds`);
            alert(`Successfully created ${bulkBedCount} beds!`);

            setBulkBedCount(1);
            setBulkBedPrefix('');
            loadRooms();
            onDataChange();
        } catch (error: any) {
            console.error('Error bulk creating beds:', error);
            alert(`Failed to create beds: ${error.message || 'Unknown error'}`);
        }
    };

    const handleDeleteRoom = async (room: BoardingRoom) => {
        if (!confirm(`Delete room ${room.roomNumber}? This will also delete all beds in this room.`)) {
            return;
        }

        try {
            await apiService.deleteModuleRecord('boarding_rooms', room.id);

            await onLogAction(`Deleted room: ${room.roomNumber}`);
            alert('Room deleted successfully!');
            loadRooms();
            onDataChange();
        } catch (error: any) {
            console.error('Error deleting room:', error);
            alert(`Failed to delete room: ${error.message || 'Unknown error'}`);
        }
    };

    const handleDeleteBed = async (bed: BoardingBed) => {
        if (bed.status === 'Occupied') {
            alert('Cannot delete an occupied bed. Please deallocate the student first.');
            return;
        }

        if (!confirm(`Delete bed ${bed.bedNumber}?`)) {
            return;
        }

        try {
            await apiService.deleteModuleRecord('boarding_beds', bed.id);

            await onLogAction(`Deleted bed: ${bed.bedNumber}`);
            alert('Bed deleted successfully!');
            loadRooms();
            onDataChange();
        } catch (error: any) {
            console.error('Error deleting bed:', error);
            alert(`Failed to delete bed: ${error.message || 'Unknown error'}`);
        }
    };

    const getBedStatusColor = (status: BedStatus) => {
        switch (status) {
            case 'Available': return 'bg-green-100 text-green-800';
            case 'Occupied': return 'bg-blue-100 text-blue-800';
            case 'Reserved': return 'bg-yellow-100 text-yellow-800';
            case 'Under Maintenance': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getConditionColor = (condition: BedCondition) => {
        switch (condition) {
            case 'Excellent': return 'text-green-600';
            case 'Good': return 'text-blue-600';
            case 'Fair': return 'text-yellow-600';
            case 'Poor': return 'text-orange-600';
            case 'Needs Replacement': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    if (loading && houses.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Rooms & Beds Management</h2>
                    <p className="text-gray-600 mt-1">Manage rooms and beds within boarding houses</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                    >
                        <GridIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                    >
                        <ListIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* House Selector */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Boarding House
                </label>
                <div className="flex gap-4">
                    <select
                        value={selectedHouseId}
                        onChange={(e) => setSelectedHouseId(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">-- Select a house --</option>
                        {houses.map((house) => (
                            <option key={house.id} value={house.id}>
                                {house.name} ({house.gender})
                            </option>
                        ))}
                    </select>
                    {selectedHouseId && (
                        <button
                            onClick={() => handleOpenRoomModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Add Room
                        </button>
                    )}
                </div>
            </div>

            {/* No House Selected */}
            {!selectedHouseId && (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <HomeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Boarding House</h3>
                    <p className="text-gray-600">Choose a house from the dropdown above to manage its rooms and beds</p>
                </div>
            )}

            {/* Rooms Display */}
            {selectedHouseId && rooms.length === 0 && !loading && (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <BedIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rooms Yet</h3>
                    <p className="text-gray-600 mb-6">Get started by creating your first room</p>
                    <button
                        onClick={() => handleOpenRoomModal()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Create First Room
                    </button>
                </div>
            )}

            {/* Rooms Grid/List */}
            {selectedHouseId && rooms.length > 0 && (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                    {rooms.map((room) => (
                        <div key={room.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                            {/* Room Header */}
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold">Room {room.roomNumber}</h3>
                                        <p className="text-sm opacity-90 mt-1">{room.roomType} • Floor {room.floorLevel}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${room.status === 'Active' ? 'bg-green-100 text-green-800' :
                                        room.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                                            'bg-orange-100 text-orange-800'
                                        }`}>
                                        {room.status}
                                    </span>
                                </div>
                            </div>

                            {/* Room Stats */}
                            <div className="p-4 border-b">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-gray-600">Capacity:</span>
                                    <span className="font-semibold">{room.capacity} beds</span>
                                </div>
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-gray-600">Current Beds:</span>
                                    <span className="font-semibold">{room.beds.length}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Available:</span>
                                    <span className="font-semibold text-green-600">
                                        {room.beds.filter(b => b.status === 'Available').length}
                                    </span>
                                </div>
                            </div>

                            {/* Beds List */}
                            <div className="p-4 max-h-60 overflow-y-auto">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-gray-900">Beds</h4>
                                    <button
                                        onClick={() => handleOpenBedModal(room.id)}
                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                    >
                                        + Add Bed
                                    </button>
                                </div>

                                {room.beds.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">No beds yet</p>
                                ) : (
                                    <div className="space-y-2">
                                        {room.beds.map((bed) => (
                                            <div key={bed.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">{bed.bedNumber}</span>
                                                        <span className={`px-2 py-0.5 rounded text-xs ${getBedStatusColor(bed.status)}`}>
                                                            {bed.status}
                                                        </span>
                                                    </div>
                                                    <span className={`text-xs ${getConditionColor(bed.condition)}`}>
                                                        {bed.condition}
                                                    </span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleOpenBedModal(room.id, bed)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                    >
                                                        <Edit2Icon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBed(bed)}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2Icon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Bulk Create Beds */}
                                {room.beds.length < room.capacity && (
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-xs font-medium text-gray-700 mb-2">Quick Add Multiple Beds</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Prefix (e.g., B)"
                                                value={bulkBedPrefix}
                                                onChange={(e) => setBulkBedPrefix(e.target.value)}
                                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Count"
                                                value={bulkBedCount}
                                                onChange={(e) => setBulkBedCount(parseInt(e.target.value) || 1)}
                                                min="1"
                                                max={room.capacity - room.beds.length}
                                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                            />
                                            <button
                                                onClick={() => handleBulkCreateBeds(room.id)}
                                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Room Actions */}
                            <div className="p-4 bg-gray-50 border-t flex gap-2">
                                <button
                                    onClick={() => handleOpenRoomModal(room)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                >
                                    <Edit2Icon className="w-4 h-4" />
                                    Edit Room
                                </button>
                                <button
                                    onClick={() => handleDeleteRoom(room)}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                                >
                                    <Trash2Icon className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Room Modal */}
            {showRoomModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingRoom ? 'Edit Room' : 'Add New Room'}
                            </h3>
                            <button onClick={() => setShowRoomModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitRoom} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Room Number *</label>
                                    <input
                                        type="text"
                                        value={roomFormData.roomNumber}
                                        onChange={(e) => setRoomFormData({ ...roomFormData, roomNumber: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., R101"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Room Type *</label>
                                    <select
                                        value={roomFormData.roomType}
                                        onChange={(e) => setRoomFormData({ ...roomFormData, roomType: e.target.value as RoomType })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="Single">Single</option>
                                        <option value="Double">Double</option>
                                        <option value="Triple">Triple</option>
                                        <option value="Quad">Quad</option>
                                        <option value="Dormitory">Dormitory</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Capacity *</label>
                                    <input
                                        type="number"
                                        value={roomFormData.capacity}
                                        onChange={(e) => setRoomFormData({ ...roomFormData, capacity: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min="1"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Floor Level</label>
                                    <input
                                        type="number"
                                        value={roomFormData.floorLevel}
                                        onChange={(e) => setRoomFormData({ ...roomFormData, floorLevel: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    value={roomFormData.status}
                                    onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value as RoomStatus })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Under Maintenance">Under Maintenance</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
                                <textarea
                                    value={roomFormData.amenities}
                                    onChange={(e) => setRoomFormData({ ...roomFormData, amenities: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={2}
                                    placeholder="e.g., Ensuite bathroom, Study desk, Wardrobe"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowRoomModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    {editingRoom ? 'Update Room' : 'Create Room'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bed Modal */}
            {showBedModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingBed ? 'Edit Bed' : 'Add New Bed'}
                            </h3>
                            <button onClick={() => setShowBedModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitBed} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bed Number *</label>
                                <input
                                    type="text"
                                    value={bedFormData.bedNumber}
                                    onChange={(e) => setBedFormData({ ...bedFormData, bedNumber: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., B01"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                    <select
                                        value={bedFormData.status}
                                        onChange={(e) => setBedFormData({ ...bedFormData, status: e.target.value as BedStatus })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="Available">Available</option>
                                        <option value="Occupied">Occupied</option>
                                        <option value="Reserved">Reserved</option>
                                        <option value="Under Maintenance">Under Maintenance</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                                    <select
                                        value={bedFormData.condition}
                                        onChange={(e) => setBedFormData({ ...bedFormData, condition: e.target.value as BedCondition })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="Excellent">Excellent</option>
                                        <option value="Good">Good</option>
                                        <option value="Fair">Fair</option>
                                        <option value="Poor">Poor</option>
                                        <option value="Needs Replacement">Needs Replacement</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                <textarea
                                    value={bedFormData.notes}
                                    onChange={(e) => setBedFormData({ ...bedFormData, notes: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={2}
                                    placeholder="Optional notes about this bed"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowBedModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    {editingBed ? 'Update Bed' : 'Create Bed'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomBedManager;
