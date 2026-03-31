import React, { useState } from 'react';
import type { Vehicle } from '../../types';
import { TruckIcon } from '../icons/TruckIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { PencilIcon } from '../icons/PencilIcon';


interface VehicleManagerProps {
    vehicles: Vehicle[];
}

export const VehicleManager: React.FC<VehicleManagerProps> = ({ vehicles }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredVehicles = vehicles.filter(v =>
        v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.vin.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="relative flex-1 md:max-w-md w-full">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search By Plate, VIN, Make, Model..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-sm outline-none transition-all"
                    />
                </div>
                <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <PlusIcon className="w-5 h-5" /> Add Vehicle
                </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/20 dark:bg-slate-900/20">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Plate / VIN</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Make & Model</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Year</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Color</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredVehicles.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    <TruckIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <span className="font-bold uppercase text-xs">No Vehicles Found</span>
                                </td>
                            </tr>
                        ) : (
                            filteredVehicles.map(vehicle => (
                                <tr key={vehicle.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="font-black text-slate-900 dark:text-white uppercase">{vehicle.licensePlate}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-widest">{vehicle.vin}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800 dark:text-slate-200">{vehicle.make}</p>
                                        <p className="text-xs text-slate-500">{vehicle.model}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {vehicle.year}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border border-slate-300 shadow-inner" style={{ backgroundColor: (vehicle.color || 'grey').toLowerCase() }}></div>
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">{vehicle.color}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit Vehicle">
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
