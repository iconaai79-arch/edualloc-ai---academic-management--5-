import React, { useState } from 'react';
import { 
    Truck, Users, Map, Navigation, 
    Calendar, AlertCircle, CheckCircle2, 
    Clock, Fuel, BarChart3, Settings,
    Plus, Search, MoreHorizontal, ShieldCheck,
    Gauge, ArrowUpRight, History
} from 'lucide-react';
import { LogisticVehicle, LogisticDriver, LogisticTrip } from '../types';

export const LogisticsDashboard: React.FC = () => {
    const [activeView, setActiveView] = useState<'mission_control' | 'fleet' | 'drivers'>('mission_control');

    const [vehicles] = useState<LogisticVehicle[]>([
        { id: 'v1', institutionId: 'inst1', plateNumber: 'KBA 123X', vehicleType: 'Tanker', capacityRating: '15,000L', currentOdometer: 45200, status: 'on_trip' },
        { id: 'v2', institutionId: 'inst1', plateNumber: 'KCC 789Y', vehicleType: 'Flatbed', capacityRating: '30 Tons', currentOdometer: 12800, status: 'available' },
        { id: 'v3', institutionId: 'inst1', plateNumber: 'KDD 456Z', vehicleType: 'Crane Truck', capacityRating: '15 Tons', currentOdometer: 8900, status: 'maintenance' }
    ]);

    const [drivers] = useState<LogisticDriver[]>([
        { id: 'd1', institutionId: 'inst1', userId: 'u1', licenseNumber: 'DL-9988-X', specialization: 'Hazmat', rating: 4.8, status: 'active' },
        { id: 'd2', institutionId: 'inst1', userId: 'u2', licenseNumber: 'DL-7766-Y', specialization: 'Heavy Load', rating: 4.9, status: 'active' }
    ]);

    const [trips] = useState<LogisticTrip[]>([
        { id: 't1', vehicleId: 'v1', driverId: 'd1', cargoDescription: 'Ultra-Low Sulfur Diesel', origin: 'Mombasa Depot', destination: 'Westside Station', status: 'en_route', startedAt: new Date().toISOString() },
        { id: 't2', vehicleId: 'v2', driverId: 'd2', cargoDescription: '500x Solid Blocks', origin: 'Westside Yard', destination: 'Valley View Site', status: 'loading', startedAt: new Date().toISOString() }
    ]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-10 font-sans">
            <div className="max-w-[1700px] mx-auto space-y-8">
                
                {/* Global Navigation Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-600 font-black uppercase tracking-widest text-[10px] mb-2">
                            <Navigation className="w-4 h-4" />
                            Global Logistics Network
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Logistics Command Centre</h1>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                        {[
                            { id: 'mission_control', label: 'Mission Control', icon: Map },
                            { id: 'fleet', label: 'Fleet Registry', icon: Truck },
                            { id: 'drivers', label: 'Driver Squad', icon: Users }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveView(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeView === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-lg shadow-indigo-500/10' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors">
                            <Plus className="w-5 h-5" />
                        </button>
                        <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20">
                            Create New Mission
                        </button>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    
                    {/* Left: Active Missions List */}
                    <div className="lg:col-span-3 space-y-8">
                        
                        {/* Live Tracking Map Placeholder */}
                        <div className="relative aspect-[21/9] bg-slate-200 dark:bg-slate-800 rounded-[3rem] overflow-hidden group">
                           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                           <div className="absolute inset-0 flex items-center justify-center">
                               <div className="text-center">
                                   <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                       <Map className="w-8 h-8 text-indigo-500" />
                                   </div>
                                   <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Integrating Live GPS Feed (Google Maps API)</p>
                               </div>
                           </div>
                           
                           {/* Floating Status Cards */}
                           <div className="absolute bottom-8 left-8 right-8 flex justify-between gap-6 pointer-events-none">
                               {trips.filter(t => t.status === 'en_route').map(trip => (
                                   <div key={trip.id} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl flex items-center gap-6 pointer-events-auto">
                                       <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
                                           <Truck className="w-6 h-6 text-white" />
                                       </div>
                                       <div>
                                           <div className="text-[10px] font-black text-indigo-500 uppercase mb-1">En Route</div>
                                           <div className="text-sm font-black text-slate-900 dark:text-white">{vehicles.find(v => v.id === trip.vehicleId)?.plateNumber}</div>
                                       </div>
                                       <div className="w-[1px] h-10 bg-slate-200 dark:bg-slate-700"></div>
                                       <div>
                                           <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Destination</div>
                                           <div className="text-sm font-bold text-slate-600 dark:text-slate-400">{trip.destination}</div>
                                       </div>
                                   </div>
                               ))}
                           </div>
                        </div>

                        {/* Mission Board */}
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <Clock className="w-6 h-6 text-indigo-500" />
                                    Active Missions
                                </h3>
                                <div className="flex gap-2">
                                    <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-500">All</button>
                                    <button className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold">In Transit</button>
                                    <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-500">Pending</button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {trips.map(trip => (
                                    <div key={trip.id} className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all group flex flex-col md:flex-row items-center gap-10">
                                        <div className="flex items-center gap-6 flex-1">
                                            <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-[1.25rem] shadow-sm flex items-center justify-center font-black text-slate-400">
                                                <History className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{trip.cargoDescription}</h4>
                                                <p className="text-xs font-bold text-slate-500 flex items-center gap-2 mt-1">
                                                    <Map className="w-3 h-3" /> {trip.origin} → {trip.destination}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-12 text-center border-x border-slate-200 dark:border-slate-800 px-12">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Driver</p>
                                                <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                                                    {drivers.find(d => d.id === trip.driverId)?.licenseNumber}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle</p>
                                                <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                                                    {vehicles.find(v => v.id === trip.vehicleId)?.plateNumber}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${trip.status === 'en_route' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {trip.status.replace('_', ' ')}
                                            </span>
                                            <button className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-indigo-500 hover:text-white transition-all shadow-sm">
                                                <ArrowUpRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Fleet Health & Stats Sidebar */}
                    <div className="space-y-8">
                        {/* Fleet Overview Card */}
                        <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                           <Fuel className="absolute -top-10 -right-10 w-48 h-48 opacity-[0.03] rotate-12" />
                           <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                               <BarChart3 className="w-5 h-5 text-indigo-400" />
                               Operational Health
                           </h3>
                           
                           <div className="space-y-8">
                               <div>
                                   <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-3">
                                       <span>Active Utilization</span>
                                       <span className="text-indigo-400">82%</span>
                                   </div>
                                   <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                       <div className="h-full w-[82%] bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50"></div>
                                   </div>
                               </div>

                               <div className="grid grid-cols-2 gap-4">
                                   <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                                       <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Available</div>
                                       <div className="text-2xl font-black">12</div>
                                   </div>
                                   <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                                       <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Maintenance</div>
                                       <div className="text-2xl font-black text-amber-400">3</div>
                                   </div>
                               </div>
                           </div>
                           
                           <button className="w-full mt-10 py-5 bg-white text-slate-900 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all">
                               System Configuration
                           </button>
                        </div>

                        {/* Driver Squad Quick View */}
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm">
                           <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                               <Users className="w-5 h-5 text-indigo-500" />
                               Top Perfomers
                           </h3>
                           
                           <div className="space-y-6">
                               {drivers.map(driver => (
                                   <div key={driver.id} className="flex items-center justify-between">
                                       <div className="flex items-center gap-4">
                                           <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-400">
                                               {driver.licenseNumber.charAt(0)}
                                           </div>
                                           <div>
                                               <div className="text-sm font-black text-slate-800 dark:text-white">{driver.licenseNumber}</div>
                                               <div className="text-[10px] font-bold text-slate-500 uppercase">{driver.specialization}</div>
                                           </div>
                                       </div>
                                       <div className="flex items-center gap-1">
                                           <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                           <span className="text-xs font-black text-slate-800 dark:text-slate-300">{driver.rating}</span>
                                       </div>
                                   </div>
                               ))}
                           </div>
                           
                           <hr className="my-8 border-slate-100 dark:border-slate-800" />
                           
                           <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/30">
                               <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">Fleet Safety Alert</p>
                               <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                                   All tankers scheduled for night trips must undergo a visibility light check.
                               </p>
                           </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogisticsDashboard;

