
import React, { useState, useMemo } from 'react';
import { 
    Bus, 
    Search, 
    MapPin, 
    Calendar, 
    User, 
    ArrowRight, 
    ShieldCheck, 
    Star, 
    Clock, 
    Ticket, 
    Armchair,
    ChevronDown,
    Filter,
    ArrowLeft
} from 'lucide-react';
import type { Institution } from '../../types';

interface TransportHubViewProps {
    institutions: Institution[];
    onBack: () => void;
}

export const TransportHubView: React.FC<TransportHubViewProps> = ({ institutions, onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRoute, setSelectedRoute] = useState<{ origin: string; dest: string } | null>(null);

    const transportSaccos = useMemo(() => {
        return institutions.filter(inst => 
            inst.category?.includes('Public Transport') || 
            inst.category?.includes('SACCO') || 
            inst.category?.includes('Shuttle')
        );
    }, [institutions]);

    const mockTrips = [
        { id: '1', sacco: 'North-Star Shuttle', route: 'Nairobi - Eldoret', price: 'KES 1,200', time: '08:00 AM', seats: 4, rating: 4.8 },
        { id: '2', sacco: 'Trans-Coast SACCO', route: 'Nairobi - Mombasa', price: 'KES 1,500', time: '10:30 PM', seats: 12, rating: 4.5 },
        { id: '3', sacco: 'Great Lakes Ltd', route: 'Nairobi - Kisumu', price: 'KES 1,400', time: '09:15 AM', seats: 2, rating: 4.2 },
        { id: '4', sacco: 'Central Express', route: 'Nairobi - Nyeri', price: 'KES 600', time: '12:00 PM', seats: 8, rating: 4.9 },
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
            {/* Premium Header */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Bus className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900 italic">
                            Transport <span className="text-indigo-600">Hub</span>
                        </h1>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-8">
                    <a href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all">Support</a>
                    <a href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all">Sacco Login</a>
                    <button className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">My Tickets</button>
                </div>
            </nav>

            {/* Hero & Search Section */}
            <div className="bg-indigo-600 pt-20 pb-40 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full translate-y-32 -translate-x-32 blur-3xl"></div>
                
                <div className="max-w-4xl mx-auto text-center relative z-10 mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase text-white tracking-widest mb-6 backdrop-blur-md">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        NTSA Verified Operators
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-6 leading-tight">
                        Reach your destination <br /> <span className="text-indigo-200 italic">with total comfort</span>
                    </h2>
                </div>

                {/* Search Console */}
                <div className="max-w-5xl mx-auto bg-white rounded-[2.5rem] shadow-2xl p-4 md:p-8 grid grid-cols-1 md:grid-cols-4 gap-4 relative z-20">
                    <div className="relative">
                        <label className="absolute left-12 top-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">From</label>
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                        <input 
                            className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 pt-8 pb-4 font-black text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            placeholder="Current City"
                        />
                    </div>
                    <div className="relative">
                        <label className="absolute left-12 top-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">To</label>
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                        <input 
                            className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 pt-8 pb-4 font-black text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            placeholder="Destination"
                        />
                    </div>
                    <div className="relative">
                        <label className="absolute left-12 top-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Departure</label>
                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                        <input 
                            type="date"
                            className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 pt-8 pb-4 font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>
                    <button className="bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-200 transition-all active:scale-95 py-6 md:py-0">
                        <Search className="w-5 h-5" />
                        Find Trips
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-30 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                    {/* Filters column */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
                                Filter Results
                                <Filter className="w-3 h-3" />
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tight text-slate-800 mb-3">Operator Type</p>
                                    <div className="space-y-3">
                                        {['Premium Sacco', 'Express Shuttle', 'Public Bus'].map(type => (
                                            <label key={type} className="flex items-center gap-3 cursor-pointer group">
                                                <div className="w-4 h-4 border-2 border-slate-200 rounded-md group-hover:border-indigo-500 transition-all"></div>
                                                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-slate-50">
                                    <p className="text-xs font-black uppercase tracking-tight text-slate-800 mb-3">Price Range</p>
                                    <input type="range" className="w-full accent-indigo-600" />
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mt-2">
                                        <span>KES 500</span>
                                        <span>KES 5,000</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Saccos Ad */}
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden group">
                           <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent"></div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-2 relative z-10">Trusted Partners</p>
                           <h4 className="text-xl font-black uppercase tracking-tight mb-4 relative z-10 italic">Partner <span className="text-indigo-400">Hubs</span></h4>
                           <div className="space-y-3 relative z-10">
                               {transportSaccos.slice(0, 3).map(s => (
                                   <div key={s.id} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3">
                                       <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center font-black text-xs">{s.name.charAt(0)}</div>
                                       <span className="text-xs font-bold truncate opacity-80">{s.name}</span>
                                   </div>
                               ))}
                           </div>
                        </div>
                    </div>

                    {/* Results column */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Trips: Nairobi - All Directions</p>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 tracking-widest cursor-pointer">
                                Latest Departures
                                <ChevronDown className="w-3 h-3" />
                            </div>
                        </div>

                        {mockTrips.map(trip => (
                            <div key={trip.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:translate-y-[-2px] transition-all p-8 group">
                                <div className="flex flex-col md:flex-row justify-between gap-8">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                Trip ID: TRP-992-{trip.id}
                                            </div>
                                            <div className="flex items-center gap-1 text-amber-500">
                                                <Star className="w-3 h-3 fill-current" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{trip.rating}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Operator</p>
                                                <p className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">{trip.sacco}</p>
                                            </div>
                                            <div className="h-10 w-px bg-slate-100"></div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Route</p>
                                                <p className="text-lg font-bold text-slate-800 tracking-tight">{trip.route}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex md:flex-col justify-between items-end gap-4 min-w-[200px]">
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Starting at</p>
                                            <p className="text-3xl font-black text-indigo-600 uppercase tracking-tighter">{trip.price}</p>
                                        </div>
                                        <button className="bg-slate-900 group-hover:bg-indigo-600 text-white w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95">
                                            <Ticket className="w-5 h-5" />
                                            Book Seat
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-8 pt-6 border-t border-slate-50 flex flex-wrap gap-8">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <Clock className="w-4 h-4 text-indigo-500" />
                                        Expected Start: {trip.time}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <Armchair className="w-4 h-4 text-indigo-500" />
                                        {trip.seats} Seats Remaining
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <ShieldCheck className="w-4 h-4 text-green-500" />
                                        Instant Confirmation
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sacco CTA Section */}
            <div className="bg-white border-t border-slate-200 mt-20">
                <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center justify-between gap-12">
                   <div>
                       <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 mb-4">Are you a vehicle owner or <span className="text-indigo-600">Sacco manager?</span></h3>
                       <p className="text-slate-500 font-medium max-w-xl">Digitize your fleet operations. Manage trip registries, owner payouts, commissions, and public online bookings in one unified dashboard.</p>
                   </div>
                   <div className="flex gap-4">
                       <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all">Register Sacco</button>
                       <button className="border border-slate-200 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">Owner Login</button>
                   </div>
                </div>
            </div>
            
            {/* Footer */}
            <footer className="bg-slate-950 px-6 py-20 text-white">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-20">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                           <Bus className="w-6 h-6 text-indigo-400" />
                           <h1 className="text-xl font-black uppercase tracking-tighter italic">Transport Hub</h1>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed font-medium">Unified digital management platform for transport cooperatives and individual vehicle owners.</p>
                    </div>
                    <div>
                        <h4 className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6">Discovery</h4>
                        <ul className="space-y-4 text-sm font-bold text-slate-400">
                            <li><a href="#" className="hover:text-white transition-all">Popular Routes</a></li>
                            <li><a href="#" className="hover:text-white transition-all">Verified Saccos</a></li>
                            <li><a href="#" className="hover:text-white transition-all">Premium Shuttles</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6">Tools</h4>
                        <ul className="space-y-4 text-sm font-bold text-slate-400">
                            <li><a href="#" className="hover:text-white transition-all">Carrier Ledger</a></li>
                            <li><a href="#" className="hover:text-white transition-all">Owner Payouts</a></li>
                            <li><a href="#" className="hover:text-white transition-all">License Monitor</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6">Account</h4>
                        <ul className="space-y-4 text-sm font-bold text-slate-400">
                            <li><a href="#" className="hover:text-white transition-all">Passenger Ticket</a></li>
                            <li><a href="#" className="hover:text-white transition-all">Owner Portal</a></li>
                            <li><a href="#" className="hover:text-white transition-all">Driver Monitor</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto border-t border-white/5 mt-20 pt-10 flex flex-col md:flex-row justify-between text-[10px] font-black uppercase tracking-widest text-slate-600 gap-4">
                    <p>© 2024 EduAlloc AI Transport. All rights reserved.</p>
                    <div className="flex gap-8">
                        <a href="#">Privacy Policy</a>
                        <a href="#">Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};
