import React, { useState, useEffect } from 'react';
import {
    User, Institution, BoardingHouseWithStats,
    CompanyDetails, AcademicYear, Semester,
    Course, Department
} from '../types';
import { HomeIcon } from './icons/HomeIcon';
import { BedIcon } from './icons/BedIcon';
import { UsersIcon } from './icons/UsersIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { BarChart3Icon } from './icons/BarChart3Icon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { apiService } from '../services/apiService';
import HouseManager from './HouseManager';
import RoomBedManager from './RoomBedManager';
import BedAllocationManager from './BedAllocationManager';
import CheckInOutManager from './CheckInOutManager';
import BoardingReports from './BoardingReports';
import BoardingMaintenanceManager from './BoardingMaintenanceManager';
import { StudentLeaveOutManager } from './StudentLeaveOutManager';
import { UserManager } from './UserManager';
import { SmsConfig, Subject, LetterheadConfig } from '../types';


interface BoardingMasterViewProps {
    currentUser: User;
    currentInstitution: Institution;
    companyDetails: CompanyDetails;
    users: User[];
    academicYears: AcademicYear[];
    semesters: Semester[];
    courses: Course[];
    departments: Department[];
    onLogAction: (action: string) => Promise<void>;
    // New Props for Student Management
    onAddUser?: (userData: any) => Promise<void>;
    onEditUser?: (id: string, data: any) => Promise<void>;
    onDeleteUser?: (id: string) => Promise<void>;
    onImportStudents?: (imported: any[]) => Promise<void>;
    smsConfig?: SmsConfig;
    subjects?: Subject[];
    letterheadConfig?: LetterheadConfig;
    logoUrl?: string | null;
    footerImageUrl?: string | null;
    onSendSms?: (recipient: string, message: string, config?: SmsConfig, units?: number, institutionId?: string) => Promise<any>;
    onAddParent?: (studentId: string, parentData: { name: string, email: string, phone: string }) => Promise<{ success: boolean, message: string, credentials?: { email: string, password: string } }>;
    onDeleteParent?: (studentId: string, parentId: string) => void;
}


type BoardingTab = 'dashboard' | 'houses' | 'rooms' | 'allocations' | 'checkin' | 'leaveout' | 'maintenance' | 'reports' | 'students';


