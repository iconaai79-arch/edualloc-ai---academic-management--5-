import React, { useState, useEffect } from 'react';
import { PMListing, PMListingType, Institution, RetailInventoryItem, CarListing } from '../../types';
import { apiService } from '../../services/apiService';
import { getInstitutionEmailConfig } from '../../services/emailService';
import { HomeIcon } from '../icons/HomeIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { MapPinIcon } from '../icons/MapPinIcon';
import { ShoppingCartIcon } from '../icons/ShoppingCartIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { EnvelopeIcon } from '../icons/EnvelopeIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { XIcon } from '../icons/XIcon';
import { BuildingOfficeIcon } from '../icons/BuildingOfficeIcon';
import { CheckBadgeIcon } from '../icons/CheckBadgeIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { StarIcon } from '../icons/StarIcon';
import { ShareIcon } from '../icons/ShareIcon';
import { QrCodeIcon } from '../icons/QrCodeIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { TruckIcon } from '../icons/TruckIcon';
import { CarIcon } from '../icons/CarIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { MinusIcon } from '../icons/MinusIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { GlobeAltIcon } from '../icons/GlobeAltIcon';
import { TagIcon } from '../icons/TagIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { StoreIcon } from '../icons/StoreIcon';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { VehicleMarketplaceView } from '../VehicleMarketplaceView';
import { AiSalesAgentWidget } from '../public/AiSalesAgentWidget';

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
    const [searchCategory, setSearchCategory] = useState<'all' | 'in_stock' | 'bulk_discount' | 'retail' | 'properties' | 'vehicles'>('all');
    const [activeSection, setActiveSection] = useState<'retail' | 'properties' | 'vehicles'>('retail');
    const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
    const [selectedListing, setSelectedListing] = useState<PMListing | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<RetailInventoryItem | null>(null);

    // Logistics & Checkout State
    const [deliveryRates, setDeliveryRates] = useState<any[]>([]);
    const [selectedRate, setSelectedRate] = useState<any | null>(null);
    const [checkoutStep, setCheckoutStep] = useState<'details' | 'delivery' | 'payment'>('details');
    const [mpesaProcessing, setMpesaProcessing] = useState(false);
    const [paymentId, setPaymentId] = useState<string | null>(null);

    // Quantity & Delivery Location Enhancements
    const [orderQuantity, setOrderQuantity] = useState<number>(1);
    const [deliverySearchQuery, setDeliverySearchQuery] = useState<string>('');
    const [specificAddress, setSpecificAddress] = useState<string>('');
    const [isCustomDelivery, setIsCustomDelivery] = useState<boolean>(false);
    const [customDestination, setCustomDestination] = useState<string>('');

    // Inquiry & Order State
    const [inquiryListing, setInquiryListing] = useState<PMListing | null>(null);
    const [inquiryProduct, setInquiryProduct] = useState<RetailInventoryItem | null>(null);
    const [inquiryData, setInquiryData] = useState({ name: '', email: '', phone: '', message: '' });
    const [inquirySubmitting, setInquirySubmitting] = useState(false);
    const [inquirySuccess, setInquirySuccess] = useState(false);
    const [isGeneralContact, setIsGeneralContact] = useState(false);

    // Share Modal State
    const [showShareModal, setShowShareModal] = useState(false);
    const [sharingItem, setSharingItem] = useState<{ id: string; title: string; type: 'store' | 'product' | 'property' } | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    // B2B RFQ (Request for Quotation) Modal State
    const [showRfqModal, setShowRfqModal] = useState(false);
    const [rfqProductQuery, setRfqProductQuery] = useState('');
    const [rfqQuantity, setRfqQuantity] = useState<number>(20);
    const [rfqTargetPrice, setRfqTargetPrice] = useState('');
    const [rfqDestination, setRfqDestination] = useState('');
    const [rfqBuyerName, setRfqBuyerName] = useState('');
    const [rfqBuyerPhone, setRfqBuyerPhone] = useState('');
    const [rfqBuyerEmail, setRfqBuyerEmail] = useState('');
    const [rfqNotes, setRfqNotes] = useState('');
    const [rfqSubmitting, setRfqSubmitting] = useState(false);
    const [rfqSuccess, setRfqSuccess] = useState(false);

    // PWA / App Install
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    useEffect(() => {
        const handleBeforeInstall = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsAppInstalled(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }, []);

    const handleInstallApp = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsAppInstalled(true);
            }
            setDeferredPrompt(null);
        } else {
            alert('To install this shop as an app: tap your browser menu (⋮) and select "Add to Home screen".');
        }
    };

    // Load Tenant and Catalog
    useEffect(() => {
        const loadStorefront = async () => {
            setLoading(true);
            try {
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

                    const [instListings, instRetail, instCars, agroProducts, agroBatches, rates] = await Promise.all([
                        apiService.fetchModuleRecords<PMListing>('pm_listings', resolvedTenant.id),
                        apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', resolvedTenant.id),
                        apiService.fetchCarListings(resolvedTenant.id, 'all'),
                        (resolvedTenant.institutionType === 'Agrovet' || resolvedTenant.category === 'Agrovet') ? apiService.fetchModuleRecords('agrovet_products', resolvedTenant.id) : Promise.resolve([]),
                        (resolvedTenant.institutionType === 'Agrovet' || resolvedTenant.category === 'Agrovet') ? apiService.fetchModuleRecords('agrovet_batches', resolvedTenant.id) : Promise.resolve([]),
                        apiService.fetchModuleRecords('retail_delivery_rates', resolvedTenant.id).catch(() => [])
                    ]);

                    setListings((instListings || []).filter((l: any) => l.status === 'Active' || l.status === 'Published'));

                    let products = (instRetail || []).filter((item: any) => item.marketplaceEnabled === true || item.marketplace_enabled === true);

                    // If no explicit marketplaceEnabled flags set, fallback to all active stock
                    if (products.length === 0 && instRetail && instRetail.length > 0) {
                        products = instRetail;
                    }

                    if (agroProducts && agroProducts.length > 0) {
                        const mappedAgro = agroProducts.map((p: any) => {
                            const productBatches = (agroBatches || []).filter((b: any) => b.productId === p.id);
                            const activeBatch = productBatches.sort((a: any, b: any) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime())[0];
                            return {
                                id: p.id,
                                institutionId: p.institutionId,
                                name: p.name,
                                description: p.description,
                                category: p.category || 'Agricultural Supplies',
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

                    const filteredCars = (instCars || []).filter((c: any) => c.status === 'active' || c.status === 'Published' || c.status === 'Active');
                    setCarListings(filteredCars);

                    if (filteredCars.length > 0) setActiveSection('vehicles');
                    else if (products.length > 0) setActiveSection('retail');
                    else if (instListings && instListings.length > 0) setActiveSection('properties');

                    if (rates && rates.length > 0) {
                        setDeliveryRates(rates);
                    } else {
                        // Standard nationwide defaults if tenant hasn't defined custom rates
                        setDeliveryRates([
                            { id: 'pickup', destination: 'Shop / Agency Counter Pickup', rate: 0, courier_name: 'Self-Pickup' },
                            { id: 'local', destination: 'Local CBD & Surrounding (Express 2-Hr)', rate: 250, courier_name: 'Local Courier' },
                            { id: 'metro', destination: 'Metropolitan & Countywide Dispatch', rate: 450, courier_name: 'Regional Courier' },
                            { id: 'national', destination: 'Upcountry / Nationwide Parcel Delivery', rate: 750, courier_name: 'National Logistics' }
                        ]);
                    }

                    document.title = `${resolvedTenant.name} | Verified Wholesale & Retail Agency Storefront`;
                }
            } catch (error) {
                console.error("Failed to load storefront:", error);
            } finally {
                setLoading(false);
            }
        };

        if (institutionId) loadStorefront();
    }, [institutionId]);

    // Handle deep linking to specific items via URL ?item=<id>
    useEffect(() => {
        if (loading || (listings.length === 0 && retailProducts.length === 0)) return;
        const params = new URLSearchParams(window.location.search);
        const itemId = params.get('item');
        if (itemId) {
            const product = retailProducts.find(p => p.id === itemId);
            if (product) {
                setSelectedProduct(product);
                return;
            }
            const property = listings.find(l => l.id === itemId);
            if (property) {
                setSelectedListing(property);
            }
        }
    }, [loading, listings, retailProducts]);

    // Calculate B2B Wholesale Tiered Pricing
    const getWholesaleUnitPrice = (basePrice: number, qty: number): number => {
        if (!basePrice) return 0;
        if (qty >= 50) return Math.round(basePrice * 0.80); // 20% bulk wholesale discount
        if (qty >= 10) return Math.round(basePrice * 0.90); // 10% volume discount
        return basePrice;
    };

    const handleCopyLink = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const openInquiry = (item: PMListing | RetailInventoryItem) => {
        if ('listingType' in item) {
            setInquiryListing(item);
            setInquiryProduct(null);
            setInquiryData({ name: '', email: '', phone: '', message: '' });
        } else {
            setInquiryProduct(item);
            setInquiryListing(null);
            setInquiryData({ name: '', email: '', phone: '', message: '' });
            setCheckoutStep('details');
            setSelectedRate(deliveryRates[0] || null);
            setOrderQuantity(1);
            setDeliverySearchQuery('');
            setSpecificAddress('');
            setIsCustomDelivery(false);
            setCustomDestination('');
        }
        setInquirySuccess(false);
        setInquirySubmitting(false);
        setIsGeneralContact(false);
    };

    const openGeneralContact = () => {
        setInquiryListing(null);
        setInquiryProduct(null);
        setIsGeneralContact(true);
        setInquiryData({ name: '', email: '', phone: '', message: '' });
        setInquirySuccess(false);
    };

    const createNotification = async (targetInstId: string, message: string, type: string) => {
        try {
            const users = await apiService.fetchUsers(targetInstId);
            const notifications = users.map(user => ({
                userId: user.id,
                institutionId: targetInstId,
                message,
                type,
                isRead: false,
                timestamp: new Date().toISOString()
            }));
            await Promise.all(notifications.map(n => apiService.saveModuleRecord('app_notifications', n)));
        } catch (err) {
            console.error('Failed to create storefront notifications:', err);
        }
    };

    // M-Pesa STK Push Checkout
    const handleTriggerMpesaPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inquiryProduct || !inquiryData.phone || !selectedRate) return;

        setMpesaProcessing(true);
        try {
            const baseUnitPrice = Number(inquiryProduct.srpPrice || inquiryProduct.costPrice || 0);
            const unitPrice = getWholesaleUnitPrice(baseUnitPrice, orderQuantity);
            const deliveryFee = Number(selectedRate.rate || 0);
            const itemsTotal = unitPrice * orderQuantity;
            const amount = itemsTotal + deliveryFee;
            const destinationName = isCustomDelivery ? (customDestination.trim() || 'Custom Destination') : (selectedRate.destination || 'Pickup');
            const fullAddress = specificAddress.trim() ? `${specificAddress.trim()} (${destinationName})` : destinationName;

            const orderId = crypto.randomUUID();
            const payableAmount = Math.max(1, Math.round(amount));
            const response = await apiService.triggerMpesaStkPush({
                amount: payableAmount,
                phoneNumber: inquiryData.phone.replace(/\+/g, '').trim(),
                reference: `ORD-${orderId.slice(0, 8)}`,
                description: `${orderQuantity}x ${inquiryProduct.name}`.slice(0, 30),
                institutionId: inquiryProduct.institutionId
            });

            const checkoutId = response?.CheckoutRequestID || response?.checkoutRequestId || response?.data?.CheckoutRequestID;
            if (!checkoutId || String(checkoutId).startsWith('KCB_CO_Mock_') || String(checkoutId).startsWith('ws_CO_Mock_')) {
                throw new Error(response?.message || 'Unable to send M-Pesa STK Push to your phone. Please check your phone number and try again.');
            }

            await apiService.saveModuleRecord('retail_marketplace_orders', {
                id: orderId,
                institutionId: inquiryProduct.institutionId,
                institution_id: inquiryProduct.institutionId,
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
            alert(error?.message || 'M-Pesa STK prompt could not be delivered. Please check your phone number and try again, or use "Book Order (Pay on Delivery / Invoice)".');
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

    // Standard Inquiry submission
    const handleSubmitInquiry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant || (!inquiryListing && !inquiryProduct && !isGeneralContact)) return;
        setInquirySubmitting(true);

        try {
            if (inquiryListing) {
                apiService.incrementCount('pm_listings', inquiryListing.id, 'inquiry_count');
                const pmInquiry = {
                    id: `inq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    institutionId: tenant.id,
                    listingId: inquiryListing.id,
                    customerName: inquiryData.name,
                    phoneNumber: inquiryData.phone,
                    inquiryDate: new Date().toISOString().split('T')[0],
                    message: inquiryData.message || `Interested in ${inquiryListing.listingType} on ${inquiryListing.title}`,
                    status: 'New',
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('pm_inquiries', pmInquiry);
                await createNotification(tenant.id, `New inquiry from ${inquiryData.name} for: ${inquiryListing.title}`, 'property_inquiry');
            } else if (inquiryProduct) {
                apiService.incrementCount('retail_inventory_items', inquiryProduct.id, 'inquiry_count');
                const lead = {
                    id: `wish_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    institutionId: tenant.id,
                    customerName: inquiryData.name,
                    phoneNumber: inquiryData.phone,
                    productQuery: `${orderQuantity}x ${inquiryProduct.name} (Wholesale Inquiry)`,
                    urgency: 'urgent',
                    status: 'Open',
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('retail_wishlist', lead);
                await createNotification(tenant.id, `New wholesale order lead from ${inquiryData.name} (${inquiryData.phone}) for ${orderQuantity}x ${inquiryProduct.name}`, 'retail_lead');
            } else if (isGeneralContact) {
                const lead = {
                    id: `wish_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    institutionId: tenant.id,
                    customerName: inquiryData.name,
                    phoneNumber: inquiryData.phone,
                    productQuery: inquiryData.message || 'Direct Store Support Inquiry',
                    urgency: 'urgent',
                    status: 'Open',
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('retail_wishlist', lead);
                await createNotification(tenant.id, `Direct storefront inquiry from ${inquiryData.name} (${inquiryData.phone})`, 'store_inquiry');
            }

            if (tenant.email) {
                try {
                    const subject = `[Storefront Inquiry]: ${inquiryListing ? inquiryListing.title : inquiryProduct ? inquiryProduct.name : tenant.name}`;
                    const body = `Hello ${tenant.name},\n\nA customer has contacted your storefront:\nName: ${inquiryData.name}\nPhone: ${inquiryData.phone}\nEmail: ${inquiryData.email || 'N/A'}\nItem: ${inquiryProduct ? `${orderQuantity}x ${inquiryProduct.name}` : inquiryListing ? inquiryListing.title : 'General Inquiry'}\nNotes: ${inquiryData.message || 'Ready to purchase'}`;
                    await apiService.sendEmail(tenant.email, subject, body, getInstitutionEmailConfig(tenant, tenant.emailConfig));
                } catch (e) {
                    console.warn('Storefront email dispatch error:', e);
                }
            }

            setInquirySuccess(true);
        } catch (err: any) {
            console.error('Inquiry submission failed:', err);
            alert(`Submission error: ${err.message || 'Unable to submit'}`);
        } finally {
            setInquirySubmitting(false);
        }
    };

    // Handle RFQ (Request for Quotation) submission
    const handleRfqSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant || !rfqProductQuery || !rfqBuyerPhone) {
            alert('Please specify the product you are sourcing and your contact phone number.');
            return;
        }

        setRfqSubmitting(true);
        try {
            const rfqLead = {
                id: `rfq_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                institutionId: tenant.id,
                customerName: rfqBuyerName || 'B2B Wholesale Buyer',
                phoneNumber: rfqBuyerPhone,
                email: rfqBuyerEmail,
                productQuery: `${rfqQuantity}x ${rfqProductQuery}${rfqTargetPrice ? ` (Target: KES ${rfqTargetPrice})` : ''} - Destination: ${rfqDestination || 'Standard Delivery'}`,
                urgency: 'urgent',
                status: 'Open',
                notes: rfqNotes,
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('retail_wishlist', rfqLead);
            await createNotification(tenant.id, `New B2B RFQ from ${rfqBuyerName || 'Buyer'} (${rfqBuyerPhone}) for: ${rfqQuantity}x ${rfqProductQuery}`, 'rfq_submission');

            if (tenant.email) {
                try {
                    const subject = `[B2B RFQ Quotation Request]: ${rfqQuantity}x ${rfqProductQuery}`;
                    const body = `Hello ${tenant.name},\n\nA wholesale buyer has submitted a formal Request for Quotation (RFQ) on your storefront:\n\nBuyer: ${rfqBuyerName}\nPhone: ${rfqBuyerPhone}\nEmail: ${rfqBuyerEmail || 'N/A'}\nItem Needed: ${rfqProductQuery}\nQuantity: ${rfqQuantity}\nTarget Price: ${rfqTargetPrice ? `KES ${rfqTargetPrice}` : 'Negotiable'}\nDelivery Location: ${rfqDestination || 'Standard'}\nSpecial Instructions: ${rfqNotes || 'None'}\n\nPlease contact this buyer promptly with your quotation.`;
                    await apiService.sendEmail(tenant.email, subject, body, getInstitutionEmailConfig(tenant, tenant.emailConfig));
                } catch (emailErr) {
                    console.warn('RFQ email notice error:', emailErr);
                }
            }

            setRfqSuccess(true);
        } catch (err: any) {
            console.error('RFQ error:', err);
            alert(`Failed to post RFQ: ${err.message || 'Error'}`);
        } finally {
            setRfqSubmitting(false);
        }
    };

    // Dynamic categories extracted from inventory
    const uniqueCategories = Array.from(new Set(retailProducts.map(p => p.category).filter(Boolean))) as string[];

    // Filtering
    const filteredProducts = retailProducts.filter(p => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q) ||
            (p.sku || '').toLowerCase().includes(q);

        if (selectedCategoryTab !== 'all' && p.category?.toLowerCase() !== selectedCategoryTab.toLowerCase()) {
            return false;
        }

        if (searchCategory === 'in_stock') return matchesSearch && Number(p.quantity || 0) > 0;
        if (searchCategory === 'bulk_discount') return matchesSearch && Number(p.srpPrice || p.costPrice || 0) > 0;

        return matchesSearch;
    });

    const filteredListings = listings.filter(l =>
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredVehicles = carListings.filter(v =>
        `${v.make} ${v.model} ${v.year} ${v.description} ${v.fuelType} ${v.transmission}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredDeliveryRates = deliveryRates.filter(rate => {
        if (!deliverySearchQuery.trim()) return true;
        const q = deliverySearchQuery.toLowerCase();
        const dest = (rate.destination || '').toLowerCase();
        const courier = (rate.courier_name || rate.courierName || '').toLowerCase();
        return dest.includes(q) || courier.includes(q);
    });

    const baseUnitPrice = Number(inquiryProduct?.srpPrice || inquiryProduct?.costPrice || 0);
    const activeUnitPrice = getWholesaleUnitPrice(baseUnitPrice, orderQuantity);
    const activeItemsSubtotal = activeUnitPrice * orderQuantity;
    const activeDeliveryFee = Number(selectedRate?.rate || 0);
    const activeTotalAmount = activeItemsSubtotal + activeDeliveryFee;

    const storeUrl = typeof window !== 'undefined'
        ? (tenant?.useSubdomain && tenant?.customSubdomain
            ? `https://${tenant.customSubdomain}.eduai.co.ke`
            : `${window.location.origin}/?shop=${tenant?.slug || tenant?.id || institutionId}`)
        : '';

    const showTabs = (retailProducts.length > 0 ? 1 : 0) + (listings.length > 0 ? 1 : 0) + (carListings.length > 0 ? 1 : 0) > 1;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FFF9F5] dark:bg-slate-950 flex flex-col items-center justify-center p-8 relative">
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 relative mb-6">
                        <div className="absolute inset-0 border-4 border-[#FF6000]/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-[#FF6000] border-t-transparent rounded-full animate-spin"></div>
                        <img src="/marketplace_logo_3d.png" alt="Marketplace" className="w-12 h-12 absolute inset-0 m-auto object-contain rounded-xl shadow-lg" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">Loading Storefront...</h2>
                    <p className="text-xs font-bold text-[#FF6000] mt-1 uppercase tracking-widest animate-pulse">Initializing Wholesale Catalog & Trade Assurance...</p>
                </div>
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="min-h-screen bg-[#F5F5F7] dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6 text-3xl">
                    🏪
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Agency Storefront Not Found</h1>
                <p className="text-slate-500 text-sm max-w-md mt-2 mb-8">The requested retail agency shop link does not exist, has expired, or is currently undergoing catalog updates.</p>
                <button
                    onClick={() => window.location.href = '/?view=marketplace'}
                    className="bg-gradient-to-r from-[#FF6000] to-[#FF4500] text-white px-8 py-3.5 rounded-full font-black uppercase text-xs tracking-wider shadow-lg hover:scale-105 transition-all"
                >
                    Explore Global Marketplace
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 pb-24 md:pb-16">

            {/* ── 1. Top B2B Wholesale Announcement & Utility Bar ── */}
            <div className="bg-[#222222] text-[#C4C4C4] text-[11px] font-medium border-b border-neutral-800 px-4 sm:px-8 py-2 sticky top-0 z-50">
                <div className="max-w-[1500px] mx-auto flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[#FF6000] font-black flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                            <span className="w-2 h-2 rounded-full bg-[#FF6000] animate-ping"></span>
                            Verified Retail Agency Storefront
                        </span>
                        <span className="hidden sm:inline text-neutral-600">|</span>
                        <span className="hidden md:inline text-neutral-300 text-[11px] flex items-center gap-1">
                            <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                            Trade Assurance Protected • Official Vendor: <strong className="text-white">{tenant.name}</strong>
                        </span>
                    </div>

                    <div className="flex items-center gap-3 ml-auto text-[11px]">
                        <button
                            onClick={handleInstallApp}
                            className="bg-gradient-to-r from-[#FF6000] to-[#FF7A00] text-white px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 transition-all"
                            title="Install App Shortcut"
                        >
                            <span>📱</span>
                            <span>{isAppInstalled ? 'App Ready' : 'Install Shop App'}</span>
                        </button>

                        <button
                            onClick={() => setShowRfqModal(true)}
                            className="hover:text-white transition-colors flex items-center gap-1 font-bold text-amber-300"
                        >
                            <span>📝</span> Post RFQ
                        </button>

                        <span className="text-neutral-600">|</span>

                        <button
                            onClick={() => {
                                setSharingItem({ id: tenant.id, title: tenant.name, type: 'store' });
                                setShowShareModal(true);
                            }}
                            className="hover:text-white transition-colors flex items-center gap-1 text-[11px] font-semibold"
                        >
                            <ShareIcon className="w-3.5 h-3.5" />
                            <span>Share Shop</span>
                        </button>

                        <span className="text-neutral-600 hidden sm:inline">|</span>

                        <div className="hidden sm:flex items-center gap-1 text-white font-semibold">
                            <span>🇰🇪</span>
                            <span>KES (Kenya)</span>
                        </div>

                        <span className="text-neutral-600">|</span>

                        <button
                            onClick={() => window.location.href = '/?view=marketplace'}
                            className="text-white/80 hover:text-white font-bold underline text-[10px]"
                        >
                            EduAI Wholesale
                        </button>
                    </div>
                </div>
            </div>

            {/* ── 2. Signature Omnibar & Branded Header ── */}
            <header className="bg-gradient-to-r from-[#FF6000] via-[#FF5400] to-[#FF4500] text-white shadow-lg sticky top-[37px] z-40">
                <div className="max-w-[1500px] mx-auto px-4 sm:px-8 py-3.5">
                    <div className="flex flex-col md:flex-row items-center gap-4 justify-between">

                        {/* Left: Agency Identity */}
                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveSection('retail'); setSelectedCategoryTab('all'); }}>
                                {tenant.logoUrl ? (
                                    <img
                                        loading="lazy"
                                        src={tenant.logoUrl}
                                        alt={tenant.name}
                                        className="w-12 h-12 rounded-2xl shadow-md border-2 border-white/40 object-contain bg-white p-1"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-2xl shadow-md border-2 border-white/40 bg-white text-[#FF6000] flex items-center justify-center font-black text-xl uppercase">
                                        {tenant.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none text-white drop-shadow-sm truncate max-w-[280px]">
                                            {tenant.name}
                                        </h1>
                                        <CheckBadgeIcon className="w-5 h-5 text-amber-200 shrink-0" title="Verified Supplier" />
                                    </div>
                                    <p className="text-[10px] text-white/90 font-medium tracking-wide mt-0.5 flex items-center gap-2">
                                        <span>{tenant.category || tenant.institutionType || 'Retail & Agency'}</span>
                                        <span>•</span>
                                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px] font-bold">Trade Assurance</span>
                                    </p>
                                </div>
                            </div>

                            {/* Mobile RFQ Trigger */}
                            <button
                                onClick={() => setShowRfqModal(true)}
                                className="md:hidden bg-white/20 hover:bg-white/30 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border border-white/30"
                            >
                                + RFQ
                            </button>
                        </div>

                        {/* Center: Wholesale Omnibar Search */}
                        <div className="w-full md:max-w-2xl flex-1">
                            <div className="flex bg-white rounded-full p-1 shadow-xl border-2 border-white/40 focus-within:ring-4 focus-within:ring-amber-300 transition-all">
                                <div className="hidden sm:flex items-center border-r border-slate-200 px-3 py-1 text-slate-700 text-xs font-bold">
                                    <select
                                        value={searchCategory}
                                        onChange={(e: any) => setSearchCategory(e.target.value)}
                                        className="bg-transparent outline-none cursor-pointer pr-2 font-bold text-slate-700 text-[11px]"
                                    >
                                        <option value="all">All Catalog</option>
                                        <option value="in_stock">In Stock Only</option>
                                        <option value="bulk_discount">Wholesale Deals</option>
                                        {carListings.length > 0 && <option value="vehicles">Vehicles ({carListings.length})</option>}
                                        {listings.length > 0 && <option value="properties">Properties ({listings.length})</option>}
                                    </select>
                                </div>

                                <div className="flex-1 flex items-center px-3 gap-2">
                                    <SearchIcon className="w-4 h-4 text-slate-400 shrink-0" />
                                    <input
                                        type="text"
                                        placeholder={`Search items, brands, SKU in ${tenant.name}...`}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs font-semibold outline-none py-1.5"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={() => {}}
                                    className="bg-gradient-to-r from-[#FF6000] to-[#FF4500] hover:opacity-95 text-white font-black text-xs uppercase px-5 py-2 rounded-full tracking-wider shadow flex items-center gap-1.5 transition-all"
                                >
                                    <span>Search</span>
                                </button>
                            </div>
                        </div>

                        {/* Right: Quick Vendor Contact & RFQ CTA */}
                        <div className="hidden lg:flex items-center gap-2">
                            {tenant.phoneNumber && (
                                <a
                                    href={`tel:${tenant.phoneNumber}`}
                                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                                >
                                    <PhoneIcon className="w-3.5 h-3.5" />
                                    <span>Call</span>
                                </a>
                            )}
                            {tenant.phoneNumber && (
                                <a
                                    href={`https://wa.me/${tenant.phoneNumber.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(tenant.name)}%2C%20I%20am%20browsing%20your%20agency%20storefront%20and%20would%20like%20to%20inquire%20about%20your%20products.`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow transition-all"
                                >
                                    <span>WhatsApp</span>
                                </a>
                            )}
                            <button
                                onClick={() => setShowRfqModal(true)}
                                className="px-4 py-2 bg-white text-[#FF6000] hover:bg-amber-50 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
                            >
                                <span>📝</span>
                                <span>Post RFQ</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── 3. Store Identity Hero & B2B Wholesale Banner ── */}
            <div className="max-w-[1500px] mx-auto px-4 sm:px-8 mt-5">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                        {/* Store Info */}
                        <div className="flex items-start sm:items-center gap-5">
                            <div className="relative shrink-0">
                                {tenant.logoUrl ? (
                                    <img
                                        loading="lazy"
                                        src={tenant.logoUrl}
                                        alt={tenant.name}
                                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-contain bg-white p-2 border border-slate-200 dark:border-slate-700 shadow-md"
                                    />
                                ) : (
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-[#FF6000] to-[#FF8A00] text-white flex items-center justify-center font-black text-3xl shadow-lg">
                                        {tenant.name.charAt(0)}
                                    </div>
                                )}
                                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-2 border-white dark:border-slate-900" title="Active Platform Verified Vendor">
                                    <CheckBadgeIcon className="w-4 h-4" />
                                </div>
                            </div>

                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        {tenant.name}
                                    </h2>
                                    <span className="bg-[#FFF4EC] dark:bg-orange-950/40 text-[#FF6000] border border-[#FF6000]/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                                        {tenant.businessSubType || tenant.category || 'Retail Agency'}
                                    </span>
                                    <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-200 dark:border-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                        <StarIcon className="w-3 h-3 text-amber-500 fill-amber-500" />
                                        4.9 Verified Supplier
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2.5">
                                    <span className="flex items-center gap-1">
                                        <MapPinIcon className="w-3.5 h-3.5 text-[#FF6000]" />
                                        {tenant.address || 'Headquarters & Branch Counters Verified'}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <ClockIcon className="w-3.5 h-3.5 text-indigo-500" />
                                        Avg. Response: &lt; 1 Hour
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                        <ShieldCheckIcon className="w-3.5 h-3.5" />
                                        Trade Assurance 100% Secure
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                                    <span>Shop Slug: <strong className="text-slate-700 dark:text-slate-200 font-mono">?shop={tenant.slug || tenant.id}</strong></span>
                                    <span>•</span>
                                    <span>Direct Line: <strong className="text-slate-700 dark:text-slate-200">{tenant.phoneNumber || 'Available'}</strong></span>
                                    <span>•</span>
                                    <span>Email: <strong className="text-slate-700 dark:text-slate-200">{tenant.email || 'Verified'}</strong></span>
                                </div>
                            </div>
                        </div>

                        {/* Agency Metrics & Actions */}
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
                            <div className="bg-[#F8F9FA] dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-center min-w-[100px]">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Products</span>
                                <span className="text-xl font-black text-slate-900 dark:text-white">{retailProducts.length}</span>
                            </div>
                            <div className="bg-[#F8F9FA] dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-center min-w-[100px]">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Bulk Discount</span>
                                <span className="text-xl font-black text-[#FF6000]">Up to 20%</span>
                            </div>
                            <div className="bg-[#F8F9FA] dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-center min-w-[100px]">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Dispatch</span>
                                <span className="text-xl font-black text-emerald-600">Immediate</span>
                            </div>

                            <button
                                onClick={() => {
                                    handleCopyLink(storeUrl);
                                    alert('Agency shop link copied to clipboard!');
                                }}
                                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl text-slate-800 dark:text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                                title="Copy Public Shop Link"
                            >
                                <ShareIcon className="w-4 h-4 text-[#FF6000]" />
                                <span>{copySuccess ? 'Copied!' : 'Share Shop'}</span>
                            </button>

                            <button
                                onClick={openGeneralContact}
                                className="px-5 py-3 bg-[#222222] hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md"
                            >
                                <EnvelopeIcon className="w-4 h-4 text-amber-400" />
                                <span>Contact Agency</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 4. Category Pills & Section Navigation ── */}
            <div className="max-w-[1500px] mx-auto px-4 sm:px-8 mt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">

                    {/* Section Switcher (Retail / Vehicles / Properties) */}
                    {showTabs && (
                        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <button
                                onClick={() => setActiveSection('retail')}
                                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                    activeSection === 'retail' ? 'bg-[#FF6000] text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <ShoppingCartIcon className="w-3.5 h-3.5" />
                                <span>Catalog ({retailProducts.length})</span>
                            </button>
                            {carListings.length > 0 && (
                                <button
                                    onClick={() => setActiveSection('vehicles')}
                                    className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        activeSection === 'vehicles' ? 'bg-[#FF6000] text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <CarIcon className="w-3.5 h-3.5" />
                                    <span>Vehicles ({carListings.length})</span>
                                </button>
                            )}
                            {listings.length > 0 && (
                                <button
                                    onClick={() => setActiveSection('properties')}
                                    className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        activeSection === 'properties' ? 'bg-[#FF6000] text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <BuildingOfficeIcon className="w-3.5 h-3.5" />
                                    <span>Properties ({listings.length})</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Category Filter Chips for Retail */}
                    {activeSection === 'retail' && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
                            <button
                                onClick={() => setSelectedCategoryTab('all')}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shrink-0 transition-all ${
                                    selectedCategoryTab === 'all'
                                        ? 'bg-[#222222] text-white shadow'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-[#FF6000]'
                                }`}
                            >
                                All Products ({retailProducts.length})
                            </button>
                            {uniqueCategories.map(cat => {
                                const count = retailProducts.filter(p => p.category === cat).length;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategoryTab(cat)}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shrink-0 transition-all ${
                                            selectedCategoryTab === cat
                                                ? 'bg-[#FF6000] text-white shadow'
                                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-[#FF6000]'
                                        }`}
                                    >
                                        {cat} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="text-xs font-bold text-slate-400">
                        Showing {activeSection === 'retail' ? filteredProducts.length : activeSection === 'vehicles' ? filteredVehicles.length : filteredListings.length} items
                    </div>
                </div>
            </div>

            {/* ── 5. Main Catalog Content ── */}
            <div className="max-w-[1500px] mx-auto px-4 sm:px-8 mt-6">

                {activeSection === 'retail' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredProducts.map(product => {
                            const basePrice = Number(product.srpPrice || product.costPrice || product.basePrice || 0);
                            const tier10Price = getWholesaleUnitPrice(basePrice, 10);
                            const tier50Price = getWholesaleUnitPrice(basePrice, 50);
                            const inStock = Number(product.quantity || 0) > 0;

                            return (
                                <div
                                    key={product.id}
                                    className="group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 hover:border-[#FF6000] transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between relative"
                                >
                                    {/* Product Image & Badges */}
                                    <div
                                        onClick={() => setSelectedProduct(product)}
                                        className="h-56 relative overflow-hidden bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
                                    >
                                        {product.imageUrl ? (
                                            <img
                                                loading="lazy"
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 p-6 text-center">
                                                <StoreIcon className="w-16 h-16 opacity-30 mb-2" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    {product.name}
                                                </span>
                                            </div>
                                        )}

                                        {/* Category Badge */}
                                        <div className="absolute top-3 left-3 flex flex-col gap-1">
                                            <span className="bg-[#222222]/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-sm">
                                                {product.category || 'Retail Stock'}
                                            </span>
                                            {tier50Price < basePrice && (
                                                <span className="bg-[#FF6000] px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest text-white shadow-sm">
                                                    Wholesale Bulk
                                                </span>
                                            )}
                                        </div>

                                        {/* Stock & Trade Assurance Badge */}
                                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-black uppercase text-emerald-600 shadow-sm">
                                            <ShieldCheckIcon className="w-3 h-3" />
                                            <span>{inStock ? `${product.quantity} in stock` : 'Order on Demand'}</span>
                                        </div>
                                    </div>

                                    {/* Product Details */}
                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                                                <span>SKU: {product.sku || product.id.slice(0, 8)}</span>
                                                <span>MOQ: 1 {product.unit || 'unit'}</span>
                                            </div>

                                            <h3
                                                onClick={() => setSelectedProduct(product)}
                                                className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-2 hover:text-[#FF6000] cursor-pointer transition-colors"
                                            >
                                                {product.name}
                                            </h3>

                                            {product.description && (
                                                <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-medium">
                                                    {product.description}
                                                </p>
                                            )}

                                            {/* Wholesale Tiered Price Preview */}
                                            <div className="mt-3 bg-[#FFF9F5] dark:bg-orange-950/20 p-2.5 rounded-2xl border border-orange-200/60 dark:border-orange-900/40">
                                                <div className="flex items-baseline justify-between">
                                                    <span className="text-[10px] font-black uppercase text-[#FF6000] tracking-wider">
                                                        Wholesale Price:
                                                    </span>
                                                    <div className="text-right">
                                                        <span className="text-lg font-black text-slate-900 dark:text-white">
                                                            KES {basePrice.toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold ml-1">
                                                            /{product.unit || 'unit'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {tier10Price < basePrice && (
                                                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-1 pt-1 border-t border-orange-200/40 dark:border-orange-900/30">
                                                        <span>10+ units: <strong className="text-slate-800 dark:text-slate-200">KES {tier10Price.toLocaleString()}</strong> (-10%)</span>
                                                        <span>50+ units: <strong className="text-[#FF6000]">KES {tier50Price.toLocaleString()}</strong> (-20%)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                            <button
                                                onClick={() => openInquiry(product)}
                                                className="w-full py-2.5 bg-gradient-to-r from-[#FF6000] to-[#FF4500] hover:opacity-95 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-md hover:scale-102 active:scale-95 transition-all flex items-center justify-center gap-1"
                                            >
                                                <ShoppingCartIcon className="w-3.5 h-3.5" />
                                                <span>Order</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setSharingItem({ id: product.id, title: product.name, type: 'product' });
                                                    setShowShareModal(true);
                                                }}
                                                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                                                title="Share this product"
                                            >
                                                <ShareIcon className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Share</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Vehicles View */}
                {activeSection === 'vehicles' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <VehicleMarketplaceView
                            listings={filteredVehicles}
                            onBookTestDrive={(v) => {
                                setInquiryProduct({
                                    id: v.id,
                                    name: `Test Drive Booking: ${v.make} ${v.model} (${v.year})`,
                                    institutionId: v.institutionId || tenant.id,
                                    marketplaceEnabled: true,
                                    quantity: 1,
                                    srpPrice: v.price
                                } as any);
                                setInquirySuccess(false);
                            }}
                            onInquiry={(v) => {
                                setInquiryProduct({
                                    id: v.id,
                                    name: `Vehicle Sourcing Inquiry: ${v.make} ${v.model} (${v.year})`,
                                    institutionId: v.institutionId || tenant.id,
                                    marketplaceEnabled: true,
                                    quantity: 1,
                                    srpPrice: v.price
                                } as any);
                                setInquirySuccess(false);
                            }}
                            currentInstitution={tenant}
                        />
                    </div>
                )}

                {/* Properties View */}
                {activeSection === 'properties' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredListings.map(listing => (
                            <div
                                key={listing.id}
                                onClick={() => setSelectedListing(listing)}
                                className="group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 hover:border-[#FF6000] transition-all cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
                            >
                                <div className="h-56 relative overflow-hidden bg-slate-50 dark:bg-slate-800">
                                    {listing.images && listing.images[0] ? (
                                        <img loading="lazy" src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                            <BuildingOfficeIcon className="w-16 h-16 opacity-30" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3">
                                        <span className="bg-[#222222]/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white">
                                            {listing.listingType}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-5 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-1 text-[10px] font-black text-[#FF6000] uppercase tracking-wider mb-1">
                                            <MapPinIcon className="w-3 h-3" />
                                            <span>{listing.location || 'Verified Location'}</span>
                                        </div>
                                        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-2">
                                            {listing.title}
                                        </h3>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Asking Price</span>
                                            <span className="text-lg font-black text-slate-900 dark:text-white">KES {listing.price?.toLocaleString()}</span>
                                        </div>
                                        <button className="p-2.5 bg-[#FF6000] text-white rounded-xl shadow group-hover:scale-110 transition-transform">
                                            <ArrowRightIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {((activeSection === 'retail' && filteredProducts.length === 0) || (activeSection === 'properties' && filteredListings.length === 0) || (activeSection === 'vehicles' && filteredVehicles.length === 0)) && (
                    <div className="py-24 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
                            <SearchIcon className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">No Items Match Your Filter</h3>
                        <p className="text-slate-500 text-xs font-semibold max-w-sm mt-1.5 mb-6">
                            Try searching for different keywords or reset the category filters to browse the complete catalog.
                        </p>
                        <button
                            onClick={() => { setSearchQuery(''); setSelectedCategoryTab('all'); setSearchCategory('all'); }}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider"
                        >
                            Reset Search Filters
                        </button>
                    </div>
                )}
            </div>

            {/* ── 6. Trade Assurance & Agency Guarantees ── */}
            <div className="max-w-[1500px] mx-auto px-4 sm:px-8 mt-16 pt-12 border-t border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#FF6000] flex items-center justify-center shrink-0">
                            <ShieldCheckIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Trade Assurance</h4>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                Secured transactions with order protection and genuine institutional guarantees.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                            <TruckIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Nationwide Logistics</h4>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                Doorstep dispatch, regional depots, or immediate counter pickup at official agency stores.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
                            <GlobeAltIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Verified Agency</h4>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                Managed directly through EduAI multi-tenant platform with direct manager support.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 7. Product Detail Quick-View Slideout ── */}
            {selectedProduct && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
                    <div className="relative w-full max-w-xl bg-white dark:bg-slate-950 shadow-2xl animate-in slide-in-from-right duration-300 h-full overflow-y-auto flex flex-col justify-between">
                        <div>
                            <div className="relative h-72 bg-slate-100 dark:bg-slate-800">
                                {selectedProduct.imageUrl ? (
                                    <img loading="lazy" src={selectedProduct.imageUrl} className="w-full h-full object-cover" alt={selectedProduct.name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <StoreIcon className="w-16 h-16 opacity-30" />
                                    </div>
                                )}
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    className="absolute top-4 right-4 p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-full text-slate-700 dark:text-slate-200 shadow hover:scale-105 transition-all"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                                <span className="absolute bottom-4 left-4 bg-[#222222] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow">
                                    {selectedProduct.category || 'Product'}
                                </span>
                            </div>

                            <div className="p-6 sm:p-8 space-y-6">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
                                        <span>SKU: {selectedProduct.sku || selectedProduct.id.slice(0, 8)}</span>
                                        <span>•</span>
                                        <span>Seller: {tenant.name}</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        {selectedProduct.name}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                                        {selectedProduct.description || 'Verified authentic wholesale stock from authorized agency catalog.'}
                                    </p>
                                </div>

                                {/* Wholesale Tiers Table */}
                                <div className="bg-[#FFF9F5] dark:bg-orange-950/20 p-5 rounded-3xl border border-orange-200/60 dark:border-orange-900/40">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-[#FF6000] mb-3 flex items-center gap-1.5">
                                        <TagIcon className="w-4 h-4" />
                                        <span>Wholesale Tiered Pricing</span>
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-orange-200/40">
                                            <span className="text-[10px] font-bold text-slate-400 block">1 - 9 Units</span>
                                            <span className="text-sm font-black text-slate-900 dark:text-white">KES {Number(selectedProduct.srpPrice || selectedProduct.costPrice || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-orange-200/40">
                                            <span className="text-[10px] font-bold text-slate-400 block">10 - 49 Units (-10%)</span>
                                            <span className="text-sm font-black text-[#FF6000]">KES {getWholesaleUnitPrice(Number(selectedProduct.srpPrice || selectedProduct.costPrice || 0), 10).toLocaleString()}</span>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-orange-200/40">
                                            <span className="text-[10px] font-bold text-slate-400 block">50+ Units (-20%)</span>
                                            <span className="text-sm font-black text-emerald-600">KES {getWholesaleUnitPrice(Number(selectedProduct.srpPrice || selectedProduct.costPrice || 0), 50).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                        <span className="text-slate-400 font-bold block mb-1">Stock Status</span>
                                        <span className={`font-black ${Number(selectedProduct.quantity) > 0 ? 'text-emerald-600' : 'text-amber-500'}`}>
                                            {Number(selectedProduct.quantity) > 0 ? `${selectedProduct.quantity} Available` : 'Available on Order'}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                        <span className="text-slate-400 font-bold block mb-1">Fulfillment</span>
                                        <span className="font-black text-slate-900 dark:text-white">Immediate Dispatch</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                            <button
                                onClick={() => {
                                    const prod = selectedProduct;
                                    setSelectedProduct(null);
                                    openInquiry(prod);
                                }}
                                className="flex-1 py-3.5 bg-gradient-to-r from-[#FF6000] to-[#FF4500] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-102 transition-all flex items-center justify-center gap-2"
                            >
                                <ShoppingCartIcon className="w-4 h-4" />
                                <span>Proceed to Order / RFQ</span>
                            </button>
                            <button
                                onClick={() => {
                                    setSharingItem({ id: selectedProduct.id, title: selectedProduct.name, type: 'product' });
                                    setShowShareModal(true);
                                }}
                                className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-200"
                                title="Share"
                            >
                                <ShareIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 8. Property Quick-View Slideout ── */}
            {selectedListing && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSelectedListing(null)} />
                    <div className="relative w-full max-w-xl bg-white dark:bg-slate-950 shadow-2xl animate-in slide-in-from-right duration-300 h-full overflow-y-auto flex flex-col justify-between">
                        <div>
                            <div className="relative h-72 bg-slate-900">
                                {selectedListing.images?.[0] && (
                                    <img loading="lazy" src={selectedListing.images[0]} className="w-full h-full object-cover" alt={selectedListing.title} />
                                )}
                                <button
                                    onClick={() => setSelectedListing(null)}
                                    className="absolute top-4 right-4 p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-full text-slate-700 dark:text-slate-200 shadow"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                                <span className="absolute bottom-4 left-4 bg-[#FF6000] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow">
                                    {selectedListing.listingType}
                                </span>
                            </div>

                            <div className="p-6 sm:p-8 space-y-4">
                                <div className="flex items-center gap-1.5 text-xs font-black text-[#FF6000] uppercase tracking-wider">
                                    <MapPinIcon className="w-4 h-4" />
                                    <span>{selectedListing.location || 'Location Verified'}</span>
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {selectedListing.title}
                                </h2>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    {selectedListing.description}
                                </p>

                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Asking Price</span>
                                        <span className="text-xl font-black text-slate-900 dark:text-white">KES {selectedListing.price?.toLocaleString()}</span>
                                    </div>
                                    <span className="text-xs font-black uppercase px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl">
                                        Verified Property
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => {
                                    const item = selectedListing;
                                    setSelectedListing(null);
                                    openInquiry(item);
                                }}
                                className="w-full py-3.5 bg-gradient-to-r from-[#FF6000] to-[#FF4500] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-102 transition-all"
                            >
                                Inquire with Vendor
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 9. Wholesale Order / Inquiry / Checkout Modal ── */}
            {(inquiryProduct || inquiryListing || isGeneralContact) && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        onClick={() => {
                            if (!mpesaProcessing && !inquirySubmitting) {
                                setInquiryProduct(null);
                                setInquiryListing(null);
                                setIsGeneralContact(false);
                            }
                        }}
                    />

                    <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#FF6000] via-[#FF5400] to-[#FF4500] p-6 text-white relative">
                            <button
                                onClick={() => {
                                    setInquiryProduct(null);
                                    setInquiryListing(null);
                                    setIsGeneralContact(false);
                                }}
                                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>

                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-200 block mb-1">
                                {isGeneralContact ? 'Contact Store Support' : inquiryProduct ? 'Wholesale Order & RFQ' : 'Listing Inquiry'}
                            </span>
                            <h3 className="text-xl font-black uppercase tracking-tight truncate pr-8">
                                {isGeneralContact ? tenant.name : inquiryProduct ? inquiryProduct.name : inquiryListing?.title}
                            </h3>

                            {/* Stepper for Retail Checkout */}
                            {inquiryProduct && !inquirySuccess && (
                                <div className="flex gap-2 mt-4 pt-3 border-t border-white/20">
                                    {(['details', 'delivery', 'payment'] as const).map((step, idx) => (
                                        <div key={step} className="flex items-center gap-1.5 text-xs font-bold">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                checkoutStep === step ? 'bg-white text-[#FF6000]' : 'border border-white/40 text-white/70'
                                            }`}>
                                                {idx + 1}
                                            </div>
                                            <span className={`capitalize text-[11px] ${checkoutStep === step ? 'text-white' : 'text-white/60'}`}>
                                                {step}
                                            </span>
                                            {idx < 2 && <span className="text-white/30 ml-1">›</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Body */}
                        {inquirySuccess ? (
                            <div className="p-8 text-center space-y-4">
                                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                                    <CheckCircleIcon className="w-10 h-10" />
                                </div>
                                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Wholesale Order Confirmed!
                                </h4>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                    Your order details have been securely transmitted to <strong>{tenant.name}</strong>. The agency fulfillment team will contact you shortly to coordinate dispatch.
                                </p>
                                <div className="pt-4">
                                    <button
                                        onClick={() => {
                                            setInquiryProduct(null);
                                            setInquiryListing(null);
                                            setIsGeneralContact(false);
                                        }}
                                        className="w-full py-3 bg-gradient-to-r from-[#FF6000] to-[#FF4500] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow"
                                    >
                                        Return to Catalog
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 max-h-[75vh] overflow-y-auto">
                                {/* Step 1: Order Details */}
                                {checkoutStep === 'details' && (
                                    <form onSubmit={(e) => { e.preventDefault(); if (inquiryProduct) setCheckoutStep('delivery'); else handleSubmitInquiry(e); }} className="space-y-4">
                                        {inquiryProduct && (
                                            <div className="bg-[#FFF9F5] dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-200/60 dark:border-orange-900/40">
                                                <div className="flex justify-between items-center mb-3">
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{inquiryProduct.name}</span>
                                                        <span className="text-[10px] text-slate-400">Unit: KES {activeUnitPrice.toLocaleString()}</span>
                                                    </div>
                                                    <span className="text-xs font-black text-[#FF6000]">
                                                        Subtotal: KES {activeItemsSubtotal.toLocaleString()}
                                                    </span>
                                                </div>

                                                {/* Quantity Selector */}
                                                <div className="flex items-center justify-between pt-2 border-t border-orange-200/40">
                                                    <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">Quantity</span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                                                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-white shadow-sm"
                                                        >
                                                            <MinusIcon className="w-3 h-3" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={orderQuantity}
                                                            onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                                            className="w-14 text-center font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setOrderQuantity(orderQuantity + 1)}
                                                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-white shadow-sm"
                                                        >
                                                            <PlusIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Your Full Name</label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="e.g. Jane Mwangi"
                                                value={inquiryData.name}
                                                onChange={(e) => setInquiryData({ ...inquiryData, name: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-[#FF6000]"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Phone Number (M-Pesa Preferred)</label>
                                            <input
                                                required
                                                type="tel"
                                                placeholder="e.g. 0712345678"
                                                value={inquiryData.phone}
                                                onChange={(e) => setInquiryData({ ...inquiryData, phone: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-[#FF6000]"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Email Address (Optional)</label>
                                            <input
                                                type="email"
                                                placeholder="e.g. jane@company.com"
                                                value={inquiryData.email}
                                                onChange={(e) => setInquiryData({ ...inquiryData, email: e.target.value })}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-[#FF6000]"
                                            />
                                        </div>

                                        {(!inquiryProduct || isGeneralContact) && (
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Inquiry / Requirements</label>
                                                <textarea
                                                    rows={3}
                                                    placeholder="Specify your quotation or question..."
                                                    value={inquiryData.message}
                                                    onChange={(e) => setInquiryData({ ...inquiryData, message: e.target.value })}
                                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-[#FF6000]"
                                                />
                                            </div>
                                        )}

                                        <div className="pt-2">
                                            <button
                                                type="submit"
                                                disabled={inquirySubmitting}
                                                className="w-full py-3 bg-gradient-to-r from-[#FF6000] to-[#FF4500] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow hover:scale-102 transition-all flex items-center justify-center gap-2"
                                            >
                                                {inquirySubmitting ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : inquiryProduct ? (
                                                    <span>Continue to Logistics ›</span>
                                                ) : (
                                                    <span>Send Official Inquiry</span>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Step 2: Delivery & Logistics */}
                                {checkoutStep === 'delivery' && inquiryProduct && (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search destination, county, or CBD..."
                                                value={deliverySearchQuery}
                                                onChange={(e) => setDeliverySearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                                            />
                                        </div>

                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {filteredDeliveryRates.map((rate) => (
                                                <label
                                                    key={rate.id}
                                                    onClick={() => { setSelectedRate(rate); setIsCustomDelivery(false); }}
                                                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                                                        selectedRate?.id === rate.id && !isCustomDelivery
                                                            ? 'border-[#FF6000] bg-orange-50/50 dark:bg-orange-950/20 shadow-sm'
                                                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            name="deliveryRate"
                                                            checked={selectedRate?.id === rate.id && !isCustomDelivery}
                                                            onChange={() => { setSelectedRate(rate); setIsCustomDelivery(false); }}
                                                            className="text-[#FF6000] focus:ring-[#FF6000]"
                                                        />
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                <TruckIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                <span>{rate.destination}</span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                {rate.courier_name || rate.courierName || 'Verified Agency Courier'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-900 dark:text-white">
                                                        {Number(rate.rate) === 0 ? 'FREE' : `KES ${Number(rate.rate).toLocaleString()}`}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                                                Specific Dropoff Address / Building / Office
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 3rd Floor, Westlands Plaza, Commercial Office"
                                                value={specificAddress}
                                                onChange={(e) => setSpecificAddress(e.target.value)}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-[#FF6000]"
                                            />
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setCheckoutStep('details')}
                                                className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase"
                                            >
                                                ‹ Back
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCheckoutStep('payment')}
                                                className="flex-1 py-3 bg-gradient-to-r from-[#FF6000] to-[#FF4500] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow"
                                            >
                                                Proceed to Payment (KES {activeTotalAmount.toLocaleString()}) ›
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Payment */}
                                {checkoutStep === 'payment' && inquiryProduct && (
                                    <div className="space-y-4">
                                        <div className="bg-[#FFF9F5] dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-200/60 dark:border-orange-900/40 text-xs space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Item:</span>
                                                <span className="font-bold text-slate-900 dark:text-white">{inquiryProduct.name} (x{orderQuantity})</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Items Subtotal:</span>
                                                <span className="font-bold">KES {activeItemsSubtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Delivery Fee:</span>
                                                <span className="font-bold">{activeDeliveryFee === 0 ? 'FREE' : `KES ${activeDeliveryFee.toLocaleString()}`}</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-orange-200/60 text-sm font-black text-[#FF6000]">
                                                <span>Total Payable:</span>
                                                <span>KES {activeTotalAmount.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-3">
                                            <span className="text-2xl">📲</span>
                                            <div>
                                                <span className="font-black text-emerald-800 dark:text-emerald-300 block">Instant M-Pesa STK Push</span>
                                                <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                                    Prompt will be sent to <strong>{inquiryData.phone}</strong>. Enter your PIN to complete payment.
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 pt-2">
                                            <button
                                                type="button"
                                                disabled={mpesaProcessing}
                                                onClick={handleTriggerMpesaPayment}
                                                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:scale-102 transition-all flex items-center justify-center gap-2"
                                            >
                                                {mpesaProcessing ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <CreditCardIcon className="w-4 h-4" />
                                                        <span>Pay KES {activeTotalAmount.toLocaleString()} via M-Pesa</span>
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleSubmitInquiry}
                                                disabled={inquirySubmitting}
                                                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-black uppercase tracking-wider"
                                            >
                                                Book Order (Pay on Delivery / Invoice)
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setCheckoutStep('delivery')}
                                                className="text-[11px] text-slate-400 hover:text-slate-600 font-bold uppercase mt-1"
                                            >
                                                ‹ Back to Delivery
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── 10. RFQ (Request for Quotation) Modal ── */}
            {showRfqModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !rfqSubmitting && setShowRfqModal(false)} />
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-[#FF6000] via-[#FF5400] to-[#FF4500] p-6 text-white relative">
                            <button onClick={() => setShowRfqModal(false)} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white">
                                <XIcon className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-200 block mb-1">
                                EduAI B2B Sourcing Network
                            </span>
                            <h3 className="text-xl font-black uppercase tracking-tight">
                                Submit Wholesale RFQ to {tenant.name}
                            </h3>
                            <p className="text-xs text-white/80 mt-1">
                                Need custom volume, equipment, or target pricing? Get an official wholesale quotation.
                            </p>
                        </div>

                        {rfqSuccess ? (
                            <div className="p-8 text-center space-y-4">
                                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                                    <CheckCircleIcon className="w-10 h-10" />
                                </div>
                                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    RFQ Dispatched!
                                </h4>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                    Your wholesale procurement request has been lodged directly with <strong>{tenant.name}</strong>. Their sales manager will respond with a formal quotation.
                                </p>
                                <button
                                    onClick={() => { setShowRfqModal(false); setRfqSuccess(false); }}
                                    className="w-full py-3 bg-[#FF6000] text-white rounded-xl text-xs font-black uppercase tracking-wider"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleRfqSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Product / Item You Need</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. 50x Student Desks, Fertilizer Bags, Solar Inverters..."
                                        value={rfqProductQuery}
                                        onChange={(e) => setRfqProductQuery(e.target.value)}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-[#FF6000]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Estimated Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={rfqQuantity}
                                            onChange={(e) => setRfqQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-[#FF6000]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Target Price (KES/unit)</label>
                                        <input
                                            type="text"
                                            placeholder="Optional target"
                                            value={rfqTargetPrice}
                                            onChange={(e) => setRfqTargetPrice(e.target.value)}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-[#FF6000]"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Buyer / Org Name</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Your Name or Company"
                                            value={rfqBuyerName}
                                            onChange={(e) => setRfqBuyerName(e.target.value)}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-[#FF6000]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Phone Number</label>
                                        <input
                                            required
                                            type="tel"
                                            placeholder="07..."
                                            value={rfqBuyerPhone}
                                            onChange={(e) => setRfqBuyerPhone(e.target.value)}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-[#FF6000]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Delivery Destination / County</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Nakuru, Eldoret, Nairobi CBD..."
                                        value={rfqDestination}
                                        onChange={(e) => setRfqDestination(e.target.value)}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-[#FF6000]"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Special Specifications / Deadlines</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Add brand preferences, delivery deadlines..."
                                        value={rfqNotes}
                                        onChange={(e) => setRfqNotes(e.target.value)}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-[#FF6000]"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={rfqSubmitting}
                                    className="w-full py-3.5 bg-gradient-to-r from-[#FF6000] to-[#FF4500] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow hover:scale-102 transition-all flex items-center justify-center gap-2"
                                >
                                    {rfqSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <span>Submit RFQ to Agency Manager</span>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ── 11. Share Modal with Link & QR Code ── */}
            {showShareModal && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowShareModal(false)} />
                    <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl text-center space-y-4">
                        <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <XIcon className="w-4 h-4" />
                        </button>

                        <div className="w-12 h-12 bg-orange-50 text-[#FF6000] rounded-2xl flex items-center justify-center mx-auto text-xl">
                            <ShareIcon className="w-6 h-6" />
                        </div>

                        <div>
                            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Share {sharingItem?.type === 'product' ? 'Product' : 'Agency Storefront'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 truncate">
                                {sharingItem?.title || tenant.name}
                            </p>
                        </div>

                        {/* Generated Share URL */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-left">
                            <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Direct Web URL</span>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                                    {sharingItem?.type === 'product'
                                        ? `${storeUrl}&item=${sharingItem.id}`
                                        : storeUrl}
                                </span>
                                <button
                                    onClick={() => handleCopyLink(sharingItem?.type === 'product' ? `${storeUrl}&item=${sharingItem.id}` : storeUrl)}
                                    className="px-2.5 py-1 bg-[#FF6000] text-white text-[10px] font-black uppercase rounded-lg shrink-0 shadow-sm"
                                >
                                    {copySuccess ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        {/* WhatsApp Direct Share */}
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Check out ${sharingItem?.title || tenant.name} on the EduAI Wholesale Storefront: ${sharingItem?.type === 'product' ? `${storeUrl}&item=${sharingItem.id}` : storeUrl}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow"
                        >
                            <span>Share on WhatsApp</span>
                        </a>
                    </div>
                </div>
            )}

            {/* ── 12. Interactive AI Sales Assistant ── */}
            {tenant && (
                <AiSalesAgentWidget
                    institution={tenant}
                    catalogItems={retailProducts.map(p => ({
                        id: p.id,
                        name: p.name,
                        price: Number((p as any).sellingPrice || (p as any).price || p.unitPrice || p.srpPrice || p.costPrice || 0),
                        category: p.category,
                        inStock: Number(p.quantity || 0) > 0,
                        description: p.description
                    }))}
                    agentName={`${tenant.name} AI Agent`}
                    welcomeMessage={`Hello! Welcome to ${tenant.name}. Looking for anything in our wholesale catalog or need help with bulk prices and delivery? Ask me anything!`}
                    contactPhone={(tenant as any).phone || tenant.phoneNumber}
                    contactEmail={tenant.email}
                    onOrderProduct={(item) => {
                        const prod = retailProducts.find(p => p.id === item.id) || null;
                        if (prod) {
                            setSelectedProduct(prod);
                            openInquiry(prod);
                        }
                    }}
                />
            )}
        </div>
    );
};
