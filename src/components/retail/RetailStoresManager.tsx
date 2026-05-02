import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { RetailStore, MpesaConfig } from '../../types';
import { StoreIcon as Store } from '../icons/StoreIcon';
import { TruckIcon as Truck } from '../icons/TruckIcon';
import { PlusIcon as Plus } from '../icons/PlusIcon';
import { MagnifyingGlassIcon as Search } from '../icons/MagnifyingGlassIcon';
import { MapPinIcon as MapPin } from '../icons/MapPinIcon';
import { XCircleIcon as XCircle } from '../icons/XCircleIcon';
import { MoreVerticalIcon as MoreVertical } from '../icons/MoreVerticalIcon';
import { PencilIcon as Pencil } from '../icons/PencilIcon';
import { TrashIcon as Trash } from '../icons/TrashIcon';
import { CreditCardIcon as CreditCard } from '../icons/CreditCardIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface RetailStoresManagerProps {
    institutionId: string;
}

export function RetailStoresManager({ institutionId }: RetailStoresManagerProps) {
    const [stores, setStores] = useState<RetailStore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const user = apiService.getSession();
    const isSuperAdmin = user?.role === 'super_admin';
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [selectedStore, setSelectedStore] = useState<RetailStore | null>(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [config, setConfig] = useState<MpesaConfig>({
        paybillNumber: '',
        accountNumber: '',
        consumerKey: '',
        consumerSecret: '',
        passkey: ''
    });

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<Partial<RetailStore>>({
        name: '',
        storeType: 'branch_store',
        location: '',
        isActive: true,
        latitude: undefined,
        longitude: undefined
    });

    useEffect(() => {
        fetchStores();
    }, [institutionId]);

    const fetchStores = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<RetailStore>('retail_stores', institutionId);
            if (data) {
                setStores(data.map((s: RetailStore) => ({
                    ...s,
                    mpesaConfig: (s as any).mpesa_config || s.mpesaConfig // Handle potential snake_case from DB
                })));
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!selectedStore) return;

        try {
            await apiService.saveModuleRecord('retail_stores', {
                id: selectedStore.id,
                mpesa_config: config
            });

            setStores(prev => prev.map(s => s.id === selectedStore.id ? { ...s, mpesaConfig: config } : s));
            setIsConfigModalOpen(false);
            setSelectedStore(null);
            alert('Configuration saved successfully!');
        } catch (err) {
            console.error("Save error:", err);
            alert('Failed to save configuration');
        }
    };

    const openConfig = (store: RetailStore) => {
        setSelectedStore(store);
        setConfig(store.mpesaConfig || {
            paybillNumber: '',
            accountNumber: '',
            consumerKey: '',
            consumerSecret: '',
            passkey: ''
        });
        setIsConfigModalOpen(true);
    };

    const handleSaveLocation = async () => {
        if (!currentLocation.name || !currentLocation.storeType) {
            alert("Please provide a name and type for the location.");
            return;
        }

        setIsSaving(true);
        try {
            const newRecord: any = {
                institutionId,
                name: currentLocation.name,
                storeType: currentLocation.storeType,
                location: currentLocation.location || '',
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                isActive: currentLocation.isActive ?? true,
                createdAt: currentLocation.createdAt || new Date().toISOString()
            };

            // Only include ID if we are updating an existing record
            // For new records, let the database generate a valid UUID
            if (currentLocation.id && !currentLocation.id.startsWith('loc_')) {
                newRecord.id = currentLocation.id;
            }

            const saved = await apiService.saveModuleRecord('retail_stores', newRecord);

            if (saved) {
                if (currentLocation.id) {
                    setStores(prev => prev.map(s => s.id === saved.id ? saved as RetailStore : s));
                } else {
                    setStores(prev => [...prev, saved as RetailStore]);
                }
                setIsAddModalOpen(false);
                setCurrentLocation({
                    name: '', storeType: 'branch_store', location: '', isActive: true, latitude: undefined, longitude: undefined
                });
            }
        } catch (err: any) {
            console.error("Save location error:", err);
            alert(`Failed to save location: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteStore = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this location?")) return;

        try {
            await apiService.deleteModuleRecord('retail_stores', id);
            setStores(prev => prev.filter(s => s.id !== id));
        } catch (err: any) {
            alert(`Failed to delete: ${err.message}`);
        }
    };

    const handleEditStore = (store: RetailStore) => {
        setCurrentLocation(store);
        setIsAddModalOpen(true);
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCurrentLocation(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
            },
            (error) => {
                console.error("Error fetching location:", error);
                let message = "Failed to get location";
                if (error.code === 1) message = "Location permission denied";
                else if (error.code === 2) message = "Location unavailable";
                else if (error.code === 3) message = "Location request timed out";
                alert(message);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const filteredStores = stores.filter(store => {
        const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (store.location && store.location.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesType = filterType === 'all' || store.storeType === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Stores & Agent Locations</h2>
                    <p className="text-slate-500 text-sm mt-1">Manage physical branches and van stock for field agents.</p>
                </div>

                <button
                    onClick={() => {
                        setCurrentLocation({ name: '', storeType: 'branch_store', location: '', isActive: true, latitude: undefined, longitude: undefined });
                        setIsAddModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Add Location
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-96">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search stores or agents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-slate-50"
                    >
                        <option value="all">All Locations</option>
                        <option value="main_store">Main Stores</option>
                        <option value="branch_store">Branch Stores</option>
                        <option value="van_stock">Van Stock (Agents)</option>
                        <option value="warehouse">Warehouses</option>
                    </select>
                </div>
            </div>

            {/* Stores List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStores.map(store => (
                        <div key={store.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group relative">
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={() => handleEditStore(store)}
                                    className="p-1.5 bg-white shadow-sm border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all"
                                    title="Edit Location"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteStore(store.id)}
                                    className="p-1.5 bg-white shadow-sm border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-100 transition-all"
                                    title="Delete Location"
                                >
                                    <Trash className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${store.storeType === 'van_stock' ? 'bg-indigo-50 text-indigo-600' :
                                    store.storeType === 'main_store' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                    }`}>
                                    {store.storeType === 'van_stock' ? <Truck className="w-6 h-6" /> : <Store className="w-6 h-6" />}
                                </div>

                                <h3 className="font-semibold text-slate-800 text-lg pr-6 truncate">{store.name}</h3>

                                <div className="mt-2 space-y-2">
                                    <div className="flex items-start gap-2 text-sm text-slate-500">
                                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex flex-col">
                                            <span className="truncate">{store.location || 'No location set'}</span>
                                            {(store.latitude !== undefined && store.longitude !== undefined) && (
                                                <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    {store.latitude}, {store.longitude}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        {store.isActive ? (
                                            <><CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" /><span>Active Location</span></>
                                        ) : (
                                            <><XCircle className="w-4 h-4 text-red-500 flex-shrink-0" /><span>Inactive</span></>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 bg-slate-50 p-4 flex flex-col gap-2 group-hover:bg-blue-50 transition-colors">
                                <div className="flex justify-between items-center w-full">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">View Transactions</span>
                                    <span className="text-slate-400 group-hover:text-blue-600 transition-colors">›</span>
                                </div>
                                {isSuperAdmin && (
                                    <button
                                        onClick={() => openConfig(store)}
                                        className="mt-2 flex items-center gap-2 w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all"
                                    >
                                        <CreditCard className="w-3 h-3" />
                                        {store.mpesaConfig ? 'Update MPESA Config' : 'Setup Payments'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredStores.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
                            <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-slate-800">No locations found</h3>
                            <p className="text-slate-500 mt-1">Try adjusting your search or add a new location.</p>
                        </div>
                    )}
                </div>
            )}
            {/* MPESA Config Modal */}
            {isConfigModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">MPESA Integration</h3>
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{selectedStore?.name}</p>
                            </div>
                            <button onClick={() => setIsConfigModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Till/Paybill Number</label>
                                    <input
                                        type="text"
                                        value={config.paybillNumber}
                                        onChange={(e) => setConfig({ ...config, paybillNumber: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. 174379"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Store Shortcode</label>
                                    <input
                                        type="text"
                                        value={config.accountNumber}
                                        onChange={(e) => setConfig({ ...config, accountNumber: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. STORE001"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consumer Key</label>
                                <input
                                    type="text"
                                    value={config.consumerKey}
                                    onChange={(e) => setConfig({ ...config, consumerKey: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consumer Secret</label>
                                <input
                                    type="password"
                                    value={config.consumerSecret}
                                    onChange={(e) => setConfig({ ...config, consumerSecret: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Passkey</label>
                                <input
                                    type="password"
                                    value={config.passkey}
                                    onChange={(e) => setConfig({ ...config, passkey: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsConfigModalOpen(false)}
                                    className="flex-1 py-3 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all underline"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveConfig}
                                    className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    Save Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Location Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-800">
                                {currentLocation.id ? 'Edit Location' : 'Add New Location'}
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Location Name *</label>
                                <input
                                    type="text"
                                    value={currentLocation.name}
                                    onChange={e => setCurrentLocation({ ...currentLocation, name: e.target.value })}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Downtown Branch"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Location Type *</label>
                                <select
                                    value={currentLocation.storeType}
                                    onChange={e => setCurrentLocation({ ...currentLocation, storeType: e.target.value as any })}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="branch_store">Branch Store</option>
                                    <option value="main_store">Main Store / HQ</option>
                                    <option value="van_stock">Field Agent (Van Stock)</option>
                                    <option value="warehouse">Warehouse</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Physical Address</label>
                                <input
                                    type="text"
                                    value={currentLocation.location}
                                    onChange={e => setCurrentLocation({ ...currentLocation, location: e.target.value })}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. 123 Business Avenue, Suite 100"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-slate-700">GPS Coordinates</label>
                                    <button
                                        type="button"
                                        onClick={handleGetCurrentLocation}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
                                    >
                                        <MapPin className="w-3.5 h-3.5" />
                                        Get Current Location
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Latitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={currentLocation.latitude || ''}
                                            onChange={e => setCurrentLocation({ ...currentLocation, latitude: parseFloat(e.target.value) })}
                                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-slate-50"
                                            placeholder="e.g. -1.2921"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Longitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={currentLocation.longitude || ''}
                                            onChange={e => setCurrentLocation({ ...currentLocation, longitude: parseFloat(e.target.value) })}
                                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-slate-50"
                                            placeholder="e.g. 36.8219"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isActiveLoc"
                                    checked={currentLocation.isActive}
                                    onChange={e => setCurrentLocation({ ...currentLocation, isActive: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="isActiveLoc" className="text-sm font-medium text-slate-700 cursor-pointer">
                                    Location is currently active
                                </label>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveLocation}
                                disabled={isSaving}
                                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
                            >
                                {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                Save Location
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

