
import React, { useState, useMemo } from 'react';
import { 
    Truck, 
    Package, 
    MapPin, 
    ShieldCheck, 
    Navigation, 
    Signature, 
    Camera, 
    Calendar, 
    BarChart3, 
    Plus, 
    Search, 
    MoreHorizontal,
    ArrowRight,
    Fuel,
    AlertCircle,
    User,
    CheckCircle2,
    Clock
} from 'lucide-react';
import type { Institution, User as UserType } from '../types';

interface Shipment {
    id: string;
    trackingId: string;
    origin: string;
    destination: string;
    status: 'pending' | 'in_transit' | 'delivered' | 'delayed';
    clientName: string;
    weight: string;
    driverId: string;
    eta: string;
    proofOfDelivery?: {
        signatureUrl?: string;
        photoUrl?: string;
        timestamp: string;
        receiverName: string;
    }
}

interface LogisticsManagerProps {
    currentInstitution: Institution;
    users: UserType[];
}

export const LogisticsManager: React.FC<LogisticsManagerProps> = ({ currentInstitution, users }) => {
    const [activeTab, setActiveTab] = useState<'manifest' | 'fleet' | 'analytics' | 'epod'>('manifest');
    const [searchTerm, setSearchTerm] = useState('');

    const drivers = useMemo(() => users.filter(u => u.role === 'driver'), [users]);

    const shipments: Shipment[] = [
        { 
            id: '1', 
            trackingId: 'LOG-7729-KE', 
            origin: 'Mombasa Port', 
            destination: 'Nairobi ICD', 
            status: 'in_transit', 
            clientName: 'Global Retail Ltd', 
            weight: '12.5 Tons', 
            driverId: drivers[0]?.id || 'dr_1', 
            eta: '2024-10-22 14:00' 
        },
        { 
            id: '2', 
            trackingId: 'LOG-8114-UG', 
            origin: 'Nairobi', 
            destination: 'Kampala', 
            status: 'pending', 
            clientName: 'Eco-Builders NGO', 
            weight: '4.2 Tons', 
            driverId: drivers[1]?.id || 'dr_2', 
            eta: '2024-10-24 10:00' 
        },
        { 
            id: '3', 
            trackingId: 'LOG-9912-KE', 
            origin: 'Kisumu', 
            destination: 'Eldoret', 
            status: 'delivered', 
            clientName: 'Prime Distributors', 
            weight: '2.8 Tons', 
            driverId: drivers[0]?.id || 'dr_1', 
            eta: '2024-10-21 09:30',
            proofOfDelivery: {
                receiverName: 'Samuel Kamau',
                timestamp: '2024-10-21 09:45'
            }
        }
    ];

    const filteredShipments = shipments.filter(s => 
        s.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = [
        { label: 'Active Shipments', value: '24', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Idle Fleet', value: '3', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Fuel Efficiency', value: '88%', icon: Fuel, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Delayed', value: '2', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    ];

    const renderManifest = () => (
        <div className="animate-fade-in-up space-y-8">
            {/* Real-time Tracking Map Placeholder */}
            <div className="bg-slate-900 rounded-[3rem] p-8 h-[300px] relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')] opacity-30 mix-blend-overlay bg-center bg-cover"></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/10">
                            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1">Fleet Pulse</p>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Active Route Monitor</h3>
                        </div>
                        <div className="flex gap-2">
                            <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/30 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                Live GPS Feed
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        {shipments.filter(s => s.status === 'in_transit').map(s => (
                            <div key={s.id} className="min-w-[250px] bg-white/90 backdrop-blur rounded-2xl p-4 shadow-xl border border-white/20">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <Navigation className="w-4 h-4" />
                                    </div>
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{s.trackingId}</p>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 gap-4">
                                    <div className="flex-1">
                                        <p className="uppercase tracking-widest opacity-60">Near</p>
                                        <p className="text-slate-800 line-clamp-1">Athi River Bypass</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="uppercase tracking-widest opacity-60">ETA</p>
                                        <p className="text-indigo-600">45 Mins</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Shipment Manifest Table */}
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Cargo manifest</h3>
                        <p className="text-slate-500 font-medium text-xs mt-1">Full registry of active and historical delivery manifests.</p>
                    </div>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Track Shipment ID or Client..." 
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none outline-none font-bold text-sm"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Shipment / ID</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Client & Payload</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Route</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {filteredShipments.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all cursor-pointer group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl ${s.status === 'in_transit' ? 'bg-blue-100 text-blue-600' : s.status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{s.trackingId}</p>
                                                <p className="text-[10px] font-black text-slate-400 tracking-widest">ETA: {s.eta.split(' ')[0]}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="font-bold text-slate-700 dark:text-slate-200">{s.clientName}</p>
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{s.weight}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                            <span>{s.origin}</span>
                                            <ArrowRight className="w-3 h-3 text-slate-300" />
                                            <span>{s.destination}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                            s.status === 'in_transit' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                            s.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                        }`}>
                                            {s.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <button className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all">
                                            <MoreHorizontal className="w-5 h-5 text-slate-400" />
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

    const renderFleet = () => (
        <div className="animate-fade-in space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Vehicle Health & Maintenance */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <Truck className="w-6 h-6 text-indigo-600" />
                            Fleet Health
                        </h3>
                        <button className="bg-slate-50 dark:bg-slate-900 px-4 py-1.5 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 dark:border-slate-700">
                            Manage All
                        </button>
                    </div>
                    <div className="space-y-4">
                        {[
                            { plate: 'KDC 992P', fuel: 45, status: 'Healthy', health: 92 },
                            { plate: 'KBB 120Z', fuel: 90, status: 'Maintenance Due', health: 65, alert: true },
                            { plate: 'KDM 441X', fuel: 12, status: 'Healthy', health: 88, lowFuel: true },
                        ].map((v, i) => (
                            <div key={i} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-transparent hover:border-indigo-100 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight">{v.plate}</p>
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${v.alert ? 'text-red-500' : 'text-slate-400'}`}>{v.status}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-slate-800 dark:text-white italic">{v.health}% Engine Life</p>
                                        <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1">
                                            <div className={`h-full rounded-full ${v.health > 80 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${v.health}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <Fuel className={`w-4 h-4 ${v.lowFuel ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                                        <span className="text-xs font-black text-slate-600 dark:text-slate-300">{v.fuel}L Left</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest truncate">Athi River</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Driver Performance */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3 mb-8">
                        <Users className="w-6 h-6 text-blue-600" />
                        Driver Efficiency
                    </h3>
                    <div className="space-y-6">
                        {drivers.slice(0, 4).map((d, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl">
                                    {d.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-bold text-slate-800 dark:text-white uppercase tracking-tight">{d.name}</p>
                                        <p className="text-[10px] font-black text-green-600">Top Performer</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            <Clock className="w-3 h-3" />
                                            98.2% On Time
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            <ShieldCheck className="w-3 h-3" />
                                            Safety Score: 4.9/5
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderEPOD = () => (
        <div className="animate-fade-in-up space-y-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <Signature className="w-8 h-8 text-indigo-600" />
                            Digital Proof of Delivery (e-POD)
                        </h3>
                        <p className="text-slate-500 font-medium text-sm mt-1">Review legal delivery evidence including signatures, geostamps, and photos.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {shipments.filter(s => s.status === 'delivered').map(s => (
                        <div key={s.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">{s.trackingId}</p>
                                        <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{s.clientName}</h4>
                                    </div>
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                </div>

                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                        <User className="w-4 h-4" />
                                        Received By: {s.proofOfDelivery?.receiverName}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                        <Clock className="w-4 h-4" />
                                        Delivered At: {s.proofOfDelivery?.timestamp}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                        <MapPin className="w-4 h-4 text-green-500" />
                                        Geofence Verified
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all">
                                        <Signature className="w-4 h-4" />
                                        View Sign
                                    </button>
                                    <button className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all">
                                        <Camera className="w-4 h-4" />
                                        View Photo
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 lg:p-10 space-y-10 group/logistics">
            {/* Contextual Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                            <Truck className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
                            Logistics <span className="text-indigo-600">Control</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 font-medium max-w-xl group-hover/logistics:text-slate-600 transition-colors">
                        The mission control for your supply chain. Real-time fleet tracking, automated manifests, and digital proof-of-delivery for modern cargo operations.
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-200 dark:shadow-none hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center gap-3">
                        <Plus className="w-5 h-5" />
                        Plan New Trip
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group/stat relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-900/50 rotate-45 translate-x-12 -translate-y-12 transition-colors group-hover/stat:bg-indigo-50/50"></div>
                        <div className="relative z-10 flex items-center gap-6">
                            <div className={`w-16 h-16 ${stat.bg} ${stat.color} rounded-[1.5rem] flex items-center justify-center transition-transform group-hover/stat:scale-110`}>
                                <stat.icon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{stat.label}</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900/50 p-2 rounded-[2rem] w-fit border border-slate-200 dark:border-slate-800 shadow-inner">
                {[
                    { id: 'manifest', label: 'Cargo Manifest', icon: Package },
                    { id: 'fleet', label: 'Fleet Control', icon: Truck },
                    { id: 'analytics', label: 'Route Science', icon: BarChart3 },
                    { id: 'epod', label: 'Proof Center', icon: Signature }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-3 px-8 py-3 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all ${
                            activeTab === tab.id 
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xl' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="min-h-[60vh]">
                {activeTab === 'manifest' && renderManifest()}
                {activeTab === 'fleet' && renderFleet()}
                {activeTab === 'epod' && renderEPOD()}
                {activeTab === 'analytics' && (
                    <div className="bg-white dark:bg-slate-800 p-20 rounded-[4rem] text-center border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center">
                        <BarChart3 className="w-16 h-16 text-indigo-200 mb-8 animate-pulse" />
                        <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter">AI Route Science Engine</h3>
                        <p className="text-slate-400 mt-4 max-w-sm">Generating optimal routes based on current traffic patterns and vessel arrival times...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface Users {
    length: number;
    filter(arg0: (u: any) => boolean): any;
    slice(arg0: number, arg1: number): any[];
}
