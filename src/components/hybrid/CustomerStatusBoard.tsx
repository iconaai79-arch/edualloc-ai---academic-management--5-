import React from 'react';
import type { CarWashJob, RetailSale } from '../../types';
import { TruckIcon } from '../icons/TruckIcon';
import { ShoppingCartIcon } from '../icons/ShoppingCartIcon';


interface CustomerStatusBoardProps {
    carWashJobs: CarWashJob[];
    retailSales: RetailSale[];
}

export const CustomerStatusBoard: React.FC<CustomerStatusBoardProps> = ({
    carWashJobs, retailSales
}) => {
    // Active jobs only for the board — completed/cancelled jobs (checked-out) are excluded
    const activeJobs = carWashJobs.filter(
        job => job.status === 'in_progress' || job.status === 'queued' || job.status === 'ready'
    );

    // Food orders that are preparing or ready
    const foodOrders: Array<{ ticketId: string, status: 'preparing' | 'ready' }> = [];
    retailSales.forEach(sale => {
        let hasPreparing = false;
        let hasReady = false;
        let allDelivered = true;
        let hasFood = false;

        sale.items.forEach(item => {
            if (item.kitchenStatus) {
                hasFood = true;
                if (item.kitchenStatus === 'preparing') hasPreparing = true;
                if (item.kitchenStatus === 'ready') hasReady = true;
                if (item.kitchenStatus !== 'delivered') allDelivered = false;
            }
        });

        if (hasFood && !allDelivered) {
            foodOrders.push({
                ticketId: sale.unifiedTabId || sale.id,
                status: hasReady ? 'ready' : (hasPreparing ? 'preparing' : 'preparing') // simplify to two states for TV
            });
        }
    });

    const renderJobStatus = (status: string) => {
        switch (status) {
            case 'queued': return <span className="text-slate-400">Waiting</span>;
            case 'in_progress': return <span className="text-blue-400 animate-pulse">Washing...</span>;
            case 'ready':
            case 'completed': return <span className="text-emerald-400 font-extrabold">READY</span>;
            default: return <span className="text-slate-500">{status}</span>;
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] bg-slate-950 p-6 rounded-3xl text-white overflow-hidden flex flex-col">
            <div className="text-center mb-8">
                <h1 className="text-5xl font-black uppercase tracking-widest bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                    Live Status Board
                </h1>
                <p className="text-slate-400 font-bold tracking-widest mt-2 uppercase">Please watch the screen for your order</p>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Vehicle Column */}
                <div className="flex flex-col border-r border-slate-800 pr-12">
                    <h2 className="text-3xl font-black mb-8 flex items-center gap-4 text-slate-300">
                        <TruckIcon className="w-10 h-10 text-blue-500" />
                        VEHICLES
                    </h2>

                    <div className="flex-1 space-y-4">
                        {activeJobs.map(job => (
                            <div key={job.id} className="flex justify-between items-center py-4 border-b border-slate-800/50">
                                <span className="text-4xl font-black tracking-tighter uppercase">
                                    {job.vehiclePlate}
                                </span>
                                <span className="text-3xl font-bold uppercase tracking-widest">
                                    {renderJobStatus(job.status)}
                                </span>
                            </div>
                        ))}
                        {activeJobs.length === 0 && (
                            <div className="py-12 text-center text-slate-600 font-black text-2xl uppercase tracking-widest">
                                No Vehicles in Queue
                            </div>
                        )}
                    </div>
                </div>

                {/* Cafe Column */}
                <div className="flex flex-col pl-4">
                    <h2 className="text-3xl font-black mb-8 flex items-center gap-4 text-slate-300">
                        <ShoppingCartIcon className="w-10 h-10 text-orange-500" />
                        CAFE ORDERS
                    </h2>

                    <div className="flex-1 space-y-4">
                        {foodOrders.map(order => (
                            <div key={order.ticketId} className="flex justify-between items-center py-4 border-b border-slate-800/50">
                                <span className="text-4xl font-black tracking-tighter uppercase text-slate-300">
                                    #{order.ticketId.slice(-4)}
                                </span>
                                <span className={`text-3xl font-bold uppercase tracking-widest ${order.status === 'ready'
                                    ? 'text-orange-400 font-extrabold animate-pulse'
                                    : 'text-slate-500'
                                    }`}>
                                    {order.status === 'ready' ? 'READY FOR PICKUP' : 'PREPARING...'}
                                </span>
                            </div>
                        ))}
                        {foodOrders.length === 0 && (
                            <div className="py-12 text-center text-slate-600 font-black text-2xl uppercase tracking-widest">
                                No active cafe orders
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
