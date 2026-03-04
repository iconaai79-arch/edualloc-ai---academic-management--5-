import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RetailInventoryItem, RetailStore, User } from '../../types';
import { Search, ShoppingCart, User as UserIcon, MapPin, Calculator, DollarSign, Tag, HandCoins, AlertCircle, Plus, Store } from 'lucide-react';

interface DualModePOSProps {
    institutionId: string;
    currentUser: User;
}

export function DualModePOS({ institutionId, currentUser }: DualModePOSProps) {
    const [activeMode, setActiveMode] = useState<'shop' | 'field'>('shop');
    const [activeStore, setActiveStore] = useState<RetailStore | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Cart state
    const [cart, setCart] = useState<{ item: any, quantity: number, finalPrice: number }[]>([]);

    // Selected item for pricing negotiation
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [negotiatedPrice, setNegotiatedPrice] = useState<string>('');

    // Mock products
    const [products] = useState([
        {
            id: 'prod-1',
            name: 'iPhone 15 Pro Max',
            category: 'Smartphones',
            basePrice: 1050,
            srpPrice: 1200,
            unit: 'pc',
            availableStock: 5,
            isSerialized: true
        },
        {
            id: 'prod-2',
            name: 'HP LaserJet Pro M404n',
            category: 'Printers',
            basePrice: 220,
            srpPrice: 280,
            unit: 'pc',
            availableStock: 12,
            isSerialized: true
        },
        {
            id: 'prod-3',
            name: 'Original HP 59A Toner',
            category: 'Accessories',
            basePrice: 85,
            srpPrice: 110,
            unit: 'pc',
            availableStock: 45,
            isSerialized: false
        }
    ]);

    // Determine available modes based on user role (Mock Logic)
    useEffect(() => {
        // If user is a field agent, default to field mode
        if (currentUser.role.includes('agent') || currentUser.role === 'field_agent') {
            setActiveMode('field');
        }
    }, [currentUser]);

    const addToCart = () => {
        if (!selectedItem) return;

        const numPrice = parseFloat(negotiatedPrice);
        if (isNaN(numPrice)) {
            alert('Please enter a valid price.');
            return;
        }

        if (numPrice < selectedItem.basePrice) {
            alert(`Price cannot be below the Base Price of $${selectedItem.basePrice}`);
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
    const totalCommission = cart.reduce((sum, cartItem) => sum + ((cartItem.finalPrice - cartItem.item.basePrice) * cartItem.quantity), 0);

    return (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[600px]">

            {/* Left Column: Products & Mode Selection */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                {/* Header & Mode Switcher */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveMode('shop')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeMode === 'shop'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <Store className="w-4 h-4" />
                            In-Shop POS
                        </button>
                        <button
                            onClick={() => setActiveMode('field')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeMode === 'field'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <MapPin className="w-4 h-4" />
                            Field Sales (Van Stock)
                        </button>
                    </div>

                    <button className="text-sm font-medium text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        Capture Lead
                    </button>
                </div>

                {/* Search & Filter */}
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={activeMode === 'shop' ? "Search Main Store Inventory..." : "Search Your Van Stock..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map(product => (
                            <div
                                key={product.id}
                                onClick={() => {
                                    setSelectedItem(product);
                                    setNegotiatedPrice(product.srpPrice.toString());
                                }}
                                className={`bg-white p-4 rounded-xl border ${selectedItem?.id === product.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' : 'border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md'} cursor-pointer transition-all flex flex-col justify-between`}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">{product.category}</span>
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{product.availableStock} in stock</span>
                                    </div>
                                    <h3 className="font-semibold text-slate-800 line-clamp-2 leading-tight">{product.name}</h3>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <p className="text-2xl font-bold text-blue-600">${product.srpPrice}</p>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                        <Tag className="w-3 h-3" /> Base: ${product.basePrice}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Cart & Pricing */}
            <div className="w-full md:w-96 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                {/* Dynamic Pricing Engine Modal (Inlined for layout) */}
                {selectedItem ? (
                    <div className="p-6 border-b border-emerald-100 bg-emerald-50/30">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-slate-800 text-lg">Negotiate Price</h3>
                            <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>

                        <p className="text-sm font-medium text-slate-700 mb-4">{selectedItem.name}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Selling Price (SRP: ${selectedItem.srpPrice})</label>
                                <div className="relative">
                                    <DollarSign className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="number"
                                        value={negotiatedPrice}
                                        onChange={(e) => setNegotiatedPrice(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 text-lg font-bold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Real-time Commission Preview */}
                            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-emerald-100">
                                <div className="flex items-center gap-2 text-emerald-700">
                                    <HandCoins className="w-4 h-4" />
                                    <span className="text-sm font-medium">Your Commission:</span>
                                </div>
                                <span className="text-lg font-bold text-emerald-600">
                                    ${Math.max(0, parseFloat(negotiatedPrice || '0') - selectedItem.basePrice).toFixed(2)}
                                </span>
                            </div>

                            {parseFloat(negotiatedPrice) < selectedItem.basePrice && (
                                <div className="flex gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <p>Cannot sell below the Base Price of ${selectedItem.basePrice}. Manager override required.</p>
                                </div>
                            )}

                            <button
                                onClick={addToCart}
                                disabled={parseFloat(negotiatedPrice) < selectedItem.basePrice}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Add to Cart
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2 text-slate-700">
                        <ShoppingCart className="w-5 h-5" />
                        <h3 className="font-bold text-lg">Current Sale</h3>
                    </div>
                )}

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                            <p>Select a product to start sale</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map((cartItem, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-white shadow-sm">
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-800 text-sm truncate">{cartItem.item.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-500">${cartItem.finalPrice} x {cartItem.quantity}</span>
                                            {cartItem.item.isSerialized && (
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase font-mono">Select Serial</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-slate-800">${cartItem.finalPrice * cartItem.quantity}</span>
                                        <button onClick={() => removeFromCart(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Checkout Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-500 font-medium text-sm">Sale Mode</span>
                        <span className="text-slate-800 font-bold text-sm uppercase px-2 py-1 bg-white rounded border border-slate-200">
                            {activeMode === 'shop' ? 'Shop Stock' : 'Van Stock'}
                        </span>
                    </div>

                    <div className="flex justify-between items-center mb-6 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                        <span className="font-semibold text-sm flex items-center gap-2"><HandCoins className="w-4 h-4" /> Estimated Commission</span>
                        <span className="font-bold">${totalCommission.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center mb-6">
                        <span className="text-slate-800 font-bold text-xl">Total due</span>
                        <span className="text-blue-600 font-black text-3xl">${totalAmount.toFixed(2)}</span>
                    </div>

                    <button
                        disabled={cart.length === 0}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Calculator className="w-5 h-5" />
                        Complete Checkout
                    </button>
                </div>
            </div>
        </div>
    );
}

// Inline missing icon
const Target = ({ className }: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
const X = ({ className }: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
