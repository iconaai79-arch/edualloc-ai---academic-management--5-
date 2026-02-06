
import React, { useState } from 'react';
import type { InventoryItem } from '../types';

interface StoreItemFormProps {
    onSave: (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'institutionId'>) => void;
    onClose: () => void;
}

export const StoreItemForm: React.FC<StoreItemFormProps> = ({ onSave, onClose }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [quantity, setQuantity] = useState<number>(0);
    const [unit, setUnit] = useState('');
    const [reorderLevel, setReorderLevel] = useState<number>(10);
    const [location, setLocation] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            category,
            quantity,
            unit,
            reorderLevel,
            location
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Add Inventory Item</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Item Name</label>
                        <input type="text" className="form-input w-full" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Category</label>
                            <input type="text" className="form-input w-full" value={category} onChange={e => setCategory(e.target.value)} required placeholder="e.g., Stationery" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Unit</label>
                            <input type="text" className="form-input w-full" value={unit} onChange={e => setUnit(e.target.value)} required placeholder="e.g., Box, Pcs" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Quantity</label>
                            <input type="number" className="form-input w-full" value={quantity} onChange={e => setQuantity(Number(e.target.value))} required min="0" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Reorder Level</label>
                            <input type="number" className="form-input w-full" value={reorderLevel} onChange={e => setReorderLevel(Number(e.target.value))} required min="0" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Storage Location</label>
                        <input type="text" className="form-input w-full" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Shelf A1" />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-slate-600 hover:bg-slate-100">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:brightness-90">Save Item</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
