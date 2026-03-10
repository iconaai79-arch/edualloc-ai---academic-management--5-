import React, { useState, useEffect } from 'react';
import { PMListing, PMListingStatus, PMListingType, Institution, RetailInventoryItem } from '../types';
import { apiService } from '../services/apiService';
import {
    HomeIcon, SearchIcon, MapPinIcon, ShoppingCartIcon,
    SparklesIcon, PhoneIcon, EnvelopeIcon, ArrowRightIcon,
    XIcon, BuildingOfficeIcon,
    CurrencyIcon, CheckCircleIcon, StarIcon
} from './icons/index';

interface PropertyMarketplaceViewProps {
    onInquire?: (listing: PMListing) => void;
}

export const PropertyMarketplaceView: React.FC<PropertyMarketplaceViewProps> = ({ onInquire }) => {
    const [listings, setListings] = useState<PMListing[]>([]);
    const [retailProducts, setRetailProducts] = useState<RetailInventoryItem[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<PMListingType | 'All'>('All');
    const [activeSection, setActiveSection] = useState<'properties' | 'retail'>('properties');
    const [selectedListing, setSelectedListing] = useState<PMListing | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<RetailInventoryItem | null>(null);

    useEffect(() => {
        const loadMarketplace = async () => {
            setLoading(true);
            try {
                // Fetch all active/published property listings across all institutions
                const allListings = await apiService.fetchModuleRecords<PMListing>('pm_listings', 'ALL');
                const activeListings = allListings.filter(l => l.status === 'Active' || l.status === 'Published');

                // Fetch all retail inventory items that are marked as live on market
                const allRetailItems = await apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', 'ALL');
                const liveRetailItems = allRetailItems.filter(item => item.marketplaceEnabled === true);

                // Fetch institution details to show seller info
                const instList = await apiService.fetchModuleRecords<Institution>('institutions', 'ALL');

                setListings(activeListings);
                setRetailProducts(liveRetailItems);
                setInstitutions(instList);
            } catch (e) {
                console.error("Marketplace Load Error:", e);
            }
            setLoading(false);
        };
        loadMarketplace();
    }, []);

    const filteredListings = listings.filter(l => {
        const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.location?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'All' || l.listingType === filterType;
        return matchesSearch && matchesType;
    });

    const filteredRetailProducts = retailProducts.filter(p => {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q);
    });

    const getSeller = (instId: string) => institutions.find(i => i.id === instId);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">Scanning the Market...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
            {/* ── Marketplace Hero Section ── */}
            <div className="relative h-[50vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-rose-600 to-amber-500 animate-gradient-xy"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>

                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 text-white text-[10px] font-black uppercase tracking-widest mb-6 shadow-xl animate-in slide-in-from-top duration-700">
                        <SparklesIcon className="w-4 h-4 text-amber-300" />
                        EduAI Premium Marketplace
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic mb-6 drop-shadow-2xl animate-in zoom-in-95 duration-700">
                        Find Your Next <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-white">Dream Space</span>
                    </h1>
                    <p className="text-white/80 text-lg font-medium max-w-xl mx-auto leading-relaxed animate-in slide-in-from-bottom duration-700">
                        Browse exclusive property listings and retail products from verified businesses.
                    </p>
                </div>

                {/* Search Bar Floating */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 animate-in slide-in-from-bottom-10 duration-1000">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-4 flex flex-col md:flex-row gap-4 border border-slate-100 dark:border-slate-800 backdrop-blur-xl bg-white/90 dark:bg-slate-900/90">
                        <div className="flex-1 relative">
                            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by area, product, title, or keywords..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl font-bold text-slate-600 outline-none focus:ring-4 ring-orange-500/10 transition-all border-none"
                            />
                        </div>
                        {activeSection === 'properties' && (
                            <div className="flex gap-2">
                                {(['All', 'Rent', 'Sale', 'Lease'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setFilterType(type)}
                                        className={`px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${filterType === type
                                            ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/30'
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Section Tabs ── */}
            <div className="max-w-[1600px] mx-auto px-8 pt-24 pb-6">
                <div className="flex gap-4 w-fit bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveSection('properties')}
                        className={`flex items-center gap-2 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSection === 'properties'
                            ? 'bg-white dark:bg-slate-900 text-orange-600 shadow-lg border border-slate-200 dark:border-slate-700'
                            : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <BuildingOfficeIcon className="w-4 h-4" />
                        Properties & Spaces
                        {listings.length > 0 && (
                            <span className="bg-orange-100 text-orange-600 text-[9px] px-2 py-0.5 rounded-full font-black">{listings.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveSection('retail')}
                        className={`flex items-center gap-2 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSection === 'retail'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-lg border border-slate-200 dark:border-slate-700'
                            : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <ShoppingCartIcon className="w-4 h-4" />
                        Retail Products
                        {retailProducts.length > 0 && (
                            <span className="bg-indigo-100 text-indigo-600 text-[9px] px-2 py-0.5 rounded-full font-black">{retailProducts.length}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Property Listings Grid ── */}
            {activeSection === 'properties' && (
                <div className="max-w-[1600px] mx-auto px-8 pb-32">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Featured Listings</h2>
                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.3em] mt-2">Discover verified properties in your area</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-slate-400">
                                <SparklesIcon className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                        {filteredListings.map(listing => {
                            const seller = getSeller(listing.institutionId);
                            return (
                                <div
                                    key={listing.id}
                                    onClick={() => setSelectedListing(listing)}
                                    className="group bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden cursor-pointer hover:-translate-y-4 transition-all duration-700 relative"
                                >
                                    <div className="h-64 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
                                        {listing.images && listing.images[0] ? (
                                            <img
                                                src={listing.images[0]}
                                                alt={listing.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-300">
                                                <BuildingOfficeIcon className="w-16 h-16 opacity-20" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                        <div className="absolute top-6 left-6 flex flex-col gap-2">
                                            <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg text-slate-900 dark:text-white">
                                                {listing.listingType}
                                            </span>
                                            {listing.isPromoted && (
                                                <span className="bg-amber-400 text-amber-900 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
                                                    <SparklesIcon className="w-3 h-3" /> Promoted
                                                </span>
                                            )}
                                        </div>

                                        <div className="absolute bottom-6 left-6 text-white transform translate-y-10 group-hover:translate-y-0 transition-transform duration-500 delay-100">
                                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/80">
                                                <MapPinIcon className="w-3 h-3" />
                                                {listing.location || 'Location Hidden'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic group-hover:text-orange-500 transition-colors">{listing.title}</h3>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{listing.listingType}</p>
                                            </div>
                                            <button className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-300 hover:text-amber-500 transition-colors">
                                                <StarIcon className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-6 mb-8 text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <HomeIcon className="w-4 h-4 text-orange-500" />
                                                <span className="text-[10px] font-black uppercase tracking-wider">Verified</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                                                <span className="text-[10px] font-black uppercase tracking-wider">Ready</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-6 border-t border-slate-50 dark:border-slate-800">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing</p>
                                                <p className="text-2xl font-black text-slate-900 dark:text-white italic mt-1">
                                                    <span className="text-sm font-bold not-italic mr-1 uppercase text-slate-400">KES</span>
                                                    {listing.price?.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all">
                                                <ArrowRightIcon className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredListings.length === 0 && (
                            <div className="col-span-full py-40 flex flex-col items-center text-center">
                                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-8 shadow-inner">
                                    <SearchIcon className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic mb-2">No Matching Spaces</h3>
                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Try adjusting your filters or search keywords</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Retail Products Grid ── */}
            {activeSection === 'retail' && (
                <div className="max-w-[1600px] mx-auto px-8 pb-32">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Retail Products</h2>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-2">Live products from verified retailers</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredRetailProducts.map(product => {
                            const seller = getSeller(product.institutionId);
                            return (
                                <div
                                    key={product.id}
                                    onClick={() => setSelectedProduct(product)}
                                    className="group bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden cursor-pointer hover:-translate-y-3 transition-all duration-700"
                                >
                                    <div className="h-52 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <ShoppingCartIcon className="w-16 h-16 opacity-20" />
                                            </div>
                                        )}
                                        <span className="absolute top-4 left-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                                            {product.category || 'General'}
                                        </span>
                                        {Number(product.quantity) <= 5 && Number(product.quantity) > 0 && (
                                            <span className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg animate-pulse">
                                                Low Stock
                                            </span>
                                        )}
                                        {Number(product.quantity) === 0 && (
                                            <span className="absolute top-4 right-4 bg-rose-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                                                Out of Stock
                                            </span>
                                        )}
                                    </div>

                                    <div className="p-7">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic group-hover:text-indigo-500 transition-colors mb-1 truncate">{product.name}</h3>
                                        {seller && (
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 truncate">by {seller.name}</p>
                                        )}
                                        {product.description && (
                                            <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4">{product.description}</p>
                                        )}

                                        <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-800">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Retail Price</p>
                                                <p className="text-xl font-black text-slate-900 dark:text-white italic mt-0.5">
                                                    <span className="text-xs font-bold not-italic mr-1 text-slate-400">KES</span>
                                                    {Number(product.srpPrice || product.unitCost || 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all">
                                                <ArrowRightIcon className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredRetailProducts.length === 0 && (
                            <div className="col-span-full py-40 flex flex-col items-center text-center">
                                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-8 shadow-inner">
                                    <ShoppingCartIcon className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic mb-2">No Retail Products</h3>
                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                                    {searchQuery ? 'Try adjusting your search keywords' : 'No products are currently live on the marketplace'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Property Listing Detail Panel ── */}
            {selectedListing && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500"
                        onClick={() => setSelectedListing(null)}
                    ></div>
                    <div className="relative w-full max-w-4xl bg-white dark:bg-slate-950 shadow-2xl animate-in slide-in-from-right duration-700 h-full overflow-y-auto">
                        <button
                            onClick={() => setSelectedListing(null)}
                            className="absolute top-8 left-8 z-10 p-4 bg-white/20 hover:bg-white text-white hover:text-slate-900 rounded-full backdrop-blur-xl transition-all shadow-2xl border border-white/30"
                        >
                            <XIcon className="w-8 h-8" />
                        </button>

                        <div className="h-[50vh] relative">
                            {selectedListing.images && selectedListing.images[0] ? (
                                <img src={selectedListing.images[0]} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                    <BuildingOfficeIcon className="w-32 h-32 text-slate-800" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                            <div className="absolute bottom-12 left-12 right-12">
                                <span className="bg-orange-500 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
                                    {selectedListing.listingType}
                                </span>
                                <h2 className="text-6xl font-black text-white uppercase tracking-tighter italic mt-6 drop-shadow-2xl">
                                    {selectedListing.title}
                                </h2>
                                <p className="text-white/80 text-lg font-bold uppercase tracking-widest mt-4 flex items-center gap-2">
                                    <MapPinIcon className="w-6 h-6 text-orange-400" />
                                    {selectedListing.location || 'Location details on inquiry'}
                                </p>
                            </div>
                        </div>

                        <div className="p-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                            <div className="lg:col-span-2 space-y-12">
                                <div>
                                    <h4 className="text-xs font-black text-orange-600 uppercase tracking-[0.3em] mb-4">Property Description</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed font-medium">
                                        {selectedListing.description}
                                    </p>
                                </div>

                                {selectedListing.features && selectedListing.features.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-black text-orange-600 uppercase tracking-[0.3em] mb-6">Premium Features</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            {selectedListing.features.map(feat => (
                                                <div key={feat} className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-orange-500 transition-colors">
                                                    <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                                        <SparklesIcon className="w-4 h-4 text-orange-600" />
                                                    </div>
                                                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{feat}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl sticky top-8">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Offering Price</p>
                                    <p className="text-5xl font-black text-slate-900 dark:text-white italic text-center mb-10">
                                        <span className="text-xl not-italic mr-2 text-slate-400">KES</span>
                                        {selectedListing.price?.toLocaleString()}
                                    </p>

                                    <div className="space-y-4 mb-10">
                                        <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                                            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                                <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Managed By</p>
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase italic truncate">
                                                    {getSeller(selectedListing.institutionId)?.name || 'Agency'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            const seller = getSeller(selectedListing.institutionId);
                                            alert(`Inquiry sent to ${seller?.name}. They will reach you via your profile details.`);
                                            setSelectedListing(null);
                                        }}
                                        className="w-full bg-black dark:bg-orange-600 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        <ShoppingCartIcon className="w-5 h-5" /> Express Interest
                                    </button>

                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <button className="py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                                            <StarIcon className="w-4 h-4" /> Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Retail Product Detail Panel ── */}
            {selectedProduct && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500"
                        onClick={() => setSelectedProduct(null)}
                    ></div>
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-950 shadow-2xl animate-in slide-in-from-right duration-700 h-full overflow-y-auto">
                        <button
                            onClick={() => setSelectedProduct(null)}
                            className="absolute top-8 right-8 z-10 p-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all shadow-md"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>

                        <div className="h-72 relative">
                            {selectedProduct.imageUrl ? (
                                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-indigo-900 flex items-center justify-center">
                                    <ShoppingCartIcon className="w-24 h-24 text-indigo-700" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                            <div className="absolute bottom-8 left-8">
                                <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                                    {selectedProduct.category || 'General'}
                                </span>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic mt-4 drop-shadow-xl">
                                    {selectedProduct.name}
                                </h2>
                            </div>
                        </div>

                        <div className="p-10 space-y-8">
                            {selectedProduct.description && (
                                <div>
                                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em] mb-3">About this Product</h4>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{selectedProduct.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Retail Price</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white italic mt-1">
                                        KES {Number(selectedProduct.srpPrice || selectedProduct.unitCost || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Available Stock</p>
                                    <p className={`text-2xl font-black italic mt-1 ${Number(selectedProduct.quantity) > 5 ? 'text-emerald-600' : Number(selectedProduct.quantity) > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {selectedProduct.quantity} Units
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Sold by</p>
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase italic">
                                    {getSeller(selectedProduct.institutionId)?.name || 'Retail Agency'}
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    const seller = getSeller(selectedProduct.institutionId);
                                    alert(`Order inquiry sent to ${seller?.name || 'the retailer'}. They will reach out with payment instructions.`);
                                    setSelectedProduct(null);
                                }}
                                className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <ShoppingCartIcon className="w-5 h-5" /> Inquire to Purchase
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
