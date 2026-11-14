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
import { PlusIcon } from './icons/PlusIcon';
import { MinusIcon } from './icons/MinusIcon';
import { CourierSignupModal } from './retail/CourierSignupModal';
import { VehicleMarketplaceView } from './VehicleMarketplaceView';

interface PropertyMarketplaceViewProps {
    onInquire?: (listing: PMListing) => void;
    carListings?: CarListing[];
    onBackToPortal?: () => void;
}

// Category list for B2B Wholesale megamenu & quick tabs
const WHOLESALE_CATEGORIES = [
    { id: 'all', name: 'All Categories', icon: '🌐' },
    { id: 'furniture', name: 'Desks & Furniture', icon: '🪑', query: 'furniture' },
    { id: 'lab', name: 'Lab & Science Kits', icon: '🧪', query: 'lab' },
    { id: 'electronics', name: 'IT & Electronics', icon: '💻', query: 'computer' },
    { id: 'stationery', name: 'Books & Stationery', icon: '📚', query: 'book' },
    { id: 'vehicles', name: 'School Buses & Fleet', icon: '🚌', section: 'vehicles' },
    { id: 'properties', name: 'Campuses & Real Estate', icon: '🏫', section: 'properties' },
    { id: 'uniforms', name: 'Uniforms & Apparel', icon: '👔', query: 'uniform' },
    { id: 'sports', name: 'Sports & Games Gear', icon: '⚽', query: 'sport' },
    { id: 'solar', name: 'Solar & Utilities', icon: '⚡', query: 'solar' },
];

