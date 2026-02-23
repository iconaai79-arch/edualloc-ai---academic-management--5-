
import React, { useState, useEffect } from 'react';
import {
    TruckIcon, UserIcon, CheckCircleIcon,
    ArrowPathIcon, PhoneIcon, MapPinIcon
} from './icons';
import type { Vehicle, TransportOnboarding, User, Institution } from '../types';

interface TransportOnboardingViewProps {
    vehicles: Vehicle[];
    onboardingRecords: TransportOnboarding[];
    users: User[];
    currentUser: User;
    currentInstitution: Institution;
    onOnboardStudent: (studentId: string, vehicleId: string, direction: 'to_school' | 'from_school', lat?: number, lng?: number) => Promise<void>;
    onOffboardStudent: (recordId: string, lat?: number, lng?: number) => Promise<void>;
}

export const TransportOnboardingView: React.FC<TransportOnboardingViewProps> = ({
    vehicles, onboardingRecords, users, currentUser, currentInstitution,
    onOnboardStudent, onOffboardStudent
}) => {
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [direction, setDirection] = useState<'to_school' | 'from_school'>('from_school');

    // Get my assigned vehicle if any
    useEffect(() => {
        const myVehicle = vehicles.find(v => v.driverId === currentUser.id || v.assistantId === currentUser.id);
        if (myVehicle) setSelectedVehicleId(myVehicle.id);
    }, [vehicles, currentUser]);

    // Update location periodically
    useEffect(() => {
        if (!navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.warn('Location tracking blocked:', err),
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const students = users.filter(u => u.role === 'student');
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.staffId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeRecords = onboardingRecords.filter(r =>
        r.vehicleId === selectedVehicleId &&
        r.direction === direction &&
        (r.status === 'onboarded' || r.status === 'offboarded')
    );

    const handleOnboard = async (studentId: string) => {
        if (!selectedVehicleId) return alert('Please select a vehicle first.');
        try {
            await onOnboardStudent(studentId, selectedVehicleId, direction, location?.lat, location?.lng);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleOffboard = async (recordId: string) => {
        try {
            await onOffboardStudent(recordId, location?.lat, location?.lng);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const vehicle = vehicles.find(v => v.id === selectedVehicleId);

    return (
        <div className="p-4 max-w-2xl mx-auto pb-24">
            <div className="flex items-center justify-between mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                        <TruckIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Active Route</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Driver/Assistant View</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${location ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{location ? 'Live tracking ON' : 'GPS Offline'}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Select Active Vehicle</label>
                    <select
                        value={selectedVehicleId}
                        onChange={e => setSelectedVehicleId(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 font-bold text-slate-800 dark:text-white shadow-sm outline-none focus:border-blue-500 transition-colors"
                    >
                        <option value="">Choose Vehicle...</option>
                        {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.plateNumber} ({v.model})</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={() => setDirection('to_school')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${direction === 'to_school' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-transparent bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                >
                    <span className="text-xl font-black">Morning</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">To School</span>
                </button>
                <button
                    onClick={() => setDirection('from_school')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${direction === 'from_school' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'border-transparent bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                >
                    <span className="text-xl font-black">Evening</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">To Home</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden mb-6 border border-slate-100 dark:border-slate-700">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border-none outline-none text-sm font-bold"
                            placeholder="Find student to onboard..."
                        />
                    </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {searchTerm.length > 0 && filteredStudents.map(student => {
                        const isAlreadyOnboarded = activeRecords.some(r => r.studentId === student.id && r.status === 'onboarded');
                        return (
                            <div key={student.id} className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-700/50 last:border-none">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                        <UserIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-white leading-tight">{student.name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-black">{student.staffId || 'No ID'}</p>
                                    </div>
                                </div>
                                {!isAlreadyOnboarded ? (
                                    <button
                                        onClick={() => handleOnboard(student.id)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-all shadow-md active:scale-95"
                                    >
                                        <TruckIcon className="w-6 h-6" />
                                    </button>
                                ) : (
                                    <div className="text-green-500 font-black uppercase text-[10px] flex items-center gap-1">
                                        <CheckCircleIcon className="w-4 h-4" />
                                        In Transit
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest ml-2 mb-2">Manifest ({activeRecords.length} Students)</h3>
                {activeRecords.map(record => {
                    const student = users.find(u => u.id === record.studentId);
                    return (
                        <div key={record.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${record.status === 'onboarded' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                    <UserIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 dark:text-white">{student?.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${record.status === 'onboarded' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'}`}>
                                            {record.status}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                            <MapPinIcon className="w-3 h-3 text-red-400" />
                                            Live Track Active
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleOffboard(record.id)}
                                className={`px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${record.status === 'onboarded' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                            >
                                Release
                            </button>
                        </div>
                    );
                })}
                {activeRecords.length === 0 && searchTerm.length === 0 && (
                    <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <ArrowPathIcon className="w-10 h-10 text-slate-200 mx-auto mb-2 animate-spin-slow" />
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Waiting for Onboarding</p>
                    </div>
                )}
            </div>

            {/* Bottom Floating Nav Simulation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 flex justify-between items-center text-white shadow-2xl z-40 border border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black">
                        {vehicle?.plateNumber.split(' ')[1] || '??'}
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-blue-400">Route Status</p>
                        <p className="text-xs font-bold">{direction === 'to_school' ? 'Driving to School' : 'Heading Home'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                        <PhoneIcon className="w-5 h-5" />
                    </button>
                    <button className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                        <MapPinIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    );
};
