
import React, { useState, useEffect } from 'react';
import {
    TruckIcon, PlusIcon, PencilIcon, TrashIcon,
    QrCodeIcon, UserIcon, CheckIcon, XIcon
} from './icons';
import type { Vehicle, User, Institution } from '../types';
import { apiService } from '../services/apiService';

interface TransportManagerProps {
    vehicles: Vehicle[];
    users: User[];
    currentInstitution: Institution;
    onAddVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
    onUpdateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<void>;
    onDeleteVehicle: (id: string) => Promise<void>;
}

export const TransportManager: React.FC<TransportManagerProps> = ({
    vehicles, users, currentInstitution,
    onAddVehicle, onUpdateVehicle, onDeleteVehicle
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<Vehicle, 'id' | 'institutionId'>>({
        plateNumber: '',
        model: '',
        vehicleType: 'school',
        capacity: 14,
        status: 'active'
    });
    const [showQrId, setShowQrId] = useState<string | null>(null);
    const [qrUrl, setQrUrl] = useState<string>('');

    const drivers = users.filter(u => u.role === 'driver' || u.roles?.includes('driver'));
    const assistants = users.filter(u => u.role === 'transport_assistant' || u.roles?.includes('transport_assistant'));

    useEffect(() => {
        if (showQrId) {
            const QRCodeLib = (window as any).QRCode;
            if (QRCodeLib) {
                const vehicle = vehicles.find(v => v.id === showQrId);
                if (vehicle) {
                    const data = JSON.stringify({
                        type: 'vehicle_gate_pass',
                        id: vehicle.id,
                        plate: vehicle.plateNumber,
                        inst: currentInstitution.id
                    });
                    QRCodeLib.toDataURL(data, { width: 512, margin: 2 }, (err: any, url: string) => {
                        if (!err) setQrUrl(url);
                    });
                }
            }
        } else {
            setQrUrl('');
        }
    }, [showQrId, vehicles, currentInstitution]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await onUpdateVehicle(editingId, formData);
                setEditingId(null);
            } else {
                await onAddVehicle({ ...formData, institutionId: currentInstitution.id } as any);
                setIsAdding(false);
            }
            setFormData({
                plateNumber: '',
                model: '',
                vehicleType: 'school',
                capacity: 14,
                status: 'active'
            });
        } catch (error: any) {
            alert(error.message);
        }
    };

    const startEdit = (v: Vehicle) => {
        setEditingId(v.id);
        setFormData({
            plateNumber: v.plateNumber,
            model: v.model,
            vehicleType: v.vehicleType,
            capacity: v.capacity,
            driverId: v.driverId,
            assistantId: v.assistantId,
            status: v.status
        });
        setIsAdding(true);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                    <TruckIcon className="w-8 h-8 text-blue-600" />
                    Transport Fleet Management
                </h2>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Register Vehicle
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">
                        {editingId ? 'Edit Vehicle Details' : 'Register New Vehicle'}
                    </h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Plate Number</label>
                            <input
                                required
                                value={formData.plateNumber}
                                onChange={e => setFormData({ ...formData, plateNumber: e.target.value })}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. KCA 123X"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Make & Model</label>
                            <input
                                required
                                value={formData.model}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Isuzu FRR"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Capacity (Seats)</label>
                            <input
                                type="number"
                                required
                                value={formData.capacity}
                                onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Vehicle Type</label>
                            <select
                                value={formData.vehicleType}
                                onChange={e => setFormData({ ...formData, vehicleType: e.target.value as any })}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="school">School Owned</option>
                                <option value="private">Private (Consourced)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Assigned Driver</label>
                            <select
                                value={formData.driverId || ''}
                                onChange={e => setFormData({ ...formData, driverId: e.target.value || undefined })}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Not Assigned</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Assigned Assistant</label>
                            <select
                                value={formData.assistantId || ''}
                                onChange={e => setFormData({ ...formData, assistantId: e.target.value || undefined })}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Not Assigned</option>
                                {assistants.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => { setIsAdding(false); setEditingId(null); }}
                                className="px-6 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                            >
                                {editingId ? 'Update Vehicle' : 'Register Vehicle'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vehicles.map(vehicle => (
                    <div key={vehicle.id} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`h-2 w-full ${vehicle.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${vehicle.vehicleType === 'school' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {vehicle.vehicleType}
                                    </span>
                                    <h4 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{vehicle.plateNumber}</h4>
                                    <p className="text-sm text-slate-500">{vehicle.model}</p>
                                </div>
                                <button
                                    onClick={() => setShowQrId(vehicle.id)}
                                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="View Gate Pass QR"
                                >
                                    <QrCodeIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <UserIcon className="w-4 h-4 text-blue-500" />
                                    <span>Driver: {users.find(u => u.id === vehicle.driverId)?.name || 'None'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <UserIcon className="w-4 h-4 text-purple-500" />
                                    <span>Assistant: {users.find(u => u.id === vehicle.assistantId)?.name || 'None'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <TruckIcon className="w-4 h-4 text-slate-400" />
                                    <span>Capacity: {vehicle.capacity} Students</span>
                                </div>
                            </div>

                            <div className="flex justify-center border-t border-slate-100 dark:border-slate-700 pt-4 gap-4">
                                <button
                                    onClick={() => startEdit(vehicle)}
                                    className="flex-1 flex items-center justify-center gap-2 text-sm text-blue-600 hover:bg-blue-50 py-2 rounded-lg transition-colors"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => { if (confirm('Delete this vehicle?')) onDeleteVehicle(vehicle.id) }}
                                    className="flex-1 flex items-center justify-center gap-2 text-sm text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {vehicles.length === 0 && !isAdding && (
                    <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <TruckIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">No vehicles registered yet</h3>
                        <p className="text-sm text-slate-500 mb-6">Start by adding your school buses or contracted private transport.</p>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                        >
                            Register First Vehicle
                        </button>
                    </div>
                )}
            </div>

            {showQrId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowQrId(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Vehicle Gate Pass</h3>
                                <button onClick={() => setShowQrId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-2xl mb-6 relative">
                                {qrUrl ? (
                                    <img src={qrUrl} alt="Gate Pass QR" className="mx-auto w-full max-w-[250px] mix-blend-multiply dark:mix-blend-normal" />
                                ) : (
                                    <div className="w-48 h-48 bg-slate-200 mx-auto animate-pulse flex items-center justify-center rounded-xl">Generating QR...</div>
                                )}
                                <div className="mt-6">
                                    <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white tracking-widest">
                                        {vehicles.find(v => v.id === showQrId)?.plateNumber}
                                    </p>
                                    <p className="text-sm text-slate-500 mt-1 uppercase tracking-tight">Official Transport QR Code</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={() => window.print()}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Print Pass
                                </button>
                                <button
                                    onClick={() => setShowQrId(null)}
                                    className="w-full border border-slate-200 dark:border-slate-700 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-6 uppercase tracking-widest font-bold">
                                Security Personnel must scan this code for entry or exit
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
