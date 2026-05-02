
import React, { useState } from 'react';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { TruckIcon } from './icons/TruckIcon';
import { ArrowRightOnRectangleIcon } from './icons/ArrowRightOnRectangleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

import type { TransportVehicle, VehicleLog, User, Institution } from '../types';

interface SecurityGatePassViewProps {
    vehicles: TransportVehicle[];
    vehicleLogs: VehicleLog[];
    users: User[];
    currentUser: User;
    currentInstitution: Institution;
    onLogGateAction: (vehicleId: string, eventType: 'entry' | 'exit', notes?: string) => Promise<void>;
}

export const SecurityGatePassView: React.FC<SecurityGatePassViewProps> = ({
    vehicles, vehicleLogs, users, currentUser, currentInstitution, onLogGateAction
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [scanning, setScanning] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<TransportVehicle | null>(null);
    const [notes, setNotes] = useState('');

    const filteredVehicles = vehicles.filter(v =>
        v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAction = async (type: 'entry' | 'exit') => {
        if (!selectedVehicle) return;
        try {
            await onLogGateAction(selectedVehicle.id, type, notes);
            setSelectedVehicle(null);
            setNotes('');
            setSearchTerm('');
            alert(`Vehicle ${type} logged successfully.`);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const recentLogs = (vehicleLogs || [])
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-100 rounded-2xl">
                    <QrCodeIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Security Gate Access</h2>
                    <p className="text-sm text-slate-500 font-medium">Scan Vehicle QR or Search Plate Number</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Scanner / Search Area */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
                        <div className="relative mb-6">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => {
                                    setSearchTerm(e.target.value);
                                    if (e.target.value.length > 2) setSelectedVehicle(null);
                                }}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold"
                                placeholder="Enter Plate Number..."
                            />
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {searchTerm.length > 1 && filteredVehicles.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => { setSelectedVehicle(v); setSearchTerm(v.plateNumber); }}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedVehicle?.id === v.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent bg-slate-50 dark:bg-slate-900 active:scale-[0.98]'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <TruckIcon className={`w-8 h-8 ${v.vehicleType === 'school' ? 'text-blue-500' : 'text-purple-500'}`} />
                                        <div className="text-left">
                                            <p className="font-black text-xl text-slate-800 dark:text-white leading-none">{v.plateNumber}</p>
                                            <p className="text-xs text-slate-500 uppercase font-bold mt-1">{v.model}</p>
                                        </div>
                                    </div>
                                    <CheckCircleIcon className={`w-6 h-6 ${selectedVehicle?.id === v.id ? 'text-blue-500 opacity-100' : 'opacity-0'}`} />
                                </button>
                            ))}
                            {searchTerm.length > 1 && filteredVehicles.length === 0 && (
                                <div className="text-center py-8">
                                    <TruckIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-500 font-bold uppercase text-xs">Vehicle Not Found</p>
                                </div>
                            )}
                            {searchTerm.length <= 1 && (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                    <QrCodeIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-sm text-slate-500 px-8">Point camera at the vehicle QR code or type the plate number above.</p>
                                    <button
                                        onClick={() => setScanning(true)}
                                        className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                                    >
                                        Activate Scanner
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedVehicle && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white mb-4">Log Gate Event</h3>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Internal Notes / Observations</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows={2}
                                    placeholder="e.g. Broken tail light, 20 students onboard..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleAction('entry')}
                                    className="flex flex-col items-center justify-center p-6 bg-green-500 hover:bg-green-600 text-white rounded-2xl transition-all shadow-lg shadow-green-100 dark:shadow-none"
                                >
                                    <ArrowRightOnRectangleIcon className="w-8 h-8 rotate-180 mb-2" />
                                    <span className="font-black uppercase text-sm">Gate Entry</span>
                                </button>
                                <button
                                    onClick={() => handleAction('exit')}
                                    className="flex flex-col items-center justify-center p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-lg shadow-blue-100 dark:shadow-none"
                                >
                                    <ArrowRightOnRectangleIcon className="w-8 h-8 mb-2" />
                                    <span className="font-black uppercase text-sm">Gate Exit</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent History */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 h-fit">
                    <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white mb-6">Security Log (Recent)</h3>
                    <div className="space-y-4">
                        {recentLogs.map(log => {
                            const vehicle = vehicles.find(v => v.id === log.vehicleId);
                            const security = users.find(u => u.id === log.securityId);
                            return (
                                <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <div className={`p-3 rounded-full h-fit ${log.eventType === 'entry' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                        <ArrowRightOnRectangleIcon className={`w-5 h-5 ${log.eventType === 'entry' ? 'rotate-180' : ''}`} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="font-black text-slate-800 dark:text-white">{vehicle?.plateNumber || 'Unknown'}</p>
                                            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                                <ClockIcon className="w-3 h-3" />
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">{log.eventType === 'entry' ? 'Incoming' : 'Outgoing'} • {security?.name || 'Security'}</p>
                                        {log.notes && <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 italic">"{log.notes}"</p>}
                                    </div>
                                </div>
                            );
                        })}
                        {recentLogs.length === 0 && (
                            <div className="text-center py-12">
                                <ClockIcon className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                                <p className="text-slate-400 text-xs font-bold uppercase">No records today</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {scanning && (
                <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-lg text-center">
                        <div className="relative aspect-square bg-slate-800 rounded-3xl border-4 border-blue-500 overflow-hidden mb-8 shadow-[0_0_50px_rgba(59,130,246,0.5)]">
                            {/* In a real app we'd attach a scanner here. Simulation for agent task. */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
                                <QrCodeIcon className="w-32 h-32 text-blue-400/20 mb-4 animate-pulse" />
                                <p className="text-blue-400 font-bold uppercase text-xs tracking-widest mb-8">Accessing Camera...</p>
                                <div className="grid grid-cols-2 gap-4 w-full">
                                    <button
                                        onClick={() => {
                                            if (vehicles.length > 0) {
                                                const v = vehicles[0];
                                                setSelectedVehicle(v);
                                                setSearchTerm(v.plateNumber);
                                                setScanning(false);
                                            }
                                        }}
                                        className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl border border-white/20"
                                    >
                                        <p className="text-[10px] font-bold uppercase mb-1">Mock Scanner</p>
                                        <p className="text-xs font-black">Scan Detected</p>
                                    </button>
                                    <button
                                        onClick={() => setScanning(false)}
                                        className="bg-red-500/20 hover:bg-red-500/40 text-red-500 p-4 rounded-2xl border border-red-500/20"
                                    >
                                        <p className="text-[10px] font-bold uppercase mb-1">Abort</p>
                                        <p className="text-xs font-black">Exit</p>
                                    </button>
                                </div>
                            </div>
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_20px_#3b82f6] animate-[scan_3s_infinite]"></div>
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Align QR Code</h3>
                        <p className="text-slate-400 font-medium">Position the vehicle's gate pass within the frame</p>
                    </div>
                    <style>{`
                        @keyframes scan {
                            0% { transform: translateY(0); }
                            50% { transform: translateY(400px); }
                            100% { transform: translateY(0); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};

