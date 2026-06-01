import React, { useState } from 'react';
import type { Vehicle, RepairOrder, User, Institution } from '../../types';
import { WrenchIcon } from '../icons/WrenchIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { XIcon } from '../icons/XIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';


interface RepairOrderManagerProps {
    vehicles: Vehicle[];
    repairOrders: RepairOrder[];
    users: User[];
    currentUser: User;
    currentInstitution: Institution;
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => Promise<void>;
}

export const RepairOrderManager: React.FC<RepairOrderManagerProps> = ({
    vehicles, repairOrders, users, currentUser, currentInstitution, onLogAction, onDataChange
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | RepairOrder['status']>('all');

    const filteredROs = repairOrders.filter(ro => {
        const vehicle = vehicles.find(v => v.id === ro.vehicleId);
        const matchesSearch =
            ro.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle?.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle?.make.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || ro.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-slate-100 text-slate-600';
            case 'in_progress': return 'bg-blue-100 text-blue-700';
            case 'completed': return 'bg-emerald-100 text-emerald-700';
            case 'invoiced': return 'bg-purple-100 text-purple-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[700px]">
            {/* Header / Toolbar */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search RO# or Plate..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-sm outline-none transition-all"
                        />
                    </div>
                    <div className="relative hidden sm:block">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="appearance-none pl-4 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="estimate">Estimate</option>
                            <option value="approved">Approved</option>
                            <option value="waiting_on_parts">Waiting on Parts</option>
                            <option value="ready">Ready</option>
                            <option value="completed">Completed</option>
                            <option value="invoiced">Invoiced</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none border-t-2 border-r-2 border-slate-400 rotate-[135deg] origin-center -translate-x-1" />
                    </div>
                </div>

                <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <PlusIcon className="w-5 h-5" /> Create R.O
                </button>
            </div>

            {/* RO List Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20 dark:bg-slate-900/20">
                {filteredROs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <DocumentTextIcon className="w-16 h-16 text-slate-200 mb-4" />
                        <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white">No Repair Orders Found</h3>
                        <p className="text-slate-400 text-sm font-medium mt-1">Try adjusting your search criteria</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {filteredROs.map(ro => {
                            const vehicle = vehicles.find(v => v.id === ro.vehicleId);
                            const customer = users.find(u => u.id === ro.customerId);
                            const advisor = users.find(u => u.id === ro.serviceAdvisorId);

                            return (
                                <div key={ro.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:border-blue-300 dark:hover:border-blue-600 transition-all group flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">RO #{ro.id.slice(-6)}</h4>
                                                <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-widest ${getStatusStyle(ro.status)}`}>
                                                    {ro.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-500">Date IN: {new Date(ro.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-slate-900 dark:text-white">KES {((ro.estimatedTotal || 0))?.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 flex-1 mb-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Customer</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{customer?.name || 'Walk-in'}</p>
                                            <p className="text-xs text-slate-500">{customer?.phoneNumber || 'No phone'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Vehicle</p>
                                            <p className="text-sm font-bold text-blue-600 uppercase">{vehicle?.licensePlate || 'N/A'}</p>
                                            <p className="text-xs text-slate-500">{vehicle?.make} {vehicle?.model}</p>
                                        </div>
                                    </div>

                                    <div className="mt-auto flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                            <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-300">
                                                {advisor?.name.charAt(0) || 'A'}
                                            </span>
                                            {advisor?.name || 'No Advisor Assigned'}
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit Repair Order">
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

