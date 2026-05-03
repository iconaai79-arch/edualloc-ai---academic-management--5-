
import React, { useState } from 'react';
import { 
    X, 
    Plus, 
    Car, 
    Image as ImageIcon, 
    Trash2, 
    Loader2, 
    CheckCircle2,
    Fuel,
    Settings2,
    BadgeCheck,
    Coins,
    Calendar,
    Gauge
} from 'lucide-react';
import { CarListing, Institution } from '../../types';
import { apiService } from '../../services/apiService';

interface AddCarListingModalProps {
    listing: Partial<CarListing> | null;
    institution: Institution;
    onClose: () => void;
    onSave: (data: Partial<CarListing>) => Promise<void>;
}

export const AddCarListingModal: React.FC<AddCarListingModalProps> = ({ 
    listing, 
    institution, 
    onClose, 
    onSave 
}) => {
    const [formData, setFormData] = useState<Partial<CarListing>>(listing || {
        make: '',
        model: '',
        year: new Date().getFullYear(),
        price: 0,
        mileage: 0,
        fuelType: 'Petrol',
        transmission: 'Automatic',
        status: 'active',
        viewCount: 0,
        inquiryCount: 0,
        galleryUrls: []
    });

    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMain: boolean = true) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const folderName = `Car_Marketplace_${institution.name.replace(/\s+/g, '_')}`;
            const uploadFile = async (file: File) => {
                const res = await apiService.uploadToGoogleDrive(file, folderName, {
                    institutionId: institution.id,
                    useGlobalConfig: false
                });
                if (!res.success) throw new Error(res.error || 'Upload failed');
                return res.fileUrl;
            };

            if (isMain) {
                const url = await uploadFile(files[0]);
                setFormData((prev: Partial<CarListing>) => ({ ...prev, mainImageUrl: url }));
            } else {
                const urls = await Promise.all(Array.from(files).map(f => uploadFile(f)));
                setFormData((prev: Partial<CarListing>) => ({ 
                    ...prev, 
                    galleryUrls: [...(prev.galleryUrls || []), ...(urls.filter((u: any) => u !== undefined) as string[])] 
                }));
            }
        } catch (err: any) {
            alert(`Upload failed: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const removeGalleryImage = (index: number) => {
        setFormData((prev: Partial<CarListing>) => ({
            ...prev,
            galleryUrls: prev.galleryUrls?.filter((_: any, i: number) => i !== index)
        }));
    };

    const handleSave = async () => {
        if (!formData.make || !formData.model || !formData.price) {
            alert("Please fill in the required fields (Make, Model, Price)");
            return;
        }

        setSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (err: any) {
            alert(`Failed to save: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                            <Car className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">
                                {listing?.id ? 'Update' : 'New'} <span className="text-indigo-600">Vehicle Listing</span>
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Car Marketplace Management</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto space-y-10 no-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Left Side: Images */}
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Hero Image (Main Showcase)
                                </label>
                                <div className="aspect-video bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative group">
                                    {formData.mainImageUrl ? (
                                        <>
                                            <img loading="lazy" src={formData.mainImageUrl} className="w-full h-full object-cover" alt="Main" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <label className="cursor-pointer bg-white text-slate-900 px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                                                    <Plus className="w-4 h-4" /> Change Image
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                                                </label>
                                            </div>
                                        </>
                                    ) : (
                                        <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center text-center p-8">
                                            <Plus className="w-8 h-8 text-slate-300 mb-2" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Featured Photo</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                                        </label>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Uploading to Drive...</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                                    <span>Gallery Photos</span>
                                    <span className="text-slate-300">{formData.galleryUrls?.length || 0}/10</span>
                                </label>
                                <div className="grid grid-cols-4 gap-3">
                                    {formData.galleryUrls?.map((url: string, i: number) => (
                                        <div key={i} className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl relative group overflow-hidden">
                                            <img loading="lazy" src={url} className="w-full h-full object-cover" alt={`Gallery ${i}`} />
                                            <button 
                                                onClick={() => removeGalleryImage(i)}
                                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center scale-75 group-hover:scale-100 transition-all shadow-lg"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {(formData.galleryUrls?.length || 0) < 10 && (
                                        <label className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                            <Plus className="w-5 h-5 text-slate-300" />
                                            <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleUpload(e, false)} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Details */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                        <BadgeCheck className="w-3.5 h-3.5" /> Make (Brand)
                                    </label>
                                    <input 
                                        value={formData.make} 
                                        onChange={e => setFormData({ ...formData, make: e.target.value })} 
                                        placeholder="e.g. Toyota" 
                                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                        <Car className="w-3.5 h-3.5" /> Model
                                    </label>
                                    <input 
                                        value={formData.model} 
                                        onChange={e => setFormData({ ...formData, model: e.target.value })} 
                                        placeholder="e.g. Land Cruiser" 
                                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" /> Manufactured Year
                                    </label>
                                    <input 
                                        type="number"
                                        value={formData.year} 
                                        onChange={e => setFormData({ ...formData, year: Number(e.target.value) })} 
                                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                        <Coins className="w-3.5 h-3.5" /> Listing Price (KES)
                                    </label>
                                    <input 
                                        type="number"
                                        value={formData.price} 
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} 
                                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                        <Fuel className="w-3.5 h-3.5" /> Fuel Type
                                    </label>
                                    <select 
                                        value={formData.fuelType} 
                                        onChange={e => setFormData({ ...formData, fuelType: e.target.value as any })} 
                                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                    >
                                        <option value="Petrol">Petrol</option>
                                        <option value="Diesel">Diesel</option>
                                        <option value="Electric">Electric</option>
                                        <option value="Hybrid">Hybrid</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                        <Settings2 className="w-3.5 h-3.5" /> Transmission
                                    </label>
                                    <select 
                                        value={formData.transmission} 
                                        onChange={e => setFormData({ ...formData, transmission: e.target.value as any })} 
                                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                    >
                                        <option value="Automatic">Automatic</option>
                                        <option value="Manual">Manual</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                        <Gauge className="w-3.5 h-3.5" /> Total Mileage (KM)
                                    </label>
                                    <input 
                                        type="number"
                                        value={formData.mileage} 
                                        onChange={e => setFormData({ ...formData, mileage: Number(e.target.value) })} 
                                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                        <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" /> Platform Status
                                    </label>
                                    <select 
                                        value={formData.status} 
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })} 
                                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                    >
                                        <option value="draft">Review Pending</option>
                                        <option value="active">Live (Verified)</option>
                                        <option value="sold">Marked as Sold</option>
                                        <option value="archived">Hidden (Archive)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-5 font-black uppercase text-[10px] tracking-[0.3em] text-slate-400 hover:text-slate-600 transition-all">Discard</button>
                    <button 
                        onClick={handleSave}
                        disabled={saving || uploading}
                        className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Synchronizing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                {listing?.id ? 'Update Listing' : 'Publish to Marketplace'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

