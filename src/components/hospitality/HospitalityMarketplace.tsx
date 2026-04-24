
import React, { useState, useMemo } from 'react';
import { 
    Palmtree, 
    Hotel, 
    Plane, 
    Compass, 
    Search, 
    MapPin, 
    Star, 
    Filter, 
    ChevronRight, 
    ArrowRight, 
    Heart,
    Calendar,
    Sparkles,
    CheckCircle,
    Clock,
    Waves,
    Mountain,
    Anchor,
    X,
    Menu
} from 'lucide-react';
import type { Institution } from '../types';

interface HospitalityMarketplaceProps {
    institutions: Institution[];
    onBack: () => void;
    onViewStore: (id: string) => void;
}

const CATEGORIES = [
    { name: 'Beach', icon: Waves, color: 'bg-blue-500' },
    { name: 'Safari', icon: Compass, color: 'bg-orange-500' },
    { name: 'Urban', icon: Building, color: 'bg-slate-500' },
    { name: 'Mountain', icon: Mountain, color: 'bg-emerald-500' },
    { name: 'Experience', icon: Sparkles, color: 'bg-purple-500' },
];

const getDirectUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
        const idMatch = url.match(/\/d\/([^\/]+)/) || url.match(/id=([^\/&]+)/);
        if (idMatch && idMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
        }
    }
    return url;
};

