
import React, { useState, useMemo } from 'react';
import { 
    Car, 
    Search, 
    Filter, 
    ChevronRight, 
    Star, 
    ShieldCheck, 
    Zap, 
    Rotate3d, 
    Calendar, 
    Gauge, 
    Fuel, 
    Settings2,
    MapPin,
    ArrowRight,
    CircleDollarSign,
    PlayCircle,
    CheckCircle2,
    X,
    MessageCircle,
    Clock,
    Heart,
    Plus
} from 'lucide-react';
import type { CarListing } from '../types';

interface VehicleMarketplaceViewProps {
    listings: CarListing[];
    onBookTestDrive: (listing: CarListing) => void;
    onInquiry: (listing: CarListing) => void;
    onEditListing?: (listing: CarListing) => void;
    currentInstitution: any;
}

export const VehicleMarketplaceView: React.FC<VehicleMarketplaceViewProps> = ({ 
    listings, 
    onBookTestDrive, 
    onInquiry,
    onEditListing,
    currentInstitution 
}) => {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState<CarListing | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'details'>('grid');
    const [compareList, setCompareList] = useState<CarListing[]>([]);
    const [isComparing, setIsComparing] = useState(false);

    // Finance Calculator State
    const [financeDownPayment, setFinanceDownPayment] = useState(20); // Percentage
    const [financeTenure, setFinanceTenure] = useState(60); // Months
    const [interestRate, setInterestRate] = useState(12); // Annual %

    const categories = ['All', 'Sedan', 'SUV', 'Electric', 'Luxury', 'Classic'];

    const filteredListings = useMemo(() => {
        return listings.filter(l => {
            const matchesSearch = `${l.make} ${l.model} ${l.year}`.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || l.bodyType === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [listings, searchTerm, selectedCategory]);

    const renderListingCard = (listing: CarListing) => (
        <div 
            key={listing.id}
            onClick={() => { setSelectedVehicle(listing); setViewMode('details'); }}
            className="group relative bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all duration-500 cursor-pointer"
        >
            <div className="aspect-[4/3] relative overflow-hidden">
                <img loading="lazy" 
                    src={listing.mainImageUrl || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80'} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt={listing.model}
                />
                <div className="absolute top-6 left-6 flex gap-2">
                    <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-900">
                        {listing.year}
                    </span>
                    {listing.verifiedHistory && (
                        <span className="bg-indigo-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                    )}
                </div>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (compareList.find(c => c.id === listing.id)) {
                            setCompareList(prev => prev.filter(c => c.id !== listing.id));
                        } else if (compareList.length < 3) {
                            setCompareList(prev => [...prev, listing]);
                        }
                    }}
                    className={`absolute top-6 right-6 w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center transition-all ${compareList.find(c => c.id === listing.id) ? 'bg-indigo-600 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
                >
                    <Heart className={`w-5 h-5 ${compareList.find(c => c.id === listing.id) ? 'fill-current' : ''}`} />
                </button>
                {/* Live Activity Ticker (FOMO) */}
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 translate-y-12 group-hover:translate-y-0 transition-all duration-500">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[8px] font-black uppercase text-white/80 tracking-widest">{Math.floor(Math.random() * 5 + 1)} People viewing</span>
                    </div>
                    <span className="text-[8px] font-black uppercase text-indigo-400 tracking-widest italic">Hot Listing</span>
                </div>
            </div>

            <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                            {listing.make} <span className="text-indigo-600">{listing.model}</span>
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            {listing.mileage.toLocaleString()} KM • {listing.transmission}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                            ${(listing.price / 1000).toFixed(1)}k
                        </p>
                        <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mt-1">
                            KES {listing.price.toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> {listing.fuelType}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <Star className="w-3.5 h-3.5 text-indigo-600" /> {listing.inspectionScore}% Score
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDetails = (vehicle: CarListing) => (
        <div className="animate-fade-in-up">
            <button 
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors mb-12"
            >
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to listings
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                {/* Visual Section */}
                <div className="space-y-8">
                    <div className="relative rounded-[4rem] overflow-hidden shadow-2xl aspect-[4/3] group">
                        <img loading="lazy" src={vehicle.mainImageUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-12">
                            <div className="flex gap-4">
                                {vehicle.tour360Url && (
                                    <button 
                                        onClick={() => window.open(vehicle.tour360Url, '_blank')}
                                        className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-8 py-4 rounded-3xl font-black uppercase text-[11px] hover:bg-white/20 transition-all flex items-center gap-2"
                                    >
                                        <Rotate3d className="w-5 h-5" /> 360° Interior
                                    </button>
                                )}
                                {vehicle.videoWalkthroughUrl && (
                                    <button 
                                        onClick={() => window.open(vehicle.videoWalkthroughUrl, '_blank')}
                                        className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-8 py-4 rounded-3xl font-black uppercase text-[11px] hover:bg-white/20 transition-all flex items-center gap-2"
                                    >
                                        <PlayCircle className="w-5 h-5" /> Tour Video
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        {vehicle.galleryUrls?.slice(0, 4).map((url, i) => (
                            <div key={i} className="aspect-square rounded-3xl overflow-hidden border-2 border-slate-100 hover:border-indigo-600 transition-all cursor-pointer">
                                <img loading="lazy" src={url} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info Section */}
                <div className="flex flex-col justify-between py-8">
                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    {vehicle.status} listing
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                    <Clock className="w-3.5 h-3.5" /> Added 2 days ago
                                </span>
                            </div>
                            <h1 className="text-7xl font-black uppercase tracking-tighter text-slate-900 leading-[0.85] mb-6">
                                {vehicle.make} <br />
                                <span className="text-indigo-600 italic">{vehicle.model}</span>
                            </h1>
                            {onEditListing && (
                                <button
                                    onClick={() => onEditListing(vehicle)}
                                    className="mb-6 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
                                >
                                    <Settings2 className="w-3.5 h-3.5" /> Edit This Listing
                                </button>
                            )}
                             <div className="flex gap-6 items-center">
                                <div className="text-4xl font-black text-slate-900 leading-none">
                                    KES {vehicle.price.toLocaleString()}
                                </div>
                                <div className="h-8 w-px bg-slate-200" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest italic">Est. Financed</span>
                                    <span className="text-lg font-black text-slate-900">
                                        KES {Math.round((vehicle.price * (1 - financeDownPayment / 100) * (1 + (interestRate/100) * (financeTenure/12))) / financeTenure).toLocaleString()}/mo
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Finance Calculator */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 space-y-8">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Finance <span className="text-indigo-600">Calculator</span></h4>
                                <div className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-[9px] font-black text-indigo-600 uppercase border border-indigo-100">Live Estimate</div>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Down Payment</span>
                                        <span className="text-indigo-600">{financeDownPayment}%</span>
                                    </div>
                                    <input type="range" min="10" max="50" step="5" value={financeDownPayment} onChange={(e) => setFinanceDownPayment(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Tenure (Months)</span>
                                        <span className="text-indigo-600">{financeTenure} Months</span>
                                    </div>
                                    <input type="range" min="12" max="84" step="12" value={financeTenure} onChange={(e) => setFinanceTenure(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { icon: Calendar, label: 'Year', value: vehicle.year },
                                { icon: Gauge, label: 'Mileage', value: `${(vehicle.mileage / 1000).toFixed(0)}k km` },
                                { icon: Settings2, label: 'Gearbox', value: vehicle.transmission },
                                { icon: Fuel, label: 'Fuel', value: vehicle.fuelType },
                            ].map((stat, i) => (
                                <div key={i} className="bg-slate-50 p-6 rounded-[2rem] space-y-2">
                                    <stat.icon className="w-6 h-6 text-slate-400" />
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                        <p className="text-xs font-black text-slate-800 uppercase">{stat.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
                            <ShieldCheck className="absolute top-4 right-4 w-24 h-24 text-white/5 -rotate-12" />
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-xl font-black uppercase tracking-tight italic">Certified Inspection</h3>
                                {vehicle.inspectionReportUrl && (
                                    <button 
                                        onClick={() => window.open(vehicle.inspectionReportUrl, '_blank')}
                                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/20 transition-all"
                                    >
                                        View Full Report PDF
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <div className="text-5xl font-black mb-2">{vehicle.inspectionScore || 95}%</div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Overall Health Score</p>
                                </div>
                                <ul className="space-y-3">
                                    {['Engine Verified', 'Body & Paint', 'Tyre Health', 'AC & Logic'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 mt-12">
                        <button 
                            onClick={() => onBookTestDrive(vehicle)}
                            className="h-20 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-indigo-200 hover:bg-slate-900 transition-all flex items-center justify-center gap-4 group"
                        >
                            Schedule Test Drive <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </button>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => onInquiry(vehicle)}
                                className="h-20 border-2 border-slate-100 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-slate-50 transition-all flex items-center justify-center gap-4 text-slate-900"
                            >
                                <MessageCircle className="w-5 h-5" /> Inquire
                            </button>
                            <button 
                                onClick={() => {
                                    const text = encodeURIComponent(`Hi, I'm interested in the ${vehicle.year} ${vehicle.make} ${vehicle.model} priced at KES ${vehicle.price.toLocaleString()}. Is it still available?`);
                                    window.open(`https://wa.me/${currentInstitution?.phoneNumber?.replace(/\+/g, '')}?text=${text}`, '_blank');
                                }}
                                className="h-20 bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-4"
                            >
                                <MessageCircle className="w-5 h-5" /> WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen">
            {viewMode === 'grid' ? (
                <div className="space-y-12">
                    {/* Header & Hero */}
                    <div className="relative rounded-[4rem] bg-indigo-900 p-20 overflow-hidden">
                        <div className="relative z-10 max-w-2xl space-y-6">
                            <span className="inline-flex items-center gap-2 bg-indigo-500/20 backdrop-blur-md px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-white">
                                <Zap className="w-4 h-4 text-amber-400" /> Discover Your Next Drive
                            </span>
                            <h1 className="text-8xl font-black uppercase tracking-tighter text-white leading-[0.8]">
                                The Future of <br />
                                <span className="text-indigo-400 italic">Auto-Trading</span>
                            </h1>
                            <p className="text-indigo-200 text-lg font-bold tracking-tight max-w-lg">
                                Immersive 360 virtual tours, AI-backed valuations, and concierge home test drives. Elevate your car buying experience.
                            </p>
                        </div>
                        <Car className="absolute bottom-0 right-0 w-[40rem] h-[30rem] -mr-40 -mb-20 text-white/5 -rotate-12" />
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col md:flex-row gap-6 items-center justify-between sticky top-6 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none w-full md:w-auto">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        selectedCategory === cat 
                                        ? 'bg-slate-900 text-white shadow-xl' 
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full md:w-96 group">
                            <input 
                                type="text"
                                placeholder="Search by model, year or make..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-16 pl-14 pr-8 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-4 focus:ring-indigo-100 transition-all"
                            />
                            <Search className="w-5 h-5 absolute left-5 top-5.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        </div>
                    </div>

                    {/* Listings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {filteredListings.length > 0 ? (
                            filteredListings.map(renderListingCard)
                        ) : (
                            <div className="col-span-full py-40 flex flex-col items-center justify-center space-y-6 bg-slate-50 rounded-[4rem]">
                                <Car className="w-20 h-20 text-slate-200" />
                                <div className="text-center">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-400 italic">No vehicles found</h3>
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">Adjust your filters or search terms</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Comparison Tray */}
                    {compareList.length > 0 && (
                        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl p-4 flex items-center gap-8 animate-fade-in-up">
                            <div className="flex gap-3">
                                {compareList.map(item => (
                                    <div key={item.id} className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-indigo-100">
                                        <img src={item.mainImageUrl} className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => setCompareList(prev => prev.filter(c => c.id !== item.id))}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {Array.from({ length: 3 - compareList.length }).map((_, i) => (
                                    <div key={i} className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-200">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                ))}
                            </div>
                            <div className="h-10 w-px bg-slate-100" />
                            <div className="pr-4">
                                <button 
                                    disabled={compareList.length < 2}
                                    onClick={() => setIsComparing(true)}
                                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:grayscale transition-all"
                                >
                                    Compare Now ({compareList.length})
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Comparison Modal */}
                    {isComparing && (
                        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                                <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter">Vehicle <span className="text-indigo-600">Comparison</span></h2>
                                    <button onClick={() => setIsComparing(false)} className="p-3 bg-slate-50 rounded-2xl"><X className="w-6 h-6 text-slate-400" /></button>
                                </div>
                                <div className="p-10 overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr>
                                                <th className="py-6 px-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Specifications</th>
                                                {compareList.map(item => (
                                                    <th key={item.id} className="py-6 px-4 min-w-[200px]">
                                                        <div className="aspect-video rounded-2xl overflow-hidden mb-4 shadow-lg">
                                                            <img src={item.mainImageUrl} className="w-full h-full object-cover" />
                                                        </div>
                                                        <p className="text-lg font-black uppercase tracking-tighter">{item.make} {item.model}</p>
                                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">KES {item.price.toLocaleString()}</p>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {[
                                                { label: 'Year', key: 'year' },
                                                { label: 'Mileage', key: 'mileage', format: (v: any) => `${v.toLocaleString()} KM` },
                                                { label: 'Transmission', key: 'transmission' },
                                                { label: 'Fuel Type', key: 'fuelType' },
                                                { label: 'Body Type', key: 'bodyType' },
                                                { label: 'Engine', key: 'engineSize' },
                                            ].map(row => (
                                                <tr key={row.label}>
                                                    <td className="py-6 px-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">{row.label}</td>
                                                    {compareList.map(item => (
                                                        <td key={item.id} className="py-6 px-4 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                                                            {row.format ? row.format((item as any)[row.key]) : (item as any)[row.key] || 'N/A'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            <tr>
                                                <td className="py-8 px-4"></td>
                                                {compareList.map(item => (
                                                    <td key={item.id} className="py-8 px-4">
                                                        <button 
                                                            onClick={() => { setSelectedVehicle(item); setViewMode('details'); setIsComparing(false); }}
                                                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-indigo-600 transition-all"
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                ))}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : selectedVehicle && (
                renderDetails(selectedVehicle)
            )}
        </div>
    );
};

