import React, { useState, useEffect } from 'react';
import { User, Institution, BedAllocationWithDetails, BoardingCheckIn, BoardingCheckOut, ClearanceStatus } from '../types';
import { CheckCircleIcon, XCircleIcon, SearchIcon, CameraIcon, UploadIcon, XIcon, ExclamationTriangleIcon } from './icons';
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
    const [activeTab, setActiveTab] = useState<'checkin' | 'checkout'>('checkin');
    const [allocations, setAllocations] = useState<BedAllocationWithDetails[]>([]);
    const [checkIns, setCheckIns] = useState<BoardingCheckIn[]>([]);
    const [checkOuts, setCheckOuts] = useState<BoardingCheckOut[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [showCheckOutModal, setShowCheckOutModal] = useState(false);
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
            await onLogAction('Viewed check-in/out manager');
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAllocations = async () => {
        try {
            const data = await apiService.fetchBedAllocations(currentInstitution.id);

            const transformed = data?.map((a: any) => ({
                ...a,
                studentName: a.usersStudentIdFkey.name,
                allocatedByName: a.usersAllocatedByFkey.name,
                bedNumber: a.boardingBeds.bedNumber,
                roomNumber: a.boardingBeds.boardingRooms.roomNumber,
                houseName: a.boardingBeds.boardingRooms.boardingHouses.name,
                hasCheckedIn: a.boardingCheckins && a.boardingCheckins.length > 0,
                hasCheckedOut: a.boardingCheckouts && a.boardingCheckouts.length > 0
            })) || [];

            setAllocations(transformed);
        } catch (error) {
            console.error('Error loading allocations:', error);
        }
    };

    const loadCheckIns = async () => {
        try {
            const data = await apiService.fetchBoardingCheckIns(currentInstitution.id);
            setCheckIns(data || []);
        } catch (error) {
            console.error('Error loading check-ins:', error);
        }
    };

    const loadCheckOuts = async () => {
        try {
            const data = await apiService.fetchBoardingCheckOuts(currentInstitution.id);
            setCheckOuts(data || []);
        } catch (error) {
            console.error('Error loading check-outs:', error);
        }
    };

    const handleOpenCheckInModal = (allocation: BedAllocationWithDetails) => {
        setSelectedAllocation(allocation);
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
        setShowCheckInModal(true);
    };

    const handleOpenCheckOutModal = (allocation: BedAllocationWithDetails) => {
        setSelectedAllocation(allocation);
        setCheckOutForm({
            conditionNotes: '',
            damageReport: '',
            clearanceStatus: 'Pending',
            photoUrl: ''
        });
        setShowCheckOutModal(true);
    };

    const handleCheckIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAllocation) return;

        try {
            const now = new Date();
            const payload = {
                allocationId: selectedAllocation.id,
                studentId: selectedAllocation.studentId,
                checkInDate: now.toISOString().split('T')[0],
                checkInTime: now.toTimeString().split(' ')[0],
                checkedInBy: currentUser.id,
                conditionNotes: checkInForm.conditionNotes,
                itemsInventory: checkInForm.itemsInventory,
                photoUrl: checkInForm.photoUrl,
                id: `checkin_${Date.now()}`
            };

            await apiService.saveModuleRecord('boarding_checkins', payload);

            await onLogAction(`Checked in ${selectedAllocation.studentName} to bed ${selectedAllocation.bedNumber}`);
            alert('Student checked in successfully!');

            setShowCheckInModal(false);
            loadData();
            onDataChange();
        } catch (error) {
            console.error('Error checking in:', error);
            alert('Failed to check in student');
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
                checkOutDate: now.toISOString().split('T')[0],
                checkOutTime: now.toTimeString().split(' ')[0],
                checkedOutBy: currentUser.id,
                conditionNotes: checkOutForm.conditionNotes,
                damageReport: checkOutForm.damageReport,
                clearanceStatus: checkOutForm.clearanceStatus,
                photoUrl: checkOutForm.photoUrl,
                id: `checkout_${Date.now()}`
            };

            await apiService.saveModuleRecord('boarding_checkouts', payload);

            // Update allocation status to Completed
            await apiService.saveModuleRecord('bed_allocations', {
                ...selectedAllocation,
                status: 'Completed'
            } as any);

            await onLogAction(`Checked out ${selectedAllocation.studentName} from bed ${selectedAllocation.bedNumber}`);
            alert('Student checked out successfully!');

            setShowCheckOutModal(false);
            loadData();
            onDataChange();
        } catch (error) {
            console.error('Error checking out:', error);
            alert('Failed to check out student');
        }
    };

    const filteredAllocations = allocations.filter(allocation =>
        allocation.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        allocation.bedNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendingCheckIns = filteredAllocations.filter(a => !a.hasCheckedIn);
    const pendingCheckOuts = filteredAllocations.filter(a => a.hasCheckedIn && !a.hasCheckedOut);

    if (loading) {
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
                    <h2 className="text-2xl font-bold text-gray-900">Check-In / Check-Out</h2>
                    <p className="text-gray-600 mt-1">Process student check-ins and check-outs</p>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Pending Check-Ins</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">{pendingCheckIns.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Pending Check-Outs</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{pendingCheckOuts.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Completed Today</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                        {checkIns.filter(c => c.checkInDate === new Date().toISOString().split('T')[0]).length}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-md">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('checkin')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'checkin'
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <CheckCircleIcon className="w-4 h-4" />
                            Check-In ({pendingCheckIns.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('checkout')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'checkout'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <XCircleIcon className="w-4 h-4" />
                            Check-Out ({pendingCheckOuts.length})
                        </button>
                    </nav>
                </div>

                {/* Search */}
                <div className="p-4 border-b">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by student name or bed number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    {activeTab === 'checkin' && (
                        <div className="space-y-3">
                            {pendingCheckIns.length === 0 ? (
                                <div className="text-center py-12">
                                    <CheckCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">No pending check-ins</p>
                                </div>
                            ) : (
                                pendingCheckIns.map((allocation) => (
                                    <div key={allocation.id} className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900">{allocation.studentName}</p>
                                                <p className="text-sm text-gray-600">
                                                    {allocation.houseName} • Room {allocation.roomNumber} • Bed {allocation.bedNumber}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Allocated: {new Date(allocation.allocationDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleOpenCheckInModal(allocation)}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                            >
                                                <CheckCircleIcon className="w-4 h-4" />
                                                Check In
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'checkout' && (
                        <div className="space-y-3">
                            {pendingCheckOuts.length === 0 ? (
                                <div className="text-center py-12">
                                    <XCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">No pending check-outs</p>
                                </div>
                            ) : (
                                pendingCheckOuts.map((allocation) => (
                                    <div key={allocation.id} className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900">{allocation.studentName}</p>
                                                <p className="text-sm text-gray-600">
                                                    {allocation.houseName} • Room {allocation.roomNumber} • Bed {allocation.bedNumber}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Checked in: {allocation.hasCheckedIn ? 'Yes' : 'No'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleOpenCheckOutModal(allocation)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                            >
                                                <XCircleIcon className="w-4 h-4" />
                                                Check Out
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Check-In Modal */}
            {showCheckInModal && selectedAllocation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Check-In Student</h3>
                                <p className="text-sm text-gray-600 mt-1">{selectedAllocation.studentName}</p>
                            </div>
                            <button onClick={() => setShowCheckInModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCheckIn} className="p-6 space-y-4">
                            {/* Room Details */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-blue-900">
                                    {selectedAllocation.houseName} • Room {selectedAllocation.roomNumber} • Bed {selectedAllocation.bedNumber}
                                </p>
                            </div>

                            {/* Items Inventory */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Items Inventory</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(checkInForm.itemsInventory).map(([item, status]) => (
                                        <div key={item} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <span className="text-sm font-medium text-gray-700 capitalize">{item}</span>
                                            <select
                                                value={status}
                                                onChange={(e) => setCheckInForm({
                                                    ...checkInForm,
                                                    itemsInventory: { ...checkInForm.itemsInventory, [item]: e.target.value }
                                                })}
                                                className="px-3 py-1 border border-gray-300 rounded text-sm"
                                            >
                                                <option value="Present">Present</option>
                                                <option value="Good">Good</option>
                                                <option value="Fair">Fair</option>
                                                <option value="Poor">Poor</option>
                                                <option value="Missing">Missing</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Condition Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Condition Notes</label>
                                <textarea
                                    value={checkInForm.conditionNotes}
                                    onChange={(e) => setCheckInForm({ ...checkInForm, conditionNotes: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="Note any existing damage or issues..."
                                />
                            </div>

                            {/* Photo Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Photo (Optional)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    <CameraIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">Click to upload photo</p>
                                    <p className="text-xs text-gray-500 mt-1">Photo upload functionality to be implemented</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowCheckInModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Complete Check-In
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Check-Out Modal */}
            {showCheckOutModal && selectedAllocation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Check-Out Student</h3>
                                <p className="text-sm text-gray-600 mt-1">{selectedAllocation.studentName}</p>
                            </div>
                            <button onClick={() => setShowCheckOutModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCheckOut} className="p-6 space-y-4">
                            {/* Room Details */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-blue-900">
                                    {selectedAllocation.houseName} • Room {selectedAllocation.roomNumber} • Bed {selectedAllocation.bedNumber}
                                </p>
                            </div>

                            {/* Condition Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Condition Notes</label>
                                <textarea
                                    value={checkOutForm.conditionNotes}
                                    onChange={(e) => setCheckOutForm({ ...checkOutForm, conditionNotes: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={2}
                                    placeholder="Note the condition of the room and items..."
                                />
                            </div>

                            {/* Damage Report */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Damage Report</label>
                                <textarea
                                    value={checkOutForm.damageReport}
                                    onChange={(e) => setCheckOutForm({ ...checkOutForm, damageReport: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="Report any damage or missing items..."
                                />
                            </div>

                            {/* Clearance Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Clearance Status</label>
                                <select
                                    value={checkOutForm.clearanceStatus}
                                    onChange={(e) => setCheckOutForm({ ...checkOutForm, clearanceStatus: e.target.value as ClearanceStatus })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Cleared">Cleared</option>
                                    <option value="Issues Reported">Issues Reported</option>
                                </select>
                            </div>

                            {/* Photo Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Photo (Optional)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    <CameraIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">Click to upload photo</p>
                                    <p className="text-xs text-gray-500 mt-1">Photo upload functionality to be implemented</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowCheckOutModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    <XCircleIcon className="w-4 h-4" />
                                    Complete Check-Out
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckInOutManager;
