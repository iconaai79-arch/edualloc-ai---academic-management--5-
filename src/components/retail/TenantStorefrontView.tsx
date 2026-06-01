import React, { useState, useEffect } from 'react';
import { PMListing, PMListingStatus, PMListingType, Institution, RetailInventoryItem, PMInquiry, RetailWishlist, AssessmentMark, CarListing } from '../../types';
import { apiService } from '../../services/apiService';
import { getInstitutionEmailConfig } from '../../services/emailService';
import { HomeIcon } from '../icons/HomeIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { MapPinIcon } from '../icons/MapPinIcon';
import { ShoppingCartIcon } from '../icons/ShoppingCartIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { EnvelopeIcon } from '../icons/EnvelopeIcon';
import { XIcon } from '../icons/XIcon';
import { BuildingOfficeIcon } from '../icons/BuildingOfficeIcon';
import { CheckBadgeIcon } from '../icons/CheckBadgeIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { GlobeAltIcon } from '../icons/GlobeAltIcon';
import { CarIcon } from '../icons/CarIcon';
import { VehicleMarketplaceView } from '../VehicleMarketplaceView';

interface TenantStorefrontViewProps {
    institutionId: string;
}

export const TenantStorefrontView: React.FC<TenantStorefrontViewProps> = ({ institutionId }) => {
    const [tenant, setTenant] = useState<Institution | null>(null);
    const [listings, setListings] = useState<PMListing[]>([]);
    const [retailProducts, setRetailProducts] = useState<RetailInventoryItem[]>([]);
    const [carListings, setCarListings] = useState<CarListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState<'retail' | 'properties' | 'vehicles'>('retail');
    const [selectedListing, setSelectedListing] = useState<PMListing | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<RetailInventoryItem | null>(null);
    
    // Inquiry State
    const [inquiryListing, setInquiryListing] = useState<PMListing | null>(null);
    const [inquiryProduct, setInquiryProduct] = useState<RetailInventoryItem | null>(null);
    const [inquiryName, setInquiryName] = useState('');
    const [inquiryPhone, setInquiryPhone] = useState('');
    const [inquiryDate, setInquiryDate] = useState('');
    const [inquirySubmitting, setInquirySubmitting] = useState(false);
    const [inquirySuccess, setInquirySuccess] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isGeneralContact, setIsGeneralContact] = useState(false);

    useEffect(() => {
        const loadStorefront = async () => {
            setLoading(true);
            try {
                // Fetch Tenant Details (Dual Lookup: ID or Slug)
                let resolvedTenant: Institution | null = null;
                
                // Try direct ID lookup first
                const institutionsById = await apiService.fetchModuleRecords<Institution>('institutions', undefined, undefined, { filter: { id: institutionId } });
                if (institutionsById && institutionsById.length > 0) {
                    resolvedTenant = institutionsById[0];
                } else {
                    // Try slug lookup
                    const institutionsBySlug = await apiService.fetchModuleRecords<Institution>('institutions', undefined, undefined, { filter: { slug: institutionId } });
                    if (institutionsBySlug && institutionsBySlug.length > 0) {
                        resolvedTenant = institutionsBySlug[0];
                    }
                }

                if (resolvedTenant) {
                    setTenant(resolvedTenant);
                    // Use the resolved unique ID for subsequent item fetches
                    const [instListings, instRetail, instCars, agroProducts, agroBatches] = await Promise.all([
                        apiService.fetchModuleRecords<PMListing>('pm_listings', resolvedTenant.id),
                        apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', resolvedTenant.id),
                        apiService.fetchCarListings(resolvedTenant.id, 'all'),
                        (resolvedTenant.institutionType === 'Agrovet' || resolvedTenant.category === 'Agrovet') ? apiService.fetchModuleRecords('agrovet_products', resolvedTenant.id) : Promise.resolve([]),
                        (resolvedTenant.institutionType === 'Agrovet' || resolvedTenant.category === 'Agrovet') ? apiService.fetchModuleRecords('agrovet_batches', resolvedTenant.id) : Promise.resolve([])
                    ]);

                    setListings((instListings || []).filter((l: any) => l.status === 'Active' || l.status === 'Published'));
                    
                    let products = (instRetail || []).filter((item: any) => item.marketplaceEnabled === true);
                    
                    if (agroProducts && agroProducts.length > 0) {
                        const mappedAgro = agroProducts.map((p: any) => {
                            const productBatches = (agroBatches || []).filter((b: any) => b.productId === p.id);
                            // Find latest batch or first one
                            const activeBatch = productBatches.sort((a: any, b: any) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime())[0];
                            return {
                                id: p.id,
                                institutionId: p.institutionId,
                                name: p.name,
                                description: p.description,
                                category: p.category,
                                sku: `AGRO-${p.id.slice(0, 4)}`,
                                costPrice: activeBatch?.costPrice || 0,
                                basePrice: activeBatch?.sellingPrice || 0,
                                srpPrice: activeBatch?.sellingPrice || 0,
                                quantity: p.currentStock || 0,
                                unit: p.unitType || 'unit',
                                marketplaceEnabled: true,
                                reorderLevel: p.reorderLevel || 0,
                                bufferStock: 0,
                                viewCount: 0,
                                inquiryCount: 0,
                                createdAt: new Date().toISOString()
                            } as RetailInventoryItem;
                        });
                        products = [...products, ...mappedAgro];
                    }

                    setRetailProducts(products);
                    
                    const isCarShowroom = resolvedTenant.institutionType === 'Car Showroom' || 
                                        resolvedTenant.category === 'Car Showroom' || 
                                        (resolvedTenant.businessSubType || '').toLowerCase().includes('showroom') || 
                                        (resolvedTenant.category || '').toLowerCase().includes('automotive');

                    // Filter car listings locally to ensure we only show active ones on the storefront
                    const filteredCars = (instCars || []).filter((c: any) => c.status === 'active' || c.status === 'Published' || c.status === 'Active');
                    setCarListings(filteredCars);
                    
                    // Set initial active section based on available content
                    if (filteredCars.length > 0) setActiveSection('vehicles');
                    else if (products.length > 0) setActiveSection('retail');
                    else if (instListings && instListings.length > 0) setActiveSection('properties');
                    else if (isCarShowroom) setActiveSection('vehicles'); // Fallback for showroom institutions

                    document.title = `${resolvedTenant.name} | Official Storefront`;
                }
            } catch (error) {
                console.error("Failed to load storefront:", error);
            } finally {
                setLoading(false);
            }
        };

        if (institutionId) loadStorefront();
    }, [institutionId]);

    const openInquiry = (item: PMListing | RetailInventoryItem) => {
        if ('listingType' in item) {
            setInquiryListing(item);
            setInquiryProduct(null);
        } else {
            setInquiryProduct(item);
            setInquiryListing(null);
        }
        setInquiryName('');
        setInquiryPhone('');
        setInquiryDate('');
        setInquirySuccess(false);
        setIsGeneralContact(false);
    };

    const openGeneralContact = () => {
        setInquiryListing(null);
        setInquiryProduct(null);
        setIsGeneralContact(true);
        setInquiryName('');
        setInquiryPhone('');
        setInquirySuccess(false);
    };

    const handleSubmitInquiry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant || (!inquiryListing && !inquiryProduct && !isGeneralContact)) return;
        setInquirySubmitting(true);

        try {
            if (inquiryListing) {
                const pmInquiry = {
                    id: `inq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    institutionId: tenant.id,
                    listingId: inquiryListing.id,
                    customerName: inquiryName,
                    phoneNumber: inquiryPhone,
                    inquiryDate: inquiryDate || null,
                    message: `Interested in ${inquiryListing.listingType} through your storefront.`,
                    status: 'New',
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('pm_inquiries', pmInquiry);
            } else if (inquiryProduct) {
                const lead = {
                    id: `wish_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    institutionId: tenant.id,
                    customerName: inquiryName,
                    phoneNumber: inquiryPhone,
                    productQuery: inquiryProduct.name,
                    urgency: 'urgent',
                    status: 'Open',
                    createdAt: new Date().toISOString()
                };
                console.log('Submitting product inquiry lead:', lead);
                await apiService.saveModuleRecord('retail_wishlist', lead);
            } else if (isGeneralContact) {
                 const lead = {
                    id: `wish_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    institutionId: tenant.id,
                    customerName: inquiryName,
                    phoneNumber: inquiryPhone,
                    productQuery: 'General Store Inquiry',
                    urgency: 'urgent',
                    status: 'Open',
                    createdAt: new Date().toISOString()
                };
                console.log('Submitting general inquiry lead:', lead);
                await apiService.saveModuleRecord('retail_wishlist', lead);
            }
            setInquirySuccess(true);
        } catch (err: any) {
            console.error('Inquiry submission failed:', err);
            alert(`Submission failed: ${err.message}`);
        } finally {
            setInquirySubmitting(false);
        }
    };

    const filteredListings = listings.filter(l => 
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        l.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredProducts = retailProducts.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.category || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isAgrovet = tenant?.institutionType === 'Agrovet' || tenant?.category === 'Agrovet';
    const isCarShowroom = tenant?.institutionType === 'Car Showroom' || tenant?.category === 'Car Showroom' || (tenant?.businessSubType || '').toLowerCase().includes('showroom') || (tenant?.category || '').toLowerCase().includes('automotive');
    const themeColor = tenant?.themeColor || (isAgrovet ? '#10b981' : isCarShowroom ? '#1e293b' : '#4f46e5');

    const heroItems = [...retailProducts, ...listings].filter(i => (i as any).imageUrl || (i as any).images?.[0]).slice(0, 5);

    useEffect(() => {
        if (heroItems.length > 0) {
            const timer = setInterval(() => {
                setCurrentSlide(prev => (prev + 1) % heroItems.length);
            }, 5000);
            return () => clearInterval(timer);
        }
    }, [heroItems.length]);

    const showTabs = (retailProducts.length > 0 ? 1 : 0) + (listings.length > 0 ? 1 : 0) + (carListings.length > 0 ? 1 : 0) > 1;
    
    useEffect(() => {
        if (!showTabs) {
            if (retailProducts.length > 0) setActiveSection('retail');
            else if (listings.length > 0) setActiveSection('properties');
            else if (carListings.length > 0) setActiveSection('vehicles');
        }
    }, [showTabs, retailProducts.length, listings.length, carListings.length]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 animate-mesh opacity-20"></div>
                <div className="relative z-10 space-y-4 text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-white font-black uppercase tracking-[0.3em] text-xs">Initializing Storefront...</p>
                </div>
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Store Not Found</h1>
                <p className="text-slate-500 mb-8">The requested shop does not exist or has been moved.</p>
                <button onClick={() => window.location.href = '/?view=marketplace'} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest">
                    Go to Marketplace
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pb-20">
            {/* Branded Header */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => window.location.href = '/?view=marketplace'}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500"
                            title="Back to Marketplace"
                        >
                            <ArrowRightIcon className="w-5 h-5 rotate-180" />
                        </button>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800"></div>
                        <div className="flex items-center gap-3">
                            {tenant.logoUrl ? (
                                <img loading="lazy" src={tenant.logoUrl} alt={tenant.name} className="w-10 h-10 object-contain rounded-lg" />
                            ) : (
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg rotate-3 transition-transform hover:rotate-0" style={{ backgroundColor: themeColor }}>
                                    {tenant.name.charAt(0)}
                                </div>
                            )}
                            <h1 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter truncate max-w-[200px]">
                                {tenant.name}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={openGeneralContact}
                            className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                        >
                            <PhoneIcon className="w-4 h-4" /> Contact Vendor
                        </button>
                    </div>
                </div>
            </div>

            {/* Hero Slider */}
            <div className="relative h-[65vh] w-full overflow-hidden bg-slate-900 mt-4 mx-auto max-w-[98%] rounded-[4rem] shadow-2xl">
                {heroItems.length > 0 ? (
                    <div className="h-full w-full relative">
                        {heroItems.map((item, index) => (
                            <div 
                                key={item.id}
                                className={`absolute inset-0 transition-all duration-1000 ease-out transform ${index === currentSlide ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-110 translate-x-full'}`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent z-10"></div>
                                <img loading="lazy" 
                                    src={(item as any).imageUrl || (item as any).images?.[0]} 
                                    className="w-full h-full object-cover"
                                    alt="Slide"
                                />
                                <div className="absolute inset-0 z-20 flex flex-col justify-center px-20">
                                    <div className="max-w-2xl space-y-8">
                                        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/20">
                                            <SparklesIcon className="w-4 h-4 text-amber-400" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Featured Offering</span>
                                        </div>
                                        <h2 className={`text-6xl md:text-8xl font-black text-white uppercase tracking-tighter italic leading-[0.9] ${isCarShowroom ? 'font-serif' : ''}`}>
                                            {(item as any).name || (item as any).title}
                                        </h2>
                                        <p className="text-white/60 text-lg font-bold uppercase tracking-widest max-w-xl italic">
                                            {isCarShowroom ? 'Experience pure engineering excellence and timeless design.' : (item as any).description?.slice(0, 120) + '...'}
                                        </p>
                                        <div className="flex items-center gap-6 pt-6">
                                            <button 
                                                onClick={() => 'listingType' in item ? setSelectedListing(item as any) : setSelectedProduct(item as any)}
                                                className="px-10 py-5 bg-white text-slate-950 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-indigo-500 hover:text-white transition-all shadow-2xl"
                                            >
                                                Explore Detail
                                            </button>
                                            <div className="text-3xl font-black text-white italic">
                                                <span className="text-sm font-medium mr-2 text-white/40">KES</span>
                                                {Number((item as any).srpPrice || (item as any).price || 0)?.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* Slide Indicators */}
                        <div className="absolute bottom-12 left-20 z-30 flex gap-3">
                            {heroItems.map((_, i) => (
                                <button 
                                    key={i}
                                    onClick={() => setCurrentSlide(i)}
                                    className={`h-1.5 transition-all rounded-full ${i === currentSlide ? 'w-12 bg-white' : 'w-4 bg-white/30'}`}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-gradient-radial from-transparent to-slate-950/50"></div>
                        <div className="relative text-center space-y-6">
                            <h2 className="text-7xl font-black text-white uppercase tracking-tighter italic opacity-20 select-none">
                                {tenant.name}
                            </h2>
                            <p className="text-white/40 font-black uppercase tracking-[0.5em] text-[10px]">Premium Storefront Identity</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Branded Identity Footer of Hero */}
            <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-40">
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center text-white text-2xl font-black shadow-2xl rotate-3" style={{ backgroundColor: themeColor }}>
                             {tenant.logoUrl ? <img loading="lazy" src={tenant.logoUrl} className="w-full h-full object-contain p-2" /> : tenant.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{tenant.name}</h3>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <MapPinIcon className="w-3 h-3 text-indigo-500" /> {tenant.location?.latitude ? 'Verified HQ' : 'Digital Location'}
                                </span>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                                <span className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                    <CheckBadgeIcon className="w-4 h-4" /> Secure Vendor
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-[400px] relative group">
                        <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder={`Search in ${tenant.name}...`} 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-16 pr-8 py-6 bg-slate-50 dark:bg-slate-800 border-none rounded-[2rem] font-black text-[11px] uppercase tracking-widest outline-none ring-offset-4 ring-indigo-500/20 focus:ring-4 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Marketplace Section Switcher */}
            <div className="max-w-7xl mx-auto px-6 mt-20">
                <div className="flex items-center justify-between mb-12">
                   {showTabs && (
                    <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <button 
                            onClick={() => setActiveSection('retail')}
                            className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeSection === 'retail' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-indigo-600'}`}
                        >
                            Catalog ({retailProducts.length})
                        </button>
                        <button 
                            onClick={() => setActiveSection('properties')}
                            className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeSection === 'properties' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-indigo-600'}`}
                        >
                            Properties ({listings.length})
                        </button>
                        {carListings.length > 0 && (
                            <button 
                                onClick={() => setActiveSection('vehicles')}
                                className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeSection === 'vehicles' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-indigo-600'}`}
                            >
                                Vehicles ({carListings.length})
                            </button>
                        )}
                    </div>
                   )}
                   
                   {!showTabs && (
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-px bg-slate-200"></div>
                            <h3 className="text-xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white">
                                All {activeSection === 'retail' ? 'Products' : 'Listings'}
                            </h3>
                        </div>
                   )}
                </div>

                {/* Content Grid */}
                {activeSection === 'retail' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredProducts.map(product => (
                            <div 
                                key={product.id}
                                onClick={() => setSelectedProduct(product)}
                                className="group bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-2 relative"
                            >
                                <div className="h-60 relative overflow-hidden bg-slate-50 dark:bg-slate-800">
                                    {product.imageUrl ? (
                                        <img loading="lazy" src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                            <ShoppingCartIcon className="w-16 h-16 opacity-20" />
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-600 border border-white/20">
                                            {product.category || 'Retail'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-7">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-4 truncate">{product.name}</h3>
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pricing</p>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white italic">
                                                <span className="text-sm font-medium not-italic mr-1 text-slate-400">KES</span>
                                                {Number(product.srpPrice || product.costPrice || 0)?.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-12" style={{ backgroundColor: themeColor }}>
                                            <ArrowRightIcon className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activeSection === 'vehicles' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <VehicleMarketplaceView 
                            listings={carListings.filter(c => 
                                `${c.make} ${c.model}`.toLowerCase().includes(searchQuery.toLowerCase())
                            )}
                            onBookTestDrive={(v) => {
                                setInquiryProduct({
                                    id: v.id,
                                    name: `Test Drive: ${v.make} ${v.model}`,
                                    institutionId: v.institutionId,
                                    marketplaceEnabled: true,
                                    quantity: 1,
                                    srpPrice: v.price
                                } as any);
                                setInquirySuccess(false);
                            }}
                            onInquiry={(v) => {
                                setInquiryProduct({
                                    id: v.id,
                                    name: `Inquiry: ${v.make} ${v.model}`,
                                    institutionId: v.institutionId,
                                    marketplaceEnabled: true,
                                    quantity: 1,
                                    srpPrice: v.price
                                } as any);
                                setInquirySuccess(false);
                            }}
                            currentInstitution={tenant}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredListings.map(listing => (
                            <div 
                                key={listing.id}
                                onClick={() => setSelectedListing(listing)}
                                className="group bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 hover:border-orange-500 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-2"
                            >
                                <div className="h-60 relative overflow-hidden bg-slate-50 dark:bg-slate-800">
                                    {listing.images && listing.images[0] ? (
                                        <img loading="lazy" src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                            <BuildingOfficeIcon className="w-16 h-16 opacity-20" />
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white">
                                            {listing.listingType}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-7">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPinIcon className="w-3 h-3 text-orange-500" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{listing.location}</span>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-4 truncate">{listing.title}</h3>
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Market Value</p>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white italic">
                                                <span className="text-sm font-medium not-italic mr-1 text-slate-400">KES</span>
                                                {listing.price?.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                                            <ArrowRightIcon className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {((activeSection === 'retail' && filteredProducts.length === 0) || (activeSection === 'properties' && filteredListings.length === 0)) && (
                    <div className="py-32 flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-8 border border-slate-100 dark:border-slate-800">
                            <SearchIcon className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic mb-2">No Items Found</h3>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">We couldn't find any {activeSection} matching your exploration criteria.</p>
                    </div>
                )}
            </div>

            {/* Store Trust Section */}
            <div className="max-w-7xl mx-auto px-6 mt-32 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-slate-200 dark:border-slate-800 pt-32">
                 <div className="space-y-6">
                     <div className="w-16 h-16 bg-slate-900 dark:bg-white rounded-[1.5rem] flex items-center justify-center text-white dark:text-slate-900 shadow-xl">
                        <ShieldCheckIcon className="w-8 h-8" />
                     </div>
                     <div>
                        <h4 className="text-lg font-black uppercase italic text-slate-900">Verified Platform Vendor</h4>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">All transactions and content on this storefront are secured via EduAI global multi-tenant architecture.</p>
                     </div>
                 </div>
                 <div className="space-y-6">
                     <div className="w-16 h-16 bg-slate-900 dark:bg-white rounded-[1.5rem] flex items-center justify-center text-white dark:text-slate-900 shadow-xl">
                        <GlobeAltIcon className="w-8 h-8" />
                     </div>
                     <div>
                        <h4 className="text-lg font-black uppercase italic text-slate-900">Direct Contact Hub</h4>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">{tenant.email || 'Contact through portal'} • {tenant.phoneNumber || 'Official Line Verified'}</p>
                     </div>
                 </div>
                 <div className="flex flex-col justify-center">
                    <button 
                         onClick={openGeneralContact}
                         className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] hover:bg-black transition-colors shadow-2xl"
                    >
                        Contact Store Support
                    </button>
                 </div>
            </div>

            {/* Inquiry/Buy Modals (Shared with Marketplace logic but themed) */}
            {/* Component Detail Panels - Keeping same logic for consistency */}
            {/* Same Panels as PropertyMarketplaceView but could be simplified or themed */}

            {selectedListing && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-lg" onClick={() => setSelectedListing(null)}></div>
                    <div className="relative w-full max-w-4xl bg-slate-50 dark:bg-slate-950 shadow-2xl animate-in slide-in-from-right duration-500 h-full overflow-y-auto">
                        <button onClick={() => setSelectedListing(null)} className="absolute top-10 right-10 z-[200] p-4 bg-slate-900 text-white rounded-2xl">
                            <XIcon className="w-6 h-6" />
                        </button>
                        <div className="h-[45vh] relative bg-slate-900">
                            {selectedListing.images?.[0] && <img loading="lazy" src={selectedListing.images[0]} className="w-full h-full object-cover" />}
                        </div>
                        <div className="p-12 space-y-12">
                             <div>
                                 <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter italic leading-none mb-6">{selectedListing.title}</h2>
                                 <p className="text-slate-500 text-lg font-bold leading-relaxed">{selectedListing.description}</p>
                             </div>
                             <div className="p-10 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-xl">
                                 <div>
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Asking Price</p>
                                     <p className="text-4xl font-black text-slate-950 dark:text-white italic tracking-tighter">KES {selectedListing.price?.toLocaleString()}</p>
                                 </div>
                                 <button 
                                    onClick={() => { setSelectedListing(null); openInquiry(selectedListing); }}
                                    className="bg-orange-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform shadow-xl"
                                 >
                                    Express Interest
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedProduct && (
                 <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-lg" onClick={() => setSelectedProduct(null)}></div>
                    <div className="relative w-full max-w-xl bg-white dark:bg-slate-950 shadow-2xl animate-in slide-in-from-right duration-500 h-full overflow-y-auto">
                        <button onClick={() => setSelectedProduct(null)} className="absolute top-10 right-10 z-[200] p-4 bg-slate-100 text-slate-900 rounded-2xl">
                            <XIcon className="w-6 h-6" />
                        </button>
                        <div className="h-80 bg-slate-100 dark:bg-slate-800">
                            {selectedProduct.imageUrl && <img loading="lazy" src={selectedProduct.imageUrl} className="w-full h-full object-cover" />}
                        </div>
                        <div className="p-12 space-y-10">
                            <div>
                                <h2 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tighter italic mb-4">{selectedProduct.name}</h2>
                                <p className="text-slate-500 font-bold uppercase italic text-sm">{selectedProduct.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Price</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white italic">KES {Number(selectedProduct.srpPrice || selectedProduct.costPrice || 0)?.toLocaleString()}</p>
                                </div>
                                <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Stock</p>
                                    <p className={`text-2xl font-black italic ${Number(selectedProduct.quantity) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{selectedProduct.quantity} Units</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setSelectedProduct(null); openInquiry(selectedProduct); }}
                                className="w-full text-white py-8 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-xl hover:scale-103 transition-transform"
                                style={{ backgroundColor: themeColor }}
                            >
                                Order Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inquiry Form Modal */}
            {(inquiryListing || inquiryProduct || isGeneralContact) && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => { if(!inquirySubmitting) { setInquiryListing(null); setInquiryProduct(null); setIsGeneralContact(false); } }}></div>
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="p-10 text-white relative h-48 flex flex-col justify-center" style={{ backgroundColor: themeColor }}>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 mb-2">
                                    {isGeneralContact ? 'General Store Inquiry' : 'Official Inquiry'}
                                </p>
                                <h3 className="text-3xl font-black uppercase tracking-tighter italic leading-none truncate">
                                    {isGeneralContact ? tenant.name : (inquiryListing?.title || inquiryProduct?.name)}
                                </h3>
                            </div>
                            <div className="absolute bottom-0 right-0 p-8 opacity-10">
                                <SparklesIcon className="w-32 h-32" />
                            </div>
                        </div>

                        {inquirySuccess ? (
                            <div className="p-12 text-center space-y-6">
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircleIcon className="w-10 h-10 text-emerald-500" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">Inquiry Received</h4>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">{tenant.name} will contact you shortly.</p>
                                </div>
                                <button 
                                    onClick={() => { setInquiryListing(null); setInquiryProduct(null); setIsGeneralContact(false); }}
                                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest"
                                >
                                    Close Storefront
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitInquiry} className="p-10 space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-2">Your Name</label>
                                        <input required value={inquiryName} onChange={e => setInquiryName(e.target.value)} type="text" placeholder="e.g. John Doe" className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 ring-indigo-500/50" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-2">Phone Number</label>
                                        <input required value={inquiryPhone} onChange={e => setInquiryPhone(e.target.value)} type="tel" placeholder="e.g. 07123..." className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 ring-indigo-500/50" />
                                    </div>
                                </div>
                                <button type="submit" disabled={inquirySubmitting} className="w-full py-6 rounded-2xl text-white font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3" style={{ backgroundColor: themeColor }}>
                                    {inquirySubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Send Inquiry'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

