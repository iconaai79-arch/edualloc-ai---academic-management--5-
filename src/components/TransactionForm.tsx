
import React, { useState, useMemo } from 'react';
import type { InventoryItem, User, Supplier } from '../types';

interface TransactionFormProps {
    inventory: InventoryItem[];
    users: User[];
    suppliers: Supplier[];
    onSave: (item: InventoryItem, type: 'Restock' | 'Dispatch' | 'Adjustment', quantity: number, party: string, verificationMethod: string, signature: string | null) => void;
    onClose: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ inventory, users, suppliers, onSave, onClose }) => {
    const [itemId, setItemId] = useState('');
    const [type, setType] = useState<'Restock' | 'Dispatch' | 'Adjustment'>('Dispatch');
    const [quantity, setQuantity] = useState<number>(1);
    const [partyId, setPartyId] = useState(''); // User ID or Supplier Name
    const [verificationMethod, setVerificationMethod] = useState('Manual');

    const selectedItem = useMemo(() => inventory.find(i => i.id === itemId), [inventory, itemId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;
        
        let partyName = partyId;
        if (type === 'Dispatch') {
            const user = users.find(u => u.id === partyId);
            partyName = user ? `${user.name} (${user.role})` : 'Unknown';
        } else if (type === 'Restock') {
             const supplier = suppliers.find(s => s.id === partyId);
             partyName = supplier ? supplier.name : partyId; // Allow custom if not in list
        }

        onSave(selectedItem, type, quantity, partyName, verificationMethod, null);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Record Stock Transaction</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Transaction Type</label>
                        <div className="flex gap-4">
                            {['Dispatch', 'Restock', 'Adjustment'].map(t => (
                                <label key={t} className="flex items-center gap-2">
                                    <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t as any)} />
                                    {t}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Select Item</label>
                        <select className="form-select w-full" value={itemId} onChange={e => setItemId(e.target.value)} required>
                            <option value="">-- Select Item --</option>
                            {inventory.map(i => (
                                <option key={i.id} value={i.id}>{i.name} (Current: {i.quantity} {i.unit})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Quantity</label>
                        <input type="number" className="form-input w-full" value={quantity} onChange={e => setQuantity(Number(e.target.value))} required min="1" />
                    </div>
                    
                    {type === 'Dispatch' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Issued To (Staff/Student)</label>
                            <select className="form-select w-full" value={partyId} onChange={e => setPartyId(e.target.value)}>
                                <option value="">-- Select Recipient --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} - {u.role}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {type === 'Restock' && (
                        <div>
                             <label className="block text-sm font-medium mb-1">Supplier</label>
                             {suppliers.length > 0 ? (
                                <select className="form-select w-full" value={partyId} onChange={e => setPartyId(e.target.value)}>
                                    <option value="">-- Select Supplier --</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    <option value="Direct Purchase">Direct Purchase</option>
                                </select>
                             ) : (
                                 <input type="text" className="form-input w-full" value={partyId} onChange={e => setPartyId(e.target.value)} placeholder="Enter Supplier Name" />
                             )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">Verification Method</label>
                        <select className="form-select w-full" value={verificationMethod} onChange={e => setVerificationMethod(e.target.value)}>
                            <option>Manual</option>
                            <option>Biometric</option>
                            <option>QR Code</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-slate-600 hover:bg-slate-100">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:brightness-90">Confirm</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

