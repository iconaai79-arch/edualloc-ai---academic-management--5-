import React, { useState } from 'react';

interface FleetVehicle {
    id: string;
    vehicleReg: string;
    vehicleType: 'SCHOOL_BUS' | 'DELIVERY_MOTORBIKE' | 'VAN';
    driverName: string;
    currentOdometerKm: number;
    nextOilServiceKm: number;
    tireConditionPct: number;
    insuranceExpiryDate: string;
    status: 'SERVICE_DUE' | 'GOOD' | 'IN_REPAIR';
}

export const FleetMaintenanceTracker: React.FC = () => {
    const [vehicles, setVehicles] = useState<FleetVehicle[]>([
        { id: 'veh_1', vehicleReg: 'KDA 489X', vehicleType: 'SCHOOL_BUS', driverName: 'Peter Kamau', currentOdometerKm: 148500, nextOilServiceKm: 150000, tireConditionPct: 85, insuranceExpiryDate: '2026-11-30', status: 'GOOD' },
        { id: 'veh_2', vehicleReg: 'KMC 112B', vehicleType: 'DELIVERY_MOTORBIKE', driverName: 'John Oduor', currentOdometerKm: 42300, nextOilServiceKm: 42000, tireConditionPct: 40, insuranceExpiryDate: '2026-09-15', status: 'SERVICE_DUE' },
        { id: 'veh_3', vehicleReg: 'KDD 741Z', vehicleType: 'VAN', driverName: 'Francis Mwangi', currentOdometerKm: 89000, nextOilServiceKm: 95000, tireConditionPct: 90, insuranceExpiryDate: '2027-01-15', status: 'GOOD' },
    ]);

    const markServiceDone = (id: string) => {
        setVehicles(prev => prev.map(v => v.id === id ? {
            ...v,
            nextOilServiceKm: v.currentOdometerKm + 5000,
            status: 'GOOD'
        } : v));
        alert('🔧 Vehicle Oil & Filter Service Logged Successfully!');
    };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border border-amber-500/30 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-black rounded-full border border-amber-500/30 uppercase tracking-wider">
                        Fleet Transport & Logistics Management
                    </span>
                    <h2 className="text-3xl font-black italic mt-2">Fleet Maintenance & Mileage Service Tracker</h2>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Oil change alerts, tire wear logs, insurance renewal dates, and fuel usage for school buses & motorcycles
                    </p>
                </div>
            </div>

            {/* Fleet Table */}
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl text-white">
                <h3 className="text-sm font-black uppercase tracking-widest text-amber-400 italic">
                    ACTIVE INSTITUTIONAL FLEET MAINTENANCE LEDGER
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <th className="py-4">Vehicle Reg & Type</th>
                                <th className="py-4">Driver</th>
                                <th className="py-4 font-mono">Current Mileage</th>
                                <th className="py-4 font-mono">Next Oil Service</th>
                                <th className="py-4 font-mono">Tire Health</th>
                                <th className="py-4">Insurance Expiry</th>
                                <th className="py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vehicles.map(v => (
                                <tr key={v.id} className="border-b border-slate-800/60">
                                    <td className="py-4 font-black italic text-sm">
                                        {v.vehicleReg}
                                        <div className="text-[10px] text-amber-400 font-bold">{v.vehicleType.replace('_', ' ')}</div>
                                    </td>
                                    <td className="py-4 text-xs font-bold text-slate-300">{v.driverName}</td>
                                    <td className="py-4 font-mono font-bold text-xs text-indigo-300">{v.currentOdometerKm.toLocaleString()} KM</td>
                                    <td className="py-4 font-mono font-bold text-xs text-rose-400">{v.nextOilServiceKm.toLocaleString()} KM</td>
                                    <td className="py-4 text-xs font-mono font-bold text-emerald-400">{v.tireConditionPct}% Health</td>
                                    <td className="py-4 text-xs font-bold text-slate-300">{v.insuranceExpiryDate}</td>
                                    <td className="py-4 text-right">
                                        <button
                                            onClick={() => markServiceDone(v.id)}
                                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                        >
                                            🔧 Log Service Done
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
