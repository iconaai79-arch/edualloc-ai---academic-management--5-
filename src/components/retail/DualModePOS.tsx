import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { generateRetailReceiptPdf } from '../../services/pdfService';
import { RetailInventoryItem, RetailStore, User, CafeMenuItem, RetailCustomer } from '../../types';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { RectangleStackIcon as Layers } from '../icons/RectangleStackIcon';

import { MagnifyingGlassIcon as Search } from '../icons/MagnifyingGlassIcon';
import { ShoppingCartIcon as ShoppingCart } from '../icons/ShoppingCartIcon';
import { UserIcon as UserIcon } from '../icons/UserIcon';
import { MapPinIcon as MapPin } from '../icons/MapPinIcon';
import { CalculatorIcon as Calculator } from '../icons/CalculatorIcon';
import { CurrencyIcon as DollarSign } from '../icons/CurrencyIcon';
import { TagIcon as Tag } from '../icons/TagIcon';
import { BanknotesIcon as HandCoins } from '../icons/BanknotesIcon';
import { ExclamationTriangleIcon as AlertCircle } from '../icons/ExclamationTriangleIcon';
import { PlusIcon as Plus } from '../icons/PlusIcon';
import { StoreIcon as Store } from '../icons/StoreIcon';
import { XIcon as X } from '../icons/XIcon';
import { CreditCardIcon as CreditCard } from '../icons/CreditCardIcon';
import { PrinterIcon as Printer } from '../icons/PrinterIcon';
import { CoffeeIcon as Coffee } from '../icons/CoffeeIcon';
import { ZapIcon as Zap } from '../icons/ZapIcon';
import { TargetIcon as Target } from '../icons/TargetIcon';

interface DualModePOSProps {
    institutionId: string;
    currentUser: User;
    isEducation?: boolean;
    preSelectedUser?: User | null;
    onClearPreSelectedUser?: () => void;
}

