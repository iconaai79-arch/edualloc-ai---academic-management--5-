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
    const [inquiryListing, setInquiryListing] = useState<PMListing | null>(null);
    const [inquiryProduct, setInquiryProduct] = useState<RetailInventoryItem | null>(null);
    const [inquiryName, setInquiryName] = useState('');
    const [inquiryPhone, setInquiryPhone] = useState('');
    const [inquiryDate, setInquiryDate] = useState('');
    const [inquirySubmitting, setInquirySubmitting] = useState(false);
    const [inquirySuccess, setInquirySuccess] = useState(false);

    const openInquiry = (listing: PMListing | RetailInventoryItem) => {
        if ('listingType' in listing) {
            setInquiryListing(listing);
            setInquiryProduct(null);
        } else {
            setInquiryProduct(listing);
            setInquiryListing(null);
        }
        setInquiryName('');
        setInquiryPhone('');
        setInquiryDate('');
        setInquirySuccess(false);
    };

    const handleSubmitInquiry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inquiryListing && !inquiryProduct) return;
        setInquirySubmitting(true);

        try {
            if (inquiryListing) {
                const seller = getSeller(inquiryListing.institutionId);
                const isViewingRequired = inquiryListing.listingType === 'Rent' || inquiryListing.listingType === 'Lease';
                const subject = `Marketplace Inquiry: ${inquiryListing.title}`;
                const body = [
                    `Hello ${seller?.name || 'Team'},`,
                    ``,
                    `A potential ${inquiryListing.listingType === 'Sale' ? 'buyer' : 'tenant'} has expressed interest in your listing:`,
                    `Title: ${inquiryListing.title}`,
                    `Price: KES ${inquiryListing.price?.toLocaleString()}`,
                    `Location: ${inquiryListing.location || 'N/A'}`,
                    ``,
                    `Interested Party Details:`,
                    `Name: ${inquiryName}`,
                    `Phone: ${inquiryPhone}`,
                    isViewingRequired && inquiryDate ? `Preferred Viewing Date: ${inquiryDate}` : '',
                ].filter(Boolean).join('\n');

                if (seller?.email) {
                    await apiService.sendEmail(seller.email, subject, body);
                }
            } else if (inquiryProduct) {
                const seller = getSeller(inquiryProduct.institutionId);
                const lead = {
                    institutionId: inquiryProduct.institutionId,
                    customerName: inquiryName,
                    phoneNumber: inquiryPhone,
                    productQuery: inquiryProduct.name,
                    urgency: 'urgent',
                    createdAt: new Date().toISOString()
                };

                await apiService.saveModuleRecord('retail_wishlist', lead);

                if (seller?.email) {
                    try {
                        const subject = `New Product Enquiry: ${inquiryProduct.name}`;
                        const body = `
                            Hello ${seller.name},
                            
                            A customer has enquired about ${inquiryProduct.name} on the marketplace.
                            
                            Details:
                            Name: ${inquiryName}
                            Phone: ${inquiryPhone}
                            Product: ${inquiryProduct.name}
                            Price: KES ${Number(inquiryProduct.srpPrice || inquiryProduct.costPrice || 0).toLocaleString()}
                            
                            Please follow up with the lead.
                        `.trim();
                        await apiService.sendEmail(seller.email, subject, body);
                    } catch (emailErr) {
                        console.warn('Inquiry email notification failed:', emailErr);
                    }
                }
            }

            setInquirySuccess(true);
        } catch (err) {
            console.error('Inquiry submission failed:', err);
            // Handle specific error feedback if needed
            alert('Enquiry submission failed. Please try again later or contact us directly.');
        } finally {
            setInquirySubmitting(false);
        }
    };

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
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 overflow-hidden relative">
                <div className="absolute inset-0 animate-mesh opacity-30"></div>
                <div className="relative z-10">
                    <div className="w-24 h-24 relative mb-8">
                        <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <SparklesIcon className="absolute inset-0 m-auto w-8 h-8 text-indigo-500 animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-[0.4em] italic">Synthesizing</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-shimmer bg-clip-text">Building your futuristic marketplace...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pb-24 md:pb-0">
            {/* ── Marketplace Hero Section ── */}
            <div className="relative min-h-[60vh] md:h-[65vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 animate-mesh opacity-90"></div>

                {/* Floating Elements for "Futuristic" feel */}
                <div className="absolute top-20 left-[10%] w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse-glow"></div>
                <div className="absolute bottom-20 right-[10%] w-96 h-96 bg-rose-500/20 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '-2s' }}></div>

                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>

                <div className="relative z-10 text-center px-6 max-w-5xl mx-auto pt-20">
                    <div className="inline-flex items-center gap-3 glass-morphism px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-white mb-8 animate-float">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                        Quantum Marketplace v2.0
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.85] mb-8 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        Explore the <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-indigo-300">Next Frontier</span>
                    </h1>

                    <p className="text-white/70 text-base md:text-xl font-medium max-w-2xl mx-auto leading-relaxed backdrop-blur-sm p-4 rounded-3xl">
                        Discover premium real estate and curated retail inventory powered by advanced AI matching.
                    </p>
                </div>

                {/* Futuristic Search Container */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-full max-w-5xl px-6 z-20">
                    <div className="glass-morphism p-3 md:p-5 rounded-[3.5rem] flex flex-col md:flex-row gap-3 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)]">
                        <div className="flex-1 relative group">
                            <SearchIcon className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300 group-focus-within:text-white transition-colors" />
                            <input
                                type="text"
                                placeholder="Search the galaxy..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-16 pr-8 py-6 bg-white/5 hover:bg-white/10 focus:bg-white/10 rounded-[2.5rem] font-bold text-white placeholder:text-white/40 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/30 transition-all border-none"
                            />
                        </div>

                        {activeSection === 'properties' && (
                            <div className="hidden md:flex gap-2 p-1 bg-black/20 rounded-[2.5rem]">
                                {(['All', 'Rent', 'Sale', 'Lease'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setFilterType(type)}
                                        className={`px-8 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filterType === type
                                            ? 'bg-white text-slate-900 shadow-xl'
                                            : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        )}

                        <button className="md:w-20 h-16 md:h-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-lg hover:shadow-indigo-500/50 hover:scale-105 transition-all">
                            <ArrowRightIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Section Navigation (Desktop Only) ── */}
            <div className="hidden md:block max-w-[1600px] mx-auto px-8 pt-32 pb-8">
                <div className="flex gap-6 items-center">
                    <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-[2rem] border border-slate-200 dark:border-slate-700 backdrop-blur-xl">
                        <button
                            onClick={() => setActiveSection('properties')}
                            className={`flex items-center gap-3 px-10 py-5 rounded-[1.75rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${activeSection === 'properties'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl scale-105'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                        >
                            <BuildingOfficeIcon className={`w-5 h-5 ${activeSection === 'properties' ? 'text-orange-500' : ''}`} />
                            Properties
                        </button>
                        <button
                            onClick={() => setActiveSection('retail')}
                            className={`flex items-center gap-3 px-10 py-5 rounded-[1.75rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${activeSection === 'retail'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl scale-105'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                        >
                            <ShoppingCartIcon className={`w-5 h-5 ${activeSection === 'retail' ? 'text-indigo-500' : ''}`} />
                            Retail
                        </button>
                    </div>

                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent"></div>
                </div>
            </div>

            {/* ── Mobile Floating Navigation ── */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-sm z-[150] animate-in slide-in-from-bottom-20 duration-1000">
                <div className="glass-morphism p-2 rounded-[2.5rem] flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                    <button
                        onClick={() => setActiveSection('properties')}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-[2rem] transition-all ${activeSection === 'properties' ? 'bg-white text-slate-900' : 'text-white/60'}`}
                    >
                        <BuildingOfficeIcon className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Properties</span>
                    </button>
                    <button
                        onClick={() => setActiveSection('retail')}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-[2rem] transition-all ${activeSection === 'retail' ? 'bg-white text-slate-900' : 'text-white/60'}`}
                    >
                        <ShoppingCartIcon className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Retail</span>
                    </button>
                </div>
            </div>

            {/* ── Property Listings Grid ── */}
            {activeSection === 'properties' && (
                <div className="max-w-[1600px] mx-auto px-8 pb-32">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-16 space-y-4 md:space-y-0">
                        <div>
                            <div className="inline-flex items-center gap-2 text-orange-500 font-black text-[10px] uppercase tracking-[0.4em] mb-4">
                                <div className="w-8 h-[2px] bg-orange-500"></div>
                                Premier Spaces
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Market <br className="md:hidden" /> Insights</h2>
                        </div>
                        <div className="flex gap-4 p-2 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl backdrop-blur-lg">
                            <div className="px-6 py-3 bg-white dark:bg-slate-900 rounded-xl shadow-lg flex items-center gap-3">
                                <MapPinIcon className="w-4 h-4 text-orange-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Global View</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
                        {filteredListings.map(listing => {
                            const seller = getSeller(listing.institutionId);
                            return (
                                <div
                                    key={listing.id}
                                    onClick={() => setSelectedListing(listing)}
                                    className="group relative flex flex-col cursor-pointer"
                                >
                                    {/* Glass Glow effect */}
                                    <div className="absolute -inset-4 bg-gradient-to-br from-orange-500/0 via-orange-500/0 to-orange-500/20 rounded-[4rem] scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-700 blur-2xl"></div>

                                    <div className="relative glass-card rounded-[3.5rem] overflow-hidden transition-all duration-700 group-hover:-translate-y-4 group-hover:shadow-[0_40px_80px_-20px_rgba(249,115,22,0.2)]">
                                        <div className="h-72 relative overflow-hidden">
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

                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>

                                            <div className="absolute top-6 left-6 flex flex-col gap-2">
                                                <span className="glass-morphism px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-white">
                                                    {listing.listingType}
                                                </span>
                                            </div>

                                            <div className="absolute bottom-6 left-8 right-8 flex justify-between items-end">
                                                <div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-orange-400 mb-1">
                                                        <MapPinIcon className="w-3 h-3" />
                                                        {listing.location || 'Cyber District'}
                                                    </div>
                                                    <h3 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">{listing.title}</h3>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-8 pb-10">
                                            <div className="flex items-center gap-6 mb-8">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available</span>
                                                </div>
                                                {listing.isPromoted && (
                                                    <div className="flex items-center gap-2">
                                                        <SparklesIcon className="w-3 h-3 text-amber-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500/80">Prime</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Market Valuation</p>
                                                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">
                                                        <span className="text-sm font-medium not-italic mr-1 text-slate-400 uppercase tracking-normal">KES</span>
                                                        {listing.price?.toLocaleString()}
                                                    </p>
                                                </div>

                                                <div className="w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all duration-500">
                                                    <ArrowRightIcon className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                                </div>
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
                    <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-16 space-y-4 md:space-y-0">
                        <div>
                            <div className="inline-flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.4em] mb-4">
                                <div className="w-8 h-[2px] bg-indigo-500"></div>
                                Curated Retail
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Prime <br className="md:hidden" /> Inventory</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
                        {filteredRetailProducts.map(product => {
                            const seller = getSeller(product.institutionId);
                            return (
                                <div
                                    key={product.id}
                                    onClick={() => setSelectedProduct(product)}
                                    className="group relative flex flex-col cursor-pointer"
                                >
                                    {/* Glass Glow effect */}
                                    <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/20 rounded-[4rem] scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-700 blur-2xl"></div>

                                    <div className="relative glass-card rounded-[3rem] overflow-hidden transition-all duration-700 group-hover:-translate-y-3 group-hover:shadow-[0_40px_80px_-20px_rgba(79,70,229,0.15)]">
                                        <div className="h-60 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
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

                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                            <div className="absolute top-4 left-4">
                                                <span className="glass-morphism px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white">
                                                    {product.category || 'General'}
                                                </span>
                                            </div>

                                            {Number(product.quantity) <= 5 && Number(product.quantity) > 0 && (
                                                <div className="absolute top-4 right-4 flex items-center gap-2 bg-amber-500/90 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg animate-pulse">
                                                    Limited
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-7">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic group-hover:text-indigo-500 transition-colors mb-4 truncate">{product.name}</h3>

                                            {seller && (
                                                <div className="flex items-center gap-2 mb-6">
                                                    <div className="w-5 h-5 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                                        <BuildingOfficeIcon className="w-3 h-3 text-indigo-500" />
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{seller.name}</span>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center pt-5 border-t border-slate-100 dark:border-slate-800/50">
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Price Unit</p>
                                                    <p className="text-2xl font-black text-slate-900 dark:text-white italic mt-0.5">
                                                        <span className="text-xs font-medium not-italic mr-1 text-slate-400">KES</span>
                                                        {Number(product.srpPrice || product.costPrice || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all shadow-lg shadow-indigo-600/20">
                                                    <ArrowRightIcon className="w-5 h-5" />
                                                </div>
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
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-700"
                        onClick={() => setSelectedListing(null)}
                    ></div>
                    <div className="relative w-full max-w-5xl bg-slate-50 dark:bg-slate-950 shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-700 h-full overflow-y-auto">
                        <div className="absolute top-8 left-8 z-30 flex gap-4">
                            <button
                                onClick={() => setSelectedListing(null)}
                                className="p-5 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-[1.5rem] backdrop-blur-xl transition-all shadow-2xl border border-white/10 group"
                            >
                                <XIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>

                        <div className="h-[55vh] relative group overflow-hidden">
                            {selectedListing.images && selectedListing.images[0] ? (
                                <img src={selectedListing.images[0]} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                    <BuildingOfficeIcon className="w-32 h-32 text-slate-800 animate-pulse" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-950/40 to-transparent"></div>

                            <div className="absolute bottom-16 left-12 right-12">
                                <span className="inline-flex items-center gap-2 glass-morphism px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-xl mb-8">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    Premier {selectedListing.listingType}
                                </span>
                                <h2 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter italic leading-none drop-shadow-2xl">
                                    {selectedListing.title}
                                </h2>
                            </div>
                        </div>

                        <div className="p-12 lg:p-20 grid grid-cols-1 lg:grid-cols-3 gap-16 relative">
                            {/* Decorative Background numbers/shapes */}
                            <div className="absolute top-20 right-20 text-[20rem] font-black text-slate-500/5 select-none pointer-events-none italic italic leading-none uppercase tracking-tighter">01</div>

                            <div className="lg:col-span-2 space-y-16">
                                <div className="space-y-6">
                                    <h4 className="inline-block px-4 py-1.5 bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] rounded-lg">Property Architecture</h4>
                                    <p className="text-slate-600 dark:text-slate-400 text-xl md:text-2xl leading-relaxed font-black uppercase tracking-tight italic">
                                        {selectedListing.description}
                                    </p>
                                </div>

                                {selectedListing.features && selectedListing.features.length > 0 && (
                                    <div className="space-y-10">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Core Features</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {selectedListing.features.map(feat => (
                                                <div key={feat} className="group relative glass-card p-8 rounded-[2.5rem] overflow-hidden hover:border-orange-500 transition-all">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-orange-500/0 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <div className="relative flex items-center gap-6">
                                                        <div className="w-12 h-12 rounded-[1.25rem] bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            <SparklesIcon className="w-6 h-6 text-orange-500" />
                                                        </div>
                                                        <span className="text-base font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">{feat}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="p-10 glass-card rounded-[3rem] space-y-8">
                                    <div className="flex items-start gap-6">
                                        <div className="w-16 h-16 rounded-[2rem] bg-slate-900 dark:bg-white flex items-center justify-center flex-shrink-0 text-white dark:text-slate-900">
                                            <MapPinIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Geolocation</h5>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter truncate">
                                                {selectedListing.location || 'Co-ordinates encrypted'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="glass-morphism p-12 rounded-[4rem] sticky top-12 shadow-[0_45px_100px_rgba(0,0,0,0.2)] flex flex-col items-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Unit Valuation</p>
                                    <div className="flex items-baseline gap-2 mb-12">
                                        <span className="text-2xl font-medium text-slate-400">KES</span>
                                        <p className="text-7xl font-black text-slate-900 dark:text-white italic tracking-tighter">
                                            {selectedListing.price?.toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="w-full space-y-4 mb-12">
                                        <div className="flex items-center gap-4 p-5 glass-card rounded-[2rem]">
                                            <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                                <BuildingOfficeIcon className="w-6 h-6 text-indigo-500" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized By</p>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase italic truncate">
                                                    {getSeller(selectedListing.institutionId)?.name || 'Central Agency'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setSelectedListing(null);
                                            openInquiry(selectedListing);
                                        }}
                                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-4"
                                    >
                                        <ShoppingCartIcon className="w-6 h-6" /> Express Interest
                                    </button>
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
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-700"
                        onClick={() => setSelectedProduct(null)}
                    ></div>
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-950 shadow-2xl animate-in slide-in-from-right duration-700 h-full overflow-y-auto">
                        <div className="absolute top-8 right-8 z-30 flex gap-4">
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="p-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all shadow-md group"
                            >
                                <XIcon className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>

                        <div className="h-80 relative group overflow-hidden bg-slate-100 dark:bg-slate-900">
                            {selectedProduct.imageUrl ? (
                                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full bg-indigo-900/10 flex items-center justify-center">
                                    <ShoppingCartIcon className="w-24 h-24 text-indigo-500 animate-pulse" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-950 via-transparent to-transparent"></div>

                            <div className="absolute bottom-8 left-10">
                                <span className="inline-flex items-center gap-2 glass-morphism px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-lg mb-4">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                    {selectedProduct.category || 'Retail'}
                                </span>
                                <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none truncate max-w-lg drop-shadow-sm">
                                    {selectedProduct.name}
                                </h2>
                            </div>
                        </div>

                        <div className="p-10 space-y-10 relative">
                            {selectedProduct.description && (
                                <div className="space-y-4">
                                    <h4 className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-500 text-[9px] font-black uppercase tracking-[0.4em] rounded-lg">Specifications</h4>
                                    <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed font-bold uppercase italic tracking-tight">
                                        {selectedProduct.description}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div className="glass-card p-8 rounded-[2.5rem] border-indigo-500/20 shadow-indigo-500/5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Retail Value</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-medium text-slate-400 uppercase">KES</span>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">
                                            {Number(selectedProduct.srpPrice || selectedProduct.costPrice || 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="glass-card p-8 rounded-[2.5rem]">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Availability</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className={`text-3xl font-black italic tracking-tighter ${Number(selectedProduct.quantity) > 5 ? 'text-emerald-500' : Number(selectedProduct.quantity) > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                                            {selectedProduct.quantity}
                                        </p>
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Units</span>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card p-6 rounded-[2rem] flex items-center gap-6">
                                <div className="w-12 h-12 rounded-[1.25rem] bg-slate-900 dark:bg-white flex items-center justify-center flex-shrink-0 text-white dark:text-slate-900">
                                    <BuildingOfficeIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Retailer</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase italic truncate">
                                        {getSeller(selectedProduct.institutionId)?.name || 'Retail Agency'}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={() => {
                                        setSelectedProduct(null);
                                        openInquiry(selectedProduct);
                                    }}
                                    className="w-full bg-indigo-600 text-white py-8 rounded-[3rem] font-black text-sm uppercase tracking-[0.3em] shadow-[0_25px_60px_-15px_rgba(79,70,229,0.5)] hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-4"
                                >
                                    <ShoppingCartIcon className="w-6 h-6" /> Buy it Now
                                </button>
                                <p className="text-[9px] text-center font-black text-slate-400 uppercase tracking-widest mt-8">Secure encrypted transaction via EduAI Quantum</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Express Interest Modal ── */}
            {(inquiryListing || inquiryProduct) && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-500"
                        onClick={() => {
                            if (!inquirySubmitting) {
                                setInquiryListing(null);
                                setInquiryProduct(null);
                            }
                        }}
                    ></div>
                    <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Header */}
                        <div className={`p-10 text-white relative overflow-hidden ${inquiryProduct ? 'bg-indigo-600' : 'bg-orange-600'}`}>
                            {/* Animated Background shapes */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse"></div>

                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 mb-2">Protocol: Secure Inquiry</p>
                                    <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic leading-none truncate max-w-md">{inquiryListing?.title || inquiryProduct?.name}</h3>
                                    <div className="flex items-center gap-4 mt-6">
                                        <div className="glass-morphism px-4 py-2 rounded-xl">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">Valuation</p>
                                            <p className="text-xl font-black italic leading-none">
                                                KES {inquiryListing ? inquiryListing.price?.toLocaleString() : Number(inquiryProduct?.srpPrice || inquiryProduct?.costPrice || 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="glass-morphism px-4 py-2 rounded-xl">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">Status</p>
                                            <p className="text-xl font-black italic leading-none uppercase">Verified</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setInquiryListing(null); setInquiryProduct(null); }}
                                    className="p-3 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-2xl transition-all backdrop-blur-md"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {inquirySuccess ? (
                            <div className="p-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
                                <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto relative">
                                    <div className="absolute inset-0 bg-emerald-500/20 rounded-[2.5rem] animate-ping opacity-20"></div>
                                    <CheckCircleIcon className="w-12 h-12 text-emerald-500" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Transmission Successful</h4>
                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest max-w-xs mx-auto">
                                        Your signal has been received. Our agents will initialize contact at <span className="text-slate-900 dark:text-white">{inquiryPhone}</span> shortly.
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setInquiryListing(null); setInquiryProduct(null); }}
                                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-6 rounded-3xl font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:scale-105 transition-all"
                                >
                                    Terminate Connection
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitInquiry} className="p-10 space-y-8">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4">Identification</label>
                                        <input
                                            required
                                            type="text"
                                            value={inquiryName}
                                            onChange={e => setInquiryName(e.target.value)}
                                            placeholder="Enter Full Name"
                                            className="w-full p-6 glass-card rounded-[2rem] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 ring-indigo-500 transition-all border-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4">Communication Line</label>
                                        <div className="relative">
                                            <PhoneIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                            <input
                                                required
                                                type="tel"
                                                value={inquiryPhone}
                                                onChange={e => setInquiryPhone(e.target.value)}
                                                placeholder="Mobile Number"
                                                className="w-full pl-16 pr-6 py-6 glass-card rounded-[2rem] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 ring-indigo-500 transition-all border-none"
                                            />
                                        </div>
                                    </div>

                                    {inquiryListing && (inquiryListing.listingType === 'Rent' || inquiryListing.listingType === 'Lease') && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4">
                                                Schedule Inspection
                                            </label>
                                            <input
                                                required
                                                type="date"
                                                value={inquiryDate}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={e => setInquiryDate(e.target.value)}
                                                className="w-full p-6 glass-card rounded-[2rem] font-bold text-slate-900 dark:text-white outline-none focus:ring-2 ring-orange-500 border-none transition-all"
                                            />
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={inquirySubmitting}
                                    className={`w-full py-7 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 text-white ${inquiryProduct ? 'bg-indigo-600 shadow-indigo-600/30' : 'bg-orange-600 shadow-orange-600/30'}`}
                                >
                                    {inquirySubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-5 h-5" />
                                            Initialize Request
                                        </>
                                    )}
                                </button>
                                <p className="text-[9px] text-center font-black text-slate-400 uppercase tracking-widest">Global Marketplace Security Protocol Active</p>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
