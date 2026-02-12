import React, { useState, useEffect } from 'react';
import { User, Institution, BoardingMaintenanceLog, BoardingHouse, MaintenancePriority, MaintenanceStatus } from '../types';
import { SettingsIcon, PlusIcon, SearchIcon, FilterIcon, XIcon, AlertTriangleIcon, CheckCircleIcon, ClockIcon } from './icons';
import { apiService } from '../services/apiService';

interface BoardingMaintenanceManagerProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction: (action: string) => Promise<void>;
}

const BoardingMaintenanceManager: React.FC<BoardingMaintenanceManagerProps> = ({
    currentUser,
    currentInstitution,
    onLogAction
}) => {
    const [maintenanceLogs, setMaintenanceLogs] = useState<BoardingMaintenanceLog[]>([]);
    const [houses, setHouses] = useState<BoardingHouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingLog, setEditingLog] = useState<BoardingMaintenanceLog | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | MaintenanceStatus>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | MaintenancePriority>('all');

    const [formData, setFormData] = useState({
        houseId: '',
        roomId: '',
        bedId: '',
        issueType: '',
        description: '',
        priority: 'Medium' as MaintenancePriority,
        status: 'Pending' as MaintenanceStatus,
        resolutionNotes: ''
    });

    useEffect(() => {
        loadData();
    }, [currentInstitution.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadMaintenanceLogs(),
                loadHouses()
            ]);
            await onLogAction('Viewed maintenance logs');
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMaintenanceLogs = async () => {
        try {
            const data = await apiService.fetchMaintenanceLogs(currentInstitution.id);
            setMaintenanceLogs(data || []);
        } catch (error) {
            console.error('Error loading maintenance logs:', error);
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

    const handleOpenModal = (log?: BoardingMaintenanceLog) => {
        if (log) {
            setEditingLog(log);
            setFormData({
                houseId: log.houseId || '',
                roomId: log.roomId || '',
                bedId: log.bedId || '',
                issueType: log.issueType,
                description: log.description,
                priority: log.priority,
                status: log.status,
                resolutionNotes: log.resolutionNotes || ''
            });
        } else {
            setEditingLog(null);
            setFormData({
                houseId: '',
                roomId: '',
                bedId: '',
                issueType: '',
                description: '',
                priority: 'Medium',
                status: 'Pending',
                resolutionNotes: ''
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.issueType.trim() || !formData.description.trim()) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            if (editingLog) {
                // Update existing log
                const payload: any = {
                    ...formData,
                    houseId: formData.houseId || null,
                    roomId: formData.roomId || null,
                    bedId: formData.bedId || null,
                    updatedAt: new Date().toISOString(),
                    id: editingLog.id
                };

                // If marking as completed, add resolved date and user
                if (formData.status === 'Completed' && editingLog.status !== 'Completed') {
                    payload.resolvedDate = new Date().toISOString().split('T')[0];
                    payload.resolvedBy = currentUser.id;
                }

                await apiService.saveModuleRecord('boarding_maintenance_logs', payload);
                await onLogAction(`Updated maintenance log: ${formData.issueType}`);
                alert('Maintenance log updated successfully!');
            } else {
                // Create new log
                const payload = {
                    ...formData,
                    houseId: formData.houseId || null,
                    roomId: formData.roomId || null,
                    bedId: formData.bedId || null,
                    reportedBy: currentUser.id,
                    reportedDate: new Date().toISOString().split('T')[0],
                    id: `log_${Date.now()}`
                };

                await apiService.saveModuleRecord('boarding_maintenance_logs', payload);
                await onLogAction(`Created maintenance log: ${formData.issueType}`);
                alert('Maintenance issue reported successfully!');
            }

            setShowModal(false);
            loadData();
        } catch (error: any) {
            console.error('Error saving maintenance log:', error);
            alert(`Failed to save maintenance log: ${error.message || 'Unknown error'}`);
        }
    };

    const handleDelete = async (log: BoardingMaintenanceLog) => {
        if (!confirm('Delete this maintenance log?')) return;

        try {
            await apiService.deleteModuleRecord('boarding_maintenance_logs', log.id);
            await onLogAction(`Deleted maintenance log: ${log.issueType}`);
            alert('Maintenance log deleted successfully!');
            loadData();
        } catch (error: any) {
            console.error('Error deleting maintenance log:', error);
            alert(`Failed to delete maintenance log: ${error.message || 'Unknown error'}`);
        }
    };

    const getPriorityColor = (priority: MaintenancePriority) => {
        switch (priority) {
            case 'Urgent': return 'bg-red-100 text-red-800 border-red-200';
            case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusColor = (status: MaintenanceStatus) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'In Progress': return 'bg-blue-100 text-blue-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredLogs = maintenanceLogs.filter(log => {
        const matchesSearch = log.issueType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || log.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
    });

    const stats = {
        pending: maintenanceLogs.filter(l => l.status === 'Pending').length,
        inProgress: maintenanceLogs.filter(l => l.status === 'In Progress').length,
        completed: maintenanceLogs.filter(l => l.status === 'Completed').length,
        urgent: maintenanceLogs.filter(l => l.priority === 'Urgent' && l.status !== 'Completed').length
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading maintenance logs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Maintenance Management</h2>
                    <p className="text-gray-600 mt-1">Track and manage maintenance issues</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    Report Issue
                </button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inProgress}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.completed}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
                    <p className="text-sm text-gray-600">Urgent Issues</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{stats.urgent}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search issues..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Priorities</option>
                        <option value="Urgent">Urgent</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>
            </div>

            {/* Maintenance Logs */}
            {filteredLogs.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <SettingsIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Maintenance Issues</h3>
                    <p className="text-gray-600 mb-6">No issues match your current filters</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredLogs.map((log) => (
                        <div key={log.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold text-gray-900">{log.issueType}</h3>
                                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(log.priority)}`}>
                                            {log.priority}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.status)}`}>
                                            {log.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{log.description}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <ClockIcon className="w-3 h-3" />
                                            Reported: {new Date(log.reportedDate).toLocaleDateString()}
                                        </span>
                                        {log.resolvedDate && (
                                            <span className="flex items-center gap-1 text-green-600">
                                                <CheckCircleIcon className="w-3 h-3" />
                                                Resolved: {new Date(log.resolvedDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    {log.resolutionNotes && (
                                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                                            <p className="font-medium text-green-900">Resolution:</p>
                                            <p className="text-green-800">{log.resolutionNotes}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <button
                                        onClick={() => handleOpenModal(log)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    >
                                        <SettingsIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(log)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingLog ? 'Update Maintenance Issue' : 'Report Maintenance Issue'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Issue Type *</label>
                                    <input
                                        type="text"
                                        value={formData.issueType}
                                        onChange={(e) => setFormData({ ...formData, issueType: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., Broken bed, Leaking pipe"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as MaintenancePriority })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="Describe the issue in detail..."
                                    required
                                />
                            </div>

                            {editingLog && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as MaintenanceStatus })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Notes</label>
                                        <textarea
                                            value={formData.resolutionNotes}
                                            onChange={(e) => setFormData({ ...formData, resolutionNotes: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            rows={2}
                                            placeholder="Describe how the issue was resolved..."
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    {editingLog ? 'Update Issue' : 'Report Issue'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BoardingMaintenanceManager;
