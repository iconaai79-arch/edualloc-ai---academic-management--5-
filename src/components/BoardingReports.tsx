import React, { useState, useEffect } from 'react';
import { User, Institution } from '../types';
import { BarChart3Icon, DownloadIcon, CalendarDaysIcon, FilterIcon, FileTextIcon, TrendingUpIcon, UsersIcon, HomeIcon } from './icons';

interface BoardingReportsProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction: (action: string) => Promise<void>;
}

type ReportType = 'occupancy' | 'allocations' | 'checkins' | 'checkouts' | 'maintenance' | 'summary';

const BoardingReports: React.FC<BoardingReportsProps> = ({
    currentUser,
    currentInstitution,
    onLogAction
}) => {
    const [selectedReport, setSelectedReport] = useState<ReportType>('summary');
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);

    useEffect(() => {
        loadReportData();
    }, [selectedReport, dateRange]);

    const loadReportData = async () => {
        setLoading(true);
        try {
            // TODO: Implement report data loading based on selectedReport
            // This would query different views and tables based on the report type

            await onLogAction(`Viewed ${selectedReport} report`);

            // Mock data structure
            setReportData({
                summary: {
                    totalHouses: 4,
                    totalRooms: 48,
                    totalBeds: 480,
                    occupiedBeds: 408,
                    availableBeds: 72,
                    occupancyRate: 85,
                    activeAllocations: 408,
                    checkInsThisPeriod: 156,
                    checkOutsThisPeriod: 23,
                    maintenanceIssues: 12
                }
            });
        } catch (error) {
            console.error('Error loading report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = () => {
        alert('PDF export functionality to be implemented');
        onLogAction(`Exported ${selectedReport} report to PDF`);
    };

    const handleExportExcel = () => {
        alert('Excel export functionality to be implemented');
        onLogAction(`Exported ${selectedReport} report to Excel`);
    };

    const renderSummaryReport = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Total Houses</p>
                            <p className="text-3xl font-bold mt-2">{reportData?.summary.totalHouses || 0}</p>
                        </div>
                        <HomeIcon className="w-12 h-12 text-blue-200" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm">Total Beds</p>
                            <p className="text-3xl font-bold mt-2">{reportData?.summary.totalBeds || 0}</p>
                            <p className="text-purple-100 text-xs mt-1">{reportData?.summary.totalRooms || 0} rooms</p>
                        </div>
                        <BarChart3Icon className="w-12 h-12 text-purple-200" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm">Occupancy Rate</p>
                            <p className="text-3xl font-bold mt-2">{reportData?.summary.occupancyRate || 0}%</p>
                            <p className="text-green-100 text-xs mt-1">
                                {reportData?.summary.occupiedBeds || 0} / {reportData?.summary.totalBeds || 0}
                            </p>
                        </div>
                        <TrendingUpIcon className="w-12 h-12 text-green-200" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-orange-100 text-sm">Available Beds</p>
                            <p className="text-3xl font-bold mt-2">{reportData?.summary.availableBeds || 0}</p>
                            <p className="text-orange-100 text-xs mt-1">Ready for allocation</p>
                        </div>
                        <UsersIcon className="w-12 h-12 text-orange-200" />
                    </div>
                </div>
            </div>

            {/* Activity Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Active Allocations</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                            {reportData?.summary.activeAllocations || 0}
                        </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Check-Ins (Period)</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">
                            {reportData?.summary.checkInsThisPeriod || 0}
                        </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Check-Outs (Period)</p>
                        <p className="text-2xl font-bold text-purple-600 mt-1">
                            {reportData?.summary.checkOutsThisPeriod || 0}
                        </p>
                    </div>
                </div>
            </div>

            {/* Maintenance Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Overview</h3>
                <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Pending Issues</p>
                            <p className="text-2xl font-bold text-orange-600 mt-1">
                                {reportData?.summary.maintenanceIssues || 0}
                            </p>
                        </div>
                        <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderOccupancyReport = () => (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Occupancy Report</h3>
            <div className="text-center py-12">
                <BarChart3Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Detailed occupancy charts and analytics</p>
                <p className="text-sm text-gray-500 mt-2">This section will include:</p>
                <ul className="text-sm text-gray-500 mt-2 space-y-1">
                    <li>• Occupancy trends over time</li>
                    <li>• Per-house occupancy breakdown</li>
                    <li>• Gender distribution</li>
                    <li>• Peak occupancy periods</li>
                </ul>
            </div>
        </div>
    );

    const renderAllocationsReport = () => (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Allocations Report</h3>
            <div className="text-center py-12">
                <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Allocation history and statistics</p>
                <p className="text-sm text-gray-500 mt-2">This section will include:</p>
                <ul className="text-sm text-gray-500 mt-2 space-y-1">
                    <li>• Total allocations by term/year</li>
                    <li>• Allocation duration analysis</li>
                    <li>• Transfer history</li>
                    <li>• Student allocation patterns</li>
                </ul>
            </div>
        </div>
    );

    const renderCheckInsReport = () => (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Check-Ins Report</h3>
            <div className="text-center py-12">
                <FileTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Check-in activity and trends</p>
                <p className="text-sm text-gray-500 mt-2">This section will include:</p>
                <ul className="text-sm text-gray-500 mt-2 space-y-1">
                    <li>• Daily check-in volumes</li>
                    <li>• Average check-in time</li>
                    <li>• Condition reports summary</li>
                    <li>• Items inventory status</li>
                </ul>
            </div>
        </div>
    );

    const renderCheckOutsReport = () => (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Check-Outs Report</h3>
            <div className="text-center py-12">
                <FileTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Check-out activity and clearance status</p>
                <p className="text-sm text-gray-500 mt-2">This section will include:</p>
                <ul className="text-sm text-gray-500 mt-2 space-y-1">
                    <li>• Daily check-out volumes</li>
                    <li>• Clearance status breakdown</li>
                    <li>• Damage reports summary</li>
                    <li>• Average clearance time</li>
                </ul>
            </div>
        </div>
    );

    const renderMaintenanceReport = () => (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Report</h3>
            <div className="text-center py-12">
                <FileTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Maintenance issues and resolution tracking</p>
                <p className="text-sm text-gray-500 mt-2">This section will include:</p>
                <ul className="text-sm text-gray-500 mt-2 space-y-1">
                    <li>• Issues by priority level</li>
                    <li>• Resolution time analysis</li>
                    <li>• Common issue types</li>
                    <li>• Maintenance costs (if tracked)</li>
                </ul>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Boarding Reports & Analytics</h2>
                    <p className="text-gray-600 mt-1">Generate and export comprehensive reports</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Export PDF
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Report Type Selector & Date Range */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                        <select
                            value={selectedReport}
                            onChange={(e) => setSelectedReport(e.target.value as ReportType)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="summary">Summary Overview</option>
                            <option value="occupancy">Occupancy Report</option>
                            <option value="allocations">Allocations Report</option>
                            <option value="checkins">Check-Ins Report</option>
                            <option value="checkouts">Check-Outs Report</option>
                            <option value="maintenance">Maintenance Report</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Report Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading report...</p>
                    </div>
                </div>
            ) : (
                <>
                    {selectedReport === 'summary' && renderSummaryReport()}
                    {selectedReport === 'occupancy' && renderOccupancyReport()}
                    {selectedReport === 'allocations' && renderAllocationsReport()}
                    {selectedReport === 'checkins' && renderCheckInsReport()}
                    {selectedReport === 'checkouts' && renderCheckOutsReport()}
                    {selectedReport === 'maintenance' && renderMaintenanceReport()}
                </>
            )}

            {/* Report Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <CalendarDaysIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">Report Period</p>
                        <p className="text-sm text-blue-800 mt-1">
                            {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-blue-700 mt-2">
                            Generated on {new Date().toLocaleString()} by {currentUser.name}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoardingReports;
