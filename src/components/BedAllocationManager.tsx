import React, { useState, useEffect } from 'react';
import { User, Institution, BoardingHouse, BoardingBed, BedAllocation, BedAllocationWithDetails } from '../types';
import { UsersIcon, SearchIcon, PlusIcon, XIcon, ExclamationTriangleIcon, CheckCircleIcon, ArrowRightIcon, FilterIcon } from './icons';
import { apiService } from '../services/apiService';

interface BedAllocationManagerProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

interface AvailableBed extends BoardingBed {
    roomNumber: string;
    houseName: string;
    houseGender: string;
    roomId: string;
    houseId: string;
}

const BedAllocationManager: React.FC<BedAllocationManagerProps> = ({
    currentUser,
    currentInstitution,
    onLogAction,
    onDataChange
}) => {
    const [students, setStudents] = useState<User[]>([]);
    const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([]);
    const [allocations, setAllocations] = useState<BedAllocationWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAllocationModal, setShowAllocationModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [selectedBed, setSelectedBed] = useState<AvailableBed | null>(null);
    const [selectedAllocation, setSelectedAllocation] = useState<BedAllocationWithDetails | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');
    const [houseFilter, setHouseFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Completed'>('all');

    const [allocationForm, setAllocationForm] = useState({
        term: 'Term 1',
        academicYear: new Date().getFullYear().toString(),
        notes: ''
    });

    const [houses, setHouses] = useState<BoardingHouse[]>([]);

    useEffect(() => {
        loadData();
    }, [currentInstitution.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadStudents(),
                loadAvailableBeds(),
                loadAllocations(),
                loadHouses()
            ]);
            await onLogAction('Viewed bed allocations');
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStudents = async () => {
        try {
            const data = await apiService.fetchModuleRecords<User>('users', currentInstitution.id);
            setStudents(data.filter(u => u.role === 'student') || []);
        } catch (error) {
            console.error('Error loading students:', error);
        }
    };

    const loadAvailableBeds = async () => {
        try {
            const data = await apiService.fetchAvailableBeds(currentInstitution.id);

            const beds = data?.map((bed: any) => ({
                ...bed,
                roomNumber: bed.boardingRooms.roomNumber,
                roomId: bed.boardingRooms.id,
                houseName: bed.boardingRooms.boardingHouses.name,
                houseGender: bed.boardingRooms.boardingHouses.gender,
                houseId: bed.boardingRooms.boardingHouses.id
            })) || [];

            setAvailableBeds(beds);
        } catch (error) {
            console.error('Error loading available beds:', error);
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

    const loadHouses = async () => {
        try {
            const data = await apiService.fetchModuleRecords<BoardingHouse>('boarding_houses', currentInstitution.id);
            setHouses(data || []);
        } catch (error) {
            console.error('Error loading houses:', error);
        }
    };

    const handleOpenAllocationModal = (student: User) => {
        setSelectedStudent(student);
        setSelectedBed(null);
        setAllocationForm({
            term: 'Term 1',
            academicYear: new Date().getFullYear().toString(),
            notes: ''
        });
        setShowAllocationModal(true);
    };

    const handleAllocateBed = async () => {
        if (!selectedStudent || !selectedBed) {
            alert('Please select both a student and a bed');
            return;
        }

        // Validate gender matching
        if (selectedBed.houseGender !== 'Mixed' && selectedStudent.gender !== selectedBed.houseGender) {
            alert(`Cannot allocate ${selectedStudent.gender} student to ${selectedBed.houseGender} house`);
            return;
        }

        try {
            const payload = {
                bedId: selectedBed.id,
                studentId: selectedStudent.id,
                allocatedBy: currentUser.id,
                allocationDate: new Date().toISOString().split('T')[0],
                term: allocationForm.term,
                academicYear: allocationForm.academicYear,
                status: 'Active',
                notes: allocationForm.notes,
                id: `allocation_${Date.now()}`
            };

            await apiService.saveModuleRecord('bed_allocations', payload);

            await onLogAction(`Allocated bed ${selectedBed.bedNumber} to ${selectedStudent.name}`);
            alert('Bed allocated successfully!');

            setShowAllocationModal(false);
            loadData();
            onDataChange();
        } catch (error) {
            console.error('Error allocating bed:', error);
            alert('Failed to allocate bed');
        }
    };

    const handleOpenTransferModal = (allocation: BedAllocationWithDetails) => {
        setSelectedAllocation(allocation);
        setSelectedBed(null);
        setShowTransferModal(true);
    };

    const handleTransferBed = async () => {
        if (!selectedAllocation || !selectedBed) {
            alert('Please select a new bed');
            return;
        }

        try {
            // Mark old allocation as transferred
            await apiService.saveModuleRecord('bed_allocations', {
                ...selectedAllocation,
                status: 'Transferred'
            } as any);

            // Create new allocation
            await apiService.saveModuleRecord('bed_allocations', {
                bedId: selectedBed.id,
                studentId: selectedAllocation.studentId,
                allocatedBy: currentUser.id,
                allocationDate: new Date().toISOString().split('T')[0],
                term: selectedAllocation.term,
                academicYear: selectedAllocation.academicYear,
                status: 'Active',
                notes: `Transferred from ${selectedAllocation.bedNumber}`,
                id: `allocation_${Date.now()}`
            });

            await onLogAction(`Transferred student to bed ${selectedBed.bedNumber}`);
            alert('Student transferred successfully!');

            setShowTransferModal(false);
            loadData();
            onDataChange();
        } catch (error) {
            console.error('Error transferring bed:', error);
            alert('Failed to transfer bed');
        }
    };

    const handleDeallocate = async (allocation: BedAllocationWithDetails) => {
        if (!confirm(`Deallocate ${allocation.studentName} from bed ${allocation.bedNumber}?`)) {
            return;
        }

        try {
            await apiService.saveModuleRecord('bed_allocations', {
                ...allocation,
                status: 'Cancelled'
            } as any);

            await onLogAction(`Deallocated ${allocation.studentName} from bed ${allocation.bedNumber}`);
            alert('Bed deallocated successfully!');

            loadData();
            onDataChange();
        } catch (error) {
            console.error('Error deallocating bed:', error);
            alert('Failed to deallocate bed');
        }
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGender = genderFilter === 'all' || student.gender === genderFilter;
        return matchesSearch && matchesGender;
    });

    const filteredAllocations = allocations.filter(allocation => {
        const matchesHouse = houseFilter === 'all' || allocation.houseName === houseFilter;
        const matchesStatus = statusFilter === 'all' || allocation.status === statusFilter;
        return matchesHouse && matchesStatus;
    });

    const filteredBeds = availableBeds.filter(bed => {
        if (!selectedStudent) return true;
        // Filter beds by gender compatibility
        if (bed.houseGender === 'Mixed') return true;
        return bed.houseGender === selectedStudent.gender;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading allocations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Bed Allocations</h2>
                    <p className="text-gray-600 mt-1">Allocate and manage student bed assignments</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadData}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{students.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Available Beds</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{availableBeds.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Active Allocations</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                        {allocations.filter(a => a.status === 'Active').length}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Unallocated Students</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">
                        {students.length - allocations.filter(a => a.status === 'Active').length}
                    </p>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Students List */}
                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Students</h3>

                        {/* Search and Filters */}
                        <div className="space-y-3">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search students..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <select
                                value={genderFilter}
                                onChange={(e) => setGenderFilter(e.target.value as any)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Genders</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-4 max-h-[600px] overflow-y-auto">
                        {filteredStudents.length === 0 ? (
                            <div className="text-center py-8">
                                <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600">No students found</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredStudents.map((student) => {
                                    const hasAllocation = allocations.some(
                                        a => a.studentId === student.id && a.status === 'Active'
                                    );

                                    return (
                                        <div
                                            key={student.id}
                                            className={`p-3 border rounded-lg ${hasAllocation ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{student.name}</p>
                                                    <p className="text-sm text-gray-600">{student.email}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                                            {student.gender}
                                                        </span>
                                                        {hasAllocation && (
                                                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1">
                                                                <CheckCircleIcon className="w-3 h-3" />
                                                                Allocated
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {!hasAllocation && (
                                                    <button
                                                        onClick={() => handleOpenAllocationModal(student)}
                                                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                                    >
                                                        Allocate
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Current Allocations */}
                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Allocations</h3>

                        {/* Filters */}
                        <div className="grid grid-cols-2 gap-3">
                            <select
                                value={houseFilter}
                                onChange={(e) => setHouseFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Houses</option>
                                {houses.map(house => (
                                    <option key={house.id} value={house.name}>{house.name}</option>
                                ))}
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-4 max-h-[600px] overflow-y-auto">
                        {filteredAllocations.length === 0 ? (
                            <div className="text-center py-8">
                                <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600">No allocations found</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredAllocations.map((allocation) => (
                                    <div key={allocation.id} className="p-3 border border-gray-200 rounded-lg bg-white">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{allocation.studentName}</p>
                                                <p className="text-sm text-gray-600">
                                                    {allocation.houseName} • Room {allocation.roomNumber} • Bed {allocation.bedNumber}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {allocation.term} • {allocation.academicYear}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${allocation.status === 'Active' ? 'bg-green-100 text-green-800' :
                                                allocation.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                                                    allocation.status === 'Transferred' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-red-100 text-red-800'
                                                }`}>
                                                {allocation.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                                            {allocation.hasCheckedIn && (
                                                <span className="flex items-center gap-1 text-green-600">
                                                    <CheckCircleIcon className="w-3 h-3" />
                                                    Checked In
                                                </span>
                                            )}
                                            {allocation.hasCheckedOut && (
                                                <span className="flex items-center gap-1 text-blue-600">
                                                    <CheckCircleIcon className="w-3 h-3" />
                                                    Checked Out
                                                </span>
                                            )}
                                        </div>

                                        {allocation.status === 'Active' && (
                                            <div className="flex gap-2 pt-2 border-t">
                                                <button
                                                    onClick={() => handleOpenTransferModal(allocation)}
                                                    className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 text-sm rounded hover:bg-blue-100 transition-colors"
                                                >
                                                    Transfer
                                                </button>
                                                <button
                                                    onClick={() => handleDeallocate(allocation)}
                                                    className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100 transition-colors"
                                                >
                                                    Deallocate
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Allocation Modal */}
            {showAllocationModal && selectedStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Allocate Bed</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Student: <span className="font-medium">{selectedStudent.name}</span> ({selectedStudent.gender})
                                </p>
                            </div>
                            <button onClick={() => setShowAllocationModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Term and Year */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                                    <select
                                        value={allocationForm.term}
                                        onChange={(e) => setAllocationForm({ ...allocationForm, term: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="Term 1">Term 1</option>
                                        <option value="Term 2">Term 2</option>
                                        <option value="Term 3">Term 3</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                                    <input
                                        type="text"
                                        value={allocationForm.academicYear}
                                        onChange={(e) => setAllocationForm({ ...allocationForm, academicYear: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="2026"
                                    />
                                </div>
                            </div>

                            {/* Available Beds */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Bed ({filteredBeds.length} available)
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2">
                                    {filteredBeds.length === 0 ? (
                                        <div className="col-span-2 text-center py-8">
                                            <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <p className="text-gray-600">No compatible beds available</p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Looking for {selectedStudent.gender} or Mixed gender houses
                                            </p>
                                        </div>
                                    ) : (
                                        filteredBeds.map((bed) => (
                                            <button
                                                key={bed.id}
                                                onClick={() => setSelectedBed(bed)}
                                                className={`p-4 border-2 rounded-lg text-left transition-all ${selectedBed?.id === bed.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{bed.houseName}</p>
                                                        <p className="text-sm text-gray-600">
                                                            Room {bed.roomNumber} • Bed {bed.bedNumber}
                                                        </p>
                                                        <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                                                            {bed.houseGender}
                                                        </span>
                                                    </div>
                                                    {selectedBed?.id === bed.id && (
                                                        <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                                                    )}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                                <textarea
                                    value={allocationForm.notes}
                                    onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={2}
                                    placeholder="Any special notes about this allocation"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    onClick={() => setShowAllocationModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAllocateBed}
                                    disabled={!selectedBed}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Allocate Bed
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {showTransferModal && selectedAllocation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Transfer Student</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    {selectedAllocation.studentName} • Current: {selectedAllocation.bedNumber}
                                </p>
                            </div>
                            <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                                <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                <p className="text-sm text-blue-800">
                                    Select a new bed to transfer the student. The current allocation will be marked as transferred.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select New Bed ({availableBeds.length} available)
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2">
                                    {availableBeds.length === 0 ? (
                                        <div className="col-span-2 text-center py-8">
                                            <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <p className="text-gray-600">No beds available for transfer</p>
                                        </div>
                                    ) : (
                                        availableBeds.map((bed) => (
                                            <button
                                                key={bed.id}
                                                onClick={() => setSelectedBed(bed)}
                                                className={`p-4 border-2 rounded-lg text-left transition-all ${selectedBed?.id === bed.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{bed.houseName}</p>
                                                        <p className="text-sm text-gray-600">
                                                            Room {bed.roomNumber} • Bed {bed.bedNumber}
                                                        </p>
                                                    </div>
                                                    {selectedBed?.id === bed.id && (
                                                        <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                                                    )}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    onClick={() => setShowTransferModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleTransferBed}
                                    disabled={!selectedBed}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <ArrowRightIcon className="w-4 h-4" />
                                    Transfer Student
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BedAllocationManager;
