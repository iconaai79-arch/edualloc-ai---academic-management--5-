import React, { useState, useEffect } from 'react';
import type {
    User, Institution, AgrovetProduct, AgrovetBatch, AgrovetSale,
    AgrovetFarmer, AgrovetAnimal, AgrovetConsultation, AgrovetCreditNote,
    AgrovetUnitType, AgrovetPaymentMethod, AgrovetSaleStatus, AgrovetSaleItem
} from '../types';
import { apiService } from '../services/apiService';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { Cog8ToothIcon } from './icons/Cog8ToothIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { UserIcon } from './icons/UserIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { TrashIcon } from './icons/TrashIcon';
import { EyeIcon } from './icons/EyeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { ShoppingCartIcon } from './icons/ShoppingCartIcon';
import { TagIcon } from './icons/TagIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

interface AgrovetViewProps {
    currentUser: User;
    currentInstitution: Institution;
    users: User[];
    onDataChange: () => void;
}

export const AgrovetView: React.FC<AgrovetViewProps> = ({ currentUser, currentInstitution, users, onDataChange }) => {
    const institutionId = currentInstitution.id;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'farmers' | 'vet' | 'credit'>('dashboard');

    const [products, setProducts] = useState<AgrovetProduct[]>([]);
    const [batches, setBatches] = useState<AgrovetBatch[]>([]);
    const [sales, setSales] = useState<AgrovetSale[]>([]);
    const [farmers, setFarmers] = useState<AgrovetFarmer[]>([]);
    const [animals, setAnimals] = useState<AgrovetAnimal[]>([]);
    const [consultations, setConsultations] = useState<AgrovetConsultation[]>([]);
    const [credits, setCredits] = useState<AgrovetCreditNote[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination limits
    const [productLimit, setProductLimit] = useState(20);
    const [saleLimit, setSaleLimit] = useState(20);
    const [farmerLimit, setFarmerLimit] = useState(20);
    const [consultationLimit, setConsultationLimit] = useState(20);

    // POS State
    const [cart, setCart] = useState<{ product: AgrovetProduct; quantity: number; price: number }[]>([]);
    const [cartSearch, setCartSearch] = useState('');
    const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<AgrovetPaymentMethod>('cash');

    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [showFarmerModal, setShowFarmerModal] = useState(false);
    const [showConsultationModal, setShowConsultationModal] = useState(false);
    const [search, setSearch] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [prodList, batchList, saleList, farmerList, animalList, consultList, creditList] = await Promise.all([
                apiService.fetchModuleRecords<AgrovetProduct>('agrovet_products', institutionId, undefined, { limit: productLimit }),
                apiService.fetchModuleRecords<AgrovetBatch>('agrovet_batches', institutionId),
                apiService.fetchModuleRecords<AgrovetSale>('agrovet_sales', institutionId, undefined, { limit: saleLimit }),
                apiService.fetchModuleRecords<AgrovetFarmer>('agrovet_customers', institutionId, undefined, { limit: farmerLimit }),
                apiService.fetchModuleRecords<AgrovetAnimal>('agrovet_animals', institutionId),
                apiService.fetchModuleRecords<AgrovetConsultation>('agrovet_consultations', institutionId, undefined, { limit: consultationLimit }),
                apiService.fetchModuleRecords<AgrovetCreditNote>('agrovet_credit', institutionId),
            ]);
            setProducts(prodList || []);
            setBatches(batchList || []);
            setSales(saleList || []);
            setFarmers(farmerList || []);
            setAnimals(animalList || []);
            setConsultations(consultList || []);
            setCredits(creditList || []);
            onDataChange();
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [institutionId, productLimit, saleLimit, farmerLimit, consultationLimit]);

    // Derived Data
    const lowStock = products.filter(p => p.currentStock <= p.reorderLevel);
    const expiringSoon = batches.filter(b => {
        const exp = new Date(b.expiryDate);
        const today = new Date();
        const diff = (exp.getTime() - today.getTime()) / (1000 * 3600 * 24);
        return diff > 0 && diff < 30; // 30 days
    });
    const todaySales = sales.filter(s => s.createdAt.startsWith(new Date().toISOString().split('T')[0]));
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.amountPaid, 0);

    // POS Handlers
    const addToCart = (product: AgrovetProduct) => {
        const existing = cart.find(item => item.product.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { product, quantity: 1, price: 0 }]);
        }
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.product.id !== productId));
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const newSale: AgrovetSale = {
            id: `avs_${Date.now()}`,
            institutionId,
            customerId: selectedFarmerId || undefined,
            totalAmount,
            amountPaid: paymentMethod === 'credit' ? 0 : totalAmount,
            paymentMethod,
            status: paymentMethod === 'credit' ? 'pending' : 'completed',
            servedById: currentUser.id,
            servedByName: currentUser.name || 'Staff',
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('agrovet_sales', newSale);

            // Save sale items (Stock updated via DB trigger)
            for (const item of cart) {
                const saleItem: AgrovetSaleItem = {
                    id: `avi_${Date.now()}_${item.product.id}`,
                    saleId: newSale.id,
                    productId: item.product.id,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    totalPrice: item.price * item.quantity,
                    institutionId,
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('agrovet_sale_items', saleItem);
            }

            setCart([]);
            setSelectedFarmerId(null);
            setShowSaleModal(false);
            loadData();
            onDataChange();
            alert('Sale completed successfully! Stock updated.');
        } catch (e) {
            console.error(e);
            alert('Failed to complete sale');
        }
    };

    // MODALS / FORMS
    const [prodForm, setProdForm] = useState<Partial<AgrovetProduct>>({ category: 'Seeds', unitType: 'kg', reorderLevel: 10 });
    const [farmerForm, setFarmerForm] = useState<Partial<AgrovetFarmer>>({ loyaltyPoints: 0, creditLimit: 0 });
    const [vetForm, setVetForm] = useState<Partial<AgrovetConsultation>>({ fee: 0, isPaid: true, symptoms: '', diagnosis: '', prescription: '' });
    const [batchForm, setBatchForm] = useState<Partial<AgrovetBatch>>({ quantity: 0, costPrice: 0, sellingPrice: 0 });
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

    // MODALS / FORMS
    const handleSaveProduct = async () => {
        if (!prodForm.name) return;
        const newProd: AgrovetProduct = {
            id: `avp_${Date.now()}`,
            institutionId,
            name: prodForm.name!,
            description: prodForm.description,
            category: prodForm.category as any || 'Seeds',
            unitType: prodForm.unitType as any || 'kg',
            reorderLevel: prodForm.reorderLevel || 10,
            currentStock: 0
        };
        await apiService.saveModuleRecord('agrovet_products', newProd);
        setShowProductModal(false);
        loadData();
    };

    const handleSaveFarmer = async () => {
        if (!farmerForm.name || !farmerForm.phoneNumber) return;
        const newFarmer: AgrovetFarmer = {
            id: `avf_${Date.now()}`,
            institutionId,
            name: farmerForm.name!,
            phoneNumber: farmerForm.phoneNumber!,
            location: farmerForm.location,
            farmType: farmerForm.farmType,
            loyaltyPoints: 0,
            creditLimit: farmerForm.creditLimit || 0,
            createdAt: new Date().toISOString()
        };
        await apiService.saveModuleRecord('agrovet_customers', newFarmer);
        setShowFarmerModal(false);
        loadData();
    };

    const handleSaveConsultation = async () => {
        if (!vetForm.customerId || !vetForm.diagnosis) {
            alert("Please select a farmer and enter a diagnosis");
            return;
        }
        const newConsult: AgrovetConsultation = {
            id: `avc_${Date.now()}`,
            institutionId,
            customerId: vetForm.customerId!,
            animalId: vetForm.animalId,
            symptoms: vetForm.symptoms || '',
            diagnosis: vetForm.diagnosis!,
            prescription: vetForm.prescription || '',
            fee: vetForm.fee || 0,
            isPaid: vetForm.isPaid ?? true,
            vetId: currentUser.id,
            vetName: currentUser.name || 'Vet Staff',
            createdAt: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0]
        };
        try {
            await apiService.saveModuleRecord('agrovet_consultations', newConsult);
            setShowConsultationModal(false);
            setVetForm({ fee: 0, isPaid: true, symptoms: '', diagnosis: '', prescription: '' });
            loadData();
            alert('Consultation logged successfully!');
        } catch (e) {
            console.error(e);
            alert('Failed to save consultation');
        }
    };

    const handleAddBatch = async () => {
        if (!selectedProductId || !batchForm.batchNumber || !batchForm.expiryDate || !batchForm.quantity) return;

        const newBatch: AgrovetBatch = {
            id: `avb_${Date.now()}`,
            productId: selectedProductId,
            institutionId,
            batchNumber: batchForm.batchNumber!,
            expiryDate: batchForm.expiryDate!,
            quantity: batchForm.quantity!,
            costPrice: batchForm.costPrice || 0,
            sellingPrice: batchForm.sellingPrice || 0,
            receivedDate: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('agrovet_batches', newBatch);

            // Update product stock
            const product = products.find(p => p.id === selectedProductId);
            if (product) {
                await apiService.saveModuleRecord('agrovet_products', {
                    ...product,
                    currentStock: product.currentStock + batchForm.quantity!
                });
            }

            setShowBatchModal(false);
            setBatchForm({ quantity: 0 });
            setSelectedProductId(null);
            loadData();
            alert('Batch added and stock updated!');
        } catch (e) {
            console.error(e);
            alert('Failed to add batch');
        }
    };

    // UI RENDER
    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl invisible md:visible"></div>
                <div className="z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-600/20 rounded-xl">
                            <ArchiveBoxIcon className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                                {currentInstitution.name} <span className="text-emerald-500 text-sm not-italic ml-2">AGROVET HUB</span>
                            </h1>
                            <p className="text-emerald-500/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <SparklesIcon className="w-3 h-3" /> Retail • Farm Advisory • Veterinary
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 z-10">
                    <button onClick={() => setShowSaleModal(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-95 text-sm uppercase tracking-wider">
                        <ShoppingCartIcon className="w-5 h-5" /> New Sale
                    </button>
                    <button onClick={loadData} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10 shadow-sm">
                        <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="flex flex-wrap gap-2 p-1.5 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/5 shadow-inner">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: ChartPieIcon },
                    { id: 'pos', label: 'Sales & POS', icon: ShoppingCartIcon },
                    { id: 'inventory', label: 'Products', icon: ArchiveBoxIcon },
                    { id: 'farmers', label: 'Farmers', icon: UserGroupIcon },
                    { id: 'vet', label: 'Vet Services', icon: BeakerIcon },
                    { id: 'credit', label: 'Credit/Debt', icon: CurrencyIcon },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-300 ${activeTab === t.id
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            } text-sm uppercase tracking-wider`}
                    >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                    </button>
                ))}
            </nav>

            {/* Tab Content */}
            <main className="min-h-[500px]">
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Stats Cards */}
                        <div className="bg-emerald-900/30 p-6 rounded-2xl border border-emerald-500/20 shadow-lg group hover:border-emerald-500/40 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                                    <CurrencyIcon className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-black text-emerald-500/50 uppercase tracking-widest">Today</span>
                            </div>
                            <h3 className="text-3xl font-black text-white tracking-tighter italic">KES {todayRevenue?.toLocaleString()}</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase mt-2">Total Sales Revenue</p>
                        </div>

                        <div className="bg-amber-900/30 p-6 rounded-2xl border border-amber-500/20 shadow-lg group hover:border-amber-500/40 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
                                    <ExclamationTriangleIcon className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-black text-amber-500/50 uppercase tracking-widest">Alerts</span>
                            </div>
                            <h3 className="text-3xl font-black text-white tracking-tighter italic">{lowStock.length} Items</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase mt-2 text-amber-500">Below Reorder Level</p>
                        </div>

                        <div className="bg-red-900/30 p-6 rounded-2xl border border-red-500/20 shadow-lg group hover:border-red-500/40 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-red-500/20 rounded-xl text-red-400 group-hover:scale-110 transition-transform">
                                    <ClockIcon className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-black text-red-500/50 uppercase tracking-widest">Critical</span>
                            </div>
                            <h3 className="text-3xl font-black text-white tracking-tighter italic">{expiringSoon.length} Batches</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase mt-2 text-red-400">Expiring Within 30 Days</p>
                        </div>

                        <div className="bg-blue-900/30 p-6 rounded-2xl border border-blue-500/20 shadow-lg group hover:border-blue-500/40 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                                    <UserGroupIcon className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-black text-blue-500/50 uppercase tracking-widest">Active</span>
                            </div>
                            <h3 className="text-3xl font-black text-white tracking-tighter italic">{farmers.length}</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase mt-2">Registered Farmers</p>
                        </div>

                        {/* Recent Activity */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl overflow-hidden mt-4">
                            <h4 className="text-white font-black uppercase tracking-[0.2em] text-sm mb-6 flex items-center gap-3">
                                <ClockIcon className="w-4 h-4 text-emerald-400" /> Recent Sales Activity
                            </h4>
                            <div className="space-y-4">
                                {sales.length === 0 ? (
                                    <div className="text-center py-10">
                                        <ShoppingCartIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                        <p className="text-slate-500 uppercase text-xs font-bold tracking-widest">No sales recorded yet</p>
                                    </div>
                                ) : (
                                    sales.slice(-5).reverse().map(sale => (
                                        <div key={sale.id} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold italic group-hover:scale-110 transition-transform">
                                                    S
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm tracking-tight">Sale #{sale.id.slice(-6)}</p>
                                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                                        {new Date(sale.createdAt)?.toLocaleString()} • {sale.paymentMethod}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-emerald-400 font-black tracking-tighter italic">KES {sale.totalAmount?.toLocaleString()}</p>
                                                <p className={`text-[10px] font-black uppercase tracking-widest ${sale.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    {sale.status}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {sales.length >= saleLimit && (
                                <button 
                                    onClick={() => setSaleLimit(prev => prev + 20)}
                                    className="w-full mt-6 py-4 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-emerald-500/10"
                                >
                                    Sync More Activity
                                </button>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl mt-4">
                            <h4 className="text-white font-black uppercase tracking-[0.2em] text-sm mb-6 flex items-center gap-3">
                                <TagIcon className="w-4 h-4 text-emerald-400" /> Actions
                            </h4>
                            <div className="space-y-3">
                                <button onClick={() => { setActiveTab('inventory'); setShowProductModal(true); }} className="w-full p-4 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/20 rounded-xl text-left transition-all group">
                                    <p className="text-white font-bold text-sm group-hover:translate-x-1 transition-transform">Add Stock</p>
                                    <p className="text-emerald-400/60 text-[10px] font-black uppercase tracking-widest group-hover:text-white/80 transition-colors">Register new products</p>
                                </button>
                                <button onClick={() => { setActiveTab('farmers'); setShowFarmerModal(true); }} className="w-full p-4 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/20 rounded-xl text-left transition-all group">
                                    <p className="text-white font-bold text-sm group-hover:translate-x-1 transition-transform">New Farmer</p>
                                    <p className="text-blue-400/60 text-[10px] font-black uppercase tracking-widest group-hover:text-white/80 transition-colors">Register a new profile</p>
                                </button>
                                <button onClick={() => { setActiveTab('vet'); setShowConsultationModal(true); }} className="w-full p-4 bg-purple-600/20 hover:bg-purple-600 border border-purple-500/20 rounded-xl text-left transition-all group">
                                    <p className="text-white font-bold text-sm group-hover:translate-x-1 transition-transform">Vet Visit</p>
                                    <p className="text-purple-400/60 text-[10px] font-black uppercase tracking-widest group-hover:text-white/80 transition-colors">Log consultation</p>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'pos' && (
                    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Product Selection */}
                        <div className="flex-grow space-y-6">
                            <div className="relative group">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="SEARCH PRODUCTS FOR SALE..."
                                    value={cartSearch}
                                    onChange={(e) => setCartSearch(e.target.value.toUpperCase())}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600 shadow-xl"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 h-[calc(100vh-400px)] overflow-y-auto pr-2 custom-scrollbar">
                                {products.filter(p => !cartSearch || p.name.toUpperCase().includes(cartSearch)).map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="bg-white/5 p-4 rounded-2xl border border-white/10 text-left hover:bg-emerald-600/10 hover:border-emerald-500/30 transition-all group relative overflow-hidden active:scale-95"
                                    >
                                        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <PlusIcon className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-1">{product.category}</p>
                                        <h4 className="text-white font-bold mb-2 group-hover:text-emerald-400 transition-colors leading-tight">{product.name}</h4>
                                        <div className="flex items-center justify-between mt-auto">
                                            <p className="text-white font-black italic tracking-tighter">STOCK: {product.currentStock}</p>
                                            <span className="p-1.5 bg-white/10 rounded-lg text-emerald-400">
                                                <ShoppingCartIcon className="w-4 h-4" />
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cart Sidebar */}
                        <div className="w-full lg:w-[400px] bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden sticky top-6 h-[calc(100vh-250px)]">
                            <div className="p-6 border-b border-white/10 bg-white/5">
                                <h3 className="text-white font-black uppercase tracking-tighter flex items-center gap-3 italic">
                                    <ShoppingCartIcon className="w-6 h-6 text-emerald-400" /> Current Cart
                                </h3>
                            </div>

                            <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                                        <ArchiveBoxIcon className="w-16 h-16 mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest">Cart is empty</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.product.id} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-white font-bold text-sm leading-tight">{item.product.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{item.product.unitType}</p>
                                                </div>
                                                <button onClick={() => removeFromCart(item.product.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center bg-black/40 rounded-lg overflow-hidden border border-white/10">
                                                    <button onClick={() => setCart(cart.map(i => i.product.id === item.product.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="px-3 py-1 hover:bg-white/10 text-white font-bold">-</button>
                                                    <span className="px-4 text-white font-black italic">{item.quantity}</span>
                                                    <button onClick={() => setCart(cart.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i))} className="px-3 py-1 hover:bg-white/10 text-white font-bold">+</button>
                                                </div>
                                                <div className="flex-grow">
                                                    <input
                                                        type="number"
                                                        placeholder="PRICE"
                                                        value={item.price}
                                                        onChange={(e) => setCart(cart.map(i => i.product.id === item.product.id ? { ...i, price: parseFloat(e.target.value) || 0 } : i))}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg py-1 px-3 text-white font-bold text-right focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-6 bg-emerald-950/20 border-t border-white/10 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block italic">Select Farmer (Optional)</label>
                                    <select
                                        value={selectedFarmerId || ''}
                                        onChange={(e) => setSelectedFarmerId(e.target.value || null)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-white font-bold text-sm focus:outline-none"
                                    >
                                        <option value="">WALK-IN CUSTOMER</option>
                                        {farmers.map(f => (
                                            <option key={f.id} value={f.id}>{f.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-between items-center text-white border-b border-white/10 pb-2">
                                    <span className="text-xs font-black uppercase tracking-widest">Total Amount</span>
                                    <span className="text-2xl font-black italic tracking-tighter text-emerald-400">
                                        KES {cart.reduce((sum, i) => sum + (i.price * i.quantity), 0)?.toLocaleString()}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setPaymentMethod('cash')} className={`py-2 rounded-lg font-black text-[10px] uppercase tracking-widest border transition-all ${paymentMethod === 'cash' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'border-white/10 text-slate-400 hover:text-white'}`}>CASH</button>
                                    <button onClick={() => setPaymentMethod('mpesa')} className={`py-2 rounded-lg font-black text-[10px] uppercase tracking-widest border transition-all ${paymentMethod === 'mpesa' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'border-white/10 text-slate-400 hover:text-white'}`}>MPESA</button>
                                    <button onClick={() => setPaymentMethod('credit')} className={`py-2 rounded-lg font-black text-[10px] uppercase tracking-widest border transition-all ${paymentMethod === 'credit' ? 'bg-amber-600 border-amber-500 text-white shadow-lg' : 'border-white/10 text-slate-400 hover:text-white col-span-2'}`}>CREDIT (DEBT)</button>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    disabled={cart.length === 0}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-900/40 hover:scale-[1.02] active:scale-95 italic text-sm"
                                >
                                    Complete Checkout
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="relative w-full max-w-md group">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="SEARCH PRODUCTS..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value.toUpperCase())}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                                />
                            </div>
                            <button onClick={() => setShowProductModal(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg text-sm uppercase">
                                <PlusIcon className="w-5 h-5" /> Add Product
                            </button>
                        </div>

                        <div className="bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Product Name</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Category</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Stock Level</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Inventory Health</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.filter(p => !search || p.name.toUpperCase().includes(search)).map(product => (
                                        <tr key={product.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-5">
                                                <p className="text-white font-bold">{product.name}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{product.unitType}</p>
                                            </td>
                                            <td className="p-5">
                                                <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest border border-white/5 shadow-sm">
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="p-5 text-white font-black italic tracking-tighter">
                                                {product.currentStock} {product.unitType}
                                            </td>
                                            <td className="p-5">
                                                {product.currentStock <= product.reorderLevel ? (
                                                    <span className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                                        <ExclamationTriangleIcon className="w-4 h-4" /> LOW STOCK
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest opacity-60">
                                                        <CheckCircleIcon className="w-4 h-4" /> HEALTHY
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600 hover:text-white transition-all">
                                                        <PlusIcon className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-2 bg-white/5 text-slate-400 rounded-lg hover:bg-white/10 hover:text-white transition-all">
                                                        <EyeIcon className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={async () => { if (confirm('Delete?')) { await apiService.deleteModuleRecord('agrovet_products', product.id); loadData(); } }} className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {products.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center opacity-30 italic font-bold text-slate-600 uppercase tracking-widest">
                                                No products registered in the hub.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {products.length >= productLimit && (
                            <div className="mt-8 flex justify-center">
                                <button 
                                    onClick={() => setProductLimit(prev => prev + 20)}
                                    className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <ArrowPathIcon className="w-4 h-4" /> Sync More Products
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'farmers' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="relative w-full max-w-md group">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="SEARCH FARMERS..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value.toUpperCase())}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                                />
                            </div>
                            <button onClick={() => setShowFarmerModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg text-sm uppercase">
                                <PlusIcon className="w-5 h-5" /> Register Farmer
                            </button>
                        </div>

                        <div className="bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Farmer Details</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Location & Farm</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Credit Limit</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Loyalty</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {farmers.filter(f => !search || f.name.toUpperCase().includes(search) || f.phoneNumber.includes(search)).map(farmer => (
                                        <tr key={farmer.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold italic">
                                                        {farmer.name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold">{farmer.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold">{farmer.phoneNumber}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-white text-sm font-bold">{farmer.location || 'N/A'}</p>
                                                <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">{farmer.farmType || 'General'}</p>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-white font-black italic tracking-tighter">KES {farmer.creditLimit?.toLocaleString()}</p>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-2">
                                                    <SparklesIcon className="w-4 h-4 text-amber-400" />
                                                    <span className="text-white font-bold">{farmer.loyaltyPoints} PTS</span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                                                        <EyeIcon className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={async () => { if (confirm('Delete?')) { await apiService.deleteModuleRecord('agrovet_customers', farmer.id); loadData(); } }} className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {farmers.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center opacity-30 italic font-bold text-slate-600 uppercase tracking-widest">
                                                NR registered farmers found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'vet' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="relative w-full max-w-md group">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="SEARCH CONSULTATIONS..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value.toUpperCase())}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                                />
                            </div>
                            <button onClick={() => setShowConsultationModal(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg text-sm uppercase">
                                <PlusIcon className="w-5 h-5" /> Log Consultation
                            </button>
                        </div>

                        <div className="bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Date & Farmer</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Diagnosis</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Prescription</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Fee</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consultations.filter(c => !search || c.diagnosis?.toUpperCase().includes(search)).map(consult => (
                                        <tr key={consult.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-5">
                                                <p className="text-white font-bold">{new Date(consult.createdAt).toLocaleDateString()}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">{farmers.find(f => f.id === consult.customerId)?.name || 'Unknown'}</p>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-white text-sm italic">{consult.diagnosis}</p>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest">{consult.prescription || 'N/A'}</p>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-purple-400 font-black italic tracking-tighter">KES {consult.fee?.toLocaleString()}</p>
                                            </td>
                                            <td className="p-5 text-right">
                                                <button className="p-2 bg-white/5 text-slate-400 rounded-lg hover:bg-white/10 hover:text-white transition-all">
                                                    <EyeIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {consultations.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center opacity-30 italic font-bold text-slate-600 uppercase tracking-widest">
                                                No consultations recorded.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {consultations.length >= consultationLimit && (
                            <div className="mt-8 flex justify-center">
                                <button 
                                    onClick={() => setConsultationLimit(prev => prev + 20)}
                                    className="px-10 py-4 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <ArrowPathIcon className="w-4 h-4" /> Sync More Consultations
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'credit' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-amber-900/20 p-6 rounded-2xl border border-amber-500/20 shadow-lg">
                                <h4 className="text-amber-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Outstanding</h4>
                                <p className="text-3xl font-black text-white italic tracking-tighter">KES {credits.reduce((sum, c) => sum + (c.amount - c.amountPaid), 0)?.toLocaleString()}</p>
                            </div>
                            <div className="bg-emerald-900/20 p-6 rounded-2xl border border-emerald-500/20 shadow-lg">
                                <h4 className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Repayments</h4>
                                <p className="text-3xl font-black text-white italic tracking-tighter">KES {credits.reduce((sum, c) => sum + c.amountPaid, 0)?.toLocaleString()}</p>
                            </div>
                            <div className="bg-blue-900/20 p-6 rounded-2xl border border-blue-500/20 shadow-lg">
                                <h4 className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-2">Active Accounts</h4>
                                <p className="text-3xl font-black text-white italic tracking-tighter">{credits.length} Farmers</p>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Farmer</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Limit</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Outstanding</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Status</th>
                                        <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {credits.map(credit => (
                                        <tr key={credit.id} className="border-b border-white/5">
                                            <td className="p-5">
                                                <p className="text-white font-bold">{farmers.find(f => f.id === credit.customerId)?.name || 'Unknown'}</p>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-slate-400 font-bold">KES {credit.limit?.toLocaleString()}</p>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-amber-400 font-black italic">KES {(credit.amount - credit.amountPaid)?.toLocaleString()}</p>
                                            </td>
                                            <td className="p-5">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${credit.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {credit.status}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right">
                                                <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all">
                                                    Repay
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {credits.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center opacity-30 italic font-bold text-slate-600 uppercase tracking-widest">
                                                No active credit accounts.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Modals (Product) */}
            {showProductModal && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in zoom-in duration-300">
                    <div className="bg-slate-800 border-2 border-emerald-600/50 w-full max-w-lg rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-hidden">
                        <div className="bg-emerald-600/10 p-6 flex items-center justify-between border-b border-emerald-600/20">
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
                                <ArchiveBoxIcon className="w-6 h-6 text-emerald-400" /> New Product Registry
                            </h2>
                            <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 italic">Product Name</label>
                                <input
                                    type="text"
                                    value={prodForm.name || ''}
                                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value.toUpperCase() })}
                                    className="w-full bg-slate-900/50 border border-emerald-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all uppercase placeholder:opacity-20"
                                    placeholder="E.G. DAP FERTILIZER"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 italic">Category</label>
                                    <select
                                        value={prodForm.category}
                                        onChange={(e) => setProdForm({ ...prodForm, category: e.target.value as any })}
                                        className="w-full bg-slate-900/50 border border-emerald-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                    >
                                        {['Seeds', 'Fertilizers', 'Chemicals', 'Animal Health', 'Equipment', 'Other'].map(c => (
                                            <option key={c} value={c}>{c.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 italic">Unit Type</label>
                                    <select
                                        value={prodForm.unitType}
                                        onChange={(e) => setProdForm({ ...prodForm, unitType: e.target.value as any })}
                                        className="w-full bg-slate-900/50 border border-emerald-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                    >
                                        {['kg', 'packet', 'litres', 'grams', 'bottle', 'bag', 'dozen'].map(u => (
                                            <option key={u} value={u}>{u.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 italic">Reorder Level (Alert)</label>
                                <input
                                    type="number"
                                    value={prodForm.reorderLevel}
                                    onChange={(e) => setProdForm({ ...prodForm, reorderLevel: parseInt(e.target.value) })}
                                    className="w-full bg-slate-900/50 border border-emerald-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-serif"
                                />
                            </div>
                            <button
                                onClick={handleSaveProduct}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-900/40 hover:scale-[1.01] active:scale-95 mt-4 italic"
                            >
                                Register {prodForm.name ? prodForm.name : 'Product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals (Farmer) */}
            {showFarmerModal && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in zoom-in duration-300">
                    <div className="bg-slate-800 border-2 border-blue-600/50 w-full max-w-lg rounded-3xl shadow-[0_0_50px_rgba(37,99,235,0.2)] overflow-hidden">
                        <div className="bg-blue-600/10 p-6 flex items-center justify-between border-b border-blue-600/20">
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
                                <UserIcon className="w-6 h-6 text-blue-400" /> Farmer Registration
                            </h2>
                            <button onClick={() => setShowFarmerModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2 italic">Full Name</label>
                                <input
                                    type="text"
                                    value={farmerForm.name || ''}
                                    onChange={(e) => setFarmerForm({ ...farmerForm, name: e.target.value.toUpperCase() })}
                                    className="w-full bg-slate-900/50 border border-blue-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2 italic">Phone Number</label>
                                <input
                                    type="text"
                                    value={farmerForm.phoneNumber || ''}
                                    onChange={(e) => setFarmerForm({ ...farmerForm, phoneNumber: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-blue-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2 italic">Location</label>
                                    <input
                                        type="text"
                                        value={farmerForm.location || ''}
                                        onChange={(e) => setFarmerForm({ ...farmerForm, location: e.target.value.toUpperCase() })}
                                        className="w-full bg-slate-900/50 border border-blue-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2 italic">Farm Type</label>
                                    <input
                                        type="text"
                                        value={farmerForm.farmType || ''}
                                        onChange={(e) => setFarmerForm({ ...farmerForm, farmType: e.target.value.toUpperCase() })}
                                        className="w-full bg-slate-900/50 border border-blue-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase"
                                        placeholder="E.G. DAIRY"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2 italic">Credit Limit (KES)</label>
                                <input
                                    type="number"
                                    value={farmerForm.creditLimit}
                                    onChange={(e) => setFarmerForm({ ...farmerForm, creditLimit: parseInt(e.target.value) })}
                                    className="w-full bg-slate-900/50 border border-blue-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                            <button
                                onClick={handleSaveFarmer}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/40 hover:scale-[1.01] active:scale-95 mt-4 italic"
                            >
                                Register Farmer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals (Vet consultation - simplified) */}
            {showConsultationModal && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in zoom-in duration-300">
                    <div className="bg-slate-800 border-2 border-purple-600/50 w-full max-w-lg rounded-3xl shadow-[0_0_50px_rgba(147,51,234,0.2)] overflow-hidden">
                        <div className="bg-purple-600/10 p-6 flex items-center justify-between border-b border-purple-600/20">
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
                                <BeakerIcon className="w-6 h-6 text-purple-400" /> Vet Consultation Log
                            </h2>
                            <button onClick={() => setShowConsultationModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-2 italic">Select Farmer</label>
                                <select
                                    value={vetForm.customerId || ''}
                                    onChange={(e) => setVetForm({ ...vetForm, customerId: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-purple-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                >
                                    <option value="">-- SELECT FARMER --</option>
                                    {farmers.map(f => (
                                        <option key={f.id} value={f.id}>{f.name.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-2 italic">Symptoms</label>
                                <textarea
                                    value={vetForm.symptoms}
                                    onChange={(e) => setVetForm({ ...vetForm, symptoms: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-purple-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 h-20"
                                    placeholder="DESCRIBE SYMPTOMS..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-2 italic">Diagnosis</label>
                                    <input
                                        type="text"
                                        value={vetForm.diagnosis}
                                        onChange={(e) => setVetForm({ ...vetForm, diagnosis: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-purple-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                        placeholder="ENTER DIAGNOSIS"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-2 italic">Consultation Fee</label>
                                    <input
                                        type="number"
                                        value={vetForm.fee}
                                        onChange={(e) => setVetForm({ ...vetForm, fee: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-slate-900/50 border border-purple-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-serif"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-2 italic">Prescription / Recommendations</label>
                                <textarea
                                    value={vetForm.prescription}
                                    onChange={(e) => setVetForm({ ...vetForm, prescription: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-purple-600/20 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 h-24"
                                    placeholder="DRUGS, DOSAGE, OR ADVICE..."
                                />
                            </div>
                            <div className="flex items-center gap-3 py-2">
                                <input
                                    type="checkbox"
                                    id="isPaid"
                                    checked={vetForm.isPaid}
                                    onChange={(e) => setVetForm({ ...vetForm, isPaid: e.target.checked })}
                                    className="w-5 h-5 accent-purple-600"
                                />
                                <label htmlFor="isPaid" className="text-xs font-black text-white uppercase tracking-widest">Mark as Paid</label>
                            </div>
                            <button
                                onClick={handleSaveConsultation}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl shadow-purple-900/40 hover:scale-[1.01] active:scale-95 mt-4 italic"
                            >
                                Save Consultation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

