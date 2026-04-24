
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Palmtree, 
    Hotel, 
    Plane, 
    Calendar, 
    Users, 
    Star, 
    MapPin, 
    Compass, 
    CheckCircle, 
    ArrowRight, 
    X,
    Phone,
    Mail,
    Globe,
    Search,
    Wifi,
    Coffee,
    Utensils,
    Camera,
    ShieldCheck,
    Clock,
    ChefHat,
    ShoppingBag,
    UtensilsCrossed,
    Sparkles,
    Car,
    Plus
} from 'lucide-react';
import { Institution, HospitalityMenuItem, HospitalityOrder, HospitalityVehicle, HospitalityDriveBooking } from '../../types';
import { apiService } from '../../services/apiService';
import { getGoogleDriveDirectUrl } from '../../utils/googleDriveUtils';

interface HospitalityStorefrontProps {
    institutionId: string;
}

// Centralized getGoogleDriveDirectUrl used instead

interface HospitalityItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: 'Safari' | 'Room' | 'Trip' | 'Experience';
    images: string[];
    features: string[];
    duration?: string;
    location: string;
    rating: number;
    reviews: number;
    available?: boolean;
}

interface CartItem extends HospitalityMenuItem {
    qty: number;
}

export const HospitalityStorefront: React.FC<HospitalityStorefrontProps> = ({ institutionId }) => {
    const [tenant, setTenant] = useState<Institution | null>(null);
    const [items, setItems] = useState<HospitalityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<HospitalityItem | null>(null);
    const [bookingStep, setBookingStep] = useState<'details' | 'confirm' | 'success'>('details');
    const [bookingData, setBookingData] = useState({
        name: '',
        email: '',
        phone: '',
        date: '',
        guests: 1,
        notes: ''
    });

    const [isDiningMode, setIsDiningMode] = useState(false);
    const [isExcursionMode, setIsExcursionMode] = useState(false);
    const [menuItems, setMenuItems] = useState<HospitalityMenuItem[]>([]);
    const [vehicles, setVehicles] = useState<HospitalityVehicle[]>([]);
    const [cart, setCart] = useState<(HospitalityMenuItem & { qty: number })[]>([]);
    const [roomNumber, setRoomNumber] = useState('');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    useEffect(() => {
        const loadStore = async () => {
            setLoading(true);
            try {
                // Fetch Tenant
                let resolvedTenant: Institution | null = null;
                const insts = await apiService.fetchModuleRecords<Institution>('institutions');
                resolvedTenant = insts.find(i => i.id === institutionId || i.slug === institutionId) || null;

                if (resolvedTenant) {
                    setTenant(resolvedTenant);
                    document.title = `${resolvedTenant.name} | Book Online`;

                    const [itemRecords, menuRecords, vehicleRecords] = await Promise.all([
                        apiService.fetchModuleRecords<HospitalityItem>('hospitality_items', resolvedTenant.id),
                        apiService.fetchModuleRecords<HospitalityMenuItem>('hospitality_menu_items', resolvedTenant.id),
                        apiService.fetchModuleRecords<HospitalityVehicle>('hospitality_vehicles', resolvedTenant.id)
                    ]);
                    setItems(itemRecords);
                    setMenuItems(menuRecords.filter(i => i.isAvailable));
                    setVehicles(vehicleRecords);
                }
            } catch (err) {
                console.error("Storefront Load Error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadStore();
    }, [institutionId]);

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        setBookingStep('confirm');
        // Simulate API call
        setTimeout(() => setBookingStep('success'), 1500);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading your gateway...</p>
                </div>
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                    <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Destination Not Found</h1>
                    <p className="text-slate-500 mt-2 text-sm font-medium">This hospitality gateway does not exist or has been relocated.</p>
                </div>
            </div>
        );
    }

    const themeColor = tenant.themeColor || '#4f46e5';

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                        {tenant.logoUrl ? (
                            <img src={getGoogleDriveDirectUrl(tenant.logoUrl)} alt={tenant.name} className="h-8 md:h-10 w-auto object-contain flex-shrink-0" />
                        ) : (
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm md:text-xl shadow-lg flex-shrink-0">
                                {tenant.name.charAt(0)}
                            </div>
                        )}
                        <h1 className="text-sm md:text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white truncate max-w-[120px] md:max-w-[200px]">
                            {tenant.name}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => {
                                setIsDiningMode(!isDiningMode);
                                setIsExcursionMode(false);
                            }}
                            className={`flex items-center gap-2 px-3 md:px-5 py-2.5 rounded-full font-black uppercase text-[8px] md:text-[10px] tracking-widest transition-all shadow-xl ${isDiningMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                            <Utensils className="w-3.5 h-3.5 md:w-4 h-4" /> <span className="hidden sm:inline">Order Food</span>
                        </button>
                        <button 
                            onClick={() => {
                                setIsExcursionMode(!isExcursionMode);
                                setIsDiningMode(false);
                            }}
                            className={`flex items-center gap-2 px-3 md:px-5 py-2.5 rounded-full font-black uppercase text-[8px] md:text-[10px] tracking-widest transition-all shadow-xl ${isExcursionMode ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                            <Compass className="w-3.5 h-3.5 md:w-4 h-4" /> <span className="hidden sm:inline">Book Drive</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <div className="pt-32 pb-20 px-6 relative">
                <div className="absolute top-0 left-0 right-0 h-[60vh] bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-indigo-950/20 -z-10" />
                <div className="max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/10 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                        <Compass className="w-4 h-4" /> Discover Your Next Adventure
                    </div>
                    <h2 className="text-3xl md:text-5xl lg:text-7xl font-black uppercase tracking-tighter text-slate-800 dark:text-white leading-none mb-8 px-4">
                        {isDiningMode ? (
                            <>Exquisite <span className="text-indigo-600 italic">Flavors</span> <br className="hidden sm:block" /> Delivered to Your Room</>
                        ) : (
                            <>Experience <span className="text-indigo-600 italic">Excellence</span> <br className="hidden sm:block" /> In Every Journey</>
                        )}
                    </h2>
                    
                    {/* Search Bar */}
                    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-3 rounded-[2.5rem] shadow-2xl shadow-indigo-100 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-2">
                        <div className="flex-1 flex items-center gap-3 px-6 py-4 md:py-3 border-b md:border-b-0 md:border-r border-slate-50 dark:border-slate-800 w-full">
                            <MapPin className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                            <div className="text-left">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Location</p>
                                <p className="text-xs font-bold text-slate-800 dark:text-white">Where are you going?</p>
                            </div>
                        </div>
                        <div className="flex-1 flex items-center gap-3 px-6 py-3 border-r border-slate-50 dark:border-slate-800">
                            <Calendar className="w-5 h-5 text-indigo-600" />
                            <div className="text-left">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Date</p>
                                <p className="text-xs font-bold text-slate-800 dark:text-white">When are you traveling?</p>
                            </div>
                        </div>
                        <button className="w-full md:w-auto px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group">
                            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" /> Explore Now
                        </button>
                    </div>
                </div>
            </div>

            {/* Featured Section */}
            <div className="max-w-7xl mx-auto px-6 py-20">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Featured Selections</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Explore our most popular {tenant.category?.includes('Agency') ? 'Safari Packages' : 'Room Categories'}</p>
                    </div>
                    <div className="flex gap-2 bg-slate-50 dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800">
                        {['All', 'Premium', 'Standard', 'Adventure'].map(f => (
                            <button key={f} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${f === 'All' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{f}</button>
                        ))}
                    </div>
                </div>

                {!isDiningMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {items.map(item => (
                            <div key={item.id} className="group bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer" onClick={() => setSelectedItem(item)}>
                                {/* Image Placeholder */}
                                <div className="h-64 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                                    <div className="absolute top-6 left-6 z-10">
                                        <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-indigo-600 shadow-sm">
                                            {item.category}
                                        </span>
                                    </div>
                                    <div className="absolute top-6 right-6 z-10 flex items-center gap-1 bg-slate-900/60 backdrop-blur px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white">
                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {item.rating}
                                    </div>
                                    
                                    {item.images && item.images.length > 0 ? (
                                        <img 
                                            src={getGoogleDriveDirectUrl(item.images[0])} 
                                            alt={item.name} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement?.classList.add('flex', 'items-center', 'justify-center', 'text-slate-200');
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-200 group-hover:scale-110 transition-transform duration-700">
                                            {item.category === 'Safari' ? <Compass className="w-16 h-16" /> : <Hotel className="w-16 h-16" />}
                                        </div>
                                    )}
                                    <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-white z-10 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                                            <MapPin className="w-4 h-4" /> {item.location.split(',')[0]}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                                            <Clock className="w-4 h-4" /> {item.duration || 'Daily'}
                                        </div>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/60 to-transparent"></div>
                                </div>

                                <div className="p-8">
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white mb-2 leading-none">{item.name}</h4>
                                    <p className="text-xs text-slate-500 line-clamp-2 mb-6 h-8">{item.description}</p>
                                    
                                    <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Starting From</p>
                                            <p className="text-2xl font-black text-slate-800 dark:text-white italic tracking-tighter">
                                                <span className="text-xs font-bold not-italic mr-1">KES</span>
                                                {(item.price/1000).toFixed(0)}K
                                            </p>
                                        </div>
                                        <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-slate-900 transition-all active:scale-95">
                                            Book Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-12 animate-fade-in">
                        <div className="flex-1 space-y-12">
                            {['Breakfast', 'Main Course', 'Dessert', 'Drinks'].map(cat => {
                                const catItems = menuItems.filter(i => i.category === cat);
                                if (catItems.length === 0) return null;
                                return (
                                    <div key={cat}>
                                        <h4 className="text-xl font-black uppercase tracking-widest text-slate-800 dark:text-white mb-6 border-l-4 border-indigo-600 pl-4">{cat}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {catItems.map(dish => (
                                                <div key={dish.id} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-transparent hover:border-indigo-100 transition-all group">
                                                    <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm flex-shrink-0">
                                                        {dish.imageUrl ? (
                                                            <img src={getGoogleDriveDirectUrl(dish.imageUrl)} alt={dish.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                                <ChefHat className="w-8 h-8" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 flex flex-col justify-between">
                                                        <div>
                                                            <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">{dish.name}</h5>
                                                            <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{dish.description}</p>
                                                        </div>
                                                        <div className="flex justify-between items-center mt-2">
                                                            <p className="font-black text-indigo-600 text-sm">KES {dish.basePrice}</p>
                                                            <button 
                                                                onClick={() => {
                                                                    const existing = cart.find(c => c.id === dish.id);
                                                                    if (existing) {
                                                                        setCart(cart.map(c => c.id === dish.id ? { ...c, qty: c.qty + 1 } : c));
                                                                    } else {
                                                                        setCart([...cart, { ...dish, qty: 1 }]);
                                                                    }
                                                                }}
                                                                className="p-2 bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm transition-all active:scale-90"
                                                            >
                                                                <Plus className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Dining Cart */}
                        <div className="w-full lg:w-96 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-8 shadow-xl h-fit sticky top-24">
                            <h4 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <ShoppingBag className="w-6 h-6 text-indigo-600" />
                                Your Order
                            </h4>
                            
                            {cart.length === 0 ? (
                                <div className="py-12 text-center space-y-4">
                                    <UtensilsCrossed className="w-12 h-12 text-slate-200 mx-auto" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Hungry? Add something from the menu!</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="max-h-64 overflow-y-auto space-y-4 pr-2">
                                        {cart.map(item => (
                                            <div key={item.id} className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase">{item.qty}x {item.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">KES {item.basePrice * item.qty}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => {
                                                        if (item.qty > 1) setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty - 1 } : c));
                                                        else setCart(cart.filter(c => c.id !== item.id));
                                                    }} className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500">-</button>
                                                    <button onClick={() => setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c))} className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600">+</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                        <div className="flex justify-between items-center text-sm font-black text-slate-800 dark:text-white uppercase">
                                            <span>Total Amount</span>
                                            <span className="text-indigo-600">KES {cart.reduce((s, i) => s + (i.basePrice * i.qty), 0)}</span>
                                        </div>
                                        
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Room Number</label>
                                            <input 
                                                type="text" 
                                                value={roomNumber}
                                                onChange={e => setRoomNumber(e.target.value)}
                                                placeholder="e.g. 204"
                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-black text-sm outline-none focus:ring-2 ring-indigo-500/50" 
                                            />
                                        </div>

                                        <button 
                                            onClick={async () => {
                                                if (!roomNumber) return alert('Please enter your room number.');
                                                setIsPlacingOrder(true);
                                                const order: Partial<HospitalityOrder> = {
                                                    id: `hord_${Date.now()}`,
                                                    institutionId: tenant.id,
                                                    roomNumber,
                                                    items: cart.map(i => ({
                                                        itemId: i.id,
                                                        name: i.name,
                                                        quantity: i.qty,
                                                        unitPrice: i.basePrice,
                                                        kitchenStatus: 'pending'
                                                    })),
                                                    totalAmount: cart.reduce((s, i) => s + (i.basePrice * i.qty), 0),
                                                    status: 'pending',
                                                    createdAt: new Date().toISOString()
                                                };
                                                await apiService.saveModuleRecord('hospitality_orders', order);
                                                setIsPlacingOrder(false);
                                                setCart([]);
                                                setRoomNumber('');
                                                alert('Your order has been sent to the kitchen! We will deliver it shortly.');
                                            }}
                                            disabled={isPlacingOrder || !roomNumber || cart.length === 0}
                                            className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-indigo-100 hover:bg-slate-900 transition-all disabled:opacity-50"
                                        >
                                            {isPlacingOrder ? 'Sending...' : 'Place Order'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {isExcursionMode && (
                    <div className="animate-fade-in space-y-12">
                        <div className="max-w-3xl mx-auto text-center">
                            <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Adventure Awaits</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Select a vehicle and reserve your game drive slot</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {vehicles.map(veh => (
                                <div key={veh.id} className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm hover:shadow-2xl transition-all group">
                                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <Car className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white mb-2">{veh.type}</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Capacity: {veh.capacity} People • {veh.plateNumber}</p>
                                    
                                    <div className="space-y-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                                        <div className="grid grid-cols-2 gap-2">
                                            {['06:30 AM', '04:00 PM', '08:00 PM'].map(slot => (
                                                <button 
                                                    key={slot}
                                                    onClick={async () => {
                                                        const room = prompt("Please enter your Room Number:");
                                                        if (!room) return;
                                                        const booking: Partial<HospitalityDriveBooking> = {
                                                            id: `drv_${Date.now()}`,
                                                            institutionId: tenant.id,
                                                            guestName: "Guest",
                                                            roomNumber: room,
                                                            vehicleId: veh.id,
                                                            date: new Date().toISOString().split('T')[0],
                                                            timeSlot: slot,
                                                            status: 'pending',
                                                            createdAt: new Date().toISOString()
                                                        };
                                                        await apiService.saveModuleRecord('hospitality_drive_bookings', booking);
                                                        alert("Drive booking requested! Management will confirm shortly.");
                                                    }}
                                                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                                                >
                                                    {slot}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Why Us Section */}
            <div className="bg-slate-900 text-white py-24 my-20">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                    {[
                        { title: 'Tailored Experience', desc: 'Crafted itineraries and stays that match your unique rhythm.', icon: Sparkles },
                        { title: 'Best Price Promise', desc: 'Competitive rates without compromising on premium quality.', icon: ShieldCheck },
                        { title: '24/7 Guest Support', desc: 'Our dedicated concierge is always just a call away.', icon: Phone },
                    ].map((f, i) => (
                        <div key={i} className="group cursor-default">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-indigo-600 transition-all duration-500">
                                <f.icon className="w-8 h-8" />
                            </div>
                            <h4 className="text-xl font-black uppercase tracking-tight mb-2">{f.title}</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg">
                        {tenant.name.charAt(0)}
                    </div>
                    <h5 className="text-lg font-black uppercase tracking-tighter text-slate-800 dark:text-white">{tenant.name}</h5>
                </div>
                <div className="flex justify-center gap-8 mb-12">
                    {[Globe, Mail, Phone].map((Icon, i) => (
                        <button key={i} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full text-slate-400 hover:text-indigo-600 hover:shadow-xl transition-all">
                            <Icon className="w-5 h-5" />
                        </button>
                    ))}
                </div>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em]">Official Hospitality Gateway • Secure Booking Guaranteed</p>
            </footer>

            {/* Booking Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => { if(bookingStep !== 'confirm') setSelectedItem(null); }}></div>
                    <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500 max-h-[95vh] sm:max-h-[90vh]">
                        {/* Summary Side */}
                        <div className="w-full md:w-2/5 bg-slate-50 dark:bg-slate-800 flex flex-col justify-between border-r border-slate-100 dark:border-slate-700">
                            <div className="relative h-48 md:h-64 bg-slate-200 dark:bg-slate-900 overflow-hidden">
                                {selectedItem.images && selectedItem.images.length > 0 ? (
                                    <img src={getGoogleDriveDirectUrl(selectedItem.images[0])} className="w-full h-full object-cover" alt={selectedItem.name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        {selectedItem.category === 'Safari' ? <Compass className="w-16 h-16" /> : <Hotel className="w-16 h-16" />}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-800 to-transparent"></div>
                            </div>
                            <div className="p-6 md:p-10 flex-1">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600/10 text-indigo-600 rounded-full text-[8px] font-black uppercase tracking-widest mb-6">
                                    {selectedItem.category === 'Safari' ? <Compass className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                    {selectedItem.category === 'Safari' ? 'Wilderness Expedition' : 'Premium Accommodation'}
                                </div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white leading-none mb-4">{selectedItem.name}</h3>
                                
                                {selectedItem.category === 'Safari' && (
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {['Wildlife', '4x4 Transport', 'Guided', 'Full Board'].map(tag => (
                                            <span key={tag} className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg text-[7px] font-black uppercase tracking-widest text-slate-400">{tag}</span>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-4 py-8">
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                                        <span>{selectedItem.category === 'Safari' ? 'Package Price' : 'Subtotal'}</span>
                                        <span>KES {selectedItem.price.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-black text-indigo-600 uppercase border-t border-slate-200 dark:border-slate-700 pt-4">
                                        <span>Total Est.</span>
                                        <span className="text-lg">KES {selectedItem.price.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {selectedItem.features.slice(0, 4).map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> {f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-8">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                                    {selectedItem.category === 'Safari' ? 'Secure your adventure today' : 'Taxes & fees included at checkout'}
                                </p>
                            </div>
                        </div>

                        {/* Form Side */}
                        <div className="flex-1 p-6 md:p-10 overflow-y-auto">
                            {bookingStep === 'details' && (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-6 md:mb-10">
                                        <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Guest Information</h4>
                                        <button onClick={() => setSelectedItem(null)} className="p-2 md:p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400 hover:text-red-500 transition-colors">
                                            <X className="w-5 h-5 md:w-6 md:h-6" />
                                        </button>
                                    </div>
                                    <form onSubmit={handleBooking} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Full Name</label>
                                                <input required type="text" value={bookingData.name} onChange={e => setBookingData({...bookingData, name: e.target.value})} placeholder="e.g. Ken Walibora" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 ring-indigo-500/50" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Check-in Date</label>
                                                <input required type="date" value={bookingData.date} onChange={e => setBookingData({...bookingData, date: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 ring-indigo-500/50" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Phone Number</label>
                                                <input required type="tel" value={bookingData.phone} onChange={e => setBookingData({...bookingData, phone: e.target.value})} placeholder="e.g. 07..." className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 ring-indigo-500/50" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">No. of Guests</label>
                                                <select value={bookingData.guests} onChange={e => setBookingData({...bookingData, guests: parseInt(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 ring-indigo-500/50">
                                                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Guests</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-slate-900 transition-all flex items-center justify-center gap-3">
                                            Confirm Reservation <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </form>
                                </div>
                            )}

                            {bookingStep === 'confirm' && (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                                    <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Processing Request</h4>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Securing your spot in Paradise...</p>
                                </div>
                            )}

                            {bookingStep === 'success' && (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-500">
                                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                        <CheckCircle className="w-12 h-12 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white mt-4 leading-none">Booking Confirmed</h4>
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-3">We've received your request for {selectedItem.name}.</p>
                                        <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase italic tracking-widest">A member of our team will contact you for deposit details.</p>
                                    </div>
                                    <button onClick={() => setSelectedItem(null)} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">
                                        Back to Gallery
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
