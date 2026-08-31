import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { generateRetailReceiptPdf } from '../../services/pdfService';
import { RetailInventoryItem, RetailStore, User, CafeMenuItem, RetailCustomer } from '../../types';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { printService, getPrinterConfig, savePrinterConfig, getBluetoothPrinters, PrinterConfig } from '../../services/printService';
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

// ─── Helper: extract the best available ID from any user object ───
function getStudentId(u: any): string {
    return (
        u?.admissionNumber ||
        u?.admission_number ||
        u?.staffId ||
        u?.staff_id ||
        u?.metadata?.admissionNumber ||
        u?.metadata?.admission_number ||
        u?.metadata?.staffId ||
        ''
    );
}

export function DualModePOS({ institutionId, currentUser, isEducation, preSelectedUser, onClearPreSelectedUser }: DualModePOSProps) {
    const [activeMode, setActiveMode] = useState<'shop' | 'field'>('shop');
    const [mobileActiveView, setMobileActiveView] = useState<'products' | 'cart'>('products');

    // Printer State Configuration
    const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(null);
    const [pairedPrinters, setPairedPrinters] = useState<{ name: string; address: string }[]>([]);
    const [showPrinterSettings, setShowPrinterSettings] = useState(false);
    const [isBluetoothLoading, setIsBluetoothLoading] = useState(false);

    useEffect(() => {
        setPrinterConfig(getPrinterConfig());
    }, []);

    const handleLoadBluetoothPrinters = async () => {
        setIsBluetoothLoading(true);
        try {
            const devices = await getBluetoothPrinters();
            setPairedPrinters(devices);
        } catch (e: any) {
            console.error("Bluetooth printers search failed:", e);
        } finally {
            setIsBluetoothLoading(false);
        }
    };

    const handlePrint = async () => {
        if (!receiptPdfUrl || !checkoutSuccess) return;

        const completeSaleData = {
            ...checkoutSuccess,
            id: checkoutSuccess.id || Date.now().toString(),
        };
        const actualInst = institution || { name: 'School Store', phoneNumber: '', email: '' };

        try {
            await printService.printReceipt({
                pdfBase64: receiptPdfUrl,
                saleData: completeSaleData,
                institution: actualInst,
                isEducation: isEducation || false
            });
        } catch (e: any) {
            alert(`Printing failed: ${e.message || e}`);
        }
    };
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
    const [receiptPdfUrl, setReceiptPdfUrl] = useState<string | null>(null);

    // Selected item for pricing negotiation
    const [selectedItem, setSelectedItem] = useState<RetailInventoryItem | CafeMenuItem | null>(null);
    const [negotiatedPrice, setNegotiatedPrice] = useState<string>('');
    const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

    // CRM state
    const [allCustomers, setAllCustomers] = useState<RetailCustomer[]>([]);
    const [allStores, setAllStores] = useState<RetailStore[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<RetailCustomer | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');


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
            const eligibleRoles = [
                'student',
                'teacher', 'lecturer', 'hod', 'dos', 'deputy', 'head_teacher',
                'support_staff', 'librarian', 'security', 'info_desk', 'store', 'boarding_master', 'driver', 'transport_assistant', 'attendant', 'worker', 'secretary', 'finance'
            ];
            const filtered = (data || []).filter(u => 
                eligibleRoles.includes(u.role) || 
                (Array.isArray(u.roles) && u.roles.some(r => eligibleRoles.includes(r)))
            );
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
        
        let clientX = 0;
        let clientY = 0;

        if ('touches' in e) {
            if (e.touches.length === 0) return { x: 0, y: 0 };
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // Scale coordinates to match canvas internal resolution (width/height attributes vs CSS bounding client rect)
        return {
            x: ((clientX - rect.left) / rect.width) * canvas.width,
            y: ((clientY - rect.top) / rect.height) * canvas.height
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

    const [institution, setInstitution] = useState<any>(null);

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
        fetchStores();
        fetchCategories();
        if (isEducation) {
            fetchStudents();
        }

        if (institutionId) {
            apiService.fetchInstitutions(institutionId).then(data => {
                if (data && data.length > 0) {
                    setInstitution(data[0]);
                }
            }).catch(() => {});
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
            const [retailData, usersData] = await Promise.all([
                apiService.fetchModuleRecords<RetailCustomer>('retail_customers', institutionId),
                apiService.fetchUsers ? apiService.fetchUsers(institutionId) : Promise.resolve([])
            ]);

            const customersFromUsers: RetailCustomer[] = (usersData || [])
                .filter((u: any) => {
                    const r = (u.role || '').toLowerCase();
                    const roles = (Array.isArray(u.roles) ? u.roles : []).map((x: any) => String(x).toLowerCase());
                    return r === 'customer' || r === 'lead' || roles.includes('customer') || roles.includes('lead');
                })
                .map((u: any) => ({
                    id: u.id,
                    institutionId: u.institutionId || institutionId,
                    name: u.name || u.fullName || u.full_name || u.customerName || (u.email ? u.email.split('@')[0] : 'Customer'),
                    phoneNumber: u.phoneNumber || u.phone_number || u.phone || '',
                    email: u.email || '',
                    totalSpent: u.totalSpent || 0,
                    loyaltyPoints: u.loyaltyPoints || 0,
                    createdAt: u.createdAt || new Date().toISOString(),
                    updatedAt: u.updatedAt || u.createdAt || new Date().toISOString()
                }));

            const combinedMap = new Map<string, RetailCustomer>();
            (retailData || []).forEach(c => {
                const cleanName = c.name || (c as any).fullName || (c as any).full_name || (c as any).customerName || 'Customer';
                const key = c.id || c.phoneNumber || cleanName;
                if (key) combinedMap.set(key, { ...c, name: cleanName });
            });
            customersFromUsers.forEach(c => {
                const key = c.id || c.phoneNumber || c.name;
                if (key && !combinedMap.has(key)) combinedMap.set(key, c);
            });

            setAllCustomers(Array.from(combinedMap.values()));
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
        } else if ((currentUser.role || '').includes('agent') || currentUser.role === 'field_agent') {
            // Specific overrides for tablet if and role is field agent
            setActiveMode('field');
        }
    }, [currentUser, institutionId]);

    const addToCart = () => {
        if (!selectedItem) return;

        const isCafe = (selectedItem as any).source === 'cafe';
        const basePrice = isCafe ? (selectedItem as any).basePrice : ((selectedItem as any).basePrice || (selectedItem as any).costPrice || 0);

        if (isEducation) {
            // For school inventory issuance
            const maxStock = (selectedItem as any).quantity ?? 0;
            if (selectedQuantity > maxStock) {
                alert(`Cannot issue more than available stock (${maxStock} units).`);
                return;
            }
            if (selectedQuantity < 1) {
                alert('Please enter a valid quantity.');
                return;
            }

            setCart([...cart, {
                item: selectedItem,
                quantity: selectedQuantity,
                finalPrice: 0 // Price is 0 for inventory issuance
            }]);
        } else {
            // For commercial sales
            const numPrice = parseFloat(negotiatedPrice);
            if (isNaN(numPrice)) {
                alert('Please enter a valid price.');
                return;
            }

            if (numPrice < basePrice) {
                alert(`Price cannot be below the Base Price of KES ${basePrice}`);
                return;
            }

            setCart([...cart, {
                item: selectedItem,
                quantity: 1,
                finalPrice: numPrice
            }]);
        }

        setSelectedItem(null);
        setNegotiatedPrice('');
        setSelectedQuantity(1);
    };

    const updateCartItemQuantity = (index: number, newQty: number) => {
        if (newQty < 1) return;
        const newCart = [...cart];
        const item = newCart[index].item;
        
        const isCafe = (item as any).source === 'cafe';
        if (!isCafe) {
            const maxStock = (item as any).quantity ?? 999999;
            if (newQty > maxStock) {
                alert(`Only ${maxStock} units of this item are available in stock.`);
                return;
            }
        }
        
        newCart[index].quantity = newQty;
        setCart(newCart);
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
            const proceedWithoutSignature = window.confirm("No recipient signature has been captured. Would you like to proceed with the issuance anyway?");
            if (!proceedWithoutSignature) {
                return;
            }
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
                    admissionNumber: getStudentId(selectedStudent),
                    isEducationIssuance: true
                } : undefined,
                createdAt: new Date().toISOString()
            };

            let savedSale;
            try {
                savedSale = await apiService.saveModuleRecord('retail_sales', saleData);
            } catch (saveErr: any) {
                console.warn("First save attempt failed, trying fallback without signature/metadata fields:", saveErr);
                // Fallback: strip signature and metadata which might not exist in old database schemas
                const fallbackSaleData = {
                    ...saleData,
                    signature: undefined,
                    metadata: undefined
                };
                savedSale = await apiService.saveModuleRecord('retail_sales', fallbackSaleData);
            }

            if (savedSale && (savedSale as any).id) {
                const commissionPromises: Promise<any>[] = [];
                const stockUpdatePromises: Promise<any>[] = [];

                // 1. Prepare Commissions
                for (const c of cart) {
                    const isCafe = (c.item as any).source === 'cafe';
                    const basePrice = isCafe ? (c.item as any).basePrice : ((c.item as any).basePrice || (c.item as any).costPrice || 0);
                    if (c.finalPrice > basePrice) {
                        commissionPromises.push(
                            apiService.saveModuleRecord('retail_commissions_ledger', {
                                institutionId,
                                agentId: currentUser.id,
                                saleId: (savedSale as any).id,
                                itemId: c.item.id,
                                basePrice,
                                soldPrice: c.finalPrice,
                                commissionAmount: (c.finalPrice - basePrice) * c.quantity,
                                isPaid: false,
                                createdAt: new Date().toISOString()
                            }).catch((commErr) => {
                                console.error("Commission save failed:", commErr);
                            })
                        );
                    }
                }

                // 2. Prepare Stock Reductions
                for (const c of cart) {
                    const isCafe = (c.item as any).source === 'cafe';
                    if (isCafe) continue; // Cafe menu items don't track quantity

                    const retailItem = c.item as RetailInventoryItem;
                    const newQty = Math.max(0, (retailItem.quantity || 0) - c.quantity);
                    const { source, ...cleanRetailPayload } = retailItem as any;
                    stockUpdatePromises.push(
                        apiService.saveModuleRecord('retail_inventory_items', {
                            ...cleanRetailPayload,
                            quantity: newQty,
                            lastUpdated: new Date().toISOString()
                        }).catch((stockErr) => {
                            console.error(`Stock update failed for item ${retailItem.name}:`, stockErr);
                        })
                    );
                }

                // 3. Await all in parallel
                await Promise.all([...commissionPromises, ...stockUpdatePromises]);

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
                    const actualInst = institution || { name: 'School Store', phoneNumber: '', email: '' };
                    const pdfUrl = await generateRetailReceiptPdf(
                        completeSaleData,
                        actualInst,
                        {} as any, // company details
                        actualInst.logoUrl || null, // default logo
                        false, // isReprint
                        isEducation // isEducation
                    );
                    setReceiptPdfUrl(pdfUrl);
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
        <div className="flex flex-col gap-6 w-full lg:h-[calc(100vh-11rem)] lg:min-h-[600px] xl:min-h-[650px] lg:overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* Mobile Tab Switcher (Visible on mobile/tablet, hidden on desktop) */}
            <div className="lg:hidden flex bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md p-1.5 rounded-2xl w-full border border-slate-200/50 dark:border-slate-700/50">
                <button
                    onClick={() => setMobileActiveView('products')}
                    className={`flex-1 py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        mobileActiveView === 'products'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-black scale-[1.02]'
                            : 'text-slate-500 hover:text-indigo-500'
                    }`}
                >
                    <Layers className="w-4 h-4" />
                    Browse Items ({filteredProducts.length})
                </button>
                <button
                    onClick={() => setMobileActiveView('cart')}
                    className={`flex-1 py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 relative ${
                        mobileActiveView === 'cart'
                            ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-indigo-400 shadow-sm font-black scale-[1.02]'
                            : 'text-slate-500 hover:text-indigo-500'
                    }`}
                >
                    <ShoppingCart className="w-4 h-4" />
                    {isEducation ? 'Issuance Cart' : 'Sales Cart'}
                    {cart.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
                            {cart.reduce((sum, c) => sum + c.quantity, 0)}
                        </span>
                    )}
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 w-full lg:h-full lg:overflow-hidden">

                {/* Product Arena - Left Section */}
                <div className={`flex-grow flex flex-col bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[3rem] shadow-sm border border-white dark:border-slate-800 overflow-hidden transition-all ${
                    mobileActiveView === 'products' ? 'flex' : 'hidden lg:flex'
                }`}>

                {/* Cyber-Header & Mode Switcher */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
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

                </div>

                {/* Product List View */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/10 no-scrollbar">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-x-auto shadow-sm">
                        <table className="w-full text-left border-collapse" style={{ minWidth: '600px' }}>
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b-2 border-indigo-100 dark:border-slate-700">
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Barcode/SKU</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Item Name</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                    {!isEducation && <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Price (KES)</th>}
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
                                                setSelectedQuantity(1);
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
                                            {!isEducation && (
                                                <td className="px-4 py-3 text-xs font-black text-slate-900 dark:text-white text-right">
                                                    {price?.toLocaleString()}
                                                </td>
                                            )}
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
                </div>
            </div>

            {/* Floating Proceed Button on Mobile */}
            {mobileActiveView === 'products' && cart.length > 0 && (
                <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] w-[90%] max-w-sm animate-in slide-in-from-bottom-8 duration-500">
                    <button
                        onClick={() => setMobileActiveView('cart')}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 border border-indigo-500/20 active:scale-95 transition-all"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        Proceed to Manifest ({cart.reduce((sum, c) => sum + c.quantity, 0)} items)
                    </button>
                </div>
            )}

            {/* Backdrop for selectedItem drawer on mobile */}
            {selectedItem && (
                <div 
                    onClick={() => setSelectedItem(null)} 
                    className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] animate-in fade-in duration-300"
                />
            )}

            {/* Cart & Pricing Engine - Right Section */}
            <div className={`w-full lg:w-[340px] xl:w-[400px] 2xl:w-[450px] flex-col gap-6 shrink-0 lg:h-full lg:overflow-hidden ${
                mobileActiveView === 'cart' ? 'flex' : 'hidden lg:flex'
            }`}>

                {/* Negotiation / Item Focus */}
                <div className={`transition-all duration-500 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] sm:rounded-[3rem] border border-white dark:border-slate-800 shadow-2xl p-6 sm:p-8
                    ${selectedItem ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none h-0 lg:h-auto overflow-hidden'}
                    fixed inset-x-4 bottom-4 z-[90] lg:relative lg:inset-auto lg:translate-y-0 lg:opacity-100 lg:pointer-events-auto lg:z-0 lg:p-8 lg:rounded-[3rem]
                `}>
                    {selectedItem && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h3 className="font-black text-slate-900 dark:text-white text-xl tracking-tight leading-tight">{selectedItem.name}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-[.3em] text-indigo-600">
                                        {isEducation ? 'Inventory Issuance Control' : 'Dynamic Pricing Active'}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-color"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>

                            <div className="space-y-6">
                                {isEducation ? (
                                    <>
                                        {/* School Issuance Quantity Selector */}
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black uppercase tracking-[.3em] text-slate-400">Quantity to Issue</label>
                                            <div className="relative group flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={(selectedItem as any).quantity ?? 0}
                                                    value={selectedQuantity}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        if (!isNaN(val)) setSelectedQuantity(val);
                                                    }}
                                                    className="w-full px-6 py-5 text-3xl font-black bg-slate-50 dark:bg-slate-800 border-none rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-900 dark:text-white transition-all"
                                                />
                                                <span className="text-xs font-bold text-slate-500 shrink-0">
                                                    / {((selectedItem as any).quantity ?? 0).toLocaleString()} {(selectedItem as any).unit || 'units'}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedQuantity > ((selectedItem as any).quantity ?? 0) && (
                                            <div className="flex gap-3 p-5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                                <AlertCircle className="w-5 h-5 flex-shrink-0 animate-bounce" />
                                                <p className="text-xs font-bold leading-relaxed">System blocked: Quantity exceeds available stock of {((selectedItem as any).quantity ?? 0).toLocaleString()} {(selectedItem as any).unit || 'units'}</p>
                                            </div>
                                        )}

                                        <button
                                            onClick={addToCart}
                                            disabled={selectedQuantity < 1 || selectedQuantity > ((selectedItem as any).quantity ?? 0)}
                                            className="w-full py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all flex items-center justify-center gap-3"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Commit to Issuance Cart
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {/* Commercial Pricing Selector */}
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
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Cart Workspace */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden h-[480px] lg:h-auto">
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
                                        {!isEducation && (
                                            <p className="text-[10px] font-bold text-indigo-500 italic">KES {cartItem.finalPrice?.toLocaleString()} {cartItem.quantity > 1 ? `x ${cartItem.quantity}` : ''}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* Interactive Quantity Control */}
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-1 border border-slate-100 dark:border-slate-800/40">
                                            <button
                                                type="button"
                                                onClick={() => updateCartItemQuantity(idx, cartItem.quantity - 1)}
                                                disabled={cartItem.quantity <= 1}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 transition-all font-bold text-sm"
                                            >
                                                −
                                            </button>
                                            <input
                                                type="number"
                                                min="1"
                                                max={(cartItem.item as any).quantity ?? 9999}
                                                value={cartItem.quantity}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (!isNaN(val)) updateCartItemQuantity(idx, val);
                                                }}
                                                className="w-12 text-center bg-transparent border-none outline-none font-black text-xs text-slate-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-0"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => updateCartItemQuantity(idx, cartItem.quantity + 1)}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 transition-all font-bold text-sm"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {!isEducation && (
                                            <p className="font-black text-slate-900 dark:text-white text-sm shrink-0 min-w-[70px] text-right">KES {(cartItem.finalPrice * cartItem.quantity)?.toLocaleString()}</p>
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

            </div>

            {/* Premium Checkout Nexus */}
            {isCheckoutModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-300">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] sm:rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden border border-white dark:border-slate-800 animate-in zoom-in-95 duration-500 max-h-[92vh] flex flex-col">
                        {checkoutSuccess ? (
                            <div className="p-6 sm:p-12 text-center space-y-6 sm:space-y-8 overflow-y-auto flex-1 no-scrollbar">
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

                                {receiptPdfUrl && printerConfig && (
                                    <div className="space-y-4 mb-4">
                                        <button
                                            type="button"
                                            onClick={handlePrint}
                                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:opacity-90 text-white font-black uppercase text-[12px] tracking-[0.4em] rounded-[1.5rem] transition-all shadow-xl flex items-center justify-center gap-2"
                                        >
                                            <Printer className="w-5 h-5" />
                                            Print Receipt
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowPrinterSettings(!showPrinterSettings)}
                                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                                        >
                                            ⚙️ Configure Printer ({printerConfig.type === 'system' ? 'System Print' : printerConfig.type === 'bluetooth' ? 'Bluetooth' : 'Network/IP'})
                                        </button>

                                        {showPrinterSettings && (
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-2xl space-y-4 text-left animate-in slide-in-from-top-2 duration-300">
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Printer Interface Type</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {(['system', 'bluetooth', 'network'] as const).map((type) => (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = { ...printerConfig, type };
                                                                    setPrinterConfig(updated);
                                                                    savePrinterConfig(updated);
                                                                    if (type === 'bluetooth' && pairedPrinters.length === 0) {
                                                                        handleLoadBluetoothPrinters();
                                                                    }
                                                                }}
                                                                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                                                    printerConfig.type === type
                                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                {type === 'system' ? 'System PDF' : type === 'bluetooth' ? 'Bluetooth' : 'IP / Wi-Fi'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {printerConfig.type === 'bluetooth' && (
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Select Bluetooth Device</label>
                                                            <button
                                                                type="button"
                                                                onClick={handleLoadBluetoothPrinters}
                                                                className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                                                disabled={isBluetoothLoading}
                                                            >
                                                                {isBluetoothLoading ? 'Searching...' : 'Refresh Devices'}
                                                            </button>
                                                        </div>
                                                        {pairedPrinters.length > 0 ? (
                                                            <select
                                                                value={printerConfig.bluetoothAddress || ''}
                                                                onChange={(e) => {
                                                                    const selected = pairedPrinters.find(p => p.address === e.target.value);
                                                                    const updated = {
                                                                        ...printerConfig,
                                                                        bluetoothAddress: e.target.value,
                                                                        bluetoothName: selected?.name
                                                                    };
                                                                    setPrinterConfig(updated);
                                                                    savePrinterConfig(updated);
                                                                }}
                                                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-850 dark:text-slate-200 outline-none"
                                                            >
                                                                <option value="">-- Choose a Printer --</option>
                                                                {pairedPrinters.map(p => (
                                                                    <option key={p.address} value={p.address}>
                                                                        {p.name} ({p.address})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <p className="text-[10px] text-slate-400 italic">No paired Bluetooth devices loaded. Try refreshing.</p>
                                                        )}
                                                    </div>
                                                )}

                                                {printerConfig.type === 'network' && (
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="col-span-2">
                                                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Printer IP Address</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. 192.168.1.100"
                                                                value={printerConfig.ipAddress || ''}
                                                                onChange={(e) => {
                                                                    const updated = { ...printerConfig, ipAddress: e.target.value };
                                                                    setPrinterConfig(updated);
                                                                    savePrinterConfig(updated);
                                                                }}
                                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-850 dark:text-slate-200 outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Port</label>
                                                            <input
                                                                type="number"
                                                                placeholder="9100"
                                                                value={printerConfig.port || 9100}
                                                                onChange={(e) => {
                                                                    const updated = { ...printerConfig, port: parseInt(e.target.value) || 9100 };
                                                                    setPrinterConfig(updated);
                                                                    savePrinterConfig(updated);
                                                                }}
                                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-850 dark:text-slate-200 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {printerConfig.type !== 'system' && (
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Paper Roll Size</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {([58, 80] as const).map((size) => (
                                                                <button
                                                                    key={size}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = { ...printerConfig, paperWidth: size };
                                                                        setPrinterConfig(updated);
                                                                        savePrinterConfig(updated);
                                                                    }}
                                                                    className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                                                        printerConfig.paperWidth === size
                                                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                                                                    }`}
                                                                >
                                                                    {size}mm Receipt Roll
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

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
                                        setReceiptPdfUrl(null);
                                    }}
                                    className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-[12px] tracking-[0.4em] rounded-[1.5rem] hover:scale-105 transition-all shadow-xl"
                                >
                                    Initiate Next Protocol
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col flex-1 overflow-hidden">
                                <div className="px-4 py-3 sm:px-10 sm:py-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
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

                                <div className="p-4 sm:p-10 space-y-6 sm:space-y-8 flex-1 overflow-y-auto no-scrollbar">
                                    {isEducation ? (
                                        // ───────────────────────────────────────────
                                        // EDUCATION MODE: Student Search & Verification
                                        // ───────────────────────────────────────────
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <label className="text-[9px] font-black uppercase tracking-[.3em] text-slate-400 ml-4">
                                                    Search Recipient (ADM, Staff ID, Name, or QR)
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
                                                                    (s.staffId || (s as any).staff_id || '').toLowerCase() === studentSearchQuery.toLowerCase() ||
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
                                                        placeholder="Admission No., Staff ID, or Name..."
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
                                                                const isStudent = randomStudent.role === 'student' || (Array.isArray(randomStudent.roles) && randomStudent.roles.includes('student'));
                                                                const idValue = isStudent 
                                                                    ? ((randomStudent as any).admission_number || randomStudent.admissionNumber || 'N/A')
                                                                    : (randomStudent.staffId || (randomStudent as any).staff_id || 'N/A');
                                                                alert(`[QR Scanner Sim] Scanned QR Code successfully! Selected Recipient: ${randomStudent.name} (${idValue})`);
                                                            } else {
                                                                alert("No eligible recipients registered yet in this school to simulate QR scan.");
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
                                                                    (s.admissionNumber || (s as any).admission_number || '').toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                                                    (s.staffId || (s as any).staff_id || '').toLowerCase().includes(studentSearchQuery.toLowerCase())
                                                                )
                                                                .map(s => {
                                                                    const isStudent = s.role === 'student' || (Array.isArray(s.roles) && s.roles.includes('student'));
                                                                    const idLabel = isStudent ? 'ADM' : 'STAFF ID';
                                                                    const idValue = isStudent 
                                                                        ? ((s as any).admission_number || s.admissionNumber || 'N/A')
                                                                        : (s.staffId || (s as any).staff_id || 'N/A');
                                                                    const roleDisplay = s.role.replace('_', ' ');

                                                                    return (
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
                                                                                <div className="flex items-center gap-2">
                                                                                    <p className="text-xs font-black uppercase text-slate-900 dark:text-white">{s.name}</p>
                                                                                    <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                                                                        {roleDisplay}
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-[10px] text-slate-400 font-bold">{idLabel}: {idValue}</p>
                                                                            </div>
                                                                            {s.email && (
                                                                                <div className="text-right">
                                                                                    <p className="text-[9px] text-slate-400">{s.email}</p>
                                                                                </div>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {selectedStudent && (
                                                <div className="p-6 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 space-y-4 animate-in slide-in-from-top-4">
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
                                                            <label className="text-[8px] uppercase tracking-wider text-slate-400 block mb-0.5">Recipient Name</label>
                                                            <p className="text-xs font-black text-slate-950 dark:text-white uppercase">{selectedStudent.name}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-[8px] uppercase tracking-wider text-slate-400 block mb-0.5">
                                                                {selectedStudent.role === 'student' || (Array.isArray(selectedStudent.roles) && selectedStudent.roles.includes('student')) ? 'Admission Number' : 'Staff ID'}
                                                            </label>
                                                            <p className="text-xs font-black text-indigo-600 uppercase">
                                                                 {selectedStudent.role === 'student' || (Array.isArray(selectedStudent.roles) && selectedStudent.roles.includes('student'))
                                                                    ? (getStudentId(selectedStudent) || 'N/A')
                                                                    : (selectedStudent.staffId || (selectedStudent as any).staff_id || getStudentId(selectedStudent) || 'N/A')}
                                                            </p>
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
                                                                .filter(c => {
                                                                    const cName = (c.name || (c as any).fullName || (c as any).full_name || (c as any).customerName || '').toLowerCase();
                                                                    const cPhone = (c.phoneNumber || (c as any).phone_number || (c as any).phone || '');
                                                                    const q = customerSearch.toLowerCase();
                                                                    return cName.includes(q) || cPhone.includes(q);
                                                                })
                                                                .map(c => {
                                                                    const resolvedName = c.name || (c as any).fullName || (c as any).full_name || (c as any).customerName || 'Customer';
                                                                    const resolvedPhone = c.phoneNumber || (c as any).phone_number || (c as any).phone || '';
                                                                     return (
                                                                         <button
                                                                             key={c.id}
                                                                             onClick={() => {
                                                                                 setSelectedCustomer(c);
                                                                                 setCustomerInfo({ name: resolvedName, phone: resolvedPhone, email: c.email || '' });
                                                                                 setCustomerSearch('');
                                                                             }}
                                                                             className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors flex justify-between items-center"
                                                                         >
                                                                             <div>
                                                                                 <p className="text-xs font-black uppercase text-slate-900 dark:text-white">{resolvedName}</p>
                                                                                 <p className="text-[10px] text-slate-400 font-bold">{resolvedPhone || 'No Phone'}</p>
                                                                             </div>
                                                                             <div className="text-right">
                                                                                 <p className="text-[10px] font-black text-indigo-600">{c.loyaltyPoints || 0} PTS</p>
                                                                             </div>
                                                                         </button>
                                                                     );
                                                                 })
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

                                </div>

                                {/* ── STICKY FOOTER: always visible, never scrolls away ── */}
                                <div className="flex-shrink-0 px-4 sm:px-10 py-4 sm:py-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-4">
                                    {isEducation ? (
                                        <div className="p-5 bg-slate-900 dark:bg-slate-800 rounded-2xl flex justify-between items-center shadow-xl">
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] font-black uppercase tracking-[.4em] text-slate-400">
                                                    Total Items Count
                                                </span>
                                                <h4 className="text-2xl font-black text-white tracking-tighter">
                                                    {cart.reduce((sum, c) => sum + c.quantity, 0)}
                                                </h4>
                                            </div>
                                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                                                <ShoppingCart className="w-6 h-6 text-white/50" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-5 bg-slate-900 dark:bg-slate-800 rounded-2xl flex justify-between items-center shadow-xl">
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] font-black uppercase tracking-[.4em] text-slate-400">
                                                    Net Liability
                                                </span>
                                                <h4 className="text-2xl font-black text-white tracking-tighter">KES {totalAmount?.toLocaleString()}</h4>
                                            </div>
                                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                                                <ShoppingCart className="w-6 h-6 text-white/50" />
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleCheckout}
                                        disabled={isProcessing}
                                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[12px] tracking-[0.4em] shadow-2xl hover:bg-indigo-500 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
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

