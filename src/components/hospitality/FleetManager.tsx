
import React, { useState, useEffect } from 'react';
import { 
    Truck, 
    User, 
    Plus, 
    Trash2, 
    Save, 
    CheckCircle, 
    Clock, 
    Calendar,
    Settings,
    Car,
    Activity,
    Users,
    Map
} from 'lucide-react';
import { HospitalityVehicle, HospitalityDriver, HospitalityDriveBooking, Institution } from '../../types';
import { apiService } from '../../services/apiService';

interface FleetManagerProps {
    institution: Institution;
}

const getDirectUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
        const idMatch = url.match(/\/d\/([^\/]+)/) || url.match(/id=([^\/&]+)/);
        if (idMatch && idMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
        }
    }
    return url;
};

export const FleetManager: React.FC<FleetManagerProps> = ({ institution }) => {
    const [vehicles, setVehicles] = useState<HospitalityVehicle[]>([]);
    const [drivers, setDrivers] = useState<HospitalityDriver[]>([]);
    const [bookings, setBookings] = useState<HospitalityDriveBooking[]>([]);
    const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers' | 'bookings'>('bookings');
    const [isAddingVehicle, setIsAddingVehicle] = useState(false);
    const [isAddingDriver, setIsAddingDriver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [newVehicle, setNewVehicle] = useState<Partial<HospitalityVehicle>>({
        type: '',
        plateNumber: '',
        capacity: 4,
        features: [],
        status: 'available'
    });

    const [newDriver, setNewDriver] = useState<Partial<HospitalityDriver>>({
        name: '',
        phone: '',
        licenseNumber: '',
        status: 'available'
    });

    const loadData = async () => {
        const [v, d, b] = await Promise.all([
            apiService.fetchModuleRecords<HospitalityVehicle>('hospitality_vehicles', institution.id),
            apiService.fetchModuleRecords<HospitalityDriver>('hospitality_drivers', institution.id),
            apiService.fetchModuleRecords<HospitalityDriveBooking>('hospitality_drive_bookings', institution.id)
        ]);
        setVehicles(v);
        setDrivers(d);
        setBookings(b);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const result = await apiService.uploadToGoogleDrive(file, institution.id);
            if (result.success) {
                setNewVehicle(prev => ({ ...prev, imageUrl: result.url }));
            }
        } catch (err) {
            console.error("Upload failed:", err);
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    useEffect(() => {
        loadData();
    }, [institution.id]);

    const handleSaveVehicle = async () => {
        const payload = {
            ...newVehicle,
            id: `veh_${Date.now()}`,
            institutionId: institution.id,
            features: typeof newVehicle.features === 'string' ? (newVehicle.features as string).split(',').map(f => f.trim()) : newVehicle.features
        };
        await apiService.saveModuleRecord('hospitality_vehicles', payload);
        setIsAddingVehicle(false);
        setNewVehicle({ type: '', plateNumber: '', capacity: 4, features: [], status: 'available' });
        loadData();
    };

    const handleSaveDriver = async () => {
        const payload = {
            ...newDriver,
            id: `drvr_${Date.now()}`,
            institutionId: institution.id
        };
        await apiService.saveModuleRecord('hospitality_drivers', payload);
        setIsAddingDriver(false);
        setNewDriver({ name: '', phone: '', licenseNumber: '', status: 'available' });
        loadData();
    };

    const updateBookingStatus = async (bookingId: string, status: HospitalityDriveBooking['status']) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
            await apiService.saveModuleRecord('hospitality_drive_bookings', { ...booking, status });
            loadData();
        }
    };

    const assignDriver = async (bookingId: string, driverId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
            await apiService.saveModuleRecord('hospitality_drive_bookings', { ...booking, driverId, status: 'confirmed' });
            loadData();
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex gap-2 bg-slate-50 dark:bg-slate-900 p-1 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    {[
                        { id: 'bookings', label: 'Drive Schedule', icon: Calendar },
                        { id: 'vehicles', label: 'Fleet Monitor', icon: Car },
                        { id: 'drivers', label: 'Driver Roster', icon: Users },
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setIsAddingDriver(true)} className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl active:scale-95 transition-all">
                        <Plus className="w-4 h-4" /> Add Driver
                    </button>
                    <button onClick={() => setIsAddingVehicle(true)} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all">
                        <Plus className="w-4 h-4" /> Add Vehicle
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px]">
                {activeTab === 'bookings' && (
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-8">
                            <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Active Excursions</h4>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                                    {bookings.filter(b => b.status === 'pending').length} Pending
                                </span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {bookings.length === 0 ? (
                                <div className="py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">
                                    <Map className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                    No drive bookings scheduled
                                </div>
                            ) : bookings.map(booking => (
                                <div key={booking.id} className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-transparent hover:border-indigo-100 transition-all">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex flex-col items-center justify-center">
                                        <p className="text-[10px] font-black">{booking.timeSlot}</p>
                                        <Clock className="w-5 h-5 mt-1" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{booking.guestName}</h5>
                                            <span className="text-[8px] font-black px-2 py-0.5 bg-slate-200 text-slate-500 rounded uppercase">Room {booking.roomNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" /> {vehicles.find(v => v.id === booking.vehicleId)?.type || 'Unknown Vehicle'}</span>
                                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {booking.date}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <select 
                                            value={booking.driverId || ''} 
                                            onChange={(e) => assignDriver(booking.id, e.target.value)}
                                            className="px-4 py-2 bg-white dark:bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 ring-indigo-500/50"
                                        >
                                            <option value="">Assign Driver</option>
                                            {drivers.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => updateBookingStatus(booking.id, 'completed')}
                                                className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-200 hover:scale-105 transition-all"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                                className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'vehicles' && (
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {vehicles.map(vehicle => (
                                <div key={vehicle.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform overflow-hidden">
                                            {vehicle.imageUrl ? (
                                                <img src={getDirectUrl(vehicle.imageUrl)} className="w-full h-full object-cover" alt={vehicle.type} />
                                            ) : (
                                                <Car className="w-6 h-6" />
                                            )}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                            vehicle.status === 'available' ? 'bg-emerald-50 text-emerald-600' : 
                                            vehicle.status === 'on-drive' ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'
                                        }`}>
                                            {vehicle.status}
                                        </span>
                                    </div>
                                    <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-lg leading-none mb-2">{vehicle.type}</h5>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{vehicle.plateNumber} • Cap: {vehicle.capacity}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {vehicle.features.map((f, i) => (
                                            <span key={i} className="px-2 py-1 bg-white/50 dark:bg-slate-800/50 rounded-lg text-[7px] font-black uppercase text-slate-400">{f}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'drivers' && (
                    <div className="p-8 overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-50 dark:border-slate-700">
                                    {['Driver Name', 'Phone', 'License', 'Status', ''].map(h => (
                                        <th key={h} className="text-left py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                {drivers.map(driver => (
                                    <tr key={driver.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs uppercase">
                                                    {driver.name.charAt(0)}
                                                </div>
                                                <p className="font-black text-slate-800 dark:text-white uppercase text-xs">{driver.name}</p>
                                            </div>
                                        </td>
                                        <td className="py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{driver.phone}</td>
                                        <td className="py-6 text-[10px] font-bold text-slate-400 font-mono">{driver.licenseNumber}</td>
                                        <td className="py-6">
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                driver.status === 'available' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                                {driver.status}
                                            </span>
                                        </td>
                                        <td className="py-6 text-right">
                                            <button className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            {isAddingVehicle && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsAddingVehicle(false)}></div>
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
                        <h4 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white mb-8">Register Vehicle</h4>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Vehicle Type</label>
                                    <input value={newVehicle.type} onChange={e => setNewVehicle({...newVehicle, type: e.target.value})} placeholder="e.g. Land Cruiser" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-black text-sm outline-none focus:ring-2 ring-indigo-500/50" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Plate Number</label>
                                    <input value={newVehicle.plateNumber} onChange={e => setNewVehicle({...newVehicle, plateNumber: e.target.value})} placeholder="KCB 123X" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-black text-sm outline-none focus:ring-2 ring-indigo-500/50" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Capacity</label>
                                    <input type="number" value={newVehicle.capacity} onChange={e => setNewVehicle({...newVehicle, capacity: parseInt(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-black text-sm outline-none focus:ring-2 ring-indigo-500/50" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Features (csv)</label>
                                    <input value={newVehicle.features} onChange={e => setNewVehicle({...newVehicle, features: e.target.value as any})} placeholder="Open roof, Fridge..." className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-black text-sm outline-none focus:ring-2 ring-indigo-500/50" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Vehicle Image</label>
                                <label className="flex items-center gap-4 cursor-pointer group p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-700 hover:border-indigo-600 transition-all">
                                    {newVehicle.imageUrl ? (
                                        <img src={getDirectUrl(newVehicle.imageUrl)} className="w-12 h-12 rounded-xl object-cover" alt="Vehicle" />
                                    ) : (
                                        <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-300">
                                            <Car className="w-6 h-6" />
                                        </div>
                                    )}
                                    <div className="flex-1 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-600">
                                        {isUploading ? 'Uploading...' : 'Upload to G-Drive'}
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                </label>
                            </div>
                            <button onClick={handleSaveVehicle} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all">
                                Complete Registration
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAddingDriver && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsAddingDriver(false)}></div>
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
                        <h4 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white mb-8">Add Driver</h4>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Full Name</label>
                                <input value={newDriver.name} onChange={e => setNewDriver({...newDriver, name: e.target.value})} placeholder="Driver Name" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-black text-sm outline-none focus:ring-2 ring-indigo-500/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Phone Number</label>
                                    <input value={newDriver.phone} onChange={e => setNewDriver({...newDriver, phone: e.target.value})} placeholder="07..." className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-black text-sm outline-none focus:ring-2 ring-indigo-500/50" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">License No.</label>
                                    <input value={newDriver.licenseNumber} onChange={e => setNewDriver({...newDriver, licenseNumber: e.target.value})} placeholder="DL-..." className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-black text-sm outline-none focus:ring-2 ring-indigo-500/50" />
                                </div>
                            </div>
                            <button onClick={handleSaveDriver} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-600 transition-all">
                                Save Driver Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