export const PropertyMarketplaceView: React.FC<PropertyMarketplaceViewProps> = ({ onInquire, carListings, onBackToPortal }) => {
    const [listings, setListings] = useState<PMListing[]>([]);
    const [retailProducts, setRetailProducts] = useState<RetailInventoryItem[]>([]);
    const [vehicleListings, setVehicleListings] = useState<CarListing[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchCategory, setSearchCategory] = useState<'all' | 'retail' | 'properties' | 'vehicles'>('all');
    const [filterType, setFilterType] = useState<PMListingType | 'All'>('All');
    const [activeSection, setActiveSection] = useState<'all' | 'retail' | 'properties' | 'vehicles'>('all');
    const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
    const [selectedListing, setSelectedListing] = useState<PMListing | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<RetailInventoryItem | null>(null);
    const [inquiryListing, setInquiryListing] = useState<PMListing | null>(null);
    const [inquiryProduct, setInquiryProduct] = useState<RetailInventoryItem | null>(null);
    const [inquiryData, setInquiryData] = useState({ name: '', email: '', phone: '', message: '' });
    const [inquirySubmitting, setInquirySubmitting] = useState(false);
    const [inquirySuccess, setInquirySuccess] = useState(false);
    const [propertyLimit, setPropertyLimit] = useState(12);
    const [retailLimit, setRetailLimit] = useState(16);
    const [vehicleLimit, setVehicleLimit] = useState(12);

    // Logistics & Checkout State
    const [deliveryRates, setDeliveryRates] = useState<any[]>([]);
    const [selectedRate, setSelectedRate] = useState<any | null>(null);
    const [checkoutStep, setCheckoutStep] = useState<'details' | 'delivery' | 'payment'>('details');
    const [mpesaProcessing, setMpesaProcessing] = useState(false);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [showCourierSignup, setShowCourierSignup] = useState(false);
    const [registratorInstId, setRegistratorInstId] = useState<string>('');

    // Quantity & Delivery Location Enhancements
    const [orderQuantity, setOrderQuantity] = useState<number>(1);
    const [deliverySearchQuery, setDeliverySearchQuery] = useState<string>('');
    const [specificAddress, setSpecificAddress] = useState<string>('');
    const [isCustomDelivery, setIsCustomDelivery] = useState<boolean>(false);
    const [customDestination, setCustomDestination] = useState<string>('');

    // Inquiries & Slideshow State
    const [inquiryName, setInquiryName] = useState('');
    const [inquiryPhone, setInquiryPhone] = useState('');
    const [inquiryDate, setInquiryDate] = useState('');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showShareModal, setShowShareModal] = useState(false);
    const [sharingItem, setSharingItem] = useState<{ id: string; title: string; type: 'property' | 'retail' } | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    // EduAI Wholesale RFQ (Request for Quotation) Modal State
    const [showRfqModal, setShowRfqModal] = useState(false);
    const [rfqProductQuery, setRfqProductQuery] = useState('');
    const [rfqQuantity, setRfqQuantity] = useState<number>(50);
    const [rfqTargetPrice, setRfqTargetPrice] = useState('');
    const [rfqDestination, setRfqDestination] = useState('');
    const [rfqBuyerName, setRfqBuyerName] = useState('');
    const [rfqBuyerPhone, setRfqBuyerPhone] = useState('');
    const [rfqBuyerEmail, setRfqBuyerEmail] = useState('');
    const [rfqNotes, setRfqNotes] = useState('');
    const [rfqSubmitting, setRfqSubmitting] = useState(false);
    const [rfqSuccess, setRfqSuccess] = useState(false);

    // Android PWA 1-Tap App Install State
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [showInstallBanner, setShowInstallBanner] = useState(true);

    // Listen for Android beforeinstallprompt
    useEffect(() => {
        const handleBeforeInstall = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBanner(true);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsAppInstalled(true);
            setShowInstallBanner(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }, []);

    const handleInstallApp = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsAppInstalled(true);
                setShowInstallBanner(false);
            }
            setDeferredPrompt(null);
        } else {
            setShowInstallModal(true);
        }
    };

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
            // Apply wholesale tiered pricing if applicable
            const baseUnitPrice = Number(inquiryProduct.srpPrice || inquiryProduct.costPrice || 0);
            const unitPrice = getWholesaleUnitPrice(baseUnitPrice, orderQuantity);
            const deliveryFee = Number(selectedRate.rate || 0);
            const itemsTotal = unitPrice * orderQuantity;
            const amount = itemsTotal + deliveryFee;
            const destinationName = isCustomDelivery ? (customDestination.trim() || 'Custom Destination') : (selectedRate.destination || 'Pickup');
            const fullAddress = specificAddress.trim() ? `${specificAddress.trim()} (${destinationName})` : destinationName;
            
            // 1. Trigger M-Pesa STK Push with real payable total amount first
            const orderId = crypto.randomUUID();
            const sellerInstId = inquiryProduct.institutionId || (inquiryProduct as any).institution_id || 'GLOBAL';
            const payableAmount = Math.max(1, Math.round(amount));
            const response = await apiService.triggerMpesaStkPush({
                amount: payableAmount,
                phoneNumber: inquiryData.phone.replace(/\+/g, '').trim(),
                reference: `ORD-${orderId.slice(0, 8)}`,
                description: `${orderQuantity}x ${inquiryProduct.name}`.slice(0, 30),
                institutionId: sellerInstId
            });

            const checkoutId = response?.CheckoutRequestID || response?.checkoutRequestId || response?.data?.CheckoutRequestID;
            if (!checkoutId || String(checkoutId).startsWith('KCB_CO_Mock_') || String(checkoutId).startsWith('ws_CO_Mock_') || String(checkoutId).startsWith('KCB_CO_')) {
                throw new Error(response?.message || 'Unable to send STK Push to your phone. Please check your phone number and try again.');
            }

            // 2. Create pending order record once STK push has been dispatched
            await apiService.saveModuleRecord('retail_marketplace_orders', {
                id: orderId,
                institutionId: sellerInstId,
                institution_id: sellerInstId,
                product_id: inquiryProduct.id,
                customer_name: inquiryData.name,
                customer_phone: inquiryData.phone,
                customer_email: inquiryData.email,
                destination: destinationName,
                delivery_address: fullAddress,
                destination_id: selectedRate.id !== 'custom' ? selectedRate.id : undefined,
                items_json: [{
                    id: inquiryProduct.id,
                    name: inquiryProduct.name,
                    unitPrice: unitPrice,
                    quantity: orderQuantity,
                    total: itemsTotal
                }],
                items_total: itemsTotal,
                quantity: orderQuantity,
                unit_price: unitPrice,
                delivery_fee: deliveryFee,
                total_amount: amount,
                payment_status: 'Pending',
                order_status: 'Pending Payment',
                created_at: new Date().toISOString()
            });

            setPaymentId(checkoutId);
            pollPaymentStatus(checkoutId, orderId, orderQuantity);
        } catch (error: any) {
            console.error('Checkout failed:', error);
            alert(error?.message || 'Payment initialization failed. Please check your phone number and try again.');
            setMpesaProcessing(false);
        }
    };

    const pollPaymentStatus = async (checkoutId: string, orderId: string, qtyPurchased: number = 1) => {
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            if (attempts > 30) {
                clearInterval(interval);
                setMpesaProcessing(false);
                alert('Payment confirmation timed out. No payment was received.');
                return;
            }

            try {
                const status = await apiService.checkMpesaPaymentStatus(checkoutId);
                if ((status.ResultCode === '0' || status.status === 'completed') && status.source !== 'sandbox_mock') {
                    clearInterval(interval);
                    
                    await apiService.saveModuleRecord('retail_marketplace_orders', {
                        id: orderId,
                        payment_status: 'Paid',
                        order_status: 'Received',
                        payment_reference: status.MpesaReceiptNumber || status.transactionId || checkoutId
                    });

                    if (inquiryProduct) {
                        await apiService.saveModuleRecord('retail_inventory', {
                            id: inquiryProduct.id,
                            quantity: Math.max(0, (inquiryProduct.quantity || 0) - qtyPurchased)
                        });
                    }

                    setInquirySuccess(true);
                    setMpesaProcessing(false);
                } else if ((status.ResultCode && status.ResultCode !== '0') || status.status === 'failed') {
                    clearInterval(interval);
                    setMpesaProcessing(false);
                    alert(`Payment was not completed: ${status.ResultDesc || status.message || 'Transaction declined or cancelled'}`);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 4000);
    };

    // Calculate B2B Wholesale Wholesale Tiered Pricing
    const getWholesaleUnitPrice = (basePrice: number, qty: number): number => {
        if (!basePrice) return 0;
        if (qty >= 50) return Math.round(basePrice * 0.80); // 20% bulk wholesale discount
        if (qty >= 10) return Math.round(basePrice * 0.90); // 10% volume discount
        return basePrice;
    };

    const promotedItems = [
        ...retailProducts.filter(p => Number(p.quantity) > 0).slice(0, 4).map(p => ({ ...p, type: 'retail' })),
        ...listings.filter(l => l.isPromoted).map(l => ({ ...l, type: 'property' }))
    ] as any[];

    useEffect(() => {
        if (promotedItems.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % promotedItems.length);
        }, 5500);
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
            setOrderQuantity(1);
            setDeliverySearchQuery('');
            setSpecificAddress('');
            setIsCustomDelivery(false);
            setCustomDestination('');
        }
        setInquirySuccess(false);
        setInquirySubmitting(false);
    };

    const createMarketplaceNotification = async (institutionId: string, message: string, type: string, link?: string) => {
        try {
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
                const subject = `[B2B Wholesale Inquiry]: ${inquiryListing.title}`;
                const body = [
                    `Hello ${seller?.name || 'Institutional Vendor'},`,
                    ``,
                    `A potential wholesale buyer has submitted an inquiry on the EduAI B2B Marketplace:`,
                    `Listing: ${inquiryListing.title}`,
                    `Price: KES ${inquiryListing.price?.toLocaleString()}`,
                    `Location: ${inquiryListing.location || 'N/A'}`,
                    ``,
                    `Buyer Details:`,
                    `Name: ${inquiryName}`,
                    `Phone: ${inquiryPhone}`,
                    isViewingRequired && inquiryDate ? `Preferred Site Inspection Date: ${inquiryDate}` : '',
                ].filter(Boolean).join('\n');

                if (seller?.email) {
                    await apiService.sendEmail(seller.email, subject, body, getInstitutionEmailConfig(seller, seller.emailConfig));
                }

                const pmInquiry = {
                    id: `inq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    institutionId: inquiryListing.institutionId,
                    listingId: inquiryListing.id,
                    customerName: inquiryName,
                    phoneNumber: inquiryPhone,
                    inquiryDate: inquiryDate || null,
                    message: `Wholesale inquiry for ${inquiryListing.listingType} on ${inquiryListing.title}`,
                    status: 'New',
                    createdAt: new Date().toISOString()
                };

                await apiService.saveModuleRecord('pm_inquiries', pmInquiry);
                await createMarketplaceNotification(
                    inquiryListing.institutionId,
                    `New B2B inquiry from ${inquiryName} for: ${inquiryListing.title}`,
                    'property_inquiry'
                );
            } else if (inquiryProduct) {
                apiService.incrementCount('retail_inventory_items', inquiryProduct.id, 'inquiry_count');
                const seller = getSeller(inquiryProduct.institutionId);
                const lead = {
                    id: `wish_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    institutionId: inquiryProduct.institutionId,
                    customerName: inquiryName || inquiryData.name,
                    phoneNumber: inquiryPhone || inquiryData.phone,
                    productQuery: inquiryProduct.name,
                    capturedById: null,
                    urgency: 'urgent',
                    status: 'Open',
                    createdAt: new Date().toISOString()
                };

                await apiService.saveModuleRecord('retail_wishlist', lead);

                if (seller?.email) {
                    try {
                        const subject = `[B2B Wholesale Inquiry]: ${inquiryProduct.name}`;
                        const body = `
                            Hello ${seller.name},
                            
                            A buyer has submitted a wholesale enquiry for ${inquiryProduct.name} on EduAI Marketplace.
                            
                            Details:
                            Buyer: ${inquiryName || inquiryData.name}
                            Phone: ${inquiryPhone || inquiryData.phone}
                            Product: ${inquiryProduct.name}
                            Price: KES ${Number(inquiryProduct.srpPrice || inquiryProduct.costPrice || 0)?.toLocaleString()}
                            
                            Please contact this buyer promptly to close the deal.
                        `.trim();
                        await apiService.sendEmail(seller.email, subject, body, getInstitutionEmailConfig(seller, seller.emailConfig));
                    } catch (emailErr) {
                        console.warn('Inquiry email notification failed:', emailErr);
                    }
                }

                await createMarketplaceNotification(
                    inquiryProduct.institutionId,
                    `New B2B wholesale enquiry from ${inquiryName || inquiryData.name} for: ${inquiryProduct.name}`,
                    'retail_lead'
                );
            }

            setInquirySuccess(true);
        } catch (err: any) {
            console.error('Inquiry submission failed:', err);
            alert(`Enquiry submission failed: ${err.message || 'Error'}. Please try again.`);
        } finally {
            setInquirySubmitting(false);
        }
    };

    // Handle RFQ (Request for Quotation) submission
    const handleRfqSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rfqProductQuery || !rfqBuyerPhone) {
            alert('Please specify what item you are sourcing and your contact phone number.');
            return;
        }

        setRfqSubmitting(true);
        try {
            const firstInstId = retailProducts[0]?.institutionId || institutions[0]?.id || 'GLOBAL';
            const rfqLead = {
                id: `rfq_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                institutionId: firstInstId,
                customerName: rfqBuyerName || 'B2B Sourcing Buyer',
                phoneNumber: rfqBuyerPhone,
                email: rfqBuyerEmail,
                productQuery: `${rfqQuantity}x ${rfqProductQuery}${rfqTargetPrice ? ` (Target: KES ${rfqTargetPrice})` : ''}`,
                details: `${rfqNotes ? `Specs: ${rfqNotes}. ` : ''}${rfqDestination ? `Destination: ${rfqDestination}` : ''}`,
                status: 'Open_RFQ',
                capturedById: 'Marketplace_RFQ',
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('retail_wishlist', rfqLead);
            setRfqSuccess(true);
        } catch (err) {
            console.error('RFQ submission error:', err);
            alert('Could not submit RFQ at this moment. Please try again.');
        } finally {
            setRfqSubmitting(false);
        }
    };

    useEffect(() => {
        const loadMarketplace = async () => {
            setLoading(true);
            try {
                const allListings = await apiService.fetchModuleRecords<PMListing>('pm_listings', 'ALL', undefined, { limit: propertyLimit });
                const activeListings = allListings.filter(l => l.status === 'Active' || l.status === 'Published');

                const allRetailItems = await apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', 'ALL', undefined, { limit: retailLimit });
                const liveRetailItems = allRetailItems.filter(item => item.marketplaceEnabled === true);

                const globalCars = await apiService.fetchCarListings('ALL', 'all', { limit: vehicleLimit });
                let cars = globalCars;
                if (carListings && carListings.length > 0) {
                    const globalIds = new Set(globalCars.map(c => c.id));
                    const uniqueInstitutional = carListings.filter(c => !globalIds.has(c.id));
                    cars = [...uniqueInstitutional, ...globalCars];
                }

                const instList = await apiService.fetchModuleRecords<Institution>('institutions', 'ALL');

                setListings(activeListings);
                setRetailProducts(liveRetailItems);
                setVehicleListings(cars);
                setInstitutions(instList);

                document.title = "EduAI Global Marketplace | B2B Wholesale, Bulk Equipment & RFQ Sourcing";
                const metaDesc = document.querySelector('meta[name="description"]');
                if (metaDesc) {
                    metaDesc.setAttribute("content", "EduAI B2B wholesale marketplace for institutions, schools, enterprises, equipment, vehicles, and campuses with Trade Assurance.");
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

    const handleCopyLink = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    // Filter Logic
    const filteredListings = listings.filter(l => {
        const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (l.location || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'All' || l.listingType === filterType;
        return matchesSearch && matchesType;
    });

    const filteredRetailProducts = retailProducts.filter(p => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q);
        
        if (selectedCategoryTab === 'all') return matchesSearch;
        const catObj = WHOLESALE_CATEGORIES.find(c => c.id === selectedCategoryTab);
        if (catObj && catObj.query) {
            const matchesCat = (p.category || '').toLowerCase().includes(catObj.query) ||
                               p.name.toLowerCase().includes(catObj.query);
            return matchesSearch && matchesCat;
        }
        return matchesSearch;
    });

    const filteredVehicles = vehicleListings.filter(v => {
        const q = searchQuery.toLowerCase();
        return `${v.make} ${v.model} ${v.year} ${v.description} ${v.fuelType} ${v.transmission}`.toLowerCase().includes(q);
    });

    const getSeller = (instId: string) => institutions.find(i => i.id === instId);

    const filteredDeliveryRates = deliveryRates.filter(rate => {
        if (!deliverySearchQuery.trim()) return true;
        const q = deliverySearchQuery.toLowerCase();
        const dest = (rate.destination || '').toLowerCase();
        const courier = (rate.courier_name || rate.courierName || '').toLowerCase();
        return dest.includes(q) || courier.includes(q);
    });

    const baseUnitPrice = Number(inquiryProduct?.srpPrice || inquiryProduct?.costPrice || 0);
    const activeUnitPrice = getWholesaleUnitPrice(baseUnitPrice, orderQuantity);
    const availableStock = Math.max(1, Number(inquiryProduct?.quantity || 1));
    const activeItemsSubtotal = activeUnitPrice * orderQuantity;
    const activeDeliveryFee = Number(selectedRate?.rate || 0);
    const activeTotalAmount = activeItemsSubtotal + activeDeliveryFee;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FFF9F5] dark:bg-slate-950 flex flex-col items-center justify-center p-8 relative">
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 relative mb-6">
                        <div className="absolute inset-0 border-4 border-[#FF6000]/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-[#FF6000] border-t-transparent rounded-full animate-spin"></div>
                        <img src="/marketplace_logo_3d.png" alt="Marketplace" className="w-12 h-12 absolute inset-0 m-auto object-contain rounded-xl shadow-lg" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">EduAI Global Marketplace</h2>
                    <p className="text-xs font-bold text-[#FF6000] mt-1 uppercase tracking-widest animate-pulse">Loading B2B Wholesale & RFQ Network...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 pb-20 md:pb-12">
            
            {/* ── 1. EduAI Wholesale Top Announcement & Utility Bar ── */}
            <div className="bg-[#222222] text-[#C4C4C4] text-[11px] font-medium border-b border-neutral-800 px-4 sm:px-8 py-2">
                <div className="max-w-[1500px] mx-auto flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-[#FF6000] font-black flex items-center gap-1.5 uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-[#FF6000] animate-ping"></span>
                            B2B Wholesale Hub
                        </span>
                        <span className="hidden sm:inline text-neutral-400">|</span>
                        <span className="hidden md:inline text-neutral-300">
                            Verified Institutional Equipment, School Buses, Furniture & Properties with Trade Assurance
                        </span>
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                        {/* 1-Tap Mobile App Install Button in Top Bar */}
                        <button
                            onClick={handleInstallApp}
                            className="bg-gradient-to-r from-[#FF6000] to-[#FF7A00] text-white px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 transition-all"
                            title="Install EduAI Marketplace Android App"
                        >
                            <span>📱</span>
                            <span>{isAppInstalled ? 'App Installed' : 'Install Android App'}</span>
                        </button>

                        <button 
                            onClick={() => setShowRfqModal(true)}
                            className="hover:text-white transition-colors flex items-center gap-1 text-[11px] font-semibold"
                        >
                            <span>📝</span> Submit RFQ
                        </button>

                        <span className="text-neutral-400">|</span>

                        <div className="flex items-center gap-1 text-white font-semibold">
                            <span>🇰🇪</span>
                            <span>KES (Kenya)</span>
                        </div>

                        {onBackToPortal && (
                            <>
                                <span className="text-neutral-400">|</span>
                                <button 
                                    onClick={onBackToPortal}
                                    className="text-amber-400 hover:text-amber-300 font-bold underline"
                                >
                                    Portal Sign In
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 2. EduAI Wholesale Signature Orange Header & Omnibar ── */}
            <header className="bg-gradient-to-r from-[#FF6000] via-[#FF5400] to-[#FF4500] text-white shadow-lg sticky top-0 z-40">
                <div className="max-w-[1500px] mx-auto px-4 sm:px-8 py-3.5">
                    <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
                        
                        {/* Left: EduAI Wholesale-Themed Logo & Slogan */}
                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveSection('all'); setSelectedCategoryTab('all'); }}>
                                <img 
                                    src="/marketplace_logo_3d.png" 
                                    alt="EduAI Marketplace" 
                                    className="w-11 h-11 rounded-2xl shadow-md border-2 border-white/30 object-contain bg-white"
                                />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-black tracking-tight leading-none text-white drop-shadow-sm font-sans">
                                            EduAI<span className="text-amber-200 font-light">.trade</span>
                                        </span>
                                        <span className="bg-white text-[#FF6000] text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm">
                                            B2B Wholesale
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-white/80 font-medium tracking-wide">
                                        Global Institutional Procurement & RFQ
                                    </p>
                                </div>
                            </div>

                            {/* Mobile Action for RFQ */}
                            <button
                                onClick={() => setShowRfqModal(true)}
                                className="md:hidden bg-white/20 hover:bg-white/30 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border border-white/30"
                            >
                                + Post RFQ
                            </button>
                        </div>

                        {/* Center: EduAI Wholesale Universal Wholesale Omnibar Search */}
                        <div className="w-full md:max-w-3xl flex-1">
                            <div className="flex bg-white rounded-full p-1 shadow-2xl border-2 border-white/40 focus-within:ring-4 focus-within:ring-amber-300 transition-all">
                                
                                {/* Search Category Dropdown */}
                                <div className="hidden sm:flex items-center border-r border-slate-200 px-3 py-1.5 text-slate-700 text-xs font-bold">
                                    <select 
                                        value={searchCategory}
                                        onChange={(e: any) => setSearchCategory(e.target.value)}
                                        className="bg-transparent outline-none cursor-pointer pr-2 font-bold text-slate-700"
                                    >
                                        <option value="all">All Products</option>
                                        <option value="retail">Equipment & Stock</option>
                                        <option value="properties">Campuses & Land</option>
                                        <option value="vehicles">School Buses & Cars</option>
                                    </select>
                                </div>

                                {/* Main Search Text Input */}
                                <div className="flex-1 flex items-center px-4">
                                    <SearchIcon className="w-5 h-5 text-slate-400 mr-2 flex-shrink-0" />
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="What bulk equipment, school supplies, or vehicles are you sourcing?"
                                        className="w-full bg-transparent text-slate-900 font-semibold text-sm outline-none placeholder:text-slate-400"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* EduAI Wholesale Orange Search Button */}
                                <button 
                                    className="bg-gradient-to-r from-[#FF6000] to-[#E55000] hover:from-[#E55000] hover:to-[#CC4500] text-white px-7 py-2.5 rounded-full font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                                >
                                    <span>Search</span>
                                </button>
                            </div>
                        </div>

                        {/* Right: Quick RFQ & Trade Assurance Badges */}
                        <div className="hidden lg:flex items-center gap-4">
                            <button
                                onClick={() => setShowRfqModal(true)}
                                className="bg-amber-300 hover:bg-amber-200 text-slate-950 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all"
                            >
                                <ClipboardListIcon className="w-4 h-4 text-[#FF6000]" />
                                <span>Request For Quote</span>
                            </button>

                            <div className="flex flex-col text-right">
                                <div className="flex items-center gap-1.5 justify-end text-xs font-bold text-white">
                                    <span className="text-amber-300">🛡️</span>
                                    <span>Trade Assurance</span>
                                </div>
                                <span className="text-[10px] text-white/80">100% Refund & Delivery</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ── 3. Quick Subheader Category Strip ── */}
                <div className="bg-[#E65300] text-white px-4 sm:px-8 border-t border-white/10 overflow-x-auto no-scrollbar">
                    <div className="max-w-[1500px] mx-auto flex items-center gap-2 py-1.5 whitespace-nowrap text-xs font-bold">
                        <button
                            onClick={() => { setActiveSection('all'); setSelectedCategoryTab('all'); }}
                            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeSection === 'all' && selectedCategoryTab === 'all' ? 'bg-white text-[#FF6000] font-black shadow-sm' : 'text-white/90 hover:bg-white/10'}`}
                        >
                            <span>☰</span> All Categories
                        </button>

                        <button
                            onClick={() => { setActiveSection('retail'); setSelectedCategoryTab('all'); }}
                            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeSection === 'retail' ? 'bg-white text-[#FF6000] font-black shadow-sm' : 'text-white/90 hover:bg-white/10'}`}
                        >
                            <ShoppingCartIcon className="w-4 h-4" /> Bulk Equipment & Supplies ({retailProducts.length})
                        </button>

                        <button
                            onClick={() => { setActiveSection('properties'); }}
                            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeSection === 'properties' ? 'bg-white text-[#FF6000] font-black shadow-sm' : 'text-white/90 hover:bg-white/10'}`}
                        >
                            <BuildingOfficeIcon className="w-4 h-4" /> Campuses & Real Estate ({listings.length})
                        </button>

                        <button
                            onClick={() => { setActiveSection('vehicles'); }}
                            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeSection === 'vehicles' ? 'bg-white text-[#FF6000] font-black shadow-sm' : 'text-white/90 hover:bg-white/10'}`}
                        >
                            <CarIcon className="w-4 h-4" /> School Buses & Vehicles ({vehicleListings.length})
                        </button>

                        <div className="h-4 w-px bg-white/20 mx-2"></div>

                        <span className="text-amber-200 text-[11px] font-black flex items-center gap-1">
                            <span>🔥</span> Ready To Ship
                        </span>

                        <span className="text-white/80 text-[11px] font-medium flex items-center gap-1 ml-auto">
                            <span>🚚</span> Countrywide Delivery via M-Pesa
                        </span>
                    </div>
                </div>
            </header>

            {/* ── 4. Android 1-Tap App Install Banner ── */}
            {showInstallBanner && !isAppInstalled && (
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-[#FF6000] text-white px-4 py-3 shadow-md">
                    <div className="max-w-[1500px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <img src="/marketplace_logo_3d.png" alt="App Icon" className="w-10 h-10 rounded-xl shadow-md bg-white p-0.5 object-contain" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-sm uppercase tracking-wide">Install EduAI Marketplace Android App</span>
                                    <span className="bg-white text-orange-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Fast Mobile APK</span>
                                </div>
                                <p className="text-xs text-white/90">
                                    Instant wholesale purchasing, direct supplier inquiries, RFQ notifications & offline tracking.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <button
                                onClick={handleInstallApp}
                                className="bg-white text-[#FF6000] hover:bg-amber-100 font-black text-xs uppercase px-5 py-2 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95"
                            >
                                📲 1-Tap Install
                            </button>
                            <button
                                onClick={() => setShowInstallBanner(false)}
                                className="text-white/70 hover:text-white p-1"
                                title="Dismiss"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 5. EduAI Wholesale 3-Column Hero Section ── */}
            <div className="max-w-[1500px] mx-auto px-4 sm:px-8 pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    
                    {/* Left Column: Megamenu Category Navigation (4 Cols on desktop) */}
                    <div className="hidden lg:block lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-[#FF6000] text-lg">☰</span>
                            <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">Wholesale Categories</h3>
                        </div>

                        <ul className="space-y-1">
                            {WHOLESALE_CATEGORIES.map(cat => {
                                const isSelected = selectedCategoryTab === cat.id;
                                return (
                                    <li key={cat.id}>
                                        <button
                                            onClick={() => {
                                                if (cat.section) {
                                                    setActiveSection(cat.section as any);
                                                } else {
                                                    setActiveSection('retail');
                                                    setSelectedCategoryTab(cat.id);
                                                }
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${isSelected ? 'bg-[#FFF3EB] dark:bg-orange-950/40 text-[#FF6000] font-black' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                        >
                                            <span className="flex items-center gap-2.5 truncate">
                                                <span className="text-base">{cat.icon}</span>
                                                <span className="truncate">{cat.name}</span>
                                            </span>
                                            <span className="text-slate-400 text-[10px]">›</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Trade Assurance Assurance Box */}
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="bg-[#FFF8F2] dark:bg-orange-950/20 p-3.5 rounded-xl border border-orange-200/60 dark:border-orange-900/50">
                                <div className="flex items-center gap-2 text-xs font-black text-[#FF6000] mb-1">
                                    <span>🛡️</span> Trade Assurance
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                                    Full M-Pesa escrow protection, quality inspection & on-time delivery guarantees on every order.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Center Column: EduAI Wholesale Dynamic Deal Carousel (6 Cols) */}
                    <div className="lg:col-span-6 flex flex-col">
                        <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden shadow-md bg-gradient-to-br from-slate-900 via-orange-950 to-slate-900 border border-slate-200/50 dark:border-slate-800">
                            
                            {promotedItems.length > 0 ? (
                                promotedItems.map((item, idx) => (
                                    <div 
                                        key={item.id}
                                        className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                                    >
                                        {/* Background Banner Image */}
                                        <div className="absolute inset-0 z-0">
                                            {item.images?.[0] || item.imageUrl ? (
                                                <img 
                                                    src={item.images?.[0] || item.imageUrl} 
                                                    alt={item.title || item.name} 
                                                    className="w-full h-full object-cover opacity-45 transform scale-105 hover:scale-110 transition-transform duration-7000"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-r from-orange-900 to-slate-900" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent"></div>
                                        </div>

                                        {/* Content Overlay */}
                                        <div className="relative z-10 p-6 sm:p-10 flex flex-col justify-between h-full">
                                            <div>
                                                <div className="inline-flex items-center gap-2 bg-[#FF6000] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md mb-4">
                                                    <span>⚡</span> Flash Wholesale Deal
                                                </div>
                                                <h2 className="text-2xl sm:text-4xl font-black text-white uppercase italic tracking-tight line-clamp-2 drop-shadow-md mb-3">
                                                    {item.title || item.name}
                                                </h2>
                                                <p className="text-xs sm:text-sm text-slate-200 font-medium line-clamp-2 max-w-md">
                                                    {item.description || 'Verified manufacturer inventory ready for institutional procurement.'}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-end justify-between gap-4 pt-4 border-t border-white/20">
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-amber-300 block">Wholesale Unit Price</span>
                                                    <div className="text-2xl sm:text-3xl font-black text-white italic">
                                                        <span className="text-sm font-normal text-amber-300 mr-1">KES</span>
                                                        {Number(item.price || item.srpPrice || item.costPrice || 0)?.toLocaleString()}
                                                        <span className="text-xs font-normal text-slate-300 ml-1">/ piece</span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => item.type === 'property' ? setSelectedListing(item) : setSelectedProduct(item)}
                                                    className="bg-gradient-to-r from-[#FF6000] to-[#E55000] text-white hover:from-[#E55000] hover:to-[#CC4500] px-6 py-3 rounded-full font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    Source Now ›
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 flex flex-col justify-center h-full text-white">
                                    <span className="bg-[#FF6000] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full w-max mb-3">
                                        EduAI Global Wholesale
                                    </span>
                                    <h2 className="text-3xl font-black uppercase tracking-tight">Direct Factory & Institutional Procurement</h2>
                                    <p className="text-sm text-slate-300 mt-2">Connecting verified schools, colleges, hospitals, and suppliers countrywide.</p>
                                </div>
                            )}

                            {/* Carousel Indicators */}
                            {promotedItems.length > 1 && (
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                                    {promotedItems.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentSlide(i)}
                                            className={`h-2 rounded-full transition-all ${i === currentSlide ? 'w-6 bg-[#FF6000]' : 'w-2 bg-white/40'}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Perks Ribbon below Banner */}
                        <div className="grid grid-cols-3 gap-3 mt-3">
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                                <span className="text-base block mb-0.5">📦</span>
                                <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 block">Tiered Discounts</span>
                                <span className="text-[9px] text-slate-400">Up to 20% on bulk</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                                <span className="text-base block mb-0.5">🚚</span>
                                <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 block">Courier Delivery</span>
                                <span className="text-[9px] text-slate-400">Doorstep & Pickup</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                                <span className="text-base block mb-0.5">🛡️</span>
                                <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 block">M-Pesa STK</span>
                                <span className="text-[9px] text-slate-400">Secure Instant Pay</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: EduAI Wholesale Buyer RFQ Sourcing Card (3 Cols) */}
                    <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-[#FF6000]">
                                    <ClipboardListIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">Quick RFQ</h4>
                                    <span className="text-[10px] text-slate-400">One request, multiple quotes</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                                Tell verified suppliers what you need. Receive wholesale quotes directly to your phone.
                            </p>

                            <form onSubmit={(e) => { e.preventDefault(); setShowRfqModal(true); }} className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">What are you sourcing?</label>
                                    <input 
                                        type="text" 
                                        value={rfqProductQuery}
                                        onChange={(e) => setRfqProductQuery(e.target.value)}
                                        placeholder="e.g. 50 Student Desks, 10 Microscopes..."
                                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-medium outline-none focus:ring-2 focus:ring-[#FF6000]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Quantity</label>
                                        <input 
                                            type="number" 
                                            min={1}
                                            value={rfqQuantity}
                                            onChange={(e) => setRfqQuantity(parseInt(e.target.value) || 1)}
                                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-medium outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Phone</label>
                                        <input 
                                            type="tel" 
                                            value={rfqBuyerPhone}
                                            onChange={(e) => setRfqBuyerPhone(e.target.value)}
                                            placeholder="+254 7..."
                                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-medium outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-[#FF6000] hover:bg-[#E55000] text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                                >
                                    Request Quotations Now
                                </button>
                            </form>
                        </div>

                        {/* Verified Supplier Trust Badge */}
                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                <span>✓</span> 100% Pre-vetted Institutional Suppliers
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                                <span>⚡</span> Average response time: ~2 hours
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── 6. Category Quick Navigation Chips (Mobile & Tablet) ── */}
            <div className="lg:hidden max-w-[1500px] mx-auto px-4 sm:px-8 mt-5 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 py-1">
                    {WHOLESALE_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                if (cat.section) {
                                    setActiveSection(cat.section as any);
                                } else {
                                    setActiveSection('retail');
                                    setSelectedCategoryTab(cat.id);
                                }
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-1.5 ${selectedCategoryTab === cat.id ? 'bg-[#FF6000] text-white border-[#FF6000] shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}
                        >
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 7. Main Wholesale Listings Section ── */}
            <div className="max-w-[1500px] mx-auto px-4 sm:px-8 pt-10">

                {/* Section Header with Tabs */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-2 text-[#FF6000] text-xs font-black uppercase tracking-wider mb-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6000]"></span>
                            Direct Sourcing Channels
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {activeSection === 'properties' ? 'Campuses, Land & Commercial Properties' : activeSection === 'vehicles' ? 'School Buses, Fleet & Transport' : 'Wholesale Equipment & Institutional Inventory'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-black">
                        <button
                            onClick={() => setActiveSection('all')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${activeSection === 'all' ? 'bg-white dark:bg-slate-900 text-[#FF6000] shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                        >
                            All ({retailProducts.length + listings.length + vehicleListings.length})
                        </button>
                        <button
                            onClick={() => setActiveSection('retail')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${activeSection === 'retail' ? 'bg-white dark:bg-slate-900 text-[#FF6000] shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                        >
                            Equipment ({retailProducts.length})
                        </button>
                        <button
                            onClick={() => setActiveSection('properties')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${activeSection === 'properties' ? 'bg-white dark:bg-slate-900 text-[#FF6000] shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                        >
                            Real Estate ({listings.length})
                        </button>
                        <button
                            onClick={() => setActiveSection('vehicles')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${activeSection === 'vehicles' ? 'bg-white dark:bg-slate-900 text-[#FF6000] shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                        >
                            Vehicles ({vehicleListings.length})
                        </button>
                    </div>
                </div>

                {/* ── Wholesale Retail Products Grid (EduAI Wholesale Style) ── */}
                {(activeSection === 'all' || activeSection === 'retail') && (
                    <div className="mb-14">
                        {activeSection === 'all' && (
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <span>📦</span> Institutional Wholesale Stock & Equipment
                                </h3>
                                <button onClick={() => setActiveSection('retail')} className="text-xs font-bold text-[#FF6000] hover:underline">
                                    View All ({retailProducts.length}) ›
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
                            {filteredRetailProducts.slice(0, activeSection === 'all' ? 8 : retailLimit).map(product => {
                                const seller = getSeller(product.institutionId);
                                const unitPrice = Number(product.srpPrice || product.costPrice || 0);
                                const tier10 = Math.round(unitPrice * 0.90);
                                const tier50 = Math.round(unitPrice * 0.80);

                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => {
                                            setSelectedProduct(product);
                                            apiService.incrementCount('retail_inventory_items', product.id, 'view_count');
                                        }}
                                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-[#FF6000] transition-all flex flex-col group cursor-pointer transform hover:-translate-y-1"
                                    >
                                        {/* Product Photo */}
                                        <div className="relative h-44 sm:h-52 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            {product.imageUrl ? (
                                                <img 
                                                    src={product.imageUrl} 
                                                    alt={product.name} 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <ShoppingCartIcon className="w-12 h-12 opacity-30 text-[#FF6000]" />
                                                </div>
                                            )}

                                            {/* EduAI Wholesale Badges */}
                                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                                                <span className="bg-[#FF6000] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow">
                                                    Wholesale
                                                </span>
                                                {product.category && (
                                                    <span className="bg-black/60 backdrop-blur-md text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded">
                                                        {product.category}
                                                    </span>
                                                )}
                                            </div>

                                            {Number(product.quantity) <= 5 && Number(product.quantity) > 0 && (
                                                <div className="absolute top-2 right-2 bg-amber-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow">
                                                    Low Stock
                                                </div>
                                            )}

                                            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white px-2 py-0.5 rounded text-[9px] font-black shadow-sm">
                                                <span className="text-[#FF6000]">🛡️</span> Trade Assurance
                                            </div>
                                        </div>

                                        {/* Product Details & Tiered Pricing */}
                                        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-[#FF6000] transition-colors mb-2">
                                                    {product.name}
                                                </h4>

                                                {/* EduAI Wholesale Volume Tiered Pricing */}
                                                <div className="bg-[#FFF8F2] dark:bg-orange-950/20 p-2 rounded-xl mb-2.5 border border-orange-200/50 dark:border-orange-900/40">
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="text-[10px] font-bold text-slate-500">1-9 pcs:</span>
                                                        <span className="text-xs font-black text-slate-900 dark:text-white">KES {unitPrice.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-baseline text-[#FF6000]">
                                                        <span className="text-[10px] font-bold">10-49 pcs (-10%):</span>
                                                        <span className="text-xs font-black">KES {tier10.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-baseline text-emerald-600 dark:text-emerald-400">
                                                        <span className="text-[10px] font-bold">50+ pcs (-20%):</span>
                                                        <span className="text-xs font-black">KES {tier50.toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                                                    <span>MOQ: <strong>1 pc</strong></span>
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">In Stock: {product.quantity || 1}</span>
                                                </div>

                                                {/* Seller / Verified Supplier */}
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate pt-2 border-t border-slate-100 dark:border-slate-800">
                                                    <span className="text-amber-500">⭐</span>
                                                    <span className="truncate font-semibold">{seller?.name || 'Verified Institutional Supplier'}</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="pt-3 mt-2 flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openInquiry(product);
                                                    }}
                                                    className="w-full bg-[#FF6000] hover:bg-[#E55000] text-white py-2 rounded-xl font-black text-[11px] uppercase tracking-wider shadow-sm transition-all text-center"
                                                >
                                                    Start Order
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {filteredRetailProducts.length === 0 && (
                            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                                <span className="text-4xl block mb-2">📦</span>
                                <h4 className="text-base font-black text-slate-800 dark:text-white uppercase">No Products Found</h4>
                                <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or category filter.</p>
                            </div>
                        )}

                        {activeSection === 'retail' && filteredRetailProducts.length >= retailLimit && (
                            <div className="flex justify-center mt-10">
                                <button
                                    onClick={() => setRetailLimit(prev => prev + 16)}
                                    className="px-8 py-3 bg-white dark:bg-slate-900 text-[#FF6000] border-2 border-[#FF6000] rounded-full font-black text-xs uppercase tracking-wider hover:bg-[#FF6000] hover:text-white transition-all shadow-sm"
                                >
                                    Load More Wholesale Stock ({retailProducts.length - retailLimit} remaining)
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Real Estate & Campuses Grid ── */}
                {(activeSection === 'all' || activeSection === 'properties') && (
                    <div className="mb-14">
                        {activeSection === 'all' && (
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <span>🏫</span> Verified School Campuses & Real Estate
                                </h3>
                                <button onClick={() => setActiveSection('properties')} className="text-xs font-bold text-[#FF6000] hover:underline">
                                    View All ({listings.length}) ›
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredListings.slice(0, activeSection === 'all' ? 6 : propertyLimit).map(listing => {
                                const seller = getSeller(listing.institutionId);
                                return (
                                    <div
                                        key={listing.id}
                                        onClick={() => {
                                            setSelectedListing(listing);
                                            apiService.incrementCount('pm_listings', listing.id, 'view_count');
                                        }}
                                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-orange-500 transition-all flex flex-col cursor-pointer group"
                                    >
                                        <div className="relative h-56 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            {listing.images && listing.images[0] ? (
                                                <img 
                                                    src={listing.images[0]} 
                                                    alt={listing.title} 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <BuildingOfficeIcon className="w-16 h-16 opacity-30 text-orange-500" />
                                                </div>
                                            )}
                                            <div className="absolute top-3 left-3 bg-[#FF6000] text-white text-[9px] font-black uppercase px-2.5 py-1 rounded shadow">
                                                For {listing.listingType}
                                            </div>
                                            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1">
                                                <MapPinIcon className="w-3.5 h-3.5 text-amber-400" />
                                                <span>{listing.location || 'Kenya'}</span>
                                            </div>
                                        </div>

                                        <div className="p-5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h4 className="font-black text-base text-slate-900 dark:text-white uppercase italic tracking-tight mb-2 group-hover:text-orange-600 transition-colors">
                                                    {listing.title}
                                                </h4>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                                                    {listing.description}
                                                </p>
                                            </div>

                                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Valuation</span>
                                                    <span className="text-xl font-black text-slate-900 dark:text-white italic">
                                                        <span className="text-xs font-normal text-slate-400 mr-1">KES</span>
                                                        {listing.price?.toLocaleString()}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openInquiry(listing);
                                                    }}
                                                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-[#FF6000] dark:hover:bg-[#FF6000] dark:hover:text-white px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                                                >
                                                    Inquire
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Vehicle Marketplace Grid ── */}
                {(activeSection === 'all' || activeSection === 'vehicles') && (
                    <div className="mb-14">
                        <VehicleMarketplaceView 
                            listings={filteredVehicles}
                            onBookTestDrive={(v) => {
                                alert(`Booking test drive for ${v.make} ${v.model}. Out of scope for this demo.`);
                            }}
                            onInquiry={(v) => {
                                alert(`Enquiring about ${v.make} ${v.model}. Out of scope for this demo.`);
                            }}
                            currentInstitution={null}
                        />
                    </div>
                )}

            </div>

            {/* ── 8. EduAI Wholesale Logistics Partner CTA ── */}
            <div className="max-w-[1500px] mx-auto px-4 sm:px-8 mt-12 mb-16">
                <div className="bg-gradient-to-r from-neutral-900 via-slate-900 to-[#E55000] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
                    <div className="max-w-2xl relative z-10 space-y-4">
                        <div className="inline-flex items-center gap-2 bg-[#FF6000] px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <TruckIcon className="w-4 h-4" /> Countrywide Logistics Network
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight italic">
                            Are you a Courier or Transport Provider?
                        </h2>
                        <p className="text-slate-200 text-sm leading-relaxed">
                            Join our nationwide B2B fulfillment network. Deliver wholesale school desks, lab supplies, books, and equipment with guaranteed automated M-Pesa payouts.
                        </p>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <button
                                onClick={() => {
                                    setRegistratorInstId(retailProducts[0]?.institutionId || '');
                                    setShowCourierSignup(true);
                                }}
                                className="bg-white text-slate-900 hover:bg-amber-100 px-6 py-3 rounded-full font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition-all"
                            >
                                Register As Courier Partner
                            </button>
                            <button
                                onClick={() => setShowRfqModal(true)}
                                className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-wider border border-white/30 transition-all"
                            >
                                Post Bulk Shipping Need
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 9. EduAI Wholesale Request for Quotation (RFQ) Modal ── */}
            {showRfqModal && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowRfqModal(false)}></div>
                    <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
                        <div className="bg-gradient-to-r from-[#FF6000] to-[#E55000] text-white p-6 flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-200 block">Sourcing Service</span>
                                <h3 className="text-xl font-black uppercase tracking-tight">Post Request For Quotation (RFQ)</h3>
                            </div>
                            <button onClick={() => setShowRfqModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {rfqSuccess ? (
                            <div className="p-8 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                                    ✓
                                </div>
                                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase">RFQ Broadcasted!</h4>
                                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                                    Your sourcing request for <strong>{rfqQuantity}x {rfqProductQuery}</strong> has been shared with verified institutional manufacturers and vendors. Suppliers will call/SMS you at <strong>{rfqBuyerPhone}</strong>.
                                </p>
                                <button
                                    onClick={() => { setShowRfqModal(false); setRfqSuccess(false); }}
                                    className="bg-[#FF6000] text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-wider"
                                >
                                    Close Window
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleRfqSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Product / Equipment Name *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={rfqProductQuery}
                                        onChange={(e) => setRfqProductQuery(e.target.value)}
                                        placeholder="e.g. 100 Double Student Desks, 5 Microscope Sets, 1 51-Seater Bus..."
                                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-[#FF6000]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Quantity Needed *</label>
                                        <input 
                                            type="number" 
                                            required
                                            min={1}
                                            value={rfqQuantity}
                                            onChange={(e) => setRfqQuantity(parseInt(e.target.value) || 1)}
                                            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Target Budget (Optional KES)</label>
                                        <input 
                                            type="text" 
                                            value={rfqTargetPrice}
                                            onChange={(e) => setRfqTargetPrice(e.target.value)}
                                            placeholder="e.g. 250,000"
                                            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Your Full Name *</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={rfqBuyerName}
                                            onChange={(e) => setRfqBuyerName(e.target.value)}
                                            placeholder="Buyer / School Admin"
                                            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Contact Phone Number *</label>
                                        <input 
                                            type="tel" 
                                            required
                                            value={rfqBuyerPhone}
                                            onChange={(e) => setRfqBuyerPhone(e.target.value)}
                                            placeholder="+254 7..."
                                            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Delivery Destination / County</label>
                                    <input 
                                        type="text" 
                                        value={rfqDestination}
                                        onChange={(e) => setRfqDestination(e.target.value)}
                                        placeholder="e.g. Eldoret, Nakuru, Nairobi, Kisumu..."
                                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Specifications / Notes</label>
                                    <textarea 
                                        rows={2}
                                        value={rfqNotes}
                                        onChange={(e) => setRfqNotes(e.target.value)}
                                        placeholder="Add required brands, materials, dimensions, or inspection requirements..."
                                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={rfqSubmitting}
                                    className="w-full bg-gradient-to-r from-[#FF6000] to-[#E55000] text-white py-3.5 rounded-full font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all"
                                >
                                    {rfqSubmitting ? 'Submitting RFQ...' : 'Submit Sourcing RFQ to Verified Suppliers'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ── 10. Android App Install Helper Modal (with QR Code) ── */}
            {showInstallModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowInstallModal(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95">
                        <button onClick={() => setShowInstallModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <XIcon className="w-5 h-5" />
                        </button>

                        <img src="/marketplace_logo_3d.png" alt="App Icon" className="w-20 h-20 rounded-2xl mx-auto shadow-xl border-2 border-orange-500 object-contain mb-4 bg-white" />
                        <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white">Install Marketplace Android App</h3>
                        <p className="text-xs text-slate-500 mt-2 mb-6">
                            Experience 1-click wholesale sourcing on your Android device with instant M-Pesa order tracking.
                        </p>

                        <div className="bg-[#FFF3EB] dark:bg-orange-950/30 p-4 rounded-2xl border border-orange-200 dark:border-orange-900 text-left space-y-3 mb-6">
                            <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-[#FF6000] text-white flex items-center justify-center text-xs font-black flex-shrink-0">1</span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                    Open this website on <strong>Google Chrome</strong> on your Android phone.
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-[#FF6000] text-white flex items-center justify-center text-xs font-black flex-shrink-0">2</span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                    Tap the <strong>Chrome menu (⋮)</strong> at top right and tap <strong>"Add to Home screen"</strong> or <strong>"Install App"</strong>.
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-[#FF6000] text-white flex items-center justify-center text-xs font-black flex-shrink-0">3</span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                    The <strong>EduAI Marketplace</strong> icon will appear on your Android home screen!
                                </p>
                            </div>
                        </div>

                        {/* QR Code for Mobile Scanning */}
                        <div className="p-3 bg-white rounded-2xl shadow-inner inline-block border border-slate-200 mb-4">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent('https://portal.eduai.co.ke/?view=marketplace')}`} 
                                alt="Scan QR Code" 
                                className="w-32 h-32 mx-auto"
                            />
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mt-1">Scan with phone camera</span>
                        </div>

                        <button
                            onClick={() => setShowInstallModal(false)}
                            className="w-full bg-[#FF6000] text-white py-3 rounded-full font-black text-xs uppercase tracking-wider"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}

            {/* ── 11. Property Detail Panel ── */}
            {selectedListing && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setSelectedListing(null)}></div>
                    <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 shadow-2xl h-full overflow-y-auto border-l border-slate-200 dark:border-slate-800">
                        <div className="absolute top-6 right-6 z-20">
                            <button onClick={() => setSelectedListing(null)} className="p-3 bg-black/50 text-white rounded-full hover:bg-black/70">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="h-80 relative bg-slate-900">
                            {selectedListing.images && selectedListing.images[0] ? (
                                <img src={selectedListing.images[0]} alt={selectedListing.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                    <BuildingOfficeIcon className="w-20 h-20" />
                                </div>
                            )}
                            <div className="absolute bottom-6 left-6 right-6 text-white">
                                <span className="bg-[#FF6000] text-white text-[9px] font-black uppercase px-2.5 py-1 rounded shadow">
                                    For {selectedListing.listingType}
                                </span>
                                <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight mt-2 drop-shadow">
                                    {selectedListing.title}
                                </h2>
                            </div>
                        </div>

                        <div className="p-6 sm:p-8 space-y-6">
                            <div>
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Description & Architecture</h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                    {selectedListing.description}
                                </p>
                            </div>

                            {selectedListing.features && selectedListing.features.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Facility Features</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedListing.features.map(feat => (
                                            <span key={feat} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                                ✓ {feat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-[#FFF8F2] dark:bg-orange-950/20 rounded-2xl border border-orange-200 dark:border-orange-900/40 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Asking Valuation</span>
                                    <span className="text-2xl font-black text-[#FF6000] italic">
                                        KES {selectedListing.price?.toLocaleString()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => { setSelectedListing(null); openInquiry(selectedListing); }}
                                    className="bg-[#FF6000] hover:bg-[#E55000] text-white px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-wider shadow"
                                >
                                    Inquire Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 12. Retail Product Detail Panel (EduAI Wholesale Wholesale) ── */}
            {selectedProduct && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setSelectedProduct(null)}></div>
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl h-full overflow-y-auto border-l border-slate-200 dark:border-slate-800">
                        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center z-20">
                            <span className="text-xs font-black text-[#FF6000] uppercase tracking-wider flex items-center gap-1">
                                <span>🛡️</span> Verified Wholesale Sourcing
                            </span>
                            <button onClick={() => setSelectedProduct(null)} className="p-2 text-slate-400 hover:text-slate-600">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="h-80 bg-slate-100 dark:bg-slate-800 relative">
                            {selectedProduct.imageUrl ? (
                                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <ShoppingCartIcon className="w-20 h-20 text-[#FF6000] opacity-40" />
                                </div>
                            )}
                        </div>

                        <div className="p-6 sm:p-8 space-y-6">
                            <div>
                                <span className="bg-[#FFF3EB] text-[#FF6000] text-[10px] font-black uppercase px-2.5 py-1 rounded-md">
                                    {selectedProduct.category || 'General Wholesale'}
                                </span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2">
                                    {selectedProduct.name}
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                                    {selectedProduct.description || 'Pre-vetted institutional supplies with direct delivery.'}
                                </p>
                            </div>

                            {/* Wholesale Tiered Pricing Table */}
                            <div className="bg-[#FFF8F2] dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-900/50">
                                <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">Wholesale Tiered Pricing</span>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <span className="text-[10px] text-slate-400 font-bold block">1 - 9 pcs</span>
                                        <span className="text-sm font-black text-slate-900 dark:text-white">KES {Number(selectedProduct.srpPrice || selectedProduct.costPrice || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-orange-300 text-[#FF6000]">
                                        <span className="text-[10px] font-bold block">10 - 49 pcs</span>
                                        <span className="text-sm font-black">KES {Math.round(Number(selectedProduct.srpPrice || selectedProduct.costPrice || 0) * 0.90).toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-400 text-emerald-600 dark:text-emerald-400">
                                        <span className="text-[10px] font-bold block">50+ pcs</span>
                                        <span className="text-sm font-black">KES {Math.round(Number(selectedProduct.srpPrice || selectedProduct.costPrice || 0) * 0.80).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 py-3 border-y border-slate-100 dark:border-slate-800">
                                <span>Availability: <strong className="text-emerald-600 dark:text-emerald-400">{selectedProduct.quantity || 1} units</strong></span>
                                <span>Supplier: <strong>{getSeller(selectedProduct.institutionId)?.name || 'Direct Vendor'}</strong></span>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedProduct(null);
                                        openInquiry(selectedProduct);
                                    }}
                                    className="flex-1 bg-gradient-to-r from-[#FF6000] to-[#E55000] text-white py-3.5 rounded-full font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all"
                                >
                                    Start Order / Inquire
                                </button>
                                <button
                                    onClick={() => {
                                        setSharingItem({ id: selectedProduct.id, title: selectedProduct.name, type: 'retail' });
                                        setShowShareModal(true);
                                    }}
                                    className="p-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 transition-colors"
                                    title="Share Listing"
                                >
                                    <ShareIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 13. M-Pesa Checkout & Logistics Modal ── */}
            {(inquiryListing || inquiryProduct) && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                        onClick={() => {
                            if (!inquirySubmitting && !mpesaProcessing) {
                                setInquiryListing(null);
                                setInquiryProduct(null);
                            }
                        }}
                    ></div>
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#FF6000] to-[#E55000] text-white p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-200 block">
                                        {inquiryProduct ? 'Wholesale Order & M-Pesa' : 'Property Inquiry'}
                                    </span>
                                    <h3 className="text-xl font-black uppercase tracking-tight line-clamp-1">
                                        {inquiryListing?.title || inquiryProduct?.name}
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => { setInquiryListing(null); setInquiryProduct(null); }}
                                    className="p-1 hover:bg-white/20 rounded-full"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Stepper for Retail */}
                            {inquiryProduct && !inquirySuccess && (
                                <div className="flex gap-2 mt-4 pt-4 border-t border-white/20">
                                    {(['details', 'delivery', 'payment'] as const).map((step, idx) => (
                                        <div key={step} className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${checkoutStep === step ? 'bg-white text-[#FF6000]' : 'border border-white/40 text-white/60'}`}>
                                                {idx + 1}
                                            </div>
                                            <span className={`text-[10px] font-bold capitalize ${checkoutStep === step ? 'text-white' : 'text-white/60'}`}>{step}</span>
                                            {idx < 2 && <span className="text-white/40">›</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {inquirySuccess ? (
                            <div className="p-8 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-black">
                                    ✓
                                </div>
                                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase">Order Received!</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    {inquiryProduct 
                                        ? `Wholesale delivery organized for ${orderQuantity}x ${inquiryProduct.name}. Courier dispatch is underway.`
                                        : `Your inquiry has been relayed to the vendor. They will call you at ${inquiryPhone}.`}
                                </p>
                                <button
                                    onClick={() => { setInquiryListing(null); setInquiryProduct(null); }}
                                    className="bg-[#FF6000] text-white px-8 py-3 rounded-full font-black text-xs uppercase"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <div className="p-6 max-h-[75vh] overflow-y-auto">
                                {checkoutStep === 'details' && (
                                    <div className="space-y-4">
                                        {inquiryProduct && (
                                            <div className="bg-[#FFF8F2] dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-900/40">
                                                <div className="flex justify-between items-center mb-3">
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{inquiryProduct.name}</span>
                                                        <span className="text-[10px] text-slate-400">Unit: KES {activeUnitPrice.toLocaleString()}</span>
                                                    </div>

                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                                        <button
                                                            type="button"
                                                            disabled={orderQuantity <= 1}
                                                            onClick={() => setOrderQuantity(prev => Math.max(1, prev - 1))}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                                        >
                                                            <MinusIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={availableStock}
                                                            value={orderQuantity}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value, 10);
                                                                if (!isNaN(val)) {
                                                                    setOrderQuantity(Math.max(1, Math.min(availableStock, val)));
                                                                } else if (e.target.value === '') {
                                                                    setOrderQuantity(1);
                                                                }
                                                            }}
                                                            className="w-12 text-center font-black text-xs bg-transparent border-0 outline-none p-0 text-slate-900 dark:text-white"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={orderQuantity >= availableStock}
                                                            onClick={() => setOrderQuantity(prev => Math.min(availableStock, prev + 1))}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                                        >
                                                            <PlusIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="text-right pt-2 border-t border-orange-200/40">
                                                    <span className="text-xs font-black text-[#FF6000]">
                                                        Subtotal: KES {activeItemsSubtotal.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Your Full Name</label>
                                            <input 
                                                type="text" 
                                                value={inquiryProduct ? inquiryData.name : inquiryName}
                                                onChange={e => inquiryProduct ? setInquiryData({...inquiryData, name: e.target.value}) : setInquiryName(e.target.value)}
                                                placeholder="Full Name"
                                                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Phone Number (M-Pesa)</label>
                                            <input 
                                                type="tel" 
                                                value={inquiryProduct ? inquiryData.phone : inquiryPhone}
                                                onChange={e => inquiryProduct ? setInquiryData({...inquiryData, phone: e.target.value}) : setInquiryPhone(e.target.value)}
                                                placeholder="+254 7..."
                                                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium outline-none"
                                            />
                                        </div>

                                        <button
                                            onClick={() => inquiryProduct ? setCheckoutStep('delivery') : handleSubmitInquiry(new Event('submit') as any)}
                                            disabled={inquirySubmitting || (inquiryProduct ? (!inquiryData.name || !inquiryData.phone) : (!inquiryName || !inquiryPhone))}
                                            className="w-full bg-[#FF6000] text-white py-3.5 rounded-full font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                                        >
                                            {inquirySubmitting ? 'Submitting...' : inquiryProduct ? `Proceed to Delivery (KES ${activeItemsSubtotal.toLocaleString()})` : 'Submit Inquiry'}
                                        </button>
                                    </div>
                                )}

                                {checkoutStep === 'delivery' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-black uppercase text-slate-400">Select Delivery Location</h4>
                                            <span className="text-[10px] text-slate-400">{filteredDeliveryRates.length} routes</span>
                                        </div>

                                        <input 
                                            type="text" 
                                            value={deliverySearchQuery}
                                            onChange={e => setDeliverySearchQuery(e.target.value)}
                                            placeholder="Search city, town, or area..."
                                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                                        />

                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {filteredDeliveryRates.map(rate => {
                                                const isSelected = selectedRate?.id === rate.id && !isCustomDelivery;
                                                return (
                                                    <div 
                                                        key={rate.id}
                                                        onClick={() => { setSelectedRate(rate); setIsCustomDelivery(false); }}
                                                        className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${isSelected ? 'border-[#FF6000] bg-[#FFF8F2] dark:bg-orange-950/30' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}
                                                    >
                                                        <div>
                                                            <span className="text-xs font-bold text-slate-900 dark:text-white block">{rate.destination}</span>
                                                            <span className="text-[10px] text-slate-400">{rate.courier_name || 'Verified Courier'} • {rate.estimated_days || 1} day</span>
                                                        </div>
                                                        <span className="text-xs font-black text-[#FF6000]">KES {Number(rate.rate).toLocaleString()}</span>
                                                    </div>
                                                );
                                            })}

                                            <div 
                                                onClick={() => {
                                                    setIsCustomDelivery(true);
                                                    setSelectedRate({ id: 'custom', destination: customDestination || 'Custom', rate: 0 });
                                                }}
                                                className={`p-3 rounded-xl border border-dashed transition-all cursor-pointer ${isCustomDelivery ? 'border-[#FF6000] bg-[#FFF8F2] dark:bg-orange-950/30' : 'border-slate-300 hover:bg-slate-50'}`}
                                            >
                                                <span className="text-xs font-bold block text-slate-800 dark:text-white">Custom Town / County</span>
                                                <span className="text-[10px] text-slate-400">Specify your exact location</span>
                                            </div>
                                        </div>

                                        {isCustomDelivery && (
                                            <input 
                                                type="text" 
                                                value={customDestination}
                                                onChange={e => {
                                                    setCustomDestination(e.target.value);
                                                    setSelectedRate({ id: 'custom', destination: e.target.value || 'Custom', rate: 0 });
                                                }}
                                                placeholder="Enter town, school, or county name"
                                                className="w-full text-xs p-3 rounded-xl border border-[#FF6000] bg-white dark:bg-slate-800 font-medium outline-none"
                                            />
                                        )}

                                        <input 
                                            type="text" 
                                            value={specificAddress}
                                            onChange={e => setSpecificAddress(e.target.value)}
                                            placeholder="Specific address, building, or landmark (Optional)"
                                            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                                        />

                                        <div className="flex gap-3 pt-2">
                                            <button onClick={() => setCheckoutStep('details')} className="px-5 py-3 rounded-full border border-slate-200 text-xs font-bold">
                                                Back
                                            </button>
                                            <button 
                                                disabled={!selectedRate || (isCustomDelivery && !customDestination.trim())}
                                                onClick={() => setCheckoutStep('payment')}
                                                className="flex-1 bg-[#FF6000] text-white py-3 rounded-full font-black text-xs uppercase tracking-wider disabled:opacity-50"
                                            >
                                                Proceed to Payment
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {checkoutStep === 'payment' && inquiryProduct && (
                                    <div className="space-y-4">
                                        <div className="bg-[#FFF8F2] dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-900/40 space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Item:</span>
                                                <span className="font-bold">{inquiryProduct.name} (x{orderQuantity})</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Items Subtotal:</span>
                                                <span className="font-black">KES {activeItemsSubtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Delivery:</span>
                                                <span className="font-bold text-[#FF6000]">{activeDeliveryFee > 0 ? `KES ${activeDeliveryFee.toLocaleString()}` : 'Coordinated on Delivery'}</span>
                                            </div>
                                            <div className="pt-2 border-t border-orange-200/50 flex justify-between text-sm">
                                                <span className="font-black uppercase">Total Payable:</span>
                                                <span className="font-black text-[#FF6000]">KES {activeTotalAmount.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleProcessPayment}
                                            disabled={mpesaProcessing}
                                            className="w-full bg-[#107C41] hover:bg-[#0E6C38] text-white py-4 rounded-full font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
                                        >
                                            {mpesaProcessing ? (
                                                <span className="animate-pulse">Check Phone for M-Pesa PIN...</span>
                                            ) : (
                                                <>
                                                    <span className="bg-white text-[#107C41] px-1.5 py-0.5 rounded text-[10px]">M-PESA</span>
                                                    <span>Pay KES {activeTotalAmount.toLocaleString()} via STK Push</span>
                                                </>
                                            )}
                                        </button>

                                        <button onClick={() => setCheckoutStep('delivery')} className="w-full text-center text-slate-400 text-xs font-bold hover:underline">
                                            ← Change Destination
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── 14. Mobile Sticky Bottom App Bar (EduAI Wholesale Style) ── */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[120] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-2 px-4 shadow-2xl">
                <div className="flex justify-around items-center">
                    <button
                        onClick={() => { setActiveSection('all'); setSelectedCategoryTab('all'); }}
                        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${activeSection === 'all' ? 'text-[#FF6000]' : 'text-slate-400'}`}
                    >
                        <span className="text-base">🏠</span>
                        <span>Home</span>
                    </button>
                    <button
                        onClick={() => { setActiveSection('retail'); }}
                        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${activeSection === 'retail' ? 'text-[#FF6000]' : 'text-slate-400'}`}
                    >
                        <span className="text-base">📦</span>
                        <span>Equipment</span>
                    </button>
                    <button
                        onClick={() => setShowRfqModal(true)}
                        className="flex flex-col items-center gap-0.5 text-[10px] font-black text-[#FF6000]"
                    >
                        <span className="text-base bg-[#FF6000] text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md -mt-4">📝</span>
                        <span>RFQ</span>
                    </button>
                    <button
                        onClick={() => { setActiveSection('properties'); }}
                        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${activeSection === 'properties' ? 'text-[#FF6000]' : 'text-slate-400'}`}
                    >
                        <span className="text-base">🏫</span>
                        <span>Estates</span>
                    </button>
                    <button
                        onClick={handleInstallApp}
                        className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-amber-500"
                    >
                        <span className="text-base">📱</span>
                        <span>App</span>
                    </button>
                </div>
            </div>

            {/* Courier Signup Modal */}
            <CourierSignupModal 
                isOpen={showCourierSignup}
                onClose={() => setShowCourierSignup(false)}
                institutionId={registratorInstId}
                onSuccess={() => {}}
            />
        </div>
    );
};
