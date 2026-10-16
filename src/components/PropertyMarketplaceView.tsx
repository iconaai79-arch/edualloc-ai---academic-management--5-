import React, { useState, useEffect } from 'react';
import { PMListing, PMListingStatus, PMListingType, Institution, RetailInventoryItem, CarListing } from '../types';
import { apiService } from '../services/apiService';
import { getInstitutionEmailConfig } from '../services/emailService';
import { HomeIcon } from './icons/HomeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { ShoppingCartIcon } from './icons/ShoppingCartIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { XIcon } from './icons/XIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { StarIcon } from './icons/StarIcon';
import { ShareIcon } from './icons/ShareIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { TruckIcon } from './icons/TruckIcon';
import { CarIcon } from './icons/CarIcon';
import { CourierSignupModal } from './retail/CourierSignupModal';
import { VehicleMarketplaceView } from './VehicleMarketplaceView';

interface PropertyMarketplaceViewProps {
    onInquire?: (listing: PMListing) => void;
    carListings?: CarListing[];
}

export const PropertyMarketplaceView: React.FC<PropertyMarketplaceViewProps> = ({ onInquire, carListings }) => {
    const [listings, setListings] = useState<PMListing[]>([]);
    const [retailProducts, setRetailProducts] = useState<RetailInventoryItem[]>([]);
    const [vehicleListings, setVehicleListings] = useState<CarListing[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<PMListingType | 'All'>('All');
    const [activeSection, setActiveSection] = useState<'properties' | 'retail' | 'vehicles'>('properties');
    const [selectedListing, setSelectedListing] = useState<PMListing | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<RetailInventoryItem | null>(null);
    const [inquiryListing, setInquiryListing] = useState<PMListing | null>(null);
    const [inquiryProduct, setInquiryProduct] = useState<RetailInventoryItem | null>(null);
    const [inquiryData, setInquiryData] = useState({ name: '', email: '', phone: '', message: '' });
    const [inquirySubmitting, setInquirySubmitting] = useState(false);
    const [inquirySuccess, setInquirySuccess] = useState(false);
    const [propertyLimit, setPropertyLimit] = useState(12);
    const [retailLimit, setRetailLimit] = useState(12);
    const [vehicleLimit, setVehicleLimit] = useState(12);

    // Logistics & Checkout State
    const [deliveryRates, setDeliveryRates] = useState<any[]>([]);
    const [selectedRate, setSelectedRate] = useState<any | null>(null);
    const [checkoutStep, setCheckoutStep] = useState<'details' | 'delivery' | 'payment'>('details');
    const [mpesaProcessing, setMpesaProcessing] = useState(false);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [showCourierSignup, setShowCourierSignup] = useState(false);
    const [registratorInstId, setRegistratorInstId] = useState<string>('');

    useEffect(() => {
        if (inquiryProduct) {
            fetchLogisticsOptions(inquiryProduct.institutionId);
            setCheckoutStep('details');
        }
    }, [inquiryProduct]);

    const fetchLogisticsOptions = async (instId: string) => {
        try {
            const rates = await apiService.fetchModuleRecords('retail_delivery_rates', instId);
            setDeliveryRates(rates);
        } catch (error) {
            console.error('Failed to fetch delivery rates:', error);
        }
    };

    const handleProcessPayment = async () => {
        if (!inquiryProduct || !selectedRate || !inquiryData.phone) return;

        setMpesaProcessing(true);
        try {
            const amount = Number(inquiryProduct.srpPrice || inquiryProduct.costPrice || 0) + Number(selectedRate.rate);
            
            // 1. Create the order record in 'Pending' status
            const orderId = crypto.randomUUID();
            await apiService.saveModuleRecord('retail_marketplace_orders', {
                id: orderId,
                institutionId: inquiryProduct.institutionId,
                product_id: inquiryProduct.id,
                customer_name: inquiryData.name,
                customer_phone: inquiryData.phone,
                customer_email: inquiryData.email,
                destination: selectedRate.destination,
                delivery_fee: selectedRate.rate,
                total_amount: amount,
                payment_status: 'Pending',
                order_status: 'Received'
            });

            // 2. Trigger M-Pesa STK Push
            const response = await apiService.triggerMpesaStkPush({
                amount: 1, // Using 1 KES for testing/safety or the real amount
                phoneNumber: inquiryData.phone.replace(/\+/g, ''),
                reference: `ORD-${orderId.slice(0, 8)}`,
                description: `Payment for ${inquiryProduct.name}`,
                institutionId: inquiryProduct.institutionId
            });

            if (response.CheckoutRequestID) {
                setPaymentId(response.CheckoutRequestID);
                // Start polling for payment status
                pollPaymentStatus(response.CheckoutRequestID, orderId);
            }
        } catch (error) {
            console.error('Checkout failed:', error);
            alert('Payment initialization failed. Please check your phone number and try again.');
            setMpesaProcessing(false);
        }
    };

    const pollPaymentStatus = async (checkoutId: string, orderId: string) => {
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            if (attempts > 30) { // 2 minutes timeout
                clearInterval(interval);
                setMpesaProcessing(false);
                alert('Payment timeout. Please check your phone or try again.');
                return;
            }

            try {
                const status = await apiService.checkMpesaPaymentStatus(checkoutId);
                if (status.ResultCode === '0') {
                    clearInterval(interval);
                    
                    // Finalize order
                    await apiService.saveModuleRecord('retail_marketplace_orders', {
                        id: orderId,
                        payment_status: 'Paid',
                        payment_reference: status.MpesaReceiptNumber
                    });

                    // Decrement inventory
                    if (inquiryProduct) {
                        await apiService.saveModuleRecord('retail_inventory', {
                            id: inquiryProduct.id,
                            quantity: Math.max(0, (inquiryProduct.quantity || 0) - 1)
                        });
                    }

                    setInquirySuccess(true);
                    setMpesaProcessing(false);
                } else if (status.ResultCode) {
                    // Payment failed
                    clearInterval(interval);
                    setMpesaProcessing(false);
                    alert(`Payment failed: ${status.ResultDesc}`);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 4000);
    };

    const [inquiryName, setInquiryName] = useState('');
    const [inquiryPhone, setInquiryPhone] = useState('');
    const [inquiryDate, setInquiryDate] = useState('');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showShareModal, setShowShareModal] = useState(false);
    const [sharingItem, setSharingItem] = useState<{ id: string; title: string; type: 'property' | 'retail' } | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    const promotedItems = [
        ...listings.filter(l => l.isPromoted).map(l => ({ ...l, type: 'property' })),
        ...retailProducts.filter(p => Number(p.quantity) > 0).slice(0, 5).map(p => ({ ...p, type: 'retail' }))
    ] as any[];

    useEffect(() => {
        if (promotedItems.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % promotedItems.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [promotedItems.length]);

    const openInquiry = (item: PMListing | RetailInventoryItem) => {
        if ('listingType' in item) {
            setInquiryListing(item);
            setInquiryProduct(null);
            setInquiryName('');
            setInquiryPhone('');
            setInquiryDate('');
        } else {
            setInquiryProduct(item);
            setInquiryListing(null);
            setInquiryData({ name: '', email: '', phone: '', message: '' });
            setCheckoutStep('details');
            setSelectedRate(null);
        }
        setInquirySuccess(false);
        setInquirySubmitting(false);
    };

    const createMarketplaceNotification = async (institutionId: string, message: string, type: string, link?: string) => {
        try {
            // Fetch all users for this institution to notify them
            const users = await apiService.fetchUsers(institutionId);
            const notifications = users.map(user => ({
                userId: user.id,
                institutionId: institutionId,
                message,
                type,
                link,
                isRead: false,
                timestamp: new Date().toISOString()
            }));

            // Save notifications for all users
            await Promise.all(notifications.map(n => apiService.saveModuleRecord('app_notifications', n)));
        } catch (err) {
            console.error('Failed to create marketplace notifications:', err);
        }
    };

    const handleSubmitInquiry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inquiryListing && !inquiryProduct) return;
        setInquirySubmitting(true);

        try {
            if (inquiryListing) {
                apiService.incrementCount('pm_listings', inquiryListing.id, 'inquiry_count');
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
                    await apiService.sendEmail(seller.email, subject, body, getInstitutionEmailConfig(seller, seller.emailConfig));
                }

                // Save inquiry to database for portal management
                const pmInquiry = {
                    id: `inq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    institutionId: inquiryListing.institutionId,
                    listingId: inquiryListing.id,
                    customerName: inquiryName,
                    phoneNumber: inquiryPhone,
                    inquiryDate: inquiryDate || null,
                    message: `Interested in ${inquiryListing.listingType === 'Sale' ? 'buying' : 'renting'} ${inquiryListing.title}`,
                    status: 'New',
                    createdAt: new Date().toISOString()
                };

                await apiService.saveModuleRecord('pm_inquiries', pmInquiry);

                // Send bell notifications to institutional staff
                await createMarketplaceNotification(
                    inquiryListing.institutionId,
                    `New inquiry from ${inquiryName} for property: ${inquiryListing.title}`,
                    'property_inquiry'
                );
            } else if (inquiryProduct) {
                apiService.incrementCount('retail_inventory_items', inquiryProduct.id, 'inquiry_count');
                const seller = getSeller(inquiryProduct.institutionId);
                const lead = {
                    id: `wish_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    institutionId: inquiryProduct.institutionId,
                    customerName: inquiryName,
                    phoneNumber: inquiryPhone,
                    productQuery: inquiryProduct.name,
                    capturedById: null, // Marketplace captured
                    urgency: 'urgent',
                    status: 'Open',
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
                            Price: KES ${Number(inquiryProduct.srpPrice || inquiryProduct.costPrice || 0)?.toLocaleString()}
                            
                            Please follow up with the lead.
                        `.trim();
                        await apiService.sendEmail(seller.email, subject, body, getInstitutionEmailConfig(seller, seller.emailConfig));
                    } catch (emailErr) {
                        console.warn('Inquiry email notification failed:', emailErr);
                    }
                }

                // Send bell notifications to institutional staff
                await createMarketplaceNotification(
                    inquiryProduct.institutionId,
                    `New lead from ${inquiryName} for product: ${inquiryProduct.name}`,
                    'retail_lead'
                );
            }

            setInquirySuccess(true);
        } catch (err: any) {
            console.error('Inquiry submission failed:', err);
            alert(`Enquiry submission failed: ${err.message || 'Unknown protocol error'}. Please try again or contact us directly.`);
        } finally {
            setInquirySubmitting(false);
        }
    };

    useEffect(() => {
        const loadMarketplace = async () => {
            setLoading(true);
            try {
                // Fetch all active/published property listings across all institutions
                const allListings = await apiService.fetchModuleRecords<PMListing>('pm_listings', 'ALL', undefined, {
                    limit: propertyLimit
                });
                const activeListings = allListings.filter(l => l.status === 'Active' || l.status === 'Published');

                // Fetch all retail inventory items that are marked as live on market
                const allRetailItems = await apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', 'ALL', undefined, {
                    limit: retailLimit
                });
                const liveRetailItems = allRetailItems.filter(item => item.marketplaceEnabled === true);

                // Fetch vehicle listings - Always fetch global for the unified marketplace
                const globalCars = await apiService.fetchCarListings('ALL', 'all', { limit: vehicleLimit });
                
                // Merge with institutional listings if provided, ensuring no duplicates
                let cars = globalCars;
                if (carListings && carListings.length > 0) {
                    const globalIds = new Set(globalCars.map(c => c.id));
                    const uniqueInstitutional = carListings.filter(c => !globalIds.has(c.id));
                    cars = [...uniqueInstitutional, ...globalCars];
                }

                // Fetch institution details to show seller info
                const instList = await apiService.fetchModuleRecords<Institution>('institutions', 'ALL');

                setListings(activeListings);
                setRetailProducts(liveRetailItems);
                setVehicleListings(cars);
                setInstitutions(instList);

                // SEO: Update page title and description
                document.title = "Unified Marketplace | Properties, Vehicles & Retail | Eduai Automation";
                const metaDesc = document.querySelector('meta[name="description"]');
                if (metaDesc) {
                    metaDesc.setAttribute("content", `Explore our premium unified marketplace featuring ${activeListings.length} properties, ${cars.length} vehicles, and ${liveRetailItems.length} retail products.`);
                }
            } catch (e) {
                console.error("Marketplace Load Error:", e);
            }
            setLoading(false);
        };
        loadMarketplace();
    }, [propertyLimit, retailLimit, vehicleLimit, carListings]);

    // Handle deep linking to specific items
    useEffect(() => {
        if (loading || (listings.length === 0 && retailProducts.length === 0)) return;
        
        const params = new URLSearchParams(window.location.search);
        const itemId = params.get('item');
        if (itemId) {
            const property = listings.find(l => l.id === itemId);
            if (property) {
                setSelectedListing(property);
                return;
            }
            const product = retailProducts.find(p => p.id === itemId);
            if (product) {
                setSelectedProduct(product);
            }
        }
    }, [loading, listings, retailProducts]);

    // SEO: Dynamic Structured Data (JSON-LD)
    useEffect(() => {
        if (listings.length === 0 && retailProducts.length === 0) return;

        const structuredData = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "numberOfItems": listings.length + retailProducts.length,
            "itemListElement": [
                ...listings.slice(0, 10).map((l, index) => ({
                    "@type": "ListItem",
                    "position": index + 1,
                    "item": {
                        "@type": "RealEstateListing",
                        "name": l.title,
                        "description": l.description,
                        "url": window.location.href,
                        "price": l.price,
                        "priceCurrency": "KES"
                    }
                })),
                ...retailProducts.slice(0, 10).map((p, index) => ({
                    "@type": "ListItem",
                    "position": listings.length + index + 1,
                    "item": {
                        "@type": "Product",
                        "name": p.name,
                        "description": p.description,
                        "offers": {
                            "@type": "Offer",
                            "price": p.srpPrice || p.costPrice,
                            "priceCurrency": "KES"
                        }
                    }
                }))
            ]
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'marketplace-json-ld';
        script.text = JSON.stringify(structuredData);
        document.head.appendChild(script);

        return () => {
            const existing = document.getElementById('marketplace-json-ld');
            if (existing) existing.remove();
        };
    }, [listings, retailProducts]);

    const handleCopyLink = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

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

    const filteredVehicles = vehicleListings.filter(v => {
        const q = searchQuery.toLowerCase();
        return `${v.make} ${v.model} ${v.year} ${v.description} ${v.fuelType} ${v.transmission}`.toLowerCase().includes(q);
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
            {/* ── Marketplace Hero Section with Dynamic Slideshow ── */}
            <div className="relative h-[70vh] md:h-[75vh] flex items-center justify-center overflow-hidden bg-slate-950">
                {/* Background Cosmic Effects */}
                <div className="absolute inset-0 animate-mesh opacity-50"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950 z-[1]"></div>
                
                {/* Dynamic Content Slides */}
                <div className="absolute inset-0 z-0">
                    {promotedItems.length > 0 ? (
                        promotedItems.map((item, idx) => (
                            <div 
                                key={item.id}
                                className={`absolute inset-0 transition-all duration-[1500ms] ease-out-expo ${idx === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}
                            >
                                <div className="absolute inset-0 bg-black/40 z-[2]"></div>
                                {item.images?.[0] || item.imageUrl ? (
                                    <img loading="lazy" 
                                        src={item.images?.[0] || item.imageUrl} 
                                        alt={item.title || item.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center">
                                        <BuildingOfficeIcon className="w-32 h-32 text-indigo-500/20" />
                                    </div>
                                )}
                                
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-[3] pb-32">
                                    <div className="inline-flex items-center gap-3 glass-morphism px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-white mb-10 animate-fade-in-up">
                                        <SparklesIcon className="w-4 h-4 text-amber-400 animate-pulse" />
                                        Featured {item.type === 'property' ? 'Property' : 'Product'}
                                    </div>
                                    <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter uppercase italic leading-[0.8] mb-8 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-fade-in-up delay-100">
                                        {item.title || item.name}
                                    </h1>
                                    <p className="text-white/80 text-lg md:text-2xl font-bold max-w-3xl mx-auto leading-tight italic tracking-tight animate-fade-in-up delay-200">
                                        {item.description?.substring(0, 120)}...
                                    </p>
                                    <div className="mt-12 flex items-center gap-8 animate-fade-in-up delay-300">
                                        <p className="text-4xl md:text-6xl font-black text-white italic tracking-tighter shadow-indigo-500/50">
                                            <span className="text-xl font-medium not-italic mr-2 text-white/50">KES</span>
                                            {Number(item.price || item.srpPrice || item.costPrice || 0)?.toLocaleString()}
                                        </p>
                                        <button 
                                            onClick={() => item.type === 'property' ? setSelectedListing(item) : setSelectedProduct(item)}
                                            className="px-12 py-5 bg-white text-slate-900 rounded-full font-black text-sm uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-2xl"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                             <div className="inline-flex items-center gap-3 glass-morphism px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-white mb-8">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                                Quantum Marketplace v2.0
                            </div>
                            <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter uppercase italic leading-[0.85] mb-8 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                Explore the <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-indigo-300">Next Frontier</span>
                            </h1>
                        </div>
                    )}
                </div>

                {/* Slider Controls */}
                {promotedItems.length > 1 && (
                    <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                        {promotedItems.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`h-1.5 transition-all duration-500 rounded-full ${idx === currentSlide ? 'w-12 bg-white' : 'w-3 bg-white/30 hover:bg-white/50'}`}
                            />
                        ))}
                    </div>
                )}

                {/* Futuristic Search Container */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-6xl px-6 z-30">
                    <div className="glass-morphism p-3 md:p-5 rounded-[4rem] flex flex-col md:flex-row gap-4 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                        <div className="flex-1 relative group">
                            <SearchIcon className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-indigo-300 group-focus-within:text-white transition-colors" />
                            <input
                                type="text"
                                placeholder="Search the galaxy..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-20 pr-10 py-7 bg-white/5 hover:bg-white/10 focus:bg-white/10 rounded-[3rem] font-black text-xl text-white placeholder:text-white/30 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/40 transition-all border-none"
                            />
                        </div>

                        {activeSection === 'properties' && (
                            <div className="hidden lg:flex gap-2 p-1.5 bg-black/40 rounded-[3.5rem] border border-white/5">
                                {(['All', 'Rent', 'Sale', 'Lease'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setFilterType(type)}
                                        className={`px-10 rounded-full text-[11px] font-black uppercase tracking-[0.2em] transition-all ${filterType === type
                                            ? 'bg-white text-slate-900 shadow-xl'
                                            : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        )}

                        <button 
                            onClick={() => {
                                // Just a visual trigger for now
                            }}
                            className="md:w-24 h-20 md:h-auto bg-gradient-to-br from-indigo-500 via-purple-600 to-rose-500 rounded-[3rem] flex items-center justify-center text-white shadow-[0_15px_35px_rgba(99,102,241,0.4)] hover:shadow-indigo-500/70 hover:scale-105 active:scale-95 transition-all"
                        >
                            <ArrowRightIcon className="w-8 h-8" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Share Modal Component */}
            {showShareModal && sharingItem && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
                    <div 
                        className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl animate-in fade-in duration-500"
                        onClick={() => setShowShareModal(false)}
                    ></div>
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-500 border border-white/10">
                        <div className="p-12 space-y-10">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Share Intelligence</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.35em]">{sharingItem.title}</p>
                                </div>
                                <button 
                                    onClick={() => setShowShareModal(false)}
                                    className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl hover:text-slate-900 transition-all"
                                >
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <button 
                                    onClick={async () => {
                                        const shareData = {
                                            title: sharingItem.title,
                                            text: `Check out this ${sharingItem.type} on the EduAI Marketplace!`,
                                            url: `${window.location.origin}/?view=marketplace&item=${sharingItem.id}`
                                        };
                                        if (navigator.share) {
                                            try { await navigator.share(shareData); } catch (err) { console.error(err); }
                                        } else {
                                            handleCopyLink(shareData.url);
                                        }
                                    }}
                                    className="flex flex-col items-center gap-4 p-8 glass-card rounded-[2.5rem] hover:scale-105 active:scale-95 transition-all group"
                                >
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all text-indigo-500">
                                        <ShareIcon className="w-8 h-8" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Native Share</span>
                                </button>

                                <div className="flex flex-col items-center gap-4 p-8 glass-card rounded-[2.5rem] group">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 overflow-hidden relative">
                                        <img loading="lazy" 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/?view=marketplace&item=${sharingItem.id}`)}`} 
                                            alt="QR Code"
                                            className="w-full h-full object-cover scale-110"
                                        />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Scan Signal</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4">Universal Link</label>
                                <div className="relative">
                                    <input 
                                        readOnly
                                        type="text" 
                                        value={`${window.location.origin}/?view=marketplace&item=${sharingItem.id}`}
                                        className="w-full pl-6 pr-20 py-6 glass-card rounded-[2rem] font-bold text-slate-900 dark:text-white text-[10px] truncate border-none outline-none"
                                    />
                                    <button 
                                        onClick={() => handleCopyLink(`${window.location.origin}/?view=marketplace&item=${sharingItem.id}`)}
                                        className={`absolute right-3 top-3 h-10 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:scale-105 active:scale-95'}`}
                                    >
                                        <span className="text-[8px] font-black uppercase tracking-widest">{copySuccess ? 'Copied' : 'Copy'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                        <button
                            onClick={() => setActiveSection('vehicles')}
                            className={`flex items-center gap-3 px-10 py-5 rounded-[1.75rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${activeSection === 'vehicles'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl scale-105'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                        >
                            <CarIcon className={`w-5 h-5 ${activeSection === 'vehicles' ? 'text-emerald-500' : ''}`} />
                            Vehicles
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
                    <button
                        onClick={() => setActiveSection('vehicles')}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-[2rem] transition-all ${activeSection === 'vehicles' ? 'bg-white text-slate-900' : 'text-white/60'}`}
                    >
                        <CarIcon className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Vehicles</span>
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
                                    onClick={() => {
                                        setSelectedListing(listing);
                                        apiService.incrementCount('pm_listings', listing.id, 'view_count');
                                    }}
                                    className="group relative flex flex-col cursor-pointer"
                                >
                                    {/* Glass Glow effect */}
                                    <div className="absolute -inset-4 bg-gradient-to-br from-orange-500/0 via-orange-500/0 to-orange-500/20 rounded-[4rem] scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-700 blur-2xl"></div>

                                    <div className="relative glass-card rounded-[3.5rem] overflow-hidden transition-all duration-700 group-hover:-translate-y-4 group-hover:shadow-[0_40px_80px_-20px_rgba(249,115,22,0.2)]">
                                        <div className="h-72 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
                                            {listing.images && listing.images[0] ? (
                                                <img loading="lazy"
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

                    {filteredListings.length >= propertyLimit && (
                        <div className="flex justify-center mt-20">
                            <button 
                                onClick={() => setPropertyLimit(prev => prev + 12)}
                                className="px-12 py-5 glass-card rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-orange-500 transition-all active:scale-95 border border-white/5"
                            >
                                Sync More Properties
                            </button>
                        </div>
                    )}
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
                                    onClick={() => {
                                        setSelectedProduct(product);
                                        apiService.incrementCount('retail_inventory_items', product.id, 'view_count');
                                    }}
                                    className="group relative flex flex-col cursor-pointer"
                                >
                                    {/* Glass Glow effect */}
                                    <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/20 rounded-[4rem] scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-700 blur-2xl"></div>

                                    <div className="relative glass-card rounded-[3rem] overflow-hidden transition-all duration-700 group-hover:-translate-y-3 group-hover:shadow-[0_40px_80px_-20px_rgba(79,70,229,0.15)]">
                                        <div className="h-60 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                                            {product.imageUrl ? (
                                                <img loading="lazy"
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
                                                        {Number(product.srpPrice || product.costPrice || 0)?.toLocaleString()}
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

                    {filteredRetailProducts.length >= retailLimit && (
                        <div className="flex justify-center mt-20">
                            <button 
                                onClick={() => setRetailLimit(prev => prev + 12)}
                                className="px-12 py-5 glass-card rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-indigo-500 transition-all active:scale-95 border border-white/5"
                            >
                                Sync More Products
                            </button>
                        </div>
                    )}

                    <div className="mt-40 relative group overflow-hidden rounded-[4rem] bg-indigo-900 min-h-[400px] flex items-center p-12 md:p-20">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-indigo-800/30 -skew-x-12 translate-x-1/4"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px]"></div>

                        <div className="relative z-10 max-w-2xl space-y-8">
                            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl px-5 py-2 rounded-full border border-white/10">
                                <TruckIcon className="w-5 h-5 text-white" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white italic">Logistics Network</span>
                            </div>
                            <h2 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter italic leading-[0.9]">Partner <br />With Us Today</h2>
                            <p className="text-indigo-200 text-lg font-bold">Are you a logistics provider? Join our growing delivery network and fulfill thousands of marketplace orders across the country.</p>
                            
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button
                                    onClick={() => {
                                        setRegistratorInstId(retailProducts[0]?.institutionId || '');
                                        setShowCourierSignup(true);
                                    }}
                                    className="px-10 py-5 bg-white text-indigo-900 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] shadow-2xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    Apply as Courier
                                </button>
                                <button className="px-10 py-5 bg-indigo-800/50 backdrop-blur-xl text-white border border-white/10 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] hover:bg-indigo-700 transition-all">
                                    Learn More
                                </button>
                            </div>
                        </div>

                        {/* Floating Icon Decoration */}
                        <div className="hidden lg:block absolute right-20 top-1/2 -translate-y-1/2 animate-bounce-slow">
                            <div className="w-32 h-32 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center backdrop-blur-3xl rotate-12">
                                <TruckIcon className="w-16 h-16 text-white/20" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Vehicle Listings Grid ── */}
            {activeSection === 'vehicles' && (
                <div className="max-w-[1600px] mx-auto px-8 pb-32 pt-20">
                    <VehicleMarketplaceView 
                        listings={filteredVehicles}
                        onBookTestDrive={(v) => {
                             // Implement book test drive flow if needed
                             alert(`Booking test drive for ${v.make} ${v.model}. Out of scope for this demo.`);
                        }}
                        onInquiry={(v) => {
                             // Link to inquiry flow
                             alert(`Enquiring about ${v.make} ${v.model}. Out of scope for this demo.`);
                        }}
                        currentInstitution={null}
                    />

                    {vehicleListings.length >= vehicleLimit && (
                        <div className="flex justify-center mt-12 pb-20">
                            <button 
                                onClick={() => setVehicleLimit(prev => prev + 12)}
                                className="px-12 py-5 glass-card rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-emerald-500 transition-all active:scale-95 border border-white/5"
                            >
                                Sync More Vehicles
                            </button>
                        </div>
                    )}
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
                                <img loading="lazy" src={selectedListing.images[0]} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
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

                                    <button 
                                        onClick={() => {
                                            setSharingItem({ id: selectedListing.id, title: selectedListing.title, type: 'property' });
                                            setShowShareModal(true);
                                        }}
                                        className="w-full mt-4 glass-card py-6 rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800"
                                    >
                                        <ShareIcon className="w-4 h-4 text-indigo-500" /> Spread the Word
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
                                <img loading="lazy" src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
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
                                            {Number(selectedProduct.srpPrice || selectedProduct.costPrice || 0)?.toLocaleString()}
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

                                <button 
                                    onClick={() => {
                                        setSharingItem({ id: selectedProduct.id, title: selectedProduct.name, type: 'retail' });
                                        setShowShareModal(true);
                                    }}
                                    className="w-full mt-4 glass-card py-6 rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800"
                                >
                                    <ShareIcon className="w-4 h-4 text-indigo-500" /> Spread the Word
                                </button>
                                <p className="text-[9px] text-center font-black text-slate-400 uppercase tracking-widest mt-8">Secure encrypted transaction via EduAI Quantum</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Checkout / Express Interest Modal ── */}
            {(inquiryListing || inquiryProduct) && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-500"
                        onClick={() => {
                            if (!inquirySubmitting && !mpesaProcessing) {
                                setInquiryListing(null);
                                setInquiryProduct(null);
                            }
                        }}
                    ></div>
                    <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Header */}
                        <div className={`p-10 text-white relative overflow-hidden ${inquiryProduct ? 'bg-indigo-600' : 'bg-orange-600'}`}>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse"></div>

                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 mb-2">
                                        {inquiryProduct ? 'Express Fulfillment' : 'Intelligence Protocol'}
                                    </p>
                                    <h3 className="text-3xl font-black uppercase tracking-tighter italic leading-none truncate max-w-md">
                                        {inquiryListing?.title || inquiryProduct?.name}
                                    </h3>
                                    
                                    {/* Progress Stepper for Retail */}
                                    {inquiryProduct && !inquirySuccess && (
                                        <div className="flex gap-2 mt-6">
                                            {(['details', 'delivery', 'payment'] as const).map((step, idx) => (
                                                <div key={step} className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border ${checkoutStep === step ? 'bg-white text-indigo-600 border-white' : 'border-white/30 text-white/50'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    {idx < 2 && <div className="w-4 h-px bg-white/20"></div>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    disabled={inquirySubmitting || mpesaProcessing}
                                    onClick={() => { setInquiryListing(null); setInquiryProduct(null); }}
                                    className="p-3 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-2xl transition-all"
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
                                <div className="space-y-4">
                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Order Authenticated</h4>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-loose max-w-xs mx-auto">
                                        {inquiryProduct 
                                            ? `Retail logistics initialized. Your items will be dispatched to ${selectedRate?.destination} within ${selectedRate?.estimated_days || selectedRate?.estimatedDays || 1} work days.` 
                                            : `Transmission successful. Our field agents will contact you at ${inquiryPhone} for further intelligence.`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setInquiryListing(null); setInquiryProduct(null); }}
                                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-6 rounded-3xl font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:scale-105 transition-all"
                                >
                                    Terminate Protocol
                                </button>
                            </div>
                        ) : (
                            <div className="p-10">
                                {checkoutStep === 'details' && (
                                    <div className="space-y-8 animate-in slide-in-from-right duration-500">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4">Full Identity</label>
                                                <input
                                                    type="text"
                                                    value={inquiryProduct ? inquiryData.name : inquiryName}
                                                    onChange={e => inquiryProduct ? setInquiryData({...inquiryData, name: e.target.value}) : setInquiryName(e.target.value)}
                                                    placeholder="Quantum Alias or Name"
                                                    className="w-full p-6 glass-card rounded-[2rem] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 ring-indigo-500 border-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4">Communication Line</label>
                                                <input
                                                    type="tel"
                                                    value={inquiryProduct ? inquiryData.phone : inquiryPhone}
                                                    onChange={e => inquiryProduct ? setInquiryData({...inquiryData, phone: e.target.value}) : setInquiryPhone(e.target.value)}
                                                    placeholder="+254..."
                                                    className="w-full p-6 glass-card rounded-[2rem] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 ring-indigo-500 border-none"
                                                />
                                            </div>
                                            {inquiryProduct && (
                                                 <div className="space-y-2">
                                                 <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4">Email Channel</label>
                                                 <input
                                                     type="email"
                                                     value={inquiryData.email}
                                                     onChange={e => setInquiryData({...inquiryData, email: e.target.value})}
                                                     placeholder="secure@mail.io"
                                                     className="w-full p-6 glass-card rounded-[2rem] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 ring-indigo-500 border-none"
                                                 />
                                             </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => inquiryProduct ? setCheckoutStep('delivery') : handleSubmitInquiry(new Event('submit') as any)}
                                            disabled={inquirySubmitting}
                                            className="w-full py-7 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95 text-white bg-slate-900 dark:bg-indigo-600 shadow-indigo-600/30"
                                        >
                                            {inquirySubmitting ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : (inquiryProduct ? 'Configure Logistics' : 'Initialize Request')}
                                        </button>
                                    </div>
                                )}

                                {checkoutStep === 'delivery' && (
                                    <div className="space-y-8 animate-in slide-in-from-right duration-500">
                                        <div className="space-y-6">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Select Target Destination</h4>
                                            <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar pr-2">
                                                {deliveryRates.map(rate => (
                                                    <button
                                                        key={rate.id}
                                                        onClick={() => setSelectedRate(rate)}
                                                        className={`w-full p-6 rounded-[2rem] border-2 transition-all flex justify-between items-center ${selectedRate?.id === rate.id ? 'border-indigo-500 bg-indigo-500/5 shadow-lg' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                                    >
                                                        <div className="flex flex-col items-start gap-1">
                                                            <span className="font-black text-slate-900 dark:text-white uppercase italic">{rate.destination}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{rate.estimated_days || rate.estimatedDays || 1} Day Delivery</span>
                                                        </div>
                                                        <span className="text-lg font-black text-indigo-600">KES {rate.rate}</span>
                                                    </button>
                                                ))}
                                                {deliveryRates.length === 0 && (
                                                    <div className="p-8 text-center glass-card rounded-[2rem]">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase italic">No logistics routes discovered for this zone yet.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <button onClick={() => setCheckoutStep('details')} className="px-8 py-7 glass-card rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">Back</button>
                                            <button
                                                disabled={!selectedRate}
                                                onClick={() => setCheckoutStep('payment')}
                                                className="flex-1 py-7 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95 text-white bg-indigo-600 shadow-indigo-600/30 disabled:opacity-50"
                                            >
                                                Next Protocol
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {checkoutStep === 'payment' && inquiryProduct && (
                                    <div className="space-y-8 animate-in slide-in-from-right duration-500">
                                        <div className="glass-card p-10 rounded-[3rem] border border-indigo-500/10">
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Item</span>
                                                    <span className="font-bold text-slate-900 dark:text-white italic">KES {Number(inquiryProduct.srpPrice || inquiryProduct.costPrice || 0)?.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{selectedRate?.destination} Transit</span>
                                                    <span className="font-bold text-indigo-600 italic">KES {selectedRate?.rate?.toLocaleString()}</span>
                                                </div>
                                                <div className="h-px bg-slate-100 dark:bg-slate-800"></div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.3em]">Total Intelligence</span>
                                                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">KES {(Number(inquiryProduct.srpPrice || inquiryProduct.costPrice || 0) + Number(selectedRate?.rate || 0))?.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleProcessPayment}
                                            disabled={mpesaProcessing}
                                            className="w-full bg-emerald-600 text-white py-8 rounded-[3rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-emerald-600/30 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-6"
                                        >
                                            {mpesaProcessing ? (
                                                <>
                                                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span className="animate-pulse">Check Phone for STK</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex -space-x-2">
                                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-600 font-bold text-[8px] border-2 border-emerald-600">MPESA</div>
                                                    </div>
                                                    STK Push Payment
                                                </>
                                            )}
                                        </button>
                                        <button onClick={() => setCheckoutStep('delivery')} disabled={mpesaProcessing} className="w-full text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900">Change Logistics Destination</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Courier Signup Modal */}
            <CourierSignupModal 
                isOpen={showCourierSignup}
                onClose={() => setShowCourierSignup(false)}
                institutionId={registratorInstId}
                onSuccess={() => {
                    // Application submitted
                }}
            />
        </div>
    );
};