function Building(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

export const HospitalityMarketplace: React.FC<HospitalityMarketplaceProps> = ({ institutions, onBack, onViewStore }) => {
    const [activeTab, setActiveTab] = useState<'All' | 'Safari' | 'Stays' | 'Trips'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [wishlist, setWishlist] = useState<string[]>([]);

    const hospitalityInsts = useMemo(() => {
        return institutions.filter(i => 
            i.institutionType === 'Hospitality' || 
            i.category?.includes('Agency') || 
            i.category?.includes('Hotel') || 
            i.category?.includes('Tours')
        );
    }, [institutions]);

    const filteredInsts = hospitalityInsts.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (activeTab === 'All') return matchesSearch;
        if (activeTab === 'Safari') return matchesSearch && i.category?.includes('Safaris');
        if (activeTab === 'Stays') return matchesSearch && (i.category?.includes('Hotel') || i.category?.includes('Airbnb'));
        if (activeTab === 'Trips') return matchesSearch && i.category?.includes('Agency');
        return matchesSearch;
    });

    const toggleWishlist = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setWishlist(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Header */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                            <ArrowRight className="w-5 h-5 rotate-180" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                                <Waves className="w-6 h-6" />
                            </div>
                            <h1 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Travel <span className="text-indigo-600 italic">Hub</span></h1>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        {['Destinations', 'Safari Guide', 'Partner Stays', 'Offers'].map(item => (
                            <button key={item} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">{item}</button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group hidden lg:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search destinations..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-12 pr-6 py-3 bg-[#f5f5f5] dark:bg-slate-800 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 ring-indigo-600/20 w-64 transition-all"
                            />
                        </div>
                        <button className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-400 relative">
                            <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
                            {wishlist.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="pt-32 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[100%] bg-indigo-600/5 rounded-full blur-[120px] -z-10"></div>
                <div className="max-w-7xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/10 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-fade-in">
                        <Sparkles className="w-4 h-4" /> Discover The Extraordinary
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-7xl md:text-8xl font-black uppercase tracking-tighter text-slate-800 dark:text-white leading-[0.9] mb-8 drop-shadow-sm">
                                Explore <br /> 
                                <span className="text-indigo-600 italic">Unlimited</span> <br /> 
                                Horizons
                            </h2>
                            <p className="text-slate-500 text-lg font-bold leading-relaxed max-w-lg mb-10">
                                Your gateway to the most exclusive safaris, luxury stays, and curated travel experiences across the continent.
                            </p>
                            <div className="flex gap-4">
                                <button className="px-10 py-5 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-100 hover:bg-slate-900 transition-all active:scale-95">
                                    Browse All Packages
                                </button>
                                <button className="px-10 py-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-50 transition-all flex items-center gap-2">
                                    Watch Film <Waves className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Interactive Hero Cards */}
                        <div className="relative group lg:block hidden">
                            <div className="grid grid-cols-2 gap-6 rotate-3 group-hover:rotate-0 transition-transform duration-1000">
                                <div className="space-y-6 translate-y-12">
                                    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden relative">
                                        <img src="https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover opacity-80" alt="Safari" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                        <p className="absolute bottom-8 left-8 text-white font-black uppercase tracking-widest text-[10px]">Maasai Mara</p>
                                    </div>
                                    <div className="h-48 bg-indigo-600 rounded-[3rem] shadow-2xl flex items-center justify-center">
                                        <Palmtree className="w-16 h-16 text-white opacity-20" />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="h-48 bg-slate-900 dark:bg-indigo-900 rounded-[3rem] shadow-2xl flex items-center justify-center">
                                        <Plane className="w-16 h-16 text-white opacity-20" />
                                    </div>
                                    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden relative">
                                        <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover opacity-80" alt="Beach" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                        <p className="absolute bottom-8 left-8 text-white font-black uppercase tracking-widest text-[10px]">Diani Shore</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Marketplace Area */}
            <div className="max-w-7xl mx-auto px-6 py-24">
                {/* Category Carousel */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                    <div>
                        <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Live Destinations</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 italic">Select your preferred adventure style</p>
                    </div>
                    <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        {['All', 'Safari', 'Stays', 'Trips'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {filteredInsts.length > 0 ? filteredInsts.map((inst, idx) => (
                        <div 
                            key={inst.id}
                            onClick={() => onViewStore(inst.id)}
                            className="group bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-3 transition-all cursor-pointer relative"
                        >
                            {/* Card Image Block */}
                            <div className="h-72 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                                <div className="absolute top-8 left-8 z-10">
                                    <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-600 shadow-sm">
                                        {inst.category || 'Hospitality'}
                                    </span>
                                </div>
                                <button 
                                    onClick={(e) => toggleWishlist(inst.id, e)}
                                    className="absolute top-8 right-8 z-10 w-12 h-12 bg-white/20 hover:bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center transition-all group/heart"
                                >
                                    <Heart className={`w-5 h-5 ${wishlist.includes(inst.id) ? 'text-rose-500 fill-rose-500' : 'text-white group-hover/heart:text-rose-500'}`} />
                                </button>
                                
                                <div className="w-full h-full flex items-center justify-center text-slate-200 group-hover:scale-110 transition-transform duration-1000">
                                    {inst.footerImageUrl ? (
                                        <img src={getDirectUrl(inst.footerImageUrl)} className="w-full h-full object-cover" alt={inst.name} />
                                    ) : (
                                        (inst.category?.includes('Safari') || inst.category?.includes('Tours')) ? <Compass className="w-20 h-20" /> : <Hotel className="w-20 h-20" />
                                    )}
                                </div>
                                
                                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/80 to-transparent"></div>
                                
                                <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between text-white">
                                    <div>
                                        <div className="flex items-center gap-1 mb-1">
                                            {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />)}
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Verified Partner</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Starting At</p>
                                        <p className="text-xl font-black italic tracking-tighter">KES {idx % 2 === 0 ? '45,000' : '15,000'}+</p>
                                    </div>
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-10">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-6">
                                    <MapPin className="w-4 h-4" /> Kenya Coast & Parks
                                </div>
                                
                                <h4 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white mb-4 leading-[0.9]">
                                    {inst.name}
                                </h4>
                                
                                <p className="text-sm text-slate-500 font-bold leading-relaxed mb-10 line-clamp-2">
                                    {inst.category?.includes('Agency') 
                                      ? "Expertly crafted tours and legendary safaris since 2018. Explore the wild with our award-winning guides."
                                      : "Experience luxury reimagined. Our estates offer unparalleled views and world-class hospitality services."}
                                </p>

                                <div className="flex items-center gap-4">
                                    <button className="flex-1 py-5 bg-slate-900 dark:bg-slate-800 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 dark:shadow-none active:scale-95">
                                        View Destination
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-32 text-center">
                            <Compass className="w-20 h-20 mx-auto text-slate-200 mb-6 animate-pulse" />
                            <h4 className="text-2xl font-black uppercase tracking-tighter text-slate-800">No Destinations Found</h4>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Try adjusting your filters or search terms</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Newsletter Side Panel / Call to Action */}
            <div className="max-w-7xl mx-auto px-6 mb-24">
                <div className="bg-indigo-600 rounded-[4rem] p-12 md:p-20 text-white relative overflow-hidden shadow-[0_60px_120px_-20px_rgba(79,70,229,0.3)]">
                    <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                        <Waves className="w-[400px] h-[400px]" />
                    </div>
                    <div className="relative z-10 max-w-2xl">
                        <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-8">
                            Unforgettable <br /> Memories <span className="italic">Await</span>
                        </h3>
                        <p className="text-indigo-100 text-lg font-bold mb-12 opacity-80 leading-relaxed">
                            Join over 12,000 travelers who receive exclusive early-access to seasonal safari offers and boutique stay launches.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input 
                                type="email" 
                                placeholder="Enter your email" 
                                className="flex-1 bg-white/10 backdrop-blur border border-white/20 rounded-[2rem] px-8 py-5 text-white placeholder:text-white/40 focus:bg-white/20 outline-none transition-all"
                            />
                            <button className="px-10 py-5 bg-white text-indigo-600 rounded-[2.5rem] font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-slate-900 hover:text-white transition-all">
                                Subscribe Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-24">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-10">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl">H</div>
                        <span className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Travel Hub</span>
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px] mb-12">Premier Hospitality Marketplace • 2026 Edition</p>
                    <div className="flex gap-10">
                        {['Adventure', 'Stays', 'Privacy', 'Network'].map(item => (
                            <button key={item} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all">{item}</button>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};
