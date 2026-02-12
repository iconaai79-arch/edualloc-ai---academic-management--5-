import React, { useState, useEffect } from 'react';
import { User, Institution, BoardingHouse, BoardingHouseWithStats, HouseGender, HouseStatus } from '../types';
import { HomeIcon, PlusIcon, Edit2Icon, Trash2Icon, UsersIcon, BedIcon, TrendingUpIcon, XIcon } from './icons';
import { apiService } from '../services/apiService';

interface HouseManagerProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

const HouseManager: React.FC<HouseManagerProps> = ({
    currentUser,
    currentInstitution,
    onLogAction,
    onDataChange
}) => {
    const [houses, setHouses] = useState<BoardingHouseWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingHouse, setEditingHouse] = useState<BoardingHouse | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        gender: 'Boys' as HouseGender,
        capacity: 0,
        houseMasterId: '',
        status: 'Active' as HouseStatus,
        description: ''
    });

    useEffect(() => {
        loadHouses();
    }, [currentInstitution.id]);

    const loadHouses = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<BoardingHouseWithStats>('v_house_statistics', currentInstitution.id);
            setHouses(data || []);
            await onLogAction('Viewed boarding houses');
        } catch (error) {
            console.error('Error loading houses:', error);
            alert('Failed to load houses');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (house?: BoardingHouse) => {
        if (house) {
            setEditingHouse(house);
            setFormData({
                name: house.name,
                gender: house.gender,
                capacity: house.capacity,
                houseMasterId: house.houseMasterId || '',
                status: house.status,
                description: house.description || ''
            });
        } else {
            setEditingHouse(null);
            setFormData({
                name: '',
                gender: 'Boys',
                capacity: 0,
                houseMasterId: '',
                status: 'Active',
                description: ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingHouse(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            alert('Please enter a house name');
            return;
        }

        if (formData.capacity <= 0) {
            alert('Capacity must be greater than 0');
            return;
        }

        try {
            const payload = {
                ...formData,
                institutionId: currentInstitution.id,
                ...(editingHouse ? { id: editingHouse.id } : { id: `house_${Date.now()}` })
            };

            await apiService.saveModuleRecord('boarding_houses', payload);

            if (editingHouse) {
                await onLogAction(`Updated boarding house: ${formData.name}`);
                alert('House updated successfully!');
            } else {
                await onLogAction(`Created boarding house: ${formData.name}`);
                alert('House created successfully!');
            }

            handleCloseModal();
            loadHouses();
            onDataChange();
        } catch (error: any) {
            console.error('Error saving house:', error);
            alert(`Failed to save house: ${error.message || 'Unknown error'}`);
        }
    };

    const handleDelete = async (house: BoardingHouse) => {
        if (!confirm(`Are you sure you want to delete "${house.name}"? This will also delete all rooms and beds in this house.`)) {
            return;
        }

        try {
            await apiService.deleteModuleRecord('boarding_houses', house.id);

            await onLogAction(`Deleted boarding house: ${house.name}`);
            alert('House deleted successfully!');
            loadHouses();
            onDataChange();
        } catch (error: any) {
            console.error('Error deleting house:', error);
            alert(`Failed to delete house: ${error.message || 'Unknown error'}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading houses...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Boarding Houses</h2>
                    <p className="text-gray-600 mt-1">Manage boarding houses and dormitories</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add House
                </button>
            </div>

            {/* Houses Grid */}
            {houses.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <HomeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Boarding Houses Yet</h3>
                    <p className="text-gray-600 mb-6">Get started by creating your first boarding house</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Create First House
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {houses.map((house) => (
                        <div key={house.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                            {/* House Header */}
                            <div className={`p-4 ${house.gender === 'Boys' ? 'bg-blue-500' :
                                house.gender === 'Girls' ? 'bg-pink-500' :
                                    'bg-purple-500'
                                }`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white">{house.name}</h3>
                                        <p className="text-white/90 text-sm mt-1">{house.gender}</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${house.status === 'Active' ? 'bg-green-100 text-green-800' :
                                        house.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                                            'bg-orange-100 text-orange-800'
                                        }`}>
                                        {house.status}
                                    </div>
                                </div>
                            </div>

                            {/* House Stats */}
                            <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        <BedIcon className="w-4 h-4" />
                                        Total Beds
                                    </span>
                                    <span className="font-semibold text-gray-900">{house.totalBeds}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        <UsersIcon className="w-4 h-4" />
                                        Occupied
                                    </span>
                                    <span className="font-semibold text-gray-900">{house.occupiedBeds}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        <TrendingUpIcon className="w-4 h-4" />
                                        Occupancy
                                    </span>
                                    <span className="font-semibold text-gray-900">{house.occupancyPercentage}%</span>
                                </div>

                                {/* Progress Bar */}
                                <div className="pt-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${house.occupancyPercentage >= 90 ? 'bg-red-500' :
                                                house.occupancyPercentage >= 70 ? 'bg-yellow-500' :
                                                    'bg-green-500'
                                                }`}
                                            style={{ width: `${house.occupancyPercentage}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {house.description && (
                                    <p className="text-sm text-gray-600 pt-2 border-t">{house.description}</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-4 bg-gray-50 border-t flex gap-2">
                                <button
                                    onClick={() => handleOpenModal(house)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                >
                                    <Edit2Icon className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(house)}
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

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingHouse ? 'Edit Boarding House' : 'Add New Boarding House'}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    House Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., Phoenix House"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Gender *
                                    </label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as HouseGender })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="Boys">Boys</option>
                                        <option value="Girls">Girls</option>
                                        <option value="Mixed">Mixed</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Capacity *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.capacity}
                                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., 120"
                                        min="1"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as HouseStatus })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Under Maintenance">Under Maintenance</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="Optional description or notes about this house"
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    {editingHouse ? 'Update House' : 'Create House'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HouseManager;
