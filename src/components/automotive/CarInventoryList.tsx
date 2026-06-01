
import React, { useState } from 'react';
import { CarListing, Institution } from '../../types';
import { 
    Car, 
    Pencil, 
    Trash2, 
    Search,
    Plus,
    Eye,
    Camera,
    MapPin,
    Zap,
    Gauge,
    Calendar,
    ArrowRightLeft,
    Hash
} from 'lucide-react';

interface CarInventoryListProps {
    listings: CarListing[];
    institution: Institution;
    onAddListing: () => void;
    onEditListing: (listing: CarListing) => void;
    onDeleteListing: (id: string) => void;
    onViewShowroom: () => void;
}

export const CarInventoryList: React.FC<CarInventoryListProps> = ({
    listings,
    institution,
    onAddListing,
    onEditListing,
    onDeleteListing,
    onViewShowroom
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'sold' | 'draft'>('all');

    const filteredListings = listings.filter(l => {
        const matchesSearch = `${l.make} ${l.model} ${l.vin || ''} ${l.registrationNumber || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header with Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                        Vehicle <span className="text-indigo-600">Inventory</span>
                    </h2>
                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            {listings.length} Units Total
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {listings.filter(l => l.status === 'active').length} Active
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={onViewShowroom}
                        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                    >
                        <Eye className="w-4 h-4 text-indigo-600" /> Public Showroom
                    </button>
                    <button 
                        onClick={onAddListing}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Add Vehicle
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="relative w-full md:w-96 group">
                    <input 
                        type="text"
                        placeholder="Search make, model, VIN..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-12 pl-12 pr-6 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <Search className="w-4 h-4 absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-xl w-full md:w-auto">
                    {(['all', 'active', 'sold', 'draft'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`flex-grow md:flex-grow-0 px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredListings.map((listing) => (
                    <div key={listing.id} className="group bg-white dark:bg-slate-800 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:border-indigo-200 transition-all duration-500">
                        {/* Image Preview */}
                        <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                            {listing.mainImageUrl ? (
                                <img loading="lazy" src={listing.mainImageUrl} alt={listing.model} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                    <Camera className="w-12 h-12 mb-2" />
                                    <p className="text-[9px] font-black uppercase tracking-widest">No Photos Added</p>
                                </div>
                            )}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg ${
                                    listing.status === 'active' ? 'bg-emerald-500 text-white' : 
                                    listing.status === 'sold' ? 'bg-indigo-600 text-white' : 'bg-slate-500 text-white'
                                }`}>
                                    {listing.status}
                                </span>
                                <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-900">
                                    {listing.year}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                                        {listing.make} <span className="text-indigo-600">{listing.model}</span>
                                    </h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{listing.trim || 'Standard Edition'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-slate-900 dark:text-white italic leading-none">KES {(listing.price || 0).toLocaleString()}</p>
                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-1 italic">MSRP</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-50 dark:border-slate-800">
                                    <Gauge className="w-3 h-3 text-slate-400 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate">Mileage</p>
                                        <p className="text-[9px] font-black text-slate-900 dark:text-white truncate">{(listing.mileage || 0).toLocaleString()} KM</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-50 dark:border-slate-800">
                                    <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate">Fuel</p>
                                        <p className="text-[9px] font-black text-slate-900 dark:text-white uppercase truncate">{listing.fuelType}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-50 dark:border-slate-800">
                                    <Hash className="w-3 h-3 text-indigo-500 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate">Reg No.</p>
                                        <p className="text-[9px] font-black text-slate-900 dark:text-white uppercase truncate">{listing.registrationNumber || 'UNREG'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4 border-t border-slate-50 dark:border-slate-700">
                                <button 
                                    onClick={() => onEditListing(listing)}
                                    className="flex-grow flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-100 transition-all"
                                >
                                    <Pencil className="w-3 h-3" /> Edit Unit
                                </button>
                                <button 
                                    onClick={() => onDeleteListing(listing.id)}
                                    className="w-12 h-11 flex items-center justify-center bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredListings.length === 0 && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <Car className="w-16 h-16 text-slate-200 mb-4" />
                        <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter italic">No vehicles found</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-2">Try adjusting your filters or add a new unit</p>
                        <button 
                            onClick={onAddListing}
                            className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100"
                        >
                            Add First Vehicle
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
