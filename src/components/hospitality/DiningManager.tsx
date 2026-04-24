
import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Utensils, 
    Coffee, 
    Beer, 
    Clock, 
    CheckCircle, 
    X, 
    ChefHat, 
    Trash2, 
    Edit3,
    Image as ImageIcon,
    Sparkles
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import type { Institution, HospitalityMenuItem, HospitalityOrder } from '../../types';

interface DiningManagerProps {
    currentInstitution: Institution;
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

export const DiningManager: React.FC<DiningManagerProps> = ({ currentInstitution }) => {
    const [activeSubTab, setActiveSubTab] = useState<'menu' | 'orders'>('menu');
    const [menuItems, setMenuItems] = useState<HospitalityMenuItem[]>([]);
    const [orders, setOrders] = useState<HospitalityOrder[]>([]);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [newItem, setNewItem] = useState<Partial<HospitalityMenuItem>>({
        name: '',
        description: '',
        basePrice: 0,
        category: 'Main Course',
        isAvailable: true
    });

    const loadData = async () => {
        const [mItems, rOrders] = await Promise.all([
            apiService.fetchModuleRecords<HospitalityMenuItem>('hospitality_menu_items', currentInstitution.id),
            apiService.fetchModuleRecords<HospitalityOrder>('hospitality_orders', currentInstitution.id)
        ]);
        setMenuItems(mItems);
        setOrders(rOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    };

    useEffect(() => {
        loadData();
    }, [currentInstitution.id]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const result = await apiService.uploadToGoogleDrive(file, currentInstitution.id);
            if (result.success) {
                setNewItem(prev => ({ ...prev, imageUrl: result.url }));
            }
        } catch (err) {
            console.error("Upload failed:", err);
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleSaveMenuItem = async () => {
        const payload = {
            ...newItem,
            id: newItem.id || `hmenu_${Date.now()}`,
            institutionId: currentInstitution.id,
            lastUpdated: new Date().toISOString()
        } as HospitalityMenuItem;

        await apiService.saveModuleRecord('hospitality_menu_items', payload);
        setIsAddingItem(false);
        setNewItem({ name: '', description: '', basePrice: 0, category: 'Main Course', isAvailable: true });
        loadData();
    };

    const handleUpdateOrderStatus = async (order: HospitalityOrder, status: HospitalityOrder['status']) => {
        const updated = { ...order, status };
        await apiService.saveModuleRecord('hospitality_orders', updated);
        loadData();
    };

    const handleUpdateKitchenStatus = async (order: HospitalityOrder, itemIndex: number, kitchenStatus: any) => {
        const newItems = [...order.items];
        newItems[itemIndex] = { ...newItems[itemIndex], kitchenStatus };
        const updated = { ...order, items: newItems };
        await apiService.saveModuleRecord('hospitality_orders', updated);
        loadData();
    };

    const filteredMenu = menuItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const renderMenuBuilder = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search dishes, drinks..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 ring-indigo-500/50 outline-none shadow-sm"
                    />
                </div>
                <button 
                    onClick={() => setIsAddingItem(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Add Menu Item
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMenu.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm group hover:shadow-xl transition-all">
                        <div className="aspect-video bg-slate-50 dark:bg-slate-900 relative">
                            {item.imageUrl ? (
                                <img src={getDirectUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                    <Utensils className="w-10 h-10" />
                                </div>
                            )}
                            <div className="absolute top-4 left-4">
                                <span className="text-[8px] font-black bg-white/90 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                    {item.category}
                                </span>
                            </div>
                            {!item.isAvailable && (
                                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[2px]">
                                    <span className="text-white font-black uppercase tracking-[0.2em] text-[10px] border-2 border-white px-4 py-2 rounded-xl">Sold Out</span>
                                </div>
                            )}
                        </div>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">{item.name}</h5>
                                <p className="text-sm font-black text-indigo-600 tracking-tighter">KES {item.basePrice}</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => { setNewItem(item); setIsAddingItem(true); }}
                                    className="flex-1 py-3 bg-slate-50 dark:bg-slate-900 text-slate-500 rounded-xl font-black uppercase text-[9px] tracking-widest hover:text-indigo-600 transition-colors"
                                >
                                    Edit
                                </button>
                                <button 
                                    onClick={async () => {
                                        if (confirm('Delete this item?')) {
                                            await apiService.deleteModuleRecord('hospitality_menu_items', item.id);
                                            loadData();
                                        }
                                    }}
                                    className="p-3 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderOrderMonitor = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {orders.filter(o => o.status !== 'cancelled').map(order => (
                    <div key={order.id} className={`bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 shadow-sm overflow-hidden flex flex-col ${order.status === 'pending' ? 'border-amber-400/50' : 'border-slate-100 dark:border-slate-700'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${order.status === 'pending' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700'}`}>
                            <div>
                                <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Room {order.roomNumber}</h5>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{new Date(order.createdAt).toLocaleTimeString()}</p>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                order.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                order.status === 'confirmed' ? 'bg-indigo-100 text-indigo-600' :
                                'bg-emerald-100 text-emerald-600'
                            }`}>
                                {order.status}
                            </span>
                        </div>
                        <div className="flex-1 p-6 space-y-4">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 dark:text-white uppercase">{item.quantity}x {item.name}</p>
                                        <div className="flex gap-1 mt-1">
                                            {['pending', 'preparing', 'ready', 'delivered'].map(ks => (
                                                <button 
                                                    key={ks}
                                                    onClick={() => handleUpdateKitchenStatus(order, idx, ks)}
                                                    className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tight transition-all ${item.kitchenStatus === ks ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}
                                                >
                                                    {ks}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                            {order.status === 'pending' && (
                                <button 
                                    onClick={() => handleUpdateOrderStatus(order, 'confirmed')}
                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100"
                                >
                                    Confirm Order
                                </button>
                            )}
                            {order.status === 'confirmed' && (
                                <button 
                                    onClick={() => handleUpdateOrderStatus(order, 'delivered')}
                                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-100"
                                >
                                    Mark Delivered
                                </button>
                            )}
                            <button 
                                onClick={() => handleUpdateOrderStatus(order, 'cancelled')}
                                className="p-4 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-red-500 rounded-2xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-3xl w-fit shadow-inner border border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveSubTab('menu')}
                    className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'menu' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Utensils className="w-4 h-4" /> Menu Builder
                </button>
                <button
                    onClick={() => setActiveSubTab('orders')}
                    className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'orders' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <ChefHat className="w-4 h-4" /> Order Monitor
                    {orders.filter(o => o.status === 'pending').length > 0 && (
                        <span className="bg-amber-400 text-white text-[8px] px-1.5 py-0.5 rounded-full animate-pulse">
                            {orders.filter(o => o.status === 'pending').length}
                        </span>
                    )}
                </button>
            </div>

            {activeSubTab === 'menu' ? renderMenuBuilder() : renderOrderMonitor()}

            {isAddingItem && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setIsAddingItem(false)}></div>
                    <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10">
                            <h4 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white mb-8">{newItem.id ? 'Edit' : 'Add'} Menu Item</h4>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Item Name</label>
                                    <input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Grilled Salmon" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50" />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Price (KES)</label>
                                        <input type="number" value={newItem.basePrice} onChange={e => setNewItem({...newItem, basePrice: Number(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Category</label>
                                        <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50">
                                            <option value="Appetizer">Appetizer</option>
                                            <option value="Main Course">Main Course</option>
                                            <option value="Dessert">Dessert</option>
                                            <option value="Drinks">Drinks / Beverages</option>
                                            <option value="Breakfast">Breakfast</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Item Image</label>
                                    <div className="flex items-center gap-4">
                                        {newItem.imageUrl && (
                                            <img src={getDirectUrl(newItem.imageUrl)} className="w-16 h-16 rounded-2xl object-cover" alt="Preview" />
                                        )}
                                        <label className="flex-1 cursor-pointer group">
                                            <div className="w-full py-4 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-400 group-hover:border-indigo-600 group-hover:text-indigo-600 transition-all">
                                                {isUploading ? <Sparkles className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                                {isUploading ? 'Uploading...' : 'Upload to G-Drive'}
                                            </div>
                                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">Description</label>
                                    <textarea rows={2} value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/50 resize-none" />
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                    <input type="checkbox" checked={newItem.isAvailable} onChange={e => setNewItem({...newItem, isAvailable: e.target.checked})} className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500" />
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Available for Ordering</span>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-10">
                                <button onClick={() => setIsAddingItem(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                                <button 
                                    onClick={handleSaveMenuItem}
                                    className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-slate-900 transition-all"
                                >
                                    {newItem.id ? 'Update' : 'Publish'} Dish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
