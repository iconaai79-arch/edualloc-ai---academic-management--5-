import React, { useState, useEffect } from 'react';
import type { User, Institution, Vehicle, RepairOrder, ServiceJobItem, DigitalInspectionItem, MpesaTransaction, Invoice } from '../../types';
import { WrenchIcon } from '../icons/WrenchIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { ChatBubbleLeftRightIcon } from '../icons/ChatBubbleLeftRightIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { Cog8ToothIcon } from '../icons/Cog8ToothIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { TruckIcon } from '../icons/TruckIcon';

import { CarServiceDashboard } from './CarServiceDashboard';
import { RepairOrderManager } from './RepairOrderManager';
import { DigitalInspectionManager } from './DigitalInspectionManager';
import { CarServiceCRM } from './CarServiceCRM';
import { VehicleManager } from './VehicleManager';
import { apiService } from '../../services/apiService';

interface CarServiceViewProps {
    currentUser: User;
    currentInstitution: Institution;
    users: User[];
    onLogAction: (action: string) => Promise<void>;
}

export const CarServiceView: React.FC<CarServiceViewProps> = ({
    currentUser, currentInstitution, users, onLogAction
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'vehicles' | 'repair_orders' | 'inspections' | 'crm'>('dashboard');

    // Local State for Data loaded from Backend API
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([]);
    const [inspections, setInspections] = useState<any[]>([]); // Any for now until type structure expanded if needed
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [currentInstitution.id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedVehicles, fetchedROs] = await Promise.all([
                apiService.fetchModuleRecords<Vehicle>('cs_vehicles', currentInstitution.id),
                apiService.fetchModuleRecords<RepairOrder>('repair_orders', currentInstitution.id)
            ]);
            setVehicles(fetchedVehicles);
            setRepairOrders(fetchedROs);
        } catch (error) {
            console.error("Failed to load Car Service data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
        { id: 'vehicles', label: 'Vehicle DB', icon: TruckIcon },
        { id: 'repair_orders', label: 'Repair Orders', icon: WrenchIcon },
        { id: 'inspections', label: 'Inspections (DVI)', icon: ClipboardListIcon },
        { id: 'crm', label: 'Customer CRM', icon: PhoneIcon }
    ] as const;

    return (
        <div className="space-y-6 animate-fade-in pb-24">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-400/30 backdrop-blur-md">
                        <WrenchIcon className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Service Center</h1>
                        <p className="text-blue-300/80 text-xs font-bold uppercase tracking-widest mt-1">Car Repair & Maintenance Hub</p>
                    </div>
                </div>

                {/* Quick Actions / Clock */}
                <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
                    <button className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2">
                        <PlusIcon className="w-4 h-4" /> New R.O
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1.5 rounded-2xl overflow-x-auto no-scrollbar border border-slate-200 dark:border-slate-800">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap min-w-fit ${isActive ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-100 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/30 dark:hover:bg-slate-800/30'}`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'opacity-70'}`} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Main Content Area */}
            <div className="min-h-[500px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Loading Records...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'dashboard' && (
                            <CarServiceDashboard
                                vehicles={vehicles}
                                repairOrders={repairOrders}
                                onNavigate={(tab) => setActiveTab(tab as any)}
                            />
                        )}
                        {activeTab === 'repair_orders' && (
                            <RepairOrderManager
                                vehicles={vehicles}
                                repairOrders={repairOrders}
                                users={users}
                                currentUser={currentUser}
                                currentInstitution={currentInstitution}
                                onLogAction={onLogAction}
                                onDataChange={loadData}
                            />
                        )}
                        {activeTab === 'vehicles' && <VehicleManager vehicles={vehicles} />}
                        {activeTab === 'inspections' && <DigitalInspectionManager />}
                        {activeTab === 'crm' && <CarServiceCRM users={users} />}
                    </>
                )}
            </div>
        </div>
    );
};

