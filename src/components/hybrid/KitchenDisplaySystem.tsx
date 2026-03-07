import React, { useMemo } from 'react';
import type { RetailSale, User, Institution, CafeOrder } from '../../types';
import {
    ClockIcon, CheckCircleIcon,
    ArrowRightIcon
} from '../icons';

interface KitchenDisplaySystemProps {
    retailSales?: RetailSale[];
    cafeOrders?: CafeOrder[];
    onUpdateItemStatus: (orderId: string, itemId: string, newStatus: 'pending' | 'preparing' | 'ready' | 'delivered', source: 'retail' | 'cafe') => Promise<void>;
}

export const KitchenDisplaySystem: React.FC<KitchenDisplaySystemProps> = ({
    retailSales = [], cafeOrders = [], onUpdateItemStatus
}) => {
    // Flatten all items from both sources that have a kitchen status
    const foodItems = useMemo(() => {
        const items: Array<{
            orderId: string;
            itemId: string;
            name: string;
            quantity: number;
            status: 'pending' | 'preparing' | 'ready' | 'delivered';
            orderTime: string;
            ticketId?: string;
            source: 'retail' | 'cafe';
        }> = [];

        // 1. Add from retail sales
        retailSales.forEach(sale => {
            sale.items.forEach(item => {
                const isService = item.name.toLowerCase().includes('service package') ||
                    item.name.toLowerCase().includes('wash service');

                if (item.kitchenStatus && item.kitchenStatus !== 'delivered' && !isService) {
                    items.push({
                        orderId: sale.id,
                        itemId: item.itemId,
                        name: item.name,
                        quantity: item.quantity,
                        status: item.kitchenStatus,
                        orderTime: sale.createdAt,
                        ticketId: sale.id,
                        source: 'retail'
                    });
                }
            });
        });

        // 2. Add from dedicated cafe orders
        cafeOrders.forEach(order => {
            order.items.forEach(item => {
                const isService = item.name.toLowerCase().includes('service package') ||
                    item.name.toLowerCase().includes('wash service');

                if (item.kitchenStatus && item.kitchenStatus !== 'delivered' && !isService) {
                    items.push({
                        orderId: order.id,
                        itemId: item.itemId,
                        name: item.name,
                        quantity: item.quantity,
                        status: item.kitchenStatus,
                        orderTime: order.createdAt,
                        ticketId: order.id,
                        source: 'cafe'
                    });
                }
            });
        });

        // Sort by oldest first
        return items.sort((a, b) => new Date(a.orderTime).getTime() - new Date(b.orderTime).getTime());
    }, [retailSales, cafeOrders]);

    const pendingItems = foodItems.filter(i => i.status === 'pending');
    const preparingItems = foodItems.filter(i => i.status === 'preparing');
    const readyItems = foodItems.filter(i => i.status === 'ready');

    const renderColumn = (
        title: string,
        icon: React.ReactNode,
        items: typeof foodItems,
        colorClass: string,
        nextAction: { label: string, status: 'preparing' | 'ready' | 'delivered' } | null
    ) => (
        <div className={`flex flex-col h-full rounded-3xl border-2 ${colorClass} bg-white dark:bg-slate-800 p-4`}>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-inherit/30">
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    {icon} {title}
                </h3>
                <span className="w-8 h-8 rounded-full bg-inherit flex items-center justify-center font-black text-sm">
                    {items.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                        {icon}
                        <p className="mt-2 text-sm font-bold uppercase tracking-widest">No Items</p>
                    </div>
                ) : (
                    items.map((item, idx) => {
                        const minsWaiting = Math.floor((new Date().getTime() - new Date(item.orderTime).getTime()) / 60000);
                        return (
                            <div key={`${item.orderId}-${item.itemId}-${idx}`} className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] font-black tracking-widest uppercase">
                                        Ticket #{item.ticketId?.slice(-4)}
                                    </span>
                                    <span className={`text-xs font-bold flex items-center gap-1 ${minsWaiting > 15 ? 'text-red-500' : 'text-slate-500'}`}>
                                        <ClockIcon className="w-3 h-3" /> {minsWaiting}m
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg font-black">
                                        {item.quantity}x
                                    </div>
                                    <p className="font-bold text-slate-800 dark:text-white leading-tight flex-1">
                                        {item.name}
                                    </p>
                                </div>
                                {nextAction && (
                                    <button
                                        onClick={() => onUpdateItemStatus(item.orderId, item.itemId, nextAction.status, item.source)}
                                        className="w-full mt-4 py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-inherit font-black text-[10px] uppercase tracking-widest hover:bg-inherit hover:text-white transition-all flex justify-center items-center gap-2 group"
                                    >
                                        {nextAction.label}
                                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-8rem)] bg-slate-100 dark:bg-slate-900 p-6 rounded-3xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                {renderColumn(
                    'Incoming',
                    <ClockIcon className="w-6 h-6" />,
                    pendingItems,
                    'border-slate-300 text-slate-800 dark:border-slate-600 dark:text-slate-200',
                    { label: 'Start Preparing', status: 'preparing' }
                )}

                {renderColumn(
                    'Preparing',
                    <span className="text-2xl">🔥</span>,
                    preparingItems,
                    'border-orange-300 text-orange-600 dark:border-orange-500/50 dark:text-orange-400',
                    { label: 'Mark as Ready', status: 'ready' }
                )}

                {renderColumn(
                    'Ready / Pickup',
                    <CheckCircleIcon className="w-6 h-6" />,
                    readyItems,
                    'border-emerald-300 text-emerald-600 dark:border-emerald-500/50 dark:text-emerald-400',
                    { label: 'Handed to Customer', status: 'delivered' }
                )}
            </div>
        </div>
    );
};
