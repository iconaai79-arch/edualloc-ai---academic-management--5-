import React, { useState, useEffect } from 'react';
import { User, Institution, TeacherCheckInWithDetails } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { SearchIcon } from './icons/SearchIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { UsersIcon } from './icons/UsersIcon';
import { apiService } from '../services/apiService';


interface TeacherCheckInAdminViewProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction: (action: string) => Promise<void>;
}

const TeacherCheckInAdminView: React.FC<TeacherCheckInAdminViewProps> = ({
    currentUser,
    currentInstitution,
    onLogAction
}) => {
    const [checkIns, setCheckIns] = useState<TeacherCheckInWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadCheckIns();
    }, [currentInstitution.id, selectedDate]);

    const loadCheckIns = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<TeacherCheckInWithDetails>('v_today_teacher_checkins', undefined, undefined, {
                filter: { 
                    institution_id: currentInstitution.id,
                    check_in_date: selectedDate
                },
                order: 'teacher_name'
            });

            setCheckIns(data || []);
            await onLogAction('Viewed teacher check-ins (admin)');
        } catch (error) {
            console.error('Error loading check-ins:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCheckIns = checkIns.filter(checkIn =>
        checkIn.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        checkIn.teacherEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: checkIns.length,
        morningComplete: checkIns.filter(c => c.morningCheckInTime).length,
        afternoonComplete: checkIns.filter(c => c.afternoonCheckInTime).length,
        morningOnTime: checkIns.filter(c => c.morningCheckInStatus === 'On Time').length,
        afternoonOnTime: checkIns.filter(c => c.afternoonCheckInStatus === 'On Time').length,
        morningLate: checkIns.filter(c => c.morningCheckInStatus === 'Late').length,
        afternoonLate: checkIns.filter(c => c.afternoonCheckInStatus === 'Late').length,
        morningAbsent: checkIns.filter(c => c.morningCheckInStatus === 'Absent').length,
        afternoonAbsent: checkIns.filter(c => c.afternoonCheckInStatus === 'Absent').length
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'On Time': return 'bg-green-100 text-green-800';
            case 'Late': return 'bg-orange-100 text-orange-800';
            case 'Absent': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading check-ins...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Teacher Check-Ins</h2>
                    <p className="text-gray-600 mt-1">Monitor teacher attendance and punctuality</p>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Total Teachers</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Morning Check-Ins</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                        {stats.morningComplete}/{stats.total}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {stats.morningOnTime} on time, {stats.morningLate} late
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Afternoon Check-Ins</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">
                        {stats.afternoonComplete}/{stats.total}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {stats.afternoonOnTime} on time, {stats.afternoonLate} late
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Absent Today</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                        {Math.max(stats.morningAbsent, stats.afternoonAbsent)}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search teachers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="relative">
                        <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Check-Ins Table */}
            {filteredCheckIns.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Check-Ins Found</h3>
                    <p className="text-gray-600">No teacher check-ins for the selected date</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Teacher
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Morning Check-In
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Afternoon Check-In
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredCheckIns.map((checkIn) => (
                                    <tr key={checkIn.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{checkIn.teacherName}</div>
                                                <div className="text-sm text-gray-500">{checkIn.teacherEmail}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {checkIn.morningCheckInTime ? (
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <ClockIcon className="w-4 h-4 text-gray-500" />
                                                        <span className="text-sm font-medium">{checkIn.morningCheckInTime}</span>
                                                    </div>
                                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(checkIn.morningCheckInStatus)}`}>
                                                        {checkIn.morningCheckInStatus}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <XCircleIcon className="w-4 h-4" />
                                                    <span className="text-sm">Not checked in</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {checkIn.afternoonCheckInTime ? (
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <ClockIcon className="w-4 h-4 text-gray-500" />
                                                        <span className="text-sm font-medium">{checkIn.afternoonCheckInTime}</span>
                                                    </div>
                                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(checkIn.afternoonCheckInStatus)}`}>
                                                        {checkIn.afternoonCheckInStatus}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <XCircleIcon className="w-4 h-4" />
                                                    <span className="text-sm">Not checked in</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {checkIn.morningCheckInTime && checkIn.afternoonCheckInTime ? (
                                                <div className="flex items-center gap-2 text-green-600">
                                                    <CheckCircleIcon className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Complete</span>
                                                </div>
                                            ) : checkIn.morningOverdue || checkIn.afternoonOverdue ? (
                                                <div className="flex items-center gap-2 text-red-600">
                                                    <XCircleIcon className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Overdue</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-yellow-600">
                                                    <ClockIcon className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Pending</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherCheckInAdminView;