export function DualModePOS({ institutionId, currentUser, isEducation, preSelectedUser, onClearPreSelectedUser }: DualModePOSProps) {
    const [activeMode, setActiveMode] = useState<'shop' | 'field'>('shop');
    const [activeStore, setActiveStore] = useState<RetailStore | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState<(RetailInventoryItem | CafeMenuItem)[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Cart state
    const [cart, setCart] = useState<{ item: RetailInventoryItem | CafeMenuItem, quantity: number, finalPrice: number }[]>([]);

    // Checkout state
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' });
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);

    // Selected item for pricing negotiation
    const [selectedItem, setSelectedItem] = useState<RetailInventoryItem | CafeMenuItem | null>(null);
    const [negotiatedPrice, setNegotiatedPrice] = useState<string>('');

    // CRM state
    const [allCustomers, setAllCustomers] = useState<RetailCustomer[]>([]);
    const [allStores, setAllStores] = useState<RetailStore[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<RetailCustomer | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Education mode states
    const [students, setStudents] = useState<User[]>([]);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [signatureData, setSignatureData] = useState<string>(''); // Base64 data URL
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (preSelectedUser) {
            setSelectedStudent(preSelectedUser);
            setCustomerInfo({
                name: preSelectedUser.name,
                phone: preSelectedUser.phoneNumber || '',
                email: preSelectedUser.email || ''
            });
            setIsCheckoutModalOpen(true);
            if (onClearPreSelectedUser) {
                onClearPreSelectedUser();
            }
        }
    }, [preSelectedUser, onClearPreSelectedUser]);

    const fetchStudents = async () => {
        try {
            const data = await apiService.fetchModuleRecords<User>('users', institutionId);
            const filtered = (data || []).filter(u => u.role === 'student' || (Array.isArray(u.roles) && u.roles.includes('student')));
            setStudents(filtered);
        } catch (err) {
            console.error("Fetch students error:", err);
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData('');
    };

    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        // Touch events
        if ('touches' in e) {
            if (e.touches.length === 0) return { x: 0, y: 0 };
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        
        // Mouse events
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const coords = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#4f46e5'; // Indigo stroke
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const coords = getCoordinates(e);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            setSignatureData(canvas.toDataURL());
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
        fetchStores();
        fetchCategories();
        if (isEducation) {
            fetchStudents();
        }

        // Auto-migration for new schema fields in retail_sales (Safe execution)
        const migrations = [
            "ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS signature text;",
            "ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;"
        ];
        migrations.forEach(sql => {
            apiService.runMigration(sql).catch(() => {
                // Silently ignore
            });
        });
    }, [institutionId, isEducation]);

    const fetchCategories = async () => {
        try {
            const data = await apiService.fetchModuleRecords('store_categories', institutionId);
            if (data && data.length > 0) {
                const sorted = data.sort((a, b) => a.sortOrder - b.sortOrder);
                setCategories(sorted.map((c: any) => c.name));
            } else {
                setCategories(['Stationery', 'Textbooks', 'Uniforms', 'Sports Equipment', 'Lab Supplies']);
            }
        } catch {
            setCategories(['Stationery', 'Textbooks', 'Uniforms', 'Sports Equipment', 'Lab Supplies']);
        }
    };

    const fetchStores = async () => {
        try {
            const data = await apiService.fetchModuleRecords<RetailStore>('retail_stores', institutionId);
            console.log(`[DualModePOS] Fetched ${data?.length || 0} stores for institution ${institutionId}`);
            setAllStores(data || []);
            if (data && data.length > 0) {
                if (!activeStore) {
                    // In Field Ops: prefer a van_stock store for this agent, else pick first store
                    const agentStore = data.find(s => s.agentId === currentUser.id && s.storeType === 'van_stock');
                    const defaultStore = agentStore || data[0];
                    setActiveStore(defaultStore);
                    console.log(`[DualModePOS] Auto-selected store: ${defaultStore.name} (${defaultStore.id})`);
                }
            }
        } catch (err) {
            console.error("Fetch stores error:", err);
        }
    };

    const fetchCustomers = async () => {
        try {
            const data = await apiService.fetchModuleRecords<RetailCustomer>('retail_customers', institutionId);
            setAllCustomers(data || []);
        } catch (err) {
            console.error("Fetch customers error:", err);
        }
    };

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const [retailData, cafeData] = await Promise.all([
                apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId),
                apiService.fetchModuleRecords<CafeMenuItem>('cafe_menu_items', institutionId)
            ]);

            const combined: (RetailInventoryItem | CafeMenuItem)[] = [
                ...(retailData || []).map(p => ({ ...p, source: 'retail' })),
                ...(cafeData || []).map(p => ({ ...p, source: 'cafe' }))
            ];
            setProducts(combined);
        } catch (err) {
            console.error("Fetch products error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Determine available modes based on viewport and user role
    useEffect(() => {
        const width = window.innerWidth;

        // Auto-detect desktop vs mobile/tablet
        if (width >= 1024) {
            setActiveMode('shop'); // Force shop mode on desktop
        } else if (width < 768) {
            setActiveMode('field'); // Default to field mode on mobile
        } else if (currentUser.role.includes('agent') || currentUser.role === 'field_agent') {
            // Specific overrides for tablet if and role is field agent
            setActiveMode('field');
        }
    }, [currentUser, institutionId]);

    const addToCart = () => {
        if (!selectedItem) return;

        const numPrice = parseFloat(negotiatedPrice);
        if (isNaN(numPrice)) {
            alert('Please enter a valid price.');
            return;
        }

        const isCafe = (selectedItem as any).source === 'cafe';
        const basePrice = isCafe ? (selectedItem as any).basePrice : ((selectedItem as any).basePrice || (selectedItem as any).costPrice || 0);

        if (numPrice < basePrice) {
            alert(`Price cannot be below the Base Price of KES ${basePrice}`);
            return;
        }

        setCart([...cart, {
            item: selectedItem,
            quantity: 1,
            finalPrice: numPrice
        }]);

        setSelectedItem(null);
        setNegotiatedPrice('');
    };

    const removeFromCart = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const totalAmount = cart.reduce((sum, cartItem) => sum + (cartItem.finalPrice * cartItem.quantity), 0);
    const totalCommission = cart.reduce((sum, cartItem) => {
        const isCafe = (cartItem.item as any).source === 'cafe';
        const basePrice = isCafe ? (cartItem.item as any).basePrice : ((cartItem.item as any).basePrice || (cartItem.item as any).costPrice || 0);
        return sum + ((cartItem.finalPrice - basePrice) * cartItem.quantity);
    }, 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (isEducation && !selectedStudent) {
            alert("Please search and select a student before processing issuance.");
            return;
        }
        if (isEducation && !signatureData) {
            alert("Please provide a recipient signature before processing issuance.");
            return;
        }
        setIsProcessing(true);

        try {
            // CRM Logic: Save or Update Customer and Loyalty (bypassed in education mode)
            let finalCustomerId = selectedCustomer?.id;
            const loyaltyPointsEarned = Math.floor(totalAmount / 100);

            if (!isEducation && (customerInfo.name || customerInfo.phone)) {
                try {
                    const customerData: any = {
                        institutionId,
                        name: customerInfo.name || 'Walk-in Customer',
                        phoneNumber: customerInfo.phone,
                        email: customerInfo.email,
                        totalSpent: (selectedCustomer?.totalSpent || 0) + totalAmount,
                        loyaltyPoints: (selectedCustomer?.loyaltyPoints || 0) + loyaltyPointsEarned,
                        updatedAt: new Date().toISOString()
                    };

                    if (selectedCustomer) {
                        customerData.id = selectedCustomer.id;
                    } else {
                        customerData.createdAt = new Date().toISOString();
                    }

                    const savedCustomer: any = await apiService.saveModuleRecord('retail_customers', customerData);
                    if (savedCustomer && savedCustomer.id) {
                        finalCustomerId = savedCustomer.id;
                    }
                } catch (crmErr) {
                    console.error("CRM/Customer save failed, proceeding with sale only:", crmErr);
                }
            }

            // Resolve the best store for this transaction
            let targetStore: RetailStore | undefined;
            if (activeMode === 'field') {
                // Field Ops: prefer agent's own van_stock, then any store
                targetStore = allStores.find(s => s.agentId === currentUser.id && s.storeType === 'van_stock')
                    || activeStore
                    || allStores[0];
            } else {
                targetStore = activeStore || allStores[0];
            }

            const targetStoreId = targetStore?.id;
            if (!targetStoreId) {
                alert("Please create a Store in the 'Stores' tab before checking out.");
                setIsProcessing(false);
                return;
            }

            // Only pass agentId if in field mode and store type is van_stock (to satisfy UUID FK constraint)
            const isVanSale = activeMode === 'field' && targetStore?.storeType === 'van_stock';

            const saleData = {
                institutionId,
                storeId: targetStoreId,
                agentId: isVanSale ? currentUser.id : undefined,
                customerId: finalCustomerId,
                totalAmount,
                paymentMethod: isEducation ? 'issuance' : paymentMethod,
                customerName: isEducation ? (selectedStudent?.name || customerInfo.name) : customerInfo.name,
                customerPhone: isEducation ? (selectedStudent?.phoneNumber || customerInfo.phone) : customerInfo.phone,
                customerEmail: isEducation ? (selectedStudent?.email || customerInfo.email) : customerInfo.email,
                items: cart.map(c => ({
                    itemId: c.item.id,
                    name: (c.item as any).source === 'cafe' ? `${c.item.name} (Cafe)` : c.item.name,
                    quantity: c.quantity,
                    unitPrice: c.finalPrice,
                    source: (c.item as any).source
                })),
                signature: isEducation ? signatureData : undefined,
                metadata: isEducation ? {
                    studentId: selectedStudent?.id,
                    admissionNumber: selectedStudent?.admissionNumber || (selectedStudent as any).admission_number || '',
                    isEducationIssuance: true
                } : undefined,
                createdAt: new Date().toISOString()
            };

            const savedSale = await apiService.saveModuleRecord('retail_sales', saleData);

            if (savedSale && (savedSale as any).id) {
                // Save commissions if any
                for (const c of cart) {
                    const isCafe = (c.item as any).source === 'cafe';
                    const basePrice = isCafe ? (c.item as any).basePrice : ((c.item as any).basePrice || (c.item as any).costPrice || 0);
                    if (c.finalPrice > basePrice) {
                        try {
                            await apiService.saveModuleRecord('retail_commissions_ledger', {
                                institutionId,
                                agentId: currentUser.id,
                                saleId: (savedSale as any).id,
                                itemId: c.item.id,
                                basePrice,
                                soldPrice: c.finalPrice,
                                commissionAmount: (c.finalPrice - basePrice) * c.quantity,
                                isPaid: false,
                                createdAt: new Date().toISOString()
                            });
                        } catch (commErr) {
                            console.error("Commission save failed:", commErr);
                        }
                    }
                }

                // ───────────────────────────────────────────
                // STOCK REDUCTION: Decrement qty for each sold retail item
                // ───────────────────────────────────────────
                for (const c of cart) {
                    const isCafe = (c.item as any).source === 'cafe';
                    if (isCafe) continue; // Cafe menu items don't track quantity

                    const retailItem = c.item as RetailInventoryItem;
                    const newQty = Math.max(0, (retailItem.quantity || 0) - c.quantity);
                    try {
                        await apiService.saveModuleRecord('retail_inventory_items', {
                            ...retailItem,
                            quantity: newQty,
                            lastUpdated: new Date().toISOString()
                        });
                    } catch (stockErr) {
                        console.error(`Stock update failed for item ${retailItem.name}:`, stockErr);
                    }
                }

                if (customerInfo.phone) {
                    console.log(`[Mock SMS] Sending receipt to ${customerInfo.phone} for KES ${totalAmount}`);
                }
                if (customerInfo.email) {
                    console.log(`[Mock Email] Sending invoice to ${customerInfo.email}`);
                }

                // Generate and trigger Receipt Auto-Preview
                try {
                    console.log("Generating thermal receipt preview...");

                    // Add totalAmount and paymentMethod to items since generator expects root level properties on saleData
                    const completeSaleData = {
                        ...saleData,
                        id: (savedSale as any).id || Date.now().toString(),
                    }

                    // We generate the Blob URL for the PDF
                    const dummyInstitution = { name: 'Retail Store', phoneNumber: '123-456-7890', email: 'store@example.com' } as any; // Assuming these might not be passed down, creating fallback.
                    const pdfUrl = await generateRetailReceiptPdf(
                        completeSaleData,
                        dummyInstitution,
                        {} as any, // company details
                        null // default logo
                    );

                    // Auto-open print dialog in a new window
                    const printWindow = window.open(pdfUrl, '_blank');
                    if (printWindow) {
                        printWindow.onload = () => {
                            printWindow.print();
                        };
                    } else {
                        console.warn("Popup blocked! Could not auto-preview receipt.");
                    }
                } catch (pdfErr) {
                    console.error("Failed to generate receipt PDF:", pdfErr);
                }

                setCheckoutSuccess(savedSale);
                setCart([]);
                fetchCustomers(); // Refresh list to catch new/updated customer
                fetchProducts();  // Refresh inventory to show updated stock quantities
            }

        } catch (err: any) {
            console.error("Checkout error:", err);
            const msg = err?.message || "";
            if (msg.includes('42P01')) {
                alert("Checkout error: Database tables missing. Please run migration 083.");
            } else if (msg.includes('uuid')) {
                alert("Checkout error: System ID mismatch. Please ensure a valid store is created.");
            } else {
                alert(`Failed to process checkout: ${msg || 'Unknown Database Error'}`);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.sku?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            ((p as any).barcode && (p as any).barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
            p.category?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-slate-200">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Loading Inventory...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 h-full min-h-[600px] lg:min-h-[700px] animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* Product Arena - Left Section */}
            <div className="flex-1 flex flex-col bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[3rem] shadow-sm border border-white dark:border-slate-800 overflow-hidden transition-all">

                {/* Cyber-Header & Mode Switcher */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        {!isEducation && (
                            <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-2xl w-fit backdrop-blur-md">
                                <button
                                    onClick={() => setActiveMode('shop')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeMode === 'shop'
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm scale-105'
                                        : 'text-slate-500 hover:text-indigo-500'}`}
                                >
                                    <Store className="w-4 h-4" />
                                    In Shop
                                </button>
                                <button
                                    onClick={() => setActiveMode('field')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeMode === 'field'
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm scale-105'
                                        : 'text-slate-500 hover:text-indigo-500'}`}
                                >
                                    <MapPin className="w-4 h-4" />
                                    Active Sale
                                </button>
                            </div>
                        )}

                        {/* Store Selection Dropdown */}
                        <div className="relative group">
                            <select
                                value={activeStore?.id || ''}
                                onChange={(e) => {
                                    const store = allStores.find(s => s.id === e.target.value);
                                    if (store) setActiveStore(store);
                                }}
                                className="pl-10 pr-10 py-3 bg-white dark:bg-slate-800 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-600 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none transition-all hover:bg-slate-50 dark:hover:bg-slate-700 min-w-[180px]"
                            >
                                <option value="" disabled>{allStores.length > 0 ? "Switch Point of Sale" : "No Stores Found"}</option>
                                {allStores.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.storeType.replace('_', ' ')})
                                    </option>
                                ))}
                            </select>
                            <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>

                    <button className="px-6 py-3 bg-fuchsia-100 dark:bg-fuchsia-900/20 text-fuchsia-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-fuchsia-600 hover:text-white transition-all flex items-center gap-2 group shadow-sm">
                        <Target className="w-4 h-4 group-hover:scale-125 transition-transform" />
                        Log Lead
                    </button>
                </div>

                {/* Floating Search Bar & Filters */}
                <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-grow w-full">
                        <Search className="w-5 h-5 absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={activeMode === 'shop' ? "Scan barcode or search master catalog..." : "Search your assigned field inventory..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-3.5 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                        />
                    </div>

                    <div className="relative w-full sm:w-48 shrink-0">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer h-12"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-2xl shrink-0 h-12">
                        <button
                            onClick={() => setViewMode('grid')}
                            title="Grid view"
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            title="List view"
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Search className="w-4 h-4 rotate-90" />
                        </button>
                    </div>
                </div>

                {/* Product Infinity Grid or Table View */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/10 no-scrollbar">
                    {viewMode === 'table' ? (
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-x-auto shadow-sm">
                            <table className="w-full text-left border-collapse" style={{ minWidth: '600px' }}>
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b-2 border-indigo-100 dark:border-slate-700">
                                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Barcode/SKU</th>
                                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Item Name</th>
                                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Price (KES)</th>
                                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Stock</th>
                                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-24">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((product) => {
                                        const isCafe = (product as any).source === 'cafe';
                                        const skuOrBarcode = product.sku || (product as any).barcode || '-';
                                        const price = (isCafe ? (product as any).basePrice : (product as any).srpPrice) || 0;
                                        const stock = isCafe ? 'Hospitality' : `${(product as any).quantity ?? 0} Left`;
                                        const isSelected = selectedItem?.id === product.id;

                                        return (
                                            <tr
                                                key={product.id}
                                                onClick={() => {
                                                    setSelectedItem(product);
                                                    setNegotiatedPrice(price.toString());
                                                }}
                                                className={`border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-indigo-50/50 dark:bg-indigo-900/20'
                                                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/30'
                                                }`}
                                            >
                                                <td className="px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                                                    {skuOrBarcode}
                                                </td>
                                                <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white">
                                                    {product.name}
                                                </td>
                                                <td className="px-4 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${isCafe ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                        {product.category || (isCafe ? 'Hospitality' : 'Retail')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-black text-slate-900 dark:text-white text-right">
                                                    {price?.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-xs font-bold text-center">
                                                    <span className={isCafe || (product as any).quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                                        {stock}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => {
                                                            setCart([...cart, {
                                                                item: product,
                                                                quantity: 1,
                                                                finalPrice: price
                                                            }]);
                                                        }}
                                                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        + Add
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {filteredProducts.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                                        <Search className="w-8 h-8 text-slate-300" />
                                                    </div>
                                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Void Detected</h3>
                                                    <p className="text-slate-400 text-[10px] italic mt-1 font-medium">No items match your query in the current matrix.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredProducts.map((product, idx) => (
                                <div
                                    key={product.id}
                                    style={{ animationDelay: `${idx * 30}ms` }}
                                    onClick={() => {
                                        setSelectedItem(product);
                                        const initialPrice = (product as any).source === 'cafe' ? (product as any).basePrice : (product as any).srpPrice;
                                        setNegotiatedPrice(initialPrice.toString());
                                    }}
                                    className={`group bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${selectedItem?.id === product.id
                                        ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-xl -translate-y-1'
                                        : 'border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:-translate-y-2'}`}
                                >
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-lg w-fit ${(product as any).source === 'cafe' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                    {(product as any).source === 'cafe' ? 'Hospitality' : 'Retail'}
                                                </span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{product.category}</span>
                                            </div>
                                            <div className={`w-3 h-3 rounded-full animate-pulse ${(product as any).source === 'cafe' || (product as any).quantity > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                        </div>

                                        <h3 className="font-black text-slate-900 dark:text-white text-sm line-clamp-2 leading-tight tracking-tight h-10">
                                            {product.name}
                                        </h3>

                                        <div className="pt-4 border-t border-slate-50 dark:border-slate-700 flex flex-col gap-1">
                                            <div className="flex items-end gap-1">
                                                <span className="text-[10px] font-black text-slate-400 mb-1">KES</span>
                                                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                    {((product as any).source === 'cafe' ? (product as any).basePrice : (product as any).srpPrice)?.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                                                <span>Reserve: KES {((product as any).source === 'cafe' ? (product as any).basePrice : ((product as any).basePrice || (product as any).costPrice || 0))?.toLocaleString()}</span>
                                                {(product as any).source !== 'cafe' && <span>{(product as any).quantity} Left</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {filteredProducts.length === 0 && (
                                <div className="col-span-full py-20 text-center flex flex-col items-center">
                                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                        <Search className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Void Detected</h3>
                                    <p className="text-slate-400 text-xs italic mt-2 font-medium">No items match your query in the current matrix.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Cart & Pricing Engine - Right Section */}
            <div className="w-full md:w-[340px] lg:w-[400px] xl:w-[450px] flex flex-col gap-6 shrink-0">

                {/* Negotiation / Item Focus */}
                <div className={`overflow-hidden transition-all duration-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[3rem] border border-white dark:border-slate-800 shadow-2xl ${selectedItem ? 'h-auto opacity-100 p-8' : 'h-0 opacity-0 p-0 overflow-hidden'}`}>
                    {selectedItem && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h3 className="font-black text-slate-900 dark:text-white text-xl tracking-tight leading-tight">{selectedItem.name}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-[.3em] text-indigo-600">Dynamic Pricing Active</p>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-color"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[.3em] text-slate-400">Negotiated Price (KES)</label>
                                    <div className="relative group">
                                        <HandCoins className="w-6 h-6 absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            type="number"
                                            value={negotiatedPrice}
                                            onChange={(e) => setNegotiatedPrice(e.target.value)}
                                            className="w-full pl-16 pr-6 py-5 text-3xl font-black bg-slate-50 dark:bg-slate-800 border-none rounded-[1.5rem] focus:ring-4 focus:ring-emerald-500/10 outline-none text-slate-900 dark:text-white transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-6 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 mb-1">Agent Yield</span>
                                        <span className="text-2xl font-black text-emerald-600">
                                            KES {Math.max(0, parseFloat(negotiatedPrice || '0') - ((selectedItem as any).source === 'cafe' ? (selectedItem as any).basePrice : ((selectedItem as any).basePrice || (selectedItem as any).costPrice || 0)))?.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                        <HandCoins className="w-6 h-6" />
                                    </div>
                                </div>

                                {parseFloat(negotiatedPrice) < ((selectedItem as any).source === 'cafe' ? (selectedItem as any).basePrice : ((selectedItem as any).basePrice || (selectedItem as any).costPrice || 0)) && (
                                    <div className="flex gap-3 p-5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0 animate-bounce" />
                                        <p className="text-xs font-bold leading-relaxed">System blocked: Price is below base KES {((selectedItem as any).source === 'cafe' ? (selectedItem as any).basePrice : ((selectedItem as any).basePrice || (selectedItem as any).costPrice || 0))?.toLocaleString()}</p>
                                    </div>
                                )}

                                <button
                                    onClick={addToCart}
                                    disabled={parseFloat(negotiatedPrice) < ((selectedItem as any).source === 'cafe' ? (selectedItem as any).basePrice : ((selectedItem as any).basePrice || (selectedItem as any).costPrice || 0))}
                                    className="w-full py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all flex items-center justify-center gap-3"
                                >
                                    <Plus className="w-5 h-5" />
                                    Commit to Cart
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Cart Workspace */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden min-h-[400px]">
                    <div className="p-4 sm:p-6 lg:p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl">
                                <ShoppingCart className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-[0.2em]">{isEducation ? 'Issue Cart' : 'Active Sale'}</h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{cart.length} manifest items</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 no-scrollbar">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center py-20 opacity-30 grayscale">
                                <ShoppingCart className="w-16 h-16 mb-6 text-slate-300" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cart manifestation pending</p>
                            </div>
                        ) : (
                            cart.map((cartItem, idx) => (
                                <div key={idx} className="group flex justify-between items-center p-3.5 sm:p-5 border border-slate-50 dark:border-slate-800 rounded-[2rem] bg-white dark:bg-slate-800 hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-all duration-300 animate-in slide-in-from-right-4">
                                    <div className="flex-1 space-y-1">
                                        <p className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-tight truncate pr-4">{cartItem.item.name}</p>
                                        {isEducation ? (
                                            <p className="text-[10px] font-bold text-indigo-500 italic">Qty: {cartItem.quantity} {(cartItem.item as any).unit || 'units'}</p>
                                        ) : (
                                            <p className="text-[10px] font-bold text-indigo-500 italic">KES {cartItem.finalPrice?.toLocaleString()} {cartItem.quantity > 1 ? `x ${cartItem.quantity}` : ''}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {!isEducation ? (
                                            <p className="font-black text-slate-900 dark:text-white text-sm">KES {(cartItem.finalPrice * cartItem.quantity)?.toLocaleString()}</p>
                                        ) : (
                                            <p className="font-black text-slate-900 dark:text-white text-xs">Qty: {cartItem.quantity}</p>
                                        )}
                                        <button onClick={() => removeFromCart(idx)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-50 dark:border-slate-800 space-y-6">
                        <div className="flex flex-col gap-4">
                            {!isEducation && (
                                <div className="flex justify-between items-center p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Unrealized Comms</span>
                                    </div>
                                    <span className="text-sm font-black text-emerald-600">KES {totalCommission?.toLocaleString()}</span>
                                </div>
                            )}

                            {isEducation ? (
                                <div className="flex justify-between items-end px-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Total Items Count</span>
                                    <div className="flex items-end gap-1">
                                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                            {cart.reduce((sum, c) => sum + c.quantity, 0)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-end px-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Total Liability</span>
                                    <div className="flex items-end gap-1">
                                        <span className="text-sm font-black text-slate-400 mb-1">KES</span>
                                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{totalAmount?.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setIsCheckoutModalOpen(true)}
                            disabled={cart.length === 0}
                            className="w-full py-6 bg-gradient-to-br from-indigo-600 to-fuchsia-700 text-white rounded-[2rem] font-black uppercase text-[12px] tracking-[0.4em] shadow-[0_15px_40px_-10px_rgba(79,70,229,0.4)] hover:shadow-[0_20px_50px_-10px_rgba(79,70,229,0.5)] hover:-translate-y-1 active:translate-y-0 disabled:opacity-20 disabled:grayscale transition-all flex items-center justify-center gap-4"
                        >
                            <CreditCard className="w-6 h-6" />
                            {isEducation ? "Initialize Issuance" : "Initialize Checkout"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Premium Checkout Nexus */}
            {isCheckoutModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden border border-white dark:border-slate-800 animate-in zoom-in-95 duration-500">
                        {checkoutSuccess ? (
                            <div className="p-12 text-center space-y-8">
                                <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mx-auto animate-bounce shadow-inner">
                                    <CheckCircleIcon className="w-12 h-12" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                                        {isEducation ? "Issuance Confirmed" : "Transaction Verified"}
                                    </h3>
                                    <p className="text-slate-400 font-medium text-xs uppercase tracking-[0.3em]">
                                        {isEducation ? "academic allocation complete" : "Matrix manifestation complete"}
                                    </p>
                                </div>

                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 space-y-3">
                                    {isEducation ? (
                                        <>
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                                                <span>Recipient</span>
                                                <span className="text-slate-900 dark:text-white uppercase">{selectedStudent?.name}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                                                <span>ADM Number</span>
                                                <span className="text-slate-900 dark:text-white uppercase">{(selectedStudent as any)?.admission_number || selectedStudent?.admissionNumber || 'N/A'}</span>
                                            </div>
                                            {signatureData && (
                                                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                                    <span className="text-[10px] font-black uppercase text-slate-500 block text-left">Captured Signature:</span>
                                                    <img src={signatureData} className="max-h-16 mx-auto mt-2 border border-dashed rounded-lg p-1 bg-white" alt="Signature" />
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {customerInfo.phone && <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500"><span>SMS Receipt</span><span className="text-slate-900 dark:text-white">{customerInfo.phone}</span></div>}
                                            {customerInfo.email && <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500"><span>Matrix Link</span><span className="text-slate-900 dark:text-white">{customerInfo.email}</span></div>}
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        setCheckoutSuccess(null);
                                        setIsCheckoutModalOpen(false);
                                        setCustomerInfo({ name: '', phone: '', email: '' });
                                        setSelectedCustomer(null);
                                        setSelectedStudent(null);
                                        setCustomerSearch('');
                                        setStudentSearchQuery('');
                                        setSignatureData('');
                                    }}
                                    className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-[12px] tracking-[0.4em] rounded-[1.5rem] hover:scale-105 transition-all shadow-xl"
                                >
                                    Initiate Next Protocol
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-600 text-white rounded-2xl">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-[0.2em]">
                                                {isEducation ? "Issuance Portal" : "Settlement Nexus"}
                                            </h3>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                {isEducation ? "Authorize academic resource handoff" : "Validate customer credentials"}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsCheckoutModalOpen(false)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full transition-all border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-10 space-y-8 max-h-[75vh] overflow-y-auto">
                                    {isEducation ? (
                                        // ───────────────────────────────────────────
                                        // EDUCATION MODE: Student Search & Verification
                                        // ───────────────────────────────────────────
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <label className="text-[9px] font-black uppercase tracking-[.3em] text-slate-400 ml-4">
                                                    Search Student (ADM, Name, or QR)
                                                </label>
                                                <div className="relative">
                                                    <Search className="w-5 h-5 absolute left-6 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={studentSearchQuery}
                                                        onChange={e => setStudentSearchQuery(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const exactMatch = students.find(s => 
                                                                    (s.admissionNumber || (s as any).admission_number || '').toLowerCase() === studentSearchQuery.toLowerCase() ||
                                                                    s.id.toLowerCase() === studentSearchQuery.toLowerCase()
                                                                );
                                                                if (exactMatch) {
                                                                    setSelectedStudent(exactMatch);
                                                                    setCustomerInfo({
                                                                        name: exactMatch.name,
                                                                        phone: exactMatch.phoneNumber || '',
                                                                        email: exactMatch.email || ''
                                                                    });
                                                                    setStudentSearchQuery('');
                                                                }
                                                            }
                                                        }}
                                                        className="w-full pl-16 pr-24 py-5 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-black text-slate-900 dark:text-white placeholder:text-slate-300 transition-all"
                                                        placeholder="Admission No. or Name..."
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            // Simulation of QR scanner
                                                            if (students.length > 0) {
                                                                const randomStudent = students[Math.floor(Math.random() * students.length)];
                                                                setSelectedStudent(randomStudent);
                                                                setCustomerInfo({
                                                                    name: randomStudent.name,
                                                                    phone: randomStudent.phoneNumber || '',
                                                                    email: randomStudent.email || ''
                                                                });
                                                                alert(`[QR Scanner Sim] Scanned QR Code successfully! Selected Student: ${randomStudent.name} (${(randomStudent as any).admission_number || 'ADM-883'})`);
                                                            } else {
                                                                alert("No students registered yet in this school to simulate QR scan.");
                                                            }
                                                        }}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-indigo-500 transition-all"
                                                    >
                                                        Scan QR
                                                    </button>

                                                    {studentSearchQuery && (
                                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 max-h-48 overflow-y-auto z-50 p-2 space-y-1">
                                                            {students
                                                                .filter(s =>
                                                                    s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                                                    (s.admissionNumber || (s as any).admission_number || '').toLowerCase().includes(studentSearchQuery.toLowerCase())
                                                                )
                                                                .map(s => (
                                                                    <button
                                                                        key={s.id}
                                                                        onClick={() => {
                                                                            setSelectedStudent(s);
                                                                            setCustomerInfo({
                                                                                name: s.name,
                                                                                phone: s.phoneNumber || '',
                                                                                email: s.email || ''
                                                                            });
                                                                            setStudentSearchQuery('');
                                                                        }}
                                                                        className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors flex justify-between items-center"
                                                                    >
                                                                        <div>
                                                                            <p className="text-xs font-black uppercase text-slate-900 dark:text-white">{s.name}</p>
                                                                            <p className="text-[10px] text-slate-400 font-bold">ADM: {(s as any).admission_number || s.admissionNumber || 'N/A'}</p>
                                                                        </div>
                                                                        {s.email && (
                                                                            <div className="text-right">
                                                                                <p className="text-[9px] text-slate-400">{s.email}</p>
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                ))
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {selectedStudent && (
                                                <div className="p-6 bg-indigo-55 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 space-y-4 animate-in slide-in-from-top-4">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600">Selected Recipient</span>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedStudent(null);
                                                                setCustomerInfo({ name: '', phone: '', email: '' });
                                                            }}
                                                            className="text-[8px] font-black uppercase tracking-widest text-rose-500 hover:underline"
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-[8px] uppercase tracking-wider text-slate-400 block mb-0.5">Student Name</label>
                                                            <p className="text-xs font-black text-slate-950 dark:text-white uppercase">{selectedStudent.name}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-[8px] uppercase tracking-wider text-slate-400 block mb-0.5">Admission Number</label>
                                                            <p className="text-xs font-black text-indigo-600 uppercase">{(selectedStudent as any).admission_number || selectedStudent.admissionNumber || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Digital Signature Canvas */}
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center px-4">
                                                    <label className="text-[9px] font-black uppercase tracking-[.3em] text-slate-400">Recipient Signature (Draw below)</label>
                                                    {signatureData && (
                                                        <button
                                                            onClick={clearSignature}
                                                            className="text-[8px] font-black uppercase tracking-widest text-rose-500 hover:underline"
                                                        >
                                                            Reset Sign
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-950 overflow-hidden h-40">
                                                    <canvas
                                                        ref={canvasRef}
                                                        width={500}
                                                        height={160}
                                                        onMouseDown={startDrawing}
                                                        onMouseMove={draw}
                                                        onMouseUp={stopDrawing}
                                                        onMouseLeave={stopDrawing}
                                                        onTouchStart={startDrawing}
                                                        onTouchMove={draw}
                                                        onTouchEnd={stopDrawing}
                                                        className="w-full h-full cursor-crosshair touch-none"
                                                    />
                                                    {!signatureData && (
                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">Draw or sign here</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // ───────────────────────────────────────────
                                        // RETAIL MODE: Standard Customer Search & Form
                                        // ───────────────────────────────────────────
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <label className="text-[9px] font-black uppercase tracking-[.3em] text-slate-400 ml-4">Search Existing Customer</label>
                                                <div className="relative">
                                                    <Search className="w-5 h-5 absolute left-6 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={customerSearch}
                                                        onChange={e => setCustomerSearch(e.target.value)}
                                                        className="w-full pl-16 pr-8 py-5 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-black text-slate-900 dark:text-white placeholder:text-slate-300 transition-all"
                                                        placeholder="Phone or Name..."
                                                    />
                                                    {customerSearch && (
                                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 max-h-48 overflow-y-auto z-50 p-2 space-y-1">
                                                            {allCustomers
                                                                .filter(c =>
                                                                    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                                                    (c.phoneNumber && c.phoneNumber.includes(customerSearch))
                                                                )
                                                                .map(c => (
                                                                    <button
                                                                        key={c.id}
                                                                        onClick={() => {
                                                                            setSelectedCustomer(c);
                                                                            setCustomerInfo({ name: c.name, phone: c.phoneNumber || '', email: c.email || '' });
                                                                            setCustomerSearch('');
                                                                        }}
                                                                        className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors flex justify-between items-center"
                                                                    >
                                                                        <div>
                                                                            <p className="text-xs font-black uppercase text-slate-900 dark:text-white">{c.name}</p>
                                                                            <p className="text-[10px] text-slate-400 font-bold">{c.phoneNumber || 'No Phone'}</p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-[10px] font-black text-indigo-600">{c.loyaltyPoints} PTS</p>
                                                                        </div>
                                                                    </button>
                                                                ))
                                                            }
                                                            <button
                                                                onClick={() => setCustomerSearch('')}
                                                                className="w-full p-2 text-[10px] font-bold text-slate-400 hover:text-indigo-500"
                                                            >
                                                                Clear Search
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center px-4">
                                                    <label className="text-[9px] font-black uppercase tracking-[.3em] text-slate-400">Identity Record</label>
                                                    {selectedCustomer && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedCustomer(null);
                                                                setCustomerInfo({ name: '', phone: '', email: '' });
                                                            }}
                                                            className="text-[8px] font-black uppercase tracking-widest text-rose-500 hover:underline"
                                                        >
                                                            Clear Selection
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="space-y-4">
                                                    <input
                                                        type="text"
                                                        value={customerInfo.name}
                                                        onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                                        className={`w-full px-8 py-5 border-none rounded-[1.5rem] focus:ring-4 outline-none text-sm font-black transition-all ${selectedCustomer ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 ring-2 ring-indigo-500/20' : 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-300 focus:ring-indigo-500/10'}`}
                                                        placeholder="Customer Name"
                                                    />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <input
                                                            type="tel"
                                                            value={customerInfo.phone}
                                                            onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                                            className={`w-full px-8 py-5 border-none rounded-[1.5rem] focus:ring-4 outline-none text-sm font-black transition-all ${selectedCustomer ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 ring-2 ring-indigo-500/20' : 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-300 focus:ring-indigo-500/10'}`}
                                                            placeholder="Phone Number"
                                                        />
                                                        <input
                                                            type="email"
                                                            value={customerInfo.email}
                                                            onChange={e => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                                            className={`w-full px-8 py-5 border-none rounded-[1.5rem] focus:ring-4 outline-none text-sm font-black transition-all ${selectedCustomer ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 ring-2 ring-indigo-500/20' : 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-300 focus:ring-indigo-500/10'}`}
                                                            placeholder="Email Address"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedCustomer && (
                                                <div className="p-6 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 flex justify-between items-center animate-in slide-in-from-top-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 mb-1">Loyalty Wallet</span>
                                                        <span className="text-xl font-black text-indigo-600">{selectedCustomer.loyaltyPoints} PTS</span>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 mb-1">Incoming</span>
                                                        <span className="text-xl font-black text-emerald-600">+{Math.floor(totalAmount / 100)} PTS</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!isEducation && (
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black uppercase tracking-[.3em] text-slate-400 ml-4">Transfer Protocol</label>
                                            <div className="grid grid-cols-3 gap-4">
                                                {['mpesa', 'card', 'cash'].map(method => (
                                                    <button
                                                        key={method}
                                                        onClick={() => setPaymentMethod(method)}
                                                        className={`group relative py-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${paymentMethod === method
                                                            ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-500/20'
                                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-200'}`}
                                                    >
                                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${paymentMethod === method ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                                                            {method}
                                                        </span>
                                                        {paymentMethod === method && (
                                                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border-2 border-indigo-600 text-indigo-600">
                                                                <CheckCircleIcon className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {isEducation ? (
                                        <div className="p-8 bg-slate-900 dark:bg-slate-800 rounded-[2.5rem] flex justify-between items-center shadow-2xl">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-[.4em] text-slate-400">
                                                    Total Items Count
                                                </span>
                                                <h4 className="text-3xl font-black text-white tracking-tighter">
                                                    {cart.reduce((sum, c) => sum + c.quantity, 0)}
                                                </h4>
                                            </div>
                                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                                <ShoppingCart className="w-8 h-8 text-white/50" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-8 bg-slate-900 dark:bg-slate-800 rounded-[2.5rem] flex justify-between items-center shadow-2xl">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-[.4em] text-slate-400">
                                                    Net Liability
                                                </span>
                                                <h4 className="text-3xl font-black text-white tracking-tighter">KES {totalAmount?.toLocaleString()}</h4>
                                            </div>
                                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                                <ShoppingCart className="w-8 h-8 text-white/50" />
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleCheckout}
                                        disabled={isProcessing}
                                        className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[12px] tracking-[0.4em] shadow-2xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Zap className="w-6 h-6" />
                                                {isEducation ? "Log Issuance" : "Process Settlement"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

