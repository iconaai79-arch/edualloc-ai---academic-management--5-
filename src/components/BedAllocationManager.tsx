import React, { useState, useEffect, useMemo } from 'react';
import {
    User, Institution, BoardingHouse, BoardingBed,
    BedAllocation, BedAllocationWithDetails
} from '../types';
import {
    UsersIcon, SearchIcon, PlusIcon, XIcon, CheckCircleIcon,
    ArrowRightIcon, FilterIcon, HomeIcon, BedIcon,
    ChevronRightIcon, GridIcon, ListIcon, InformationCircleIcon,
    ArrowPathIcon, TrendingUpIcon
} from './icons';
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

const isGenderMatch = (houseGender: string | undefined, studentGender: string | undefined) => {
    if (!houseGender || houseGender === 'Mixed') return true;
    if (!studentGender) return true; // Fail open if student gender is missing
    if (houseGender === 'Boys' && studentGender === 'Male') return true;
    if (houseGender === 'Girls' && studentGender === 'Female') return true;
    return false;
};

const BedAllocationManager: React.FC<BedAllocationManagerProps> = ({
    currentUser,
    currentInstitution,
    onLogAction,
    onDataChange
}) => {
    const [students, setStudents] = useState<User[]>([]);
    const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([]);
    const [allocations, setAllocations] = useState<BedAllocationWithDetails[]>([]);
    const [houses, setHouses] = useState<BoardingHouse[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [activeView, setActiveView] = useState<'roster' | 'directory'>('roster');
    const [searchTerm, setSearchTerm] = useState('');
    const [houseFilter, setHouseFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Completed'>('all');

    // Modal State
    const [showAllocationModal, setShowAllocationModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [selectedBed, setSelectedBed] = useState<AvailableBed | null>(null);
    const [selectedAllocation, setSelectedAllocation] = useState<BedAllocationWithDetails | null>(null);

    const [allocationForm, setAllocationForm] = useState({
        term: 'Term 1',
        academicYear: new Date().getFullYear().toString(),
        notes: ''
    });

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
        } catch (error) {
            console.error('Error loading allocation data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStudents = async () => {
        const data = await apiService.fetchModuleRecords<User>('users', currentInstitution.id);
        const studentList = data?.filter(u => u.role === 'student') || [];
        setStudents(studentList);
    };

    const loadAvailableBeds = async () => {
        const data = await apiService.fetchAvailableBeds(currentInstitution.id);
        const beds = (data || []).map((bed: any) => {
            // Handle both object and array return types from Supabase joins
            const room = Array.isArray(bed.boardingRooms) ? bed.boardingRooms[0] : bed.boardingRooms;
            const house = room ? (Array.isArray(room.boardingHouses) ? room.boardingHouses[0] : room.boardingHouses) : null;

            return {
                ...bed,
                roomNumber: room?.roomNumber || 'Unknown Room',
                roomId: room?.id || '',
                houseName: house?.name || 'Unknown House',
                houseGender: house?.gender || 'Mixed',
                houseId: house?.id || ''
            };
        });
        setAvailableBeds(beds);
    };

    const loadAllocations = async () => {
        const data = await apiService.fetchBedAllocations(currentInstitution.id);
        const transformed = (data || []).map((a: any) => ({
            ...a,
            studentName: a.usersStudentIdFkey?.name || 'Unknown student',
            allocatedByName: a.usersAllocatedByFkey?.name || 'Admin',
            bedNumber: a.boardingBeds?.bedNumber || 'N/A',
            roomNumber: a.boardingBeds?.boardingRooms?.roomNumber || 'N/A',
            houseName: a.boardingBeds?.boardingRooms?.boardingHouses?.name || 'N/A',
            hasCheckedIn: (a.boardingCheckins?.length || 0) > 0,
            hasCheckedOut: (a.boardingCheckouts?.length || 0) > 0
        }));
        setAllocations(transformed);
    };

    const loadHouses = async () => {
        const data = await apiService.fetchModuleRecords<BoardingHouse>('boarding_houses', currentInstitution.id);
        setHouses(data || []);
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
        if (!selectedStudent) {
            alert('Error: No student selected.');
            return;
        }
        if (!selectedBed) {
            alert('Please click on an available bed to select it first.');
            return;
        }

        // Gender validation
        if (!isGenderMatch(selectedBed.houseGender, selectedStudent.gender)) {
            alert(`Gender Mismatch: Cannot allocate a ${selectedStudent.gender || 'Unknown'} student to a ${selectedBed.houseGender} house.`);
            return;
        }

        try {
            const payload = {
                bedId: selectedBed.id,
                studentId: selectedStudent.id,
                institutionId: currentInstitution.id,
                allocatedBy: currentUser.id,
                allocationDate: new Date().toISOString().split('T')[0],
                term: allocationForm.term,
                academicYear: allocationForm.academicYear,
                status: 'Active' as const,
                notes: allocationForm.notes,
                id: `allocation_${Date.now()}`
            };

            await apiService.saveModuleRecord('bed_allocations', payload);
            await onLogAction(`Allocated bed ${selectedBed.bedNumber} in ${selectedBed.houseName} to ${selectedStudent.name}`);

            setShowAllocationModal(false);
            loadData();
            onDataChange();
        } catch (error: any) {
            console.error('Allocation Error:', error);
            alert(`Allocation failed: ${error.message || 'Unknown error'}`);
        }
    };

    const handleDeallocate = async (allocation: BedAllocationWithDetails) => {
        if (!confirm(`Revoke allocation for ${allocation.studentName}?`)) return;

        try {
            await apiService.saveModuleRecord('bed_allocations', {
                ...allocation,
                institutionId: currentInstitution.id,
                status: 'Cancelled' as const
            } as any);

            await onLogAction(`Deallocated ${allocation.studentName} from bed ${allocation.bedNumber}`);
            loadData();
            onDataChange();
        } catch (error) {
            alert('Failed to process deallocation.');
        }
    };

    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = (student.name || '').toLowerCase().includes(searchLower) ||
                (student.email || '').toLowerCase().includes(searchLower) ||
                (student.staffId || '').toLowerCase().includes(searchLower);
            const isUnallocated = !allocations.some(a => a.studentId === student.id && a.status === 'Active');
            return matchesSearch && isUnallocated;
        });
    }, [students, searchTerm, allocations]);

    const filteredAllocations = useMemo(() => {
        return allocations.filter(a => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = (a.studentName || '').toLowerCase().includes(searchLower) ||
                (a.studentId || '').toLowerCase().includes(searchLower);
            const matchesHouse = houseFilter === 'all' || a.houseName === houseFilter;
            const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
            return matchesSearch && matchesHouse && matchesStatus;
        });
    }, [allocations, searchTerm, houseFilter, statusFilter]);

    const stats = useMemo(() => {
        const active = allocations.filter(a => a.status === 'Active').length;
        return {
            totalAllocated: active,
            pendingRegistration: students.length - active,
            totalAvailable: availableBeds.length,
            occupancyRate: students.length > 0 ? Math.round((active / students.length) * 100) : 0
        };
    }, [allocations, students, availableBeds]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-indigo-600"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Archiving Occupancy States...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Intelligence Header */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200 dark:shadow-none">
                            <UsersIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Allocation Control</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mt-1">Institutional Boarding Logistics</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full lg:w-auto">
                        <div className="text-center px-4 border-r border-slate-100 dark:border-slate-700 last:border-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Occupied</p>
                            <p className="text-xl font-black text-indigo-600">{stats.totalAllocated}</p>
                        </div>
                        <div className="text-center px-4 border-r border-slate-100 dark:border-slate-700 last:border-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Available</p>
                            <p className="text-xl font-black text-emerald-500">{stats.totalAvailable}</p>
                        </div>
                        <div className="text-center px-4 border-r border-slate-100 dark:border-slate-700 last:border-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Unplaced</p>
                            <p className="text-xl font-black text-rose-500">{stats.pendingRegistration}</p>
                        </div>
                        <div className="text-center px-4">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Load Factor</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{stats.occupancyRate}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Architecture */}
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-grow flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="SEARCH BY STUDENT IDENTIFIER..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-4">
                        <select
                            value={houseFilter}
                            onChange={(e) => setHouseFilter(e.target.value)}
                            className="p-4 bg-white dark:bg-slate-800 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm outline-none appearance-none pr-10 min-w-[160px]"
                        >
                            <option value="all">All Houses</option>
                            {houses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                        </select>
                        <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-sm flex">
                            <button
                                onClick={() => setActiveView('roster')}
                                className={`px-5 py-3 rounded-xl transition-all flex items-center gap-2 ${activeView === 'roster' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <ListIcon className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Allocations</span>
                            </button>
                            <button
                                onClick={() => setActiveView('directory')}
                                className={`px-5 py-3 rounded-xl transition-all flex items-center gap-2 ${activeView === 'directory' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <GridIcon className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Waitlist</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Plane */}
            {activeView === 'roster' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAllocations.map((allocation) => (
                        <div key={allocation.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700 group hover:-translate-y-2 transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center font-black text-indigo-600">
                                    {allocation.studentName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${allocation.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {allocation.status}
                                </span>
                            </div>

                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{allocation.studentName}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">{allocation.houseName} • ROOM {allocation.roomNumber}</p>

                            <div className="flex items-center gap-3 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl mb-6">
                                <BedIcon className="w-5 h-5 text-indigo-600" />
                                <div>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Station Assigned</p>
                                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">BED {allocation.bedNumber}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">
                                <span className={`w-2 h-2 rounded-full ${allocation.hasCheckedIn ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200'}`}></span>
                                {allocation.hasCheckedIn ? 'IN QUARTERS' : 'NOT ARRIVED'}
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                    onClick={() => handleDeallocate(allocation)}
                                    className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black uppercase tracking-[0.15em] rounded-xl transition-all"
                                >
                                    REVOKE
                                </button>
                                <button
                                    className="flex-1 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-[0.15em] rounded-xl transition-all"
                                >
                                    TRANSFER
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredAllocations.length === 0 && (
                        <div className="col-span-full py-32 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <TrendingUpIcon className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No active allocation records matching criteria</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredStudents.map((student) => (
                        <div key={student.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700 flex flex-col items-center text-center group hover:border-indigo-200 transition-all">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center font-black text-2xl text-slate-300 mb-6 group-hover:scale-110 group-hover:bg-indigo-50 transition-all group-hover:text-indigo-600">
                                {student.name[0]}
                            </div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{student.name}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">{student.gender} • {student.institutionId.substring(0, 8)}</p>

                            <button
                                onClick={() => handleOpenAllocationModal(student)}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all mt-auto"
                            >
                                START PLACEMENT
                            </button>
                        </div>
                    ))}
                    {filteredStudents.length === 0 && (
                        <div className="col-span-full py-32 text-center">
                            <CheckCircleIcon className="w-16 h-16 text-emerald-100 mx-auto mb-6" />
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Registry Synchronization Complete</p>
                            <p className="text-[10px] text-slate-300 font-bold uppercase mt-2">All active students have been assigned quarters</p>
                        </div>
                    )}
                </div>
            )}

            {/* Allocation Architect Modal */}
            {showAllocationModal && selectedStudent && (
                <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowAllocationModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[90vh]">
                            {/* Left Panel: Profile */}
                            <div className="lg:col-span-4 bg-indigo-600 p-12 text-white flex flex-col items-center text-center justify-center">
                                <div className="w-32 h-32 bg-white/20 rounded-[3rem] flex items-center justify-center mb-8 backdrop-blur-xl">
                                    <UsersIcon className="w-16 h-16 text-white" />
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{selectedStudent.name}</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-8">{selectedStudent.gender} PLACEMENT PROTOCOL</p>

                                <div className="w-full space-y-4 pt-8 border-t border-white/10 text-left">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">Academic Year</span>
                                        <span className="text-xs font-black uppercase">2026/2027</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">Term Cycle</span>
                                        <span className="text-xs font-black uppercase">First Session</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Selection */}
                            <div className="lg:col-span-8 p-12 overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-center mb-10">
                                    <div>
                                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Available Station</h4>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Found {availableBeds.length} compatible units</p>
                                    </div>
                                    <button onClick={() => setShowAllocationModal(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-all text-slate-400">
                                        <XIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                                    {availableBeds.filter(b => isGenderMatch(b.houseGender, selectedStudent.gender)).map((bed) => (
                                        <button
                                            key={bed.id}
                                            onClick={() => setSelectedBed(bed)}
                                            className={`p-6 rounded-[2rem] border-2 transition-all text-left group ${selectedBed?.id === bed.id
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100'
                                                : 'bg-white dark:bg-slate-950 border-slate-50 dark:border-slate-800 hover:border-indigo-100'
                                                }`}
                                        >
                                            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${selectedBed?.id === bed.id ? 'text-white/60' : 'text-slate-400'}`}>
                                                {bed.houseName}
                                            </p>
                                            <p className="text-sm font-black uppercase tracking-tight mb-2">Room {bed.roomNumber}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <BedIcon className={`w-4 h-4 ${selectedBed?.id === bed.id ? 'text-white' : 'text-indigo-600'}`} />
                                                    <span className="text-xs font-black">BED {bed.bedNumber}</span>
                                                </div>
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${selectedBed?.id === bed.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                    {bed.houseGender}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                    {availableBeds.length === 0 && (
                                        <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-950 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                                            Architecture Exhausted: No available beds in {selectedStudent.gender} housing
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-6">
                                    <button
                                        onClick={() => setShowAllocationModal(false)}
                                        className="flex-1 py-5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em]"
                                    >
                                        TERMINATE
                                    </button>
                                    <button
                                        onClick={handleAllocateBed}
                                        className={`flex-[2] py-5 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-3 transition-all ${selectedBed
                                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                            : 'bg-indigo-400 cursor-not-allowed opacity-80'
                                            }`}
                                    >
                                        EXECUTE PLACEMENT <ArrowRightIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default BedAllocationManager;
