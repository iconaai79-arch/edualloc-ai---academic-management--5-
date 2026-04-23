
import React, { useState, useMemo } from 'react';
import { 
    Palmtree, 
    Hotel, 
    Plane, 
    MapPixels, 
    Calendar, 
    Users, 
    CreditCard, 
    Compass, 
    Map, 
    Bed, 
    Image as ImageIcon,
    History,
    Sparkles,
    CheckCircle,
    Clock,
    Plus,
    Filter,
    Search,
    ChevronRight,
    ArrowRight,
    MapPin,
    Star,
    Coffee,
    Utensils,
    Wifi,
    X,
    ChefHat,
    Truck,
    Settings,
    LayoutDashboard
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { DiningManager } from './hospitality/DiningManager';
import { FleetManager } from './hospitality/FleetManager';
import type { Institution, User } from '../types';

interface HospitalityManagerProps {
    currentInstitution: Institution;
    users: User[];
}

const getDirectUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
        const idMatch = url.match(/\/d\/([^\/]+)/) || url.match(/id=([^\/&]+)/);
        if (idMatch && idMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
        }
    }
    return url;
};

export const HospitalityManager: React.FC<HospitalityManagerProps> = ({ currentInstitution, users }) => {
    const category = currentInstitution.category || 'Travel Agency';
    const isAgency = useMemo(() => 
        category.toLowerCase().includes('agency') || 
        category.toLowerCase().includes('safari') || 
        category.toLowerCase().includes('tour') ||
        currentInstitution.institutionType === 'Hospitality' && category === 'Travel Agency'
    , [category, currentInstitution.institutionType]);
    const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'itineraries' | 'inventory' | 'customers' | 'dining' | 'fleet' | 'settings'>('overview');
    const [items, setItems] = useState<any[]>([]);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '',
        description: '',
        price: '',
        category: isAgency ? 'Safari' : 'Room',
        features: '',
        location: '',
        duration: '',
        images: [] as string[]
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [orders, setOrders] = useState<any[]>([]);

    const loadItems = async () => {
        const records = await apiService.fetchModuleRecords<any>('hospitality_items', currentInstitution.id);
        setItems(records);
    };

    const loadOrders = async () => {
        const records = await apiService.fetchModuleRecords<any>('hospitality_orders', currentInstitution.id);
        setOrders(records);
    };

    React.useEffect(() => {
        loadItems();
        loadOrders();
    }, [currentInstitution.id]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const result = await apiService.uploadToGoogleDrive(file, currentInstitution.id);
            if (result.success) {
                setNewItem(prev => ({ ...prev, images: [...prev.images, result.url] }));
            }
        } catch (err) {
            console.error("Upload failed:", err);
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleSaveItem = async () => {
        const payload = {
            ...newItem,
            id: editingId || `hosp_${Date.now()}`,
            institutionId: currentInstitution.id,
            price: Number(newItem.price),
            features: typeof newItem.features === 'string' ? newItem.features.split(',').map(f => f.trim()) : newItem.features,
            rating: 5.0,
            isAvailable: true
        };

        await apiService.saveModuleRecord('hospitality_items', payload);
        setIsAddingItem(false);
        setEditingId(null);
        setNewItem({ name: '', description: '', price: '', category: isAgency ? 'Safari' : 'Room', features: '', location: '', duration: '', images: [] });
        loadItems();
    };

    const renderOverview = () => {
        const pendingOrders = orders.filter(o => o.status === 'pending');
        const deliveredOrders = orders.filter(o => o.status === 'delivered');
        
        const stats = [
            { label: 'Total Reservations', value: items.length * 12 + 124, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Pending Dining', value: pendingOrders.length, icon: ChefHat, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Revenue (MTD)', value: `KES ${(deliveredOrders.reduce((s:any,o:any) => s+o.totalAmount, 0)/1000 + 420).toFixed(1)}K`, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: isAgency ? 'Upcoming Trips' : 'Occupancy Rate', value: isAgency ? '12' : '84%', icon: isAgency ? Plane : Hotel, color: 'text-rose-600', bg: 'bg-rose-50' },
        ];

        return (
            <div className="space-y-8 animate-fade-in">
                {/* Industry-specific KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((s, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={`p-4 ${s.bg} ${s.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                                    <s.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">{s.label}</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">{s.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Real-time Order Stream */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Active Room Service</h4>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Pending dining requests from guests</p>
                                </div>
                                <span className="bg-indigo-600 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest">{pendingOrders.length} New</span>
                            </div>
                            <div className="space-y-3">
                                {pendingOrders.length === 0 ? (
                                    <div className="py-12 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">
                                        <Utensils className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                        No pending food orders
                                    </div>
                                ) : (
                                    pendingOrders.map((order:any) => (
                                        <div key={order.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all cursor-pointer group">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                {order.roomNumber}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-black text-slate-800 dark:text-white text-xs uppercase">Room {order.roomNumber} • {order.items.length} Items</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{order.items.map((i:any) => i.name).join(', ')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-indigo-600">KES {order.totalAmount}</p>
                                                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Recent Bookings */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Reservation Ledger</h4>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Latest confirmed check-ins</p>
                                </div>
                                <button className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors">
                                    <History className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                {items.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-2xl transition-all cursor-pointer group border-b border-slate-50 dark:border-slate-700 last:border-0 pb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm uppercase group-hover:scale-105 transition-transform">
                                            {item.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <p className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-tight">{item.name}</p>
                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">KES {item.price.toLocaleString()}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                                                {item.category} • Confirmed
                                            </p>
                                        </div>
                                        <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">Confirmed</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Compass className="w-32 h-32" />
                        </div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <h4 className="text-lg font-black uppercase tracking-tighter mb-2">Weekly Goal</h4>
                                <p className="text-slate-400 text-xs font-medium leading-relaxed">Boost your {isAgency ? 'tour packages' : 'room occupancy'} this weekend.</p>
                            </div>
                            <div className="mt-12 space-y-4">
                                <div className="p-4 bg-white/10 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Current Progress</p>
                                    <div className="flex justify-between items-end mt-1">
                                        <p className="text-xl font-black">74%</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">12/16 Slots</p>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                                        <div className="w-[74%] h-full bg-amber-500 rounded-full"></div>
                                    </div>
                                </div>
                                <button className="w-full py-4 bg-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                                    Launch Campaign
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderBookings = () => (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Reservation Master</h4>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Secure and manage all client bookings</p>
                </div>
                <div className="flex gap-2">
                    <button className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors">
                        <Search className="w-5 h-5" />
                    </button>
                    <button className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95">
                        <Plus className="w-5 h-5" />
                        New Booking
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-50 dark:border-slate-700">
                            {['Guest/Client', 'Reservation', 'Date Range', 'Amount', 'Status', ''].map((h) => (
                                <th key={h} className="text-left py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                <td className="py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-[10px]">KW</div>
                                        <p className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-tight">Ken Walibora</p>
                                    </div>
                                </td>
                                <td className="py-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                        {isAgency ? 'Diani 4-Day Getaway' : 'Room 204 - Deluxe'}
                                    </p>
                                </td>
                                <td className="py-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Oct 12 - Oct 16</p>
                                </td>
                                <td className="py-4 font-mono text-xs font-black">KES 82,000</td>
                                <td className="py-4">
                                    <span className="text-[8px] font-black bg-amber-50 text-amber-600 px-3 py-1 rounded-full uppercase tracking-widest">In Process</span>
                                </td>
                                <td className="py-4 text-right">
                                    <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderInventory = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Active Catalog</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Manage your {isAgency ? 'Safari Packages' : 'Room Inventory'}</p>
                </div>
                <button 
                    onClick={() => setIsAddingItem(true)}
                    className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-slate-900 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Add {isAgency ? 'Package' : 'Category'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {items.length === 0 ? (
                    <div className="col-span-full py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center text-slate-400">
                        <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-widest text-xs italic">No items in catalog yet. Click the button above to start.</p>
                    </div>
                ) : items.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden group hover:shadow-2xl transition-all">
                        <div className="aspect-video bg-slate-100 dark:bg-slate-900 relative">
                            {item.images && item.images.length > 0 ? (
                                <img src={getDirectUrl(item.images[0])} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                    {isAgency ? <Plane className="w-12 h-12" /> : <Bed className="w-12 h-12" />}
                                </div>
                            )}
                            <div className="absolute top-4 left-4">
                                <span className="text-[8px] font-black bg-white/90 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                    {item.category}
                                </span>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-lg leading-none">{item.name}</h5>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{item.duration || item.location}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Price</p>
                                    <p className="text-sm font-black text-indigo-600 tracking-tighter">KES {item.price.toLocaleString()}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setEditingId(item.id);
                                    setNewItem({
                                        name: item.name,
                                        description: item.description,
                                        price: item.price.toString(),
                                        category: item.category,
                                        features: Array.isArray(item.features) ? item.features.join(', ') : item.features,
                                        location: item.location || '',
                                        duration: item.duration || '',
                                        images: item.images || []
                                    });
                                    setIsAddingItem(true);
                                }}
                                className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest group-hover:bg-indigo-600 transition-all"
                            >
                                Edit Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Item Modal */}
            {isAddingItem && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => { setIsAddingItem(false); setEditingId(null); }}></div>
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10">
                            <h4 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white mb-8">
                                {editingId ? 'Edit' : 'New'} {isAgency ? 'Safari Package' : 'Room Category'}
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Name / Title</label>
                                    <input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. 7 Days Maasai Mara..." className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Price (KES)</label>
                                    <input type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="e.g. 145000" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50" />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Description</label>
                                <textarea rows={3} value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Describe the experience..." className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50 resize-none" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Location</label>
                                    <input type="text" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} placeholder="e.g. Maasai Mara, Kenya" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Duration / Type</label>
                                    <input type="text" value={newItem.duration} onChange={e => setNewItem({...newItem, duration: e.target.value})} placeholder="e.g. 7 Days" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50" />
                                </div>
                            </div>

                            {/* Photo Upload Section */}
                            <div className="mb-10">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-4 block">Package Gallery (Cloud Storage)</label>
                                <div className="grid grid-cols-4 gap-4">
                                    {newItem.images.map((img, idx) => (
                                        <div key={idx} className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group">
                                            <img src={getDirectUrl(img)} alt="Preview" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => setNewItem(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="aspect-square border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-600 hover:text-indigo-600 cursor-pointer transition-all relative overflow-hidden">
                                        {isUploading ? (
                                            <div className="animate-spin text-indigo-600"><Sparkles className="w-6 h-6" /></div>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-6 h-6 mb-1" />
                                                <span className="text-[8px] font-black uppercase">Add Photo</span>
                                            </>
                                        )}
                                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={isUploading} />
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setIsAddingItem(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[2rem] font-black uppercase text-[10px] tracking-widest">Cancel</button>
                                <button 
                                    onClick={handleSaveItem}
                                    disabled={!newItem.name || !newItem.price || isUploading}
                                    className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-slate-900 transition-all disabled:opacity-50"
                                >
                                    Publish to Storefront
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-100">
                        {isAgency ? <Plane className="w-8 h-8" /> : <Hotel className="w-8 h-8" />}
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.3em] mb-1">Hospitality Hub</p>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">
                            {category} Gateway
                        </h2>
                    </div>
                </div>

                <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                    {[
                        { id: 'overview', label: 'Dashboard', icon: Sparkles },
                        { id: 'bookings', label: 'Bookings', icon: Calendar },
                        { id: 'inventory', label: isAgency ? 'Packages' : 'Inventory', icon: isAgency ? Map : Bed },
                        { id: 'dining', label: 'Dining', icon: ChefHat },
                        { id: 'fleet', label: 'Fleet', icon: Truck },
                        { id: 'settings', label: 'Settings', icon: Settings },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="transition-all duration-300">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'bookings' && renderBookings()}
                {activeTab === 'inventory' && renderInventory()}
                {activeTab === 'dining' && <DiningManager currentInstitution={currentInstitution} />}
                {activeTab === 'fleet' && <FleetManager institution={currentInstitution} />}
                {activeTab === 'settings' && (
                    <div className="bg-white dark:bg-slate-800 p-12 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-700 text-center text-slate-400">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-widest text-sm">Settings Module Loading...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
