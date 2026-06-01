import React, { useState, useMemo } from 'react';
import type { User, Supplier, Requisition, InventoryItem, BusinessDocument } from '../types';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';


interface SupplierViewProps {
    user: User;
    supplierProfile: Supplier;
    requisitions: Requisition[];
    inventory: InventoryItem[];
    onUpdateRequisition: (reqId: string, data: Partial<Requisition>) => void;
    onUpdateSupplier: (supplierId: string, data: Partial<Supplier>) => void;
}

export const SupplierView: React.FC<SupplierViewProps> = ({ 
    user, 
    supplierProfile, 
    requisitions, 
    inventory, 
    onUpdateRequisition, 
    onUpdateSupplier 
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'catalog' | 'profile'>('dashboard');
    const [etaDate, setEtaDate] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [actionReqId, setActionReqId] = useState<string | null>(null);
    
    // Catalog Edit State
    const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null);
    const [newPrice, setNewPrice] = useState<number>(0);

    // Document Upload State (Simulation)
    const [docType, setDocType] = useState<BusinessDocument['type']>('Tax Compliance');
    const [isUploading, setIsUploading] = useState(false);

    const myRequisitions = useMemo(() => {
        return requisitions.filter(r => r.supplierId === supplierProfile.id && (r.status === 'approved' || r.status === 'ordered' || r.status === 'received'));
    }, [requisitions, supplierProfile.id]);

    const pendingOrders = myRequisitions.filter(r => r.status === 'approved' && r.supplierResponse !== 'rejected');

    const handleAcceptOrder = () => {
        if (actionReqId && etaDate) {
            onUpdateRequisition(actionReqId, { 
                status: 'ordered', 
                supplierResponse: 'accepted',
                deliveryEta: etaDate 
            });
            setActionReqId(null);
            setEtaDate('');
            alert("Order Accepted! LPO confirmed.");
        }
    };

    const handleRejectOrder = () => {
        if (actionReqId && rejectionReason) {
            onUpdateRequisition(actionReqId, { 
                supplierResponse: 'rejected',
                rejectionReason: rejectionReason 
                // Note: We keep status as 'approved' internally or move to 'rejected' depending on workflow. 
                // Ideally, finance/admin should see the rejection.
            });
            setActionReqId(null);
            setRejectionReason('');
            alert("Order Rejected.");
        }
    };

    const handleUpdatePrice = (itemId: string) => {
        if (newPrice > 0) {
            const updatedItems = [...(supplierProfile.suppliedItems || [])];
            const index = updatedItems.findIndex(i => i.itemId === itemId);
            if (index >= 0) {
                updatedItems[index].price = newPrice;
            } else {
                updatedItems.push({ itemId, price: newPrice });
            }
            onUpdateSupplier(supplierProfile.id, { suppliedItems: updatedItems });
            setEditingPriceItemId(null);
        }
    };
    
    const handleUploadDocument = (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        // Simulate upload
        setTimeout(() => {
            const newDoc: BusinessDocument = {
                id: `doc_${Date.now()}`,
                name: `${docType} - ${new Date().getFullYear()}`,
                type: docType,
                uploadDate: new Date().toISOString(),
                status: 'pending',
                url: '#'
            };
            const currentDocs = supplierProfile.documents || [];
            onUpdateSupplier(supplierProfile.id, { documents: [...currentDocs, newDoc] });
            setIsUploading(false);
            alert("Document uploaded successfully (Simulation)");
        }, 1500);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                    <ArchiveBoxIcon className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Supplier Portal</h2>
                    <p className="text-sm text-slate-500">{supplierProfile.name} - {supplierProfile.category}</p>
                </div>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8">
                    {['dashboard', 'orders', 'catalog', 'profile'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                                activeTab === tab 
                                ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Orders</h3>
                        <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{pendingOrders.length}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Catalog Items</h3>
                        <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{supplierProfile.suppliedItems?.length || 0}</p>
                    </div>
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Compliance Status</h3>
                        <p className="mt-2 text-lg font-bold text-green-600 dark:text-green-400">
                            {supplierProfile.documents?.some(d => d.status === 'verified') ? 'Verified' : 'Pending Review'}
                        </p>
                    </div>
                </div>
            )}

            {activeTab === 'orders' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Local Purchase Orders (LPOs)</h3>
                    {myRequisitions.length === 0 ? (
                         <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            <ClipboardListIcon className="mx-auto h-12 w-12 text-slate-400" />
                            <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No Orders</h3>
                            <p className="mt-1 text-sm text-slate-500">You haven't received any LPOs yet.</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                                {myRequisitions.map(req => (
                                    <li key={req.id} className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">LPO #{req.lpoNumber || 'PENDING'}</h4>
                                                <p className="text-sm text-slate-500">Requested: {new Date(req.requestedDate).toLocaleDateString()}</p>
                                                <div className="mt-2">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        req.supplierResponse === 'accepted' ? 'bg-green-100 text-green-800' :
                                                        req.supplierResponse === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {req.supplierResponse ? req.supplierResponse.toUpperCase() : 'PENDING ACTION'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-slate-900 dark:text-white">KES {req.totalEstimatedCost?.toLocaleString()}</p>
                                                <p className="text-sm text-slate-500">{req.items.length} Items</p>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-md">
                                            <h5 className="text-sm font-semibold mb-2">Items Requested:</h5>
                                            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300">
                                                {req.items.map((item, i) => (
                                                    <li key={i}>{item.name} - {item.quantity} units @ KES {item.unitCost}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        {!req.supplierResponse && (
                                            <div className="mt-4 flex flex-wrap gap-4 items-end border-t pt-4">
                                                {actionReqId === req.id ? (
                                                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                                                        <label className="text-xs font-medium">Estimated Delivery Date</label>
                                                        <input 
                                                            type="date" 
                                                            value={etaDate} 
                                                            onChange={e => setEtaDate(e.target.value)} 
                                                            className="form-input text-sm"
                                                            min={new Date().toISOString().split('T')[0]}
                                                        />
                                                        <div className="flex gap-2">
                                                            <button onClick={handleAcceptOrder} className="btn-primary bg-green-600 hover:bg-green-700 text-xs">Confirm Acceptance</button>
                                                            <button onClick={() => setActionReqId(null)} className="btn-secondary text-xs">Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setActionReqId(req.id)} className="btn-primary bg-green-600 hover:bg-green-700">Accept Order</button>
                                                        <button 
                                                            onClick={() => {
                                                                const reason = prompt("Please provide a reason for rejection:");
                                                                if(reason) {
                                                                    setActionReqId(req.id);
                                                                    setRejectionReason(reason);
                                                                    // Hacky way to trigger immediate reject since state update is async, better to use useEffect or direct call but this works for logic demo
                                                                    onUpdateRequisition(req.id, { supplierResponse: 'rejected', rejectionReason: reason });
                                                                    alert("Order rejected.");
                                                                    setActionReqId(null);
                                                                }
                                                            }} 
                                                            className="btn-secondary text-red-600 hover:bg-red-50 border-red-200"
                                                        >
                                                            Reject Order
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {req.supplierResponse === 'accepted' && (
                                            <p className="mt-4 text-sm text-green-600 font-medium flex items-center gap-2">
                                                <ClockIcon className="w-4 h-4"/> ETA: {new Date(req.deliveryEta || '').toLocaleDateString()}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'catalog' && (
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold">My Catalog & Pricing</h3>
                    <p className="text-sm text-slate-500">Update your unit prices here. These prices will be used by the institution for future requisitions.</p>
                    
                    <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                         <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Item Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Current Price (KES)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {supplierProfile.suppliedItems?.map(si => {
                                    const inventoryItem = inventory.find(i => i.id === si.itemId);
                                    if (!inventoryItem) return null;
                                    
                                    return (
                                        <tr key={si.itemId}>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{inventoryItem.name}</td>
                                            <td className="px-6 py-4 text-sm">
                                                {editingPriceItemId === si.itemId ? (
                                                    <input 
                                                        type="number" 
                                                        value={newPrice} 
                                                        onChange={e => setNewPrice(parseFloat(e.target.value))} 
                                                        className="form-input w-32 py-1"
                                                    />
                                                ) : (
                                                    `KES ${si.price?.toLocaleString()}`
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {editingPriceItemId === si.itemId ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleUpdatePrice(si.itemId)} className="text-green-600 hover:underline">Save</button>
                                                        <button onClick={() => setEditingPriceItemId(null)} className="text-slate-500 hover:underline">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => { setEditingPriceItemId(si.itemId); setNewPrice(si.price); }} 
                                                        className="text-[var(--color-primary)] hover:underline"
                                                    >
                                                        Update Price
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {(!supplierProfile.suppliedItems || supplierProfile.suppliedItems.length === 0) && (
                                    <tr><td colSpan={3} className="p-6 text-center text-slate-500">No items assigned to your catalog yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'profile' && (
                 <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold mb-4">Business Documents</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Upload Document</h4>
                                <form onSubmit={handleUploadDocument} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Document Type</label>
                                        <select 
                                            value={docType} 
                                            onChange={e => setDocType(e.target.value as any)} 
                                            className="form-select w-full"
                                        >
                                            <option>Tax Compliance</option>
                                            <option>Business Permit</option>
                                            <option>Incorporation Certificate</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">File</label>
                                        <input type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                    </div>
                                    <button type="submit" disabled={isUploading} className="btn-primary w-full">
                                        {isUploading ? 'Uploading...' : 'Submit Document'}
                                    </button>
                                </form>
                            </div>

                            <div>
                                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Submitted Documents</h4>
                                <ul className="space-y-3">
                                    {supplierProfile.documents?.map(doc => (
                                        <li key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                            <div>
                                                <p className="text-sm font-semibold">{doc.name}</p>
                                                <p className="text-xs text-slate-500">{new Date(doc.uploadDate).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                                                doc.status === 'verified' ? 'bg-green-100 text-green-800' : 
                                                doc.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {doc.status}
                                            </span>
                                        </li>
                                    ))}
                                    {(!supplierProfile.documents || supplierProfile.documents.length === 0) && (
                                        <p className="text-sm text-slate-500 italic">No documents submitted.</p>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500">Company Name</label>
                                <p>{supplierProfile.name}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500">Contact Person</label>
                                <p>{supplierProfile.contactPerson}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500">Email</label>
                                <p>{supplierProfile.email}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500">Phone</label>
                                <p>{supplierProfile.phone}</p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-xs text-slate-400 italic">To update contact details, please contact the Institution Administrator.</p>
                        </div>
                    </div>
                 </div>
            )}
             <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; }
            `}</style>
        </div>
    );
}
