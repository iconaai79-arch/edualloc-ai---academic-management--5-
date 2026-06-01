
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
    Menu,
    Building2 as BuildingIcon
} from 'lucide-react';
import type { Institution } from '../../types';
import { apiService } from '../../services/apiService';
import { getGoogleDriveDirectUrl, getFirstImage } from '../../utils/googleDriveUtils';

interface HospitalityMarketplaceProps {
    institutions: Institution[];
    onBack: () => void;
    onViewStore: (id: string) => void;
}

const CATEGORIES = [
    { name: 'Beach', icon: Waves, color: 'bg-blue-500' },
    { name: 'Safari', icon: Compass, color: 'bg-orange-500' },
    { name: 'Urban', icon: BuildingIcon, color: 'bg-slate-500' },
    { name: 'Mountain', icon: Mountain, color: 'bg-emerald-500' },
    { name: 'Experience', icon: Sparkles, color: 'bg-purple-500' },
];

// Removed local getDirectUrl as it is now centralized


export const HospitalityMarketplace: React.FC<HospitalityMarketplaceProps> = ({ institutions, onBack, onViewStore }) => {
    const [activeTab, setActiveTab] = useState<'All' | 'Safari' | 'Stays' | 'Trips' | 'Offers' | 'Beach' | 'Urban' | 'Mountain' | 'Experience'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [wishlist, setWishlist] = useState<string[]>([]);
    const [allPackages, setAllPackages] = useState<any[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const hospitalityInsts = useMemo(() => {
        return institutions.filter(i => 
            i.institutionId === 'all' || // Support for catch-all filters if any
            i.institutionType === 'Hospitality' || 
            i.category?.includes('Agency') || 
            i.category?.includes('Hotel') || 
            i.category?.includes('Tours')
        );
    }, [institutions]);

    const filteredInsts = useMemo(() => {
        return hospitalityInsts.filter(i => {
            const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
            const cat = (i.category || '').toLowerCase();
            
            if (activeTab === 'All') return matchesSearch;
            if (activeTab === 'Safari') return matchesSearch && (cat.includes('safari') || cat.includes('guide') || cat.includes('wild') || cat.includes('park') || cat.includes('game'));
            if (activeTab === 'Stays') return matchesSearch && (cat.includes('hotel') || cat.includes('airbnb') || cat.includes('resort') || cat.includes('stay') || cat.includes('villa') || cat.includes('camp') || cat.includes('lodge'));
            if (activeTab === 'Trips') return matchesSearch && (cat.includes('agency') || cat.includes('tour') || cat.includes('trip') || cat.includes('travel') || cat.includes('excursion') || cat.includes('adventure'));
            if (activeTab === 'Offers') return matchesSearch && (cat.includes('discount') || cat.includes('offer') || cat.includes('promo') || cat.includes('deal') || cat.includes('exclusive'));
            if (activeTab === 'Beach') return matchesSearch && (cat.includes('beach') || cat.includes('ocean') || cat.includes('coast') || cat.includes('sea') || cat.includes('shore'));
            if (activeTab === 'Urban') return matchesSearch && (cat.includes('city') || cat.includes('urban') || cat.includes('town') || cat.includes('cbd'));
            if (activeTab === 'Mountain') return matchesSearch && (cat.includes('mountain') || cat.includes('hiking') || cat.includes('climb') || cat.includes('hill') || cat.includes('peak'));
            if (activeTab === 'Experience') return matchesSearch && (cat.includes('experience') || cat.includes('activity') || cat.includes('culture') || cat.includes('workshop') || cat.includes('event'));
            return matchesSearch;
        });
    }, [hospitalityInsts, searchQuery, activeTab]);

    const institutionPackageImages = useMemo(() => {
        const map: Record<string, string> = {};
        if (allPackages && Array.isArray(allPackages)) {
            allPackages.forEach(pkg => {
                if (pkg && pkg.institutionId && !map[pkg.institutionId]) {
                    const img = getFirstImage(pkg.images);
                    if (img) {
                        map[pkg.institutionId] = img;
                    }
                }
            });
        }
        return map;
    }, [allPackages]);

    const featuredItems = useMemo(() => {
        return [...allPackages].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);
    }, [allPackages]);

    const [limit, setLimit] = useState(12);

    React.useEffect(() => {
        const loadData = async () => {
            setLoadingItems(true);
            try {
                // Fetch packages with limit
                const items = await apiService.fetchModuleRecords('hospitality_items', undefined, limit);
                setAllPackages(items);
            } catch (err) {
                console.error("Marketplace Data Load Error:", err);
            } finally {
                setLoadingItems(false);
            }
        };
        loadData();
    }, [limit]);


    const handleNavbarClick = (item: string) => {
        if (item === 'Destinations' || item === 'All') setActiveTab('All');
        else if (item === 'Safari Guide') setActiveTab('Safari');
        else if (item === 'Partner Stays' || item === 'Stays') setActiveTab('Stays');
        else if (item === 'Excursions' || item === 'Trips') setActiveTab('Trips');
        else if (item === 'Offers') setActiveTab('Offers');
        setIsMobileMenuOpen(false);
        
        // Scroll to results with a slight delay to allow state update
        setTimeout(() => {
            const element = document.getElementById('destinations-grid');
            if (element) {
                const offset = 120;
                const bodyRect = document.body.getBoundingClientRect().top;
                const elementRect = element.getBoundingClientRect().top;
                const elementPosition = elementRect - bodyRect;
                const offsetPosition = elementPosition - offset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        }, 100);
    };

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
                        <div 
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => { setActiveTab('All'); setSearchQuery(''); }}
                        >
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 group-hover:scale-110 transition-transform">
                                <Waves className="w-6 h-6" />
                            </div>
                            <h1 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Travel <span className="text-indigo-600 italic">Hub</span></h1>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        {['Destinations', 'Safari Guide', 'Partner Stays', 'Excursions', 'Offers'].map(item => (
                            <button 
                                key={item} 
                                onClick={() => handleNavbarClick(item)}
                                className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                                    (item === 'Destinations' && activeTab === 'All') || 
                                    (item === 'Safari Guide' && activeTab === 'Safari') || 
                                    (item === 'Partner Stays' && activeTab === 'Stays') || 
                                    (item === 'Excursions' && activeTab === 'Trips') || 
                                    (item === 'Offers' && activeTab === 'Offers')
                                    ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'
                                }`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400"
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                        <button className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-400 relative">
                            <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
                            {wishlist.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 animate-in slide-in-from-top duration-300">
                        <div className="p-6 space-y-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search destinations..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-6 py-3 bg-[#f5f5f5] dark:bg-slate-800 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {['Destinations', 'Safari Guide', 'Partner Stays', 'Excursions', 'Offers'].map(item => (
                                    <button 
                                        key={item} 
                                        onClick={() => handleNavbarClick(item)}
                                        className={`p-4 rounded-2xl text-[9px] font-black uppercase tracking-widest text-left transition-all ${
                                            (item === 'Destinations' && activeTab === 'All') || 
                                            (item === 'Safari Guide' && activeTab === 'Safari') || 
                                            (item === 'Partner Stays' && activeTab === 'Stays') || 
                                            (item === 'Excursions' && activeTab === 'Trips') || 
                                            (item === 'Offers' && activeTab === 'Offers')
                                            ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'
                                        }`}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <div className="pt-32 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[100%] bg-indigo-600/5 rounded-full blur-[120px] -z-10"></div>
                <div className="max-w-7xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/10 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-fade-in">
                        <Sparkles className="w-4 h-4" /> Discover The Extraordinary
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="text-center lg:text-left">
                            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter text-slate-800 dark:text-white leading-[0.9] mb-8 drop-shadow-sm">
                                Explore <br /> 
                                <span className="text-indigo-600 italic">Unlimited</span> <br /> 
                                Horizons
                            </h2>
                            <p className="text-slate-500 text-sm md:text-lg font-bold leading-relaxed max-w-lg mb-10 mx-auto lg:mx-0">
                                Your gateway to the most exclusive safaris, luxury stays, and curated travel experiences across the continent.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <button 
                                    onClick={() => handleNavbarClick('Destinations')}
                                    className="px-10 py-5 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-100 hover:bg-slate-900 transition-all active:scale-95"
                                >
                                    Browse All Packages
                                </button>
                                <button className="px-10 py-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                    Watch Film <Waves className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Interactive Hero Cards */}
                        <div className="relative group md:block hidden">
                            <div className="grid grid-cols-2 gap-6 rotate-3 group-hover:rotate-0 transition-transform duration-1000">
                                <div className="space-y-6 translate-y-12">
                                    <div className="h-48 lg:h-64 bg-slate-200 dark:bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden relative">
                                        <img loading="lazy" src="https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover opacity-80" alt="Safari" />
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
                                        <img loading="lazy" src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover opacity-80" alt="Beach" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                        <p className="absolute bottom-8 left-8 text-white font-black uppercase tracking-widest text-[10px]">Diani Shore</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-24">
                
                {/* Featured Packages Section */}
                {featuredItems.length > 0 && (
                    <div className="max-w-7xl mx-auto px-6 mb-24 animate-fade-in">
                        <div className="flex justify-between items-end mb-10">
                            <div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Trending Experiences</h3>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">The most sought-after packages this season</p>
                            </div>
                            <div className="flex gap-2">
                                 <div className="h-1 w-20 bg-indigo-100 rounded-full overflow-hidden">
                                     <div className="h-full bg-indigo-600 w-1/3"></div>
                                 </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {featuredItems.map((item) => (
                                <div key={item.id} className="group bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all cursor-pointer" onClick={() => onViewStore(item.institutionId)}>
                                    <div className="h-56 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                        <Compass className="w-12 h-12" />
                                        {getFirstImage(item.images) && (
                                            <img loading="lazy" 
                                                src={getGoogleDriveDirectUrl(getFirstImage(item.images))} 
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                                alt={item.name} 
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        )}
                                    </div>
                                        <div className="absolute top-6 left-6 z-10">
                                            <span className="bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-white">{item.category}</span>
                                        </div>
                                    </div>
                                    <div className="p-8">
                                        <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white mb-2 leading-none">{item.name}</h4>
                                        <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-50 dark:border-slate-800">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                <span className="text-[10px] font-black text-slate-400">{item.rating || '4.9'}</span>
                                            </div>
                                            <p className="text-sm font-black text-indigo-600">KES {item.price ? item.price?.toLocaleString() : '0'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Category Carousel */}
                <div className="flex flex-col lg:flex-row justify-between items-center lg:items-end mb-16 gap-8">
                    <div className="text-center lg:text-left">
                        <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Live Destinations</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 italic">Select your preferred adventure style</p>
                    </div>
                    <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto max-w-full scrollbar-none">
                        <div className="flex gap-2 min-w-max">
                            {['All', 'Beach', 'Safari', 'Stays', 'Trips', 'Urban', 'Mountain', 'Experience', 'Offers'].map(tab => {
                                const category = CATEGORIES.find(c => c.name === tab) || 
                                               (tab === 'Stays' ? { icon: Hotel } : 
                                                tab === 'Trips' ? { icon: Plane } : 
                                                tab === 'Offers' ? { icon: Sparkles } : 
                                                tab === 'All' ? { icon: Compass } : null);
                                const Icon = category?.icon || Compass;
                                
                                return (
                                    <button 
                                        key={tab}
                                        onClick={() => {
                                            setActiveTab(tab as any);
                                            // Scroll to results
                                            const element = document.getElementById('destinations-grid');
                                            if (element) {
                                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }
                                        }}
                                        className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 group/tab ${
                                            activeTab === tab 
                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' 
                                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 transition-transform group-hover/tab:scale-110 ${activeTab === tab ? 'text-white' : 'text-indigo-500'}`} />
                                        {tab}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div id="destinations-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 scroll-mt-32">
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
                                    {(() => {
                                        const isSafari = inst.category?.includes('Safari') || inst.category?.includes('Tours');
                                        return (
                                            <>
                                                {isSafari ? <Compass className="w-20 h-20" /> : <Hotel className="w-20 h-20" />}
                                                {(() => {
                                                    const displayUrl = inst.footerImageUrl || inst.logoUrl || institutionPackageImages[inst.id];
                                                    if (displayUrl && displayUrl !== 'null' && displayUrl !== 'undefined') {
                                                        return (
                                                            <img loading="lazy" 
                                                                src={getGoogleDriveDirectUrl(displayUrl)} 
                                                                className="absolute inset-0 w-full h-full object-cover" 
                                                                alt={inst.name} 
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                }}
                                                            />
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </>
                                        );
                                    })()}
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

                {allPackages.length >= limit && (
                    <div className="mt-20 flex justify-center">
                        <button 
                            onClick={() => setLimit(prev => prev + 12)}
                            className="px-12 py-5 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-100 hover:bg-slate-900 transition-all active:scale-95 flex items-center gap-3"
                        >
                            <Menu className="w-5 h-5 animate-spin-slow" />
                            Sync More Destinations
                        </button>
                    </div>
                )}
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

