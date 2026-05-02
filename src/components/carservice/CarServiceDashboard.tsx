import React from 'react';
import type { Vehicle, RepairOrder } from '../../types';
import { WrenchIcon } from '../icons/WrenchIcon';
import { CurrencyIcon } from '../icons/CurrencyIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { ArrowTrendingUpIcon } from '../icons/ArrowTrendingUpIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';


interface CarServiceDashboardProps {
    vehicles: Vehicle[];
    repairOrders: RepairOrder[];
    onNavigate: (tab: string) => void;
}

export const CarServiceDashboard: React.FC<CarServiceDashboardProps> = ({
    vehicles, repairOrders, onNavigate
}) => {
    // Basic Calculations
    const activeROs = repairOrders.filter(ro => ro.status !== 'completed' && ro.status !== 'invoiced' && ro.status !== 'cancelled');
    const totalROs = repairOrders.length;
    const completedROs = repairOrders.filter(ro => ro.status === 'completed' || ro.status === 'invoiced');

    // Revenue Estimate (Sum of totalAmount for paid/invoiced, or all)
    const totalRevenue = completedROs.reduce((sum, ro) => sum + (ro.totalAmount || 0), 0);

    // Average Ticket Size
    const avgTicket = completedROs.length > 0 ? totalRevenue / completedROs.length : 0;

    return (
        <div className="space-y-6">
            {/* KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
                    <div>
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Active Repair Orders</p>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white">{activeROs.length}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <WrenchIcon className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
                    <div>
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Service Revenue</p>
                        <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                            KES {(totalRevenue / 1000).toFixed(1)}k
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowTrendingUpIcon className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-purple-200 transition-colors">
                    <div>
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Avg Ticket Size</p>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white">
                            KES {(avgTicket).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CurrencyIcon className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-colors">
                    <div>
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Vehicle Database</p>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white">{vehicles.length}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UserGroupIcon className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Split Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Active Jobs Pane */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Shop Floor Status</h3>
                        <button onClick={() => onNavigate('repair_orders')} className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest">View All</button>
                    </div>

                    <div className="space-y-4">
                        {activeROs.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                <CheckCircleIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No active jobs</p>
                            </div>
                        ) : (
                            activeROs.slice(0, 5).map(ro => {
                                const vehicle = vehicles.find(v => v.id === ro.vehicleId);
                                return (
                                    <div key={ro.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:border-blue-200 transition-all cursor-pointer">
                                        <div className="flex items-center gap-4 mb-2 sm:mb-0">
                                            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm hidden sm:block">
                                                <WrenchIcon className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-slate-800 dark:text-white uppercase">{vehicle?.licensePlate || 'Unknown Plate'}</p>
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black uppercase">RO #{ro.id.slice(-6)}</span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-500">{vehicle?.make} {vehicle?.model} • {vehicle?.year}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-none border-slate-200">
                                            <div className="text-left sm:text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Amount</p>
                                                <p className="font-bold text-slate-800 dark:text-white">KES {ro.estimatedTotal || 0}</p>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-widest ${ro.status !== 'completed' && ro.status !== 'invoiced' ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-600'
                                                    }`}>
                                                    {ro.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Approvals/Parts Widget */}
                <div className="bg-slate-900 rounded-3xl shadow-xl p-6 relative overflow-hidden text-white flex flex-col justify-between">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl"></div>

                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <ClockIcon className="w-6 h-6 text-orange-400" />
                            <h3 className="text-lg font-black uppercase tracking-tight text-white">Pending Action</h3>
                        </div>

                        <div className="space-y-4">
                            {/* Dummy data for visual design completion */}
                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Customer Approval</p>
                                <p className="font-black text-white">KCJ 482Y - Brake Pads</p>
                                <button className="mt-3 w-full py-2 bg-orange-500 hover:bg-orange-600 transition-colors text-white font-black text-[10px] uppercase tracking-widest rounded-lg">Notify Customer</button>
                            </div>

                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Parts Ordering</p>
                                <p className="font-black text-white">KDK 992P - Alternator</p>
                                <button className="mt-3 w-full py-2 bg-blue-500 hover:bg-blue-600 transition-colors text-white font-black text-[10px] uppercase tracking-widest rounded-lg">Order Parts</button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-white/10">
                        <button
                            onClick={() => onNavigate('inspections')}
                            className="w-full text-center text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                            Open Digital Inspections <ArrowTrendingUpIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