const BoardingMasterView: React.FC<BoardingMasterViewProps> = ({
    currentUser,
    currentInstitution,
    companyDetails,
    users,
    academicYears,
    semesters,
    courses,
    departments,
    onLogAction,
    onAddUser,
    onEditUser,
    onDeleteUser,
    onImportStudents,
    smsConfig,
    subjects,
    letterheadConfig,
    logoUrl,
    footerImageUrl,
    onSendSms,
    onAddParent,
    onDeleteParent
}) => {

    const isAuthorized = ['boarding_master', 'admin', 'super_admin', 'house_master', 'head_teacher', 'boarding_mistress'].includes(currentUser.role || '');

    if (!isAuthorized) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] bg-transparent">
                <div className="text-center p-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-700 max-w-lg animate-fade-in-up">
                    <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircleIcon className="w-10 h-10 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white mb-4">Access Protocol Denied</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
                        Your current authentication profile does not possess the requisite security clearance to access institutional boarding infrastructure. Please contact the Boarding Master or System Administrator for elevation.
                    </p>
                    <div className="flex flex-col gap-3">
                        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Required Role: Boarding Master | Admin
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const [activeTab, setActiveTab] = useState<BoardingTab>('dashboard');

    const [houses, setHouses] = useState<BoardingHouseWithStats[]>([]);
    const [stats, setStats] = useState({
        totalHouses: 0,
        totalRooms: 0,
        totalBeds: 0,
        occupiedBeds: 0,
        availableBeds: 0,
        occupancyRate: 0,
        activeAllocations: 0,
        pendingCheckIns: 0,
        pendingCheckOuts: 0,
        maintenanceIssues: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, [currentInstitution.id]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const houseStats = await apiService.fetchModuleRecords<any>('v_house_statistics', currentInstitution.id);
            const maintenanceLogs = await apiService.fetchMaintenanceLogs(currentInstitution.id);
            const allocations = await apiService.fetchBedAllocations(currentInstitution.id);

            const totalHouses = houseStats.length;
            const totalRooms = houseStats.reduce((acc: number, h: any) => acc + (h.totalRooms || 0), 0);
            const totalBeds = houseStats.reduce((acc: number, h: any) => acc + (h.totalBeds || 0), 0);
            const occupiedBeds = houseStats.reduce((acc: number, h: any) => acc + (h.occupiedBeds || 0), 0);
            const availableBeds = houseStats.reduce((acc: number, h: any) => acc + (h.availableBeds || 0), 0);

            const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

            setStats({
                totalHouses,
                totalRooms,
                totalBeds,
                occupiedBeds,
                availableBeds,
                occupancyRate,
                activeAllocations: allocations.filter((a: any) => a.status === 'Active').length,
                pendingCheckIns: allocations.filter((a: any) => a.status === 'Active' && (!a.boardingCheckins || a.boardingCheckins.length === 0)).length,
                pendingCheckOuts: allocations.filter((a: any) => a.status === 'Active' && a.boardingCheckins && a.boardingCheckins.length > 0 && (!a.boardingCheckouts || a.boardingCheckouts.length === 0)).length,
                maintenanceIssues: maintenanceLogs.filter((l: any) => l.status === 'Pending').length
            });

            await onLogAction('Viewed boarding dashboard');
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderDashboard = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Boarding Management Dashboard</h2>
                    <p className="text-gray-600 mt-1">Manage boarding houses, beds, and student allocations</p>
                </div>
                <button
                    onClick={loadDashboardData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Refresh Data
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Houses */}
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Total Houses</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalHouses}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full">
                            <HomeIcon className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Total Beds */}
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Total Beds</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalBeds}</p>
                            <p className="text-sm text-gray-500 mt-1">{stats.totalRooms} rooms</p>
                        </div>
                        <div className="bg-purple-100 p-3 rounded-full">
                            <BedIcon className="w-8 h-8 text-purple-600" />
                        </div>
                    </div>
                </div>

                {/* Occupancy */}
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Occupancy Rate</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.occupancyRate}%</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {stats.occupiedBeds} / {stats.totalBeds} beds
                            </p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                            <UsersIcon className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                </div>

                {/* Available Beds */}
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Available Beds</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.availableBeds}</p>
                            <p className="text-sm text-gray-500 mt-1">Ready for allocation</p>
                        </div>
                        <div className="bg-yellow-100 p-3 rounded-full">
                            <CheckCircleIcon className="w-8 h-8 text-yellow-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => setActiveTab('allocations')}
                        className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                        <UsersIcon className="w-6 h-6 text-blue-600" />
                        <div className="text-left">
                            <p className="font-semibold text-gray-900">Allocate Beds</p>
                            <p className="text-sm text-gray-600">Assign students to beds</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveTab('checkin')}
                        className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
                    >
                        <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        <div className="text-left">
                            <p className="font-semibold text-gray-900">Check In/Out</p>
                            <p className="text-sm text-gray-600">Process student movements</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveTab('maintenance')}
                        className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all"
                    >
                        <AlertTriangleIcon className="w-6 h-6 text-orange-600" />
                        <div className="text-left">
                            <p className="font-semibold text-gray-900">Maintenance</p>
                            <p className="text-sm text-gray-600">{stats.maintenanceIssues} pending issues</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveTab('students')}
                        className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                    >
                        <UserGroupIcon className="w-6 h-6 text-indigo-600" />
                        <div className="text-left">
                            <p className="font-semibold text-gray-900">Manage Students</p>
                            <p className="text-sm text-gray-600">View and register students</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Pending Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pending Check-Ins */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Pending Check-Ins</h3>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {stats.pendingCheckIns}
                        </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">Students allocated but not yet checked in</p>
                    <button
                        onClick={() => setActiveTab('checkin')}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                        View All →
                    </button>
                </div>

                {/* Pending Check-Outs */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Pending Check-Outs</h3>
                        <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                            {stats.pendingCheckOuts}
                        </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">Students ready for check-out processing</p>
                    <button
                        onClick={() => setActiveTab('checkin')}
                        className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                    >
                        View All →
                    </button>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading boarding data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-md mb-6">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'dashboard'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <BarChart3Icon className="w-4 h-4" />
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('houses')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'houses'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <HomeIcon className="w-4 h-4" />
                            Houses
                        </button>
                        <button
                            onClick={() => setActiveTab('rooms')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'rooms'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <BedIcon className="w-4 h-4" />
                            Rooms & Beds
                        </button>
                        <button
                            onClick={() => setActiveTab('allocations')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'allocations'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <UsersIcon className="w-4 h-4" />
                            Allocations
                        </button>
                        <button
                            onClick={() => setActiveTab('checkin')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'checkin'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <CheckCircleIcon className="w-4 h-4" />
                            Check In/Out
                        </button>
                        <button
                            onClick={() => setActiveTab('maintenance')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'maintenance'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <SettingsIcon className="w-4 h-4" />
                            Maintenance
                        </button>
                        <button
                            onClick={() => setActiveTab('reports')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'reports'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <ClipboardListIcon className="w-4 h-4" />
                            Reports
                        </button>
                        <button
                            onClick={() => setActiveTab('leaveout')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'leaveout'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <ClipboardListIcon className="w-4 h-4" />
                            Leave Out Requests
                        </button>
                        <button
                            onClick={() => setActiveTab('students')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'students'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <UsersIcon className="w-4 h-4" />
                            Manage Students
                        </button>
                    </nav>

                </div>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'houses' && (
                    <HouseManager
                        currentUser={currentUser}
                        currentInstitution={currentInstitution}
                        onLogAction={onLogAction}
                        onDataChange={loadDashboardData}
                    />
                )}
                {activeTab === 'rooms' && (
                    <RoomBedManager
                        currentUser={currentUser}
                        currentInstitution={currentInstitution}
                        onLogAction={onLogAction}
                        onDataChange={loadDashboardData}
                    />
                )}
                {activeTab === 'allocations' && (
                    <BedAllocationManager
                        currentUser={currentUser}
                        currentInstitution={currentInstitution}
                        onLogAction={onLogAction}
                        onDataChange={loadDashboardData}
                    />
                )}
                {activeTab === 'checkin' && (
                    <CheckInOutManager
                        currentUser={currentUser}
                        currentInstitution={currentInstitution}
                        onLogAction={onLogAction}
                        onDataChange={loadDashboardData}
                    />
                )}
                {activeTab === 'maintenance' && (
                    <BoardingMaintenanceManager
                        currentUser={currentUser}
                        currentInstitution={currentInstitution}
                        onLogAction={onLogAction}
                    />
                )}
                {activeTab === 'leaveout' && (
                    <StudentLeaveOutManager
                        currentUser={currentUser}
                        currentInstitution={currentInstitution}
                        companyDetails={companyDetails}
                        users={users}
                        academicYears={academicYears}
                        semesters={semesters}
                        courses={courses}
                        departments={departments}
                        onLogAction={onLogAction}
                        onDataChange={loadDashboardData}
                    />
                )}

                {activeTab === 'reports' && (

                    <BoardingReports
                        currentUser={currentUser}
                        currentInstitution={currentInstitution}
                        onLogAction={onLogAction}
                    />
                )}
                {activeTab === 'students' && (
                    <UserManager
                        currentUser={currentUser}
                        currentInstitution={currentInstitution}
                        users={users}
                        courses={courses}
                        departments={departments}
                        onLogAction={onLogAction}
                        onAddUser={onAddUser}
                        onEditUser={onEditUser!}
                        onDeleteUser={onDeleteUser!}
                        onImportStudents={onImportStudents!}
                        onImportUsers={async () => { }} // Not needed for boarding perspective
                        smsConfig={smsConfig!}
                        subjects={subjects!}
                        letterheadConfig={letterheadConfig!}
                        logoUrl={logoUrl!}
                        footerImageUrl={footerImageUrl!}
                        onSendSms={onSendSms}
                        showOnly="student"
                        allocations={[]} // Optional for student view in this context
                        onWithdrawRequest={async (_requestId) => { }}
                        onAddParent={onAddParent}
                        onDeleteParent={onDeleteParent}
                    />
                )}
            </div>
        </div>
    );
};

export default BoardingMasterView;
