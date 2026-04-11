
import React, { useState, useMemo } from 'react';
import { 
    Palmtree, 
    Hotel, 
    Plane, 
    MapPixels, 
    Calendar, 
    Users, 
    CreditCard, 
    Compass, 
    Map, 
    Bed, 
    Image as ImageIcon,
    History,
    Sparkles,
    CheckCircle,
    Clock,
    Plus,
    Filter,
    Search,
    ChevronRight,
    ArrowRight,
    MapPin,
    Star,
    Coffee,
    Utensils,
    Wifi
} from 'lucide-react';
import type { Institution, User } from '../types';

interface HospitalityManagerProps {
    currentInstitution: Institution;
    users: User[];
}

export const HospitalityManager: React.FC<HospitalityManagerProps> = ({ currentInstitution, users }) => {
    const category = currentInstitution.category || 'Travel Agency';
    const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'itineraries' | 'inventory' | 'customers'>('overview');
    
    const isAgency = category.includes('Agency') || category.includes('Safaris');
    const isHotel = category.includes('Hotel') || category.includes('Airbnb') || category.includes('Apartments');

    const renderOverview = () => {
        const stats = [
            { label: 'Total Bookings', value: '1,284', icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Active Guests', value: '42', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Revenue (MTD)', value: 'KES 2.4M', icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: isAgency ? 'Upcoming Trips' : 'Occupancy Rate', value: isAgency ? '12' : '84%', icon: isAgency ? Plane : Hotel, color: 'text-rose-600', bg: 'bg-rose-50' },
        ];

        return (
            <div className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((s, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={`p-4 ${s.bg} ${s.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                                    <s.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{s.label}</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">{s.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Recent {isAgency ? 'Travel Enquiries' : 'Room Bookings'}</h4>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Live updates from your storefront</p>
                            </div>
                            <button className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors">
                                <History className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-2xl transition-all cursor-pointer group">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm group-hover:scale-105 transition-transform">
                                        JD
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <p className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight">John Doe</p>
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">KES 45,000</span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {isAgency ? '7 Days Maasai Mara Safari' : 'Executive Suite - 3 Nights'}
                                        </p>
                                    </div>
                                    <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">Confirmed</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Compass className="w-32 h-32" />
                        </div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <h4 className="text-lg font-black uppercase tracking-tighter mb-2">Weekly Goal</h4>
                                <p className="text-slate-400 text-xs font-medium leading-relaxed">Boost your {isAgency ? 'tour packages' : 'room occupancy'} this weekend.</p>
                            </div>
                            <div className="mt-12 space-y-4">
                                <div className="p-4 bg-white/10 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Current Progress</p>
                                    <div className="flex justify-between items-end mt-1">
                                        <p className="text-xl font-black">74%</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">12/16 Slots</p>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                                        <div className="w-[74%] h-full bg-amber-500 rounded-full"></div>
                                    </div>
                                </div>
                                <button className="w-full py-4 bg-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                                    Launch Campaign
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderBookings = () => (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Reservation Master</h4>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Secure and manage all client bookings</p>
                </div>
                <div className="flex gap-2">
                    <button className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors">
                        <Search className="w-5 h-5" />
                    </button>
                    <button className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95">
                        <Plus className="w-5 h-5" />
                        New Booking
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-50 dark:border-slate-700">
                            {['Guest/Client', 'Reservation', 'Date Range', 'Amount', 'Status', ''].map((h) => (
                                <th key={h} className="text-left py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                <td className="py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-[10px]">KW</div>
                                        <p className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-tight">Ken Walibora</p>
                                    </div>
                                </td>
                                <td className="py-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                        {isAgency ? 'Diani 4-Day Getaway' : 'Room 204 - Deluxe'}
                                    </p>
                                </td>
                                <td className="py-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Oct 12 - Oct 16</p>
                                </td>
                                <td className="py-4 font-mono text-xs font-black">KES 82,000</td>
                                <td className="py-4">
                                    <span className="text-[8px] font-black bg-amber-50 text-amber-600 px-3 py-1 rounded-full uppercase tracking-widest">In Process</span>
                                </td>
                                <td className="py-4 text-right">
                                    <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderInventory = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden group hover:shadow-2xl transition-all">
                    <div className="aspect-video bg-slate-100 dark:bg-slate-900 relative">
                        <div className="absolute top-4 left-4">
                            <span className="text-[8px] font-black bg-white/90 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                {isAgency ? 'Tours' : 'Vacant'}
                            </span>
                        </div>
                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                            {isAgency ? <Plane className="w-12 h-12" /> : <Bed className="w-12 h-12" />}
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-lg leading-none">
                                    {isAgency ? 'Serengeti Migration' : 'Suite 30' + i}
                                </h5>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                                    {isAgency ? '5 Days / 4 Nights' : 'Main Wing • Ocean View'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Price</p>
                                <p className="text-sm font-black text-indigo-600 tracking-tighter">KES 120k</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 my-6">
                            {[Wifi, Coffee, Utensils].map((Icon, idx) => (
                                <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-400">
                                    <Icon className="w-4 h-4" />
                                </div>
                            ))}
                        </div>

                        <button className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest group-hover:bg-indigo-600 transition-all">
                            {isAgency ? 'Manage Package' : 'Manage Inventory'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-100">
                        {isAgency ? <Plane className="w-8 h-8" /> : <Hotel className="w-8 h-8" />}
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.3em] mb-1">Hospitality Hub</p>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">
                            {category} Gateway
                        </h2>
                    </div>
                </div>

                <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                    {[
                        { id: 'overview', label: 'Dashboard', icon: Sparkles },
                        { id: 'bookings', label: 'Bookings', icon: Calendar },
                        { id: 'inventory', label: isAgency ? 'Packages' : 'Inventory', icon: isAgency ? Map : Bed },
                        { id: 'customers', label: 'Guests', icon: Users },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="transition-all duration-300">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'bookings' && renderBookings()}
                {activeTab === 'inventory' && renderInventory()}
                {activeTab === 'customers' && (
                    <div className="bg-white dark:bg-slate-800 p-12 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-700 text-center text-slate-400">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-widest text-sm">Guest Management Module Loading...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
