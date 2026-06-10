
import React, { useState } from 'react';
import { DocumentTextIcon as FileIcon } from '../icons/DocumentTextIcon';
import { PlusIcon as PlusIcon } from '../icons/PlusIcon';
import { MagnifyingGlassIcon as SearchIcon } from '../icons/MagnifyingGlassIcon';
import { ClockIcon as ClockIcon } from '../icons/ClockIcon';
import { XCircleIcon as XCircleIcon } from '../icons/XCircleIcon';
import { ArchiveBoxIcon as PackageIcon } from '../icons/ArchiveBoxIcon';
import { TrashIcon as TrashIcon } from '../icons/TrashIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

import { Requisition, RetailStore, User, RetailInventoryItem, Institution, CompanyDetails, Supplier } from '../../types';
import { generateLpoPdf } from '../../services/pdfService';
import { apiService } from '../../services/apiService';
import { EnvelopeIcon as MailIcon } from '../icons/EnvelopeIcon';
import { PrinterIcon as PrinterIcon } from '../icons/PrinterIcon';
import { ArrowUpRightIcon as ExternalLinkIcon } from '../icons/ArrowUpRightIcon';
import { getInstitutionEmailConfig } from '../../services/emailService';

interface RetailRequisitionsProps {
    institutionId: string;
    currentUser: User;
    retailStores: RetailStore[];
    requisitions: Requisition[];
    inventory: RetailInventoryItem[];
    onAddRequisition: (req: Omit<Requisition, 'id' | 'status' | 'requestedDate' | 'institutionId'>) => Promise<void>;
    onUpdateRequisition?: (reqId: string, data: Partial<Requisition>) => Promise<void>;
    isEducation?: boolean;
    allUsers?: User[];
}

export function RetailRequisitions({
    institutionId,
    currentUser,
    retailStores,
    requisitions,
    inventory,
    onAddRequisition,
    onUpdateRequisition,
    isEducation,
    allUsers = []
}: RetailRequisitionsProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStoreId, setSelectedStoreId] = useState<string>(() => {
        return retailStores.find(s => s.id === currentUser.departmentId)?.id || retailStores[0]?.id || '';
    });
    const [submittedTo, setSubmittedTo] = useState<string>('');

    const [items, setItems] = useState<{ name: string, quantity: number, unit: string, unitCost: number }[]>([]);
    const [newItem, setNewItem] = useState({ id: '', name: '', quantity: 1, unit: 'pcs', unitCost: 0 });
    const [itemSearchQuery, setItemSearchQuery] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const [selectedLpo, setSelectedLpo] = useState<Requisition | null>(null);
    const [isLpoModalOpen, setIsLpoModalOpen] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [institution, setInstitution] = useState<Institution | null>(null);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    const [selectedReqForReview, setSelectedReqForReview] = useState<Requisition | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    const headTeachers = (allUsers || []).filter(u => 
        (u.role === 'head_teacher' || u.role === 'admin') && 
        u.institutionId === institutionId
    );

    React.useEffect(() => {
        const loadInitialData = async () => {
            const [insts, co, supps] = await Promise.all([
                apiService.fetchInstitutions(institutionId),
                apiService.fetchCompanySettings(),
                apiService.fetchModuleRecords<Supplier>('suppliers', institutionId)
            ]);
            if (insts.length > 0) setInstitution(insts[0]);
            setCompanyDetails(co);
            setSuppliers(supps);
        };
        loadInitialData();
    }, [institutionId]);

    const handleEmailLpo = async (req: Requisition) => {
        if (!institution || !companyDetails) return;
        setIsSendingEmail(true);
        try {
            const supplier = suppliers.find(s => s.id === req.supplierId);
            if (!supplier?.email) {
                alert("Supplier does not have an email address configured.");
                return;
            }

            const lpoNum = req.lpoNumber || `LPO-${Date.now().toString().slice(-6)}`;
            const updatedReq = { ...req, lpoNumber: lpoNum };

            const dataUri = await generateLpoPdf(updatedReq, institution, companyDetails, companyDetails.logoUrl || null, supplier);
            await apiService.sendEmail(
                supplier.email,
                `Purchase Order - ${lpoNum}`,
                `Dear ${supplier.name},\n\nPlease find the attached Purchase Order from ${institution.name}.\n\nRequisition ID: ${req.id}\nTotal Value: KES ${req.totalEstimatedCost?.toLocaleString()}\n\nBest Regards,\n${currentUser.name}`,
                getInstitutionEmailConfig(institution),
                undefined,
                [{ filename: `LPO-${lpoNum}.pdf`, path: dataUri }]
            );

            if (onUpdateRequisition) {
                await onUpdateRequisition(req.id, { status: 'ordered', lpoNumber: lpoNum });
            }
            alert("LPO emailed successfully and marked as Ordered!");
            setIsLpoModalOpen(false);
        } catch (err) {
            console.error("Failed to email LPO:", err);
            alert("Failed to email LPO. Please try again.");
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handlePrintLpo = async (req: Requisition) => {
        if (!institution || !companyDetails) return;
        try {
            const supplier = suppliers.find(s => s.id === req.supplierId);
            const lpoNum = req.lpoNumber || `LPO-${Date.now().toString().slice(-6)}`;
            const updatedReq = { ...req, lpoNumber: lpoNum };

            const dataUri = await generateLpoPdf(updatedReq, institution, companyDetails, companyDetails.logoUrl || null, supplier);
            
            // Convert Data URI to Blob for more reliable window.open behavior
            const response = await fetch(dataUri);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const win = window.open(blobUrl);
            if (win) {
                win.focus();
                // Clean up the URL after consumption
                setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

                if (onUpdateRequisition) {
                    await onUpdateRequisition(req.id, { status: 'ordered', lpoNumber: lpoNum });
                }
                setIsLpoModalOpen(false);
            } else {
                alert("Please allow pop-ups to view the LPO.");
            }
        } catch (err) {
            console.error("Failed to generate/print LPO:", err);
            alert("Failed to generate LPO. Please try again.");
        }
    };

    const handleAddItem = () => {
        if (!newItem.name || newItem.quantity <= 0) return;
        setItems([...items, { name: newItem.name, quantity: newItem.quantity, unit: newItem.unit, unitCost: newItem.unitCost }]);
        setNewItem({ id: '', name: '', quantity: 1, unit: 'pcs', unitCost: 0 });
        setItemSearchQuery('');
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (items.length === 0 || !selectedStoreId) {
            setSubmitError('Please add at least one item using the Add button above.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError('');
        try {
            const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

            await onAddRequisition({
                storeId: selectedStoreId,
                requestedBy: currentUser.id,
                items,
                totalEstimatedCost: totalCost,
                submittedTo: isEducation ? submittedTo : undefined
            });

            setIsAddModalOpen(false);
            setItems([]);
            setSubmitError('');
            setSubmittedTo('');
        } catch (err: any) {
            console.error('Requisition submit error:', err);
            const detailedError = err?.details || err?.hint || err?.message || JSON.stringify(err);
            setSubmitError(`Failed to save: ${detailedError}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const myRequisitions = requisitions.filter(r => {
        if (currentUser.role === 'head_teacher' || currentUser.role === 'admin') {
            return r.institutionId === institutionId;
        }
        if (currentUser.role === 'finance' || currentUser.role === 'finance_officer') {
            return r.institutionId === institutionId && r.status !== 'pending' && r.status !== 'rejected';
        }
        return r.requestedBy === currentUser.id || retailStores.some(s => s.id === r.storeId);
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Stock Requisitions</h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Request new inventory from central management</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Request
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50 dark:border-slate-700">
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Store</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Items</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">LPO #</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {myRequisitions.map(req => (
                                <tr key={req.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="py-5 text-xs font-bold text-slate-500">{new Date(req.requestedDate).toLocaleDateString()}</td>
                                    <td className="py-5">
                                        <span className="text-xs font-black uppercase tracking-tight text-slate-900">
                                            {retailStores.find(s => s.id === req.storeId)?.name || 'Central'}
                                        </span>
                                    </td>
                                    <td className="py-5 text-xs font-medium text-slate-600">
                                        <div>{req.items.length} Product(s)</div>
                                        {isEducation && req.submittedTo && (
                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                                                Direct to: {allUsers.find(u => u.id === req.submittedTo)?.name || 'Head Teacher'}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-5">
                                        <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border ${
                                            req.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            req.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            req.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                            req.status === 'ordered' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                            req.status === 'received' ? 'bg-teal-50 text-teal-600 border-teal-100' :
                                            'bg-slate-50 text-slate-500 border-slate-100'
                                        }`}>
                                            {req.status === 'pending' ? 'Pending Review' :
                                             req.status === 'accepted' ? 'Approved by Principal' :
                                             req.status === 'rejected' ? 'Rejected' :
                                             req.status === 'ordered' ? 'LPO Dispatched' :
                                             req.status === 'received' ? 'Received' :
                                             req.status}
                                        </span>
                                        {req.status === 'rejected' && req.rejectionReason && (
                                            <p className="text-[9px] text-red-500 font-bold mt-1 max-w-[150px] truncate" title={req.rejectionReason}>
                                                Note: {req.rejectionReason}
                                            </p>
                                        )}
                                    </td>
                                    <td className="py-5 text-right font-black text-slate-900 text-xs">
                                        <div className="flex items-center justify-end gap-3">
                                            {req.lpoNumber || '-'}
                                            
                                            {/* File details review action button */}
                                            <button
                                                onClick={() => {
                                                    setSelectedReqForReview(req);
                                                    setIsReviewModalOpen(true);
                                                }}
                                                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                                                title="View Full Requisition"
                                            >
                                                <FileIcon className="w-4 h-4" />
                                            </button>

                                            {/* Generate LPO for finance users */}
                                            {(currentUser.role === 'finance' || currentUser.role === 'finance_officer') && req.status === 'accepted' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedLpo(req);
                                                        setIsLpoModalOpen(true);
                                                    }}
                                                    className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                                                    title="Generate & Dispatch LPO"
                                                >
                                                    <PrinterIcon className="w-4 h-4" />
                                                </button>
                                            )}

                                            {/* Mark as received for ordered items */}
                                            {req.status === 'ordered' && onUpdateRequisition && (
                                                <button
                                                    onClick={() => onUpdateRequisition(req.id, { status: 'received' })}
                                                    className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors group/btn"
                                                    title="Mark as Received"
                                                >
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {myRequisitions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <FileIcon className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No requisitions submitted yet</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Requisition Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">New Stock Request</h3>
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Inventory Replenishment</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <PlusIcon className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requesting Store</label>
                                <select
                                    value={selectedStoreId}
                                    onChange={(e) => setSelectedStoreId(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {retailStores.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add Items</label>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                        <SearchIcon className="w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search inventory..."
                                            value={itemSearchQuery}
                                            onChange={(e) => setItemSearchQuery(e.target.value)}
                                            className="bg-transparent border-none text-[10px] font-bold outline-none flex-1"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="col-span-2">
                                            <select
                                                value={newItem.id}
                                                onChange={(e) => {
                                                    const prod = inventory.find(i => i.id === e.target.value);
                                                    setNewItem({ ...newItem, id: prod?.id || '', name: prod?.name || '', unit: prod?.unit || 'pcs', unitCost: prod?.costPrice || 0 })
                                                }}
                                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                                            >
                                                <option value="">Select Product...</option>
                                                {inventory
                                                    .filter(i => i.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) || i.sku.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                                                    .map(i => (
                                                        <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit} in stock)</option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="Qty"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black outline-none"
                                    />
                                    <button
                                        onClick={handleAddItem}
                                        className="bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                                    >
                                        Add
                                    </button>
                                </div>

                                <div className="max-h-[200px] overflow-y-auto border border-slate-50 rounded-2xl">
                                    <table className="w-full text-left text-[10px]">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="p-3 font-black uppercase text-slate-400">Item</th>
                                                <th className="p-3 font-black uppercase text-slate-400 text-center">Qty</th>
                                                <th className="p-3 font-black uppercase text-slate-400 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="p-3 font-bold text-slate-700">{item.name}</td>
                                                    <td className="p-3 font-black text-slate-900 text-center">{item.quantity} {item.unit}</td>
                                                    <td className="p-3 text-right">
                                                        <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {isEducation && (
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                                        Submit Direct to Head Teacher / Principal
                                    </label>
                                    <select
                                        value={submittedTo}
                                        onChange={(e) => setSubmittedTo(e.target.value)}
                                        className="w-full h-12 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 font-bold text-xs uppercase tracking-wider focus:border-indigo-600 outline-none transition-all"
                                    >
                                        <option value="">- Select Recipient -</option>
                                        {headTeachers.map(ht => (
                                            <option key={ht.id} value={ht.id}>
                                                {ht.name} ({ht.role === 'head_teacher' ? 'Head Teacher' : 'Admin'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {submitError && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                                    <XCircleIcon className="w-5 h-5 text-red-500" />
                                    <p className="text-[10px] font-black uppercase tracking-tight text-red-600">{submitError}</p>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-4 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all underline"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={items.length === 0 || isSubmitting}
                                    onClick={handleSubmit}
                                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <ClockIcon className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : 'Submit Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LPO Preview Modal */}
            {isLpoModalOpen && selectedLpo && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Purchase Order</h3>
                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mt-1">LPO Preview & Dispatch</p>
                            </div>
                            <button onClick={() => setIsLpoModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <PlusIcon className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reference</p>
                                    <p className="text-sm font-black text-slate-900">{selectedLpo.lpoNumber || 'DRAFT'}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Value</p>
                                    <p className="text-sm font-black text-indigo-600">KES {selectedLpo.totalEstimatedCost?.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier</p>
                                    {!selectedLpo.supplierId && (
                                        <button 
                                            onClick={() => alert("Please go to the 'Vendors' tab to register a new supplier.")}
                                            className="text-[9px] font-black uppercase text-indigo-600 hover:underline"
                                        >
                                            + Register New Vendor
                                        </button>
                                    )}
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                    {selectedLpo.supplierId ? (
                                        <>
                                            <p className="text-xs font-black text-slate-900">{suppliers.find(s => s.id === selectedLpo.supplierId)?.name}</p>
                                            <p className="text-[10px] font-bold text-slate-500 mt-1">{suppliers.find(s => s.id === selectedLpo.supplierId)?.email || 'No email set'}</p>
                                        </>
                                    ) : (
                                        <div className="space-y-3">
                                            <select
                                                onChange={async (e) => {
                                                    const supplierId = e.target.value;
                                                    if (supplierId && onUpdateRequisition) {
                                                        await onUpdateRequisition(selectedLpo.id, { supplierId });
                                                        setSelectedLpo({ ...selectedLpo, supplierId });
                                                    }
                                                }}
                                                className="w-full bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="">- Select a Vendor -</option>
                                                {suppliers.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                            <p className="text-[9px] font-bold text-slate-400 italic">Required to generate PDF or Email.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Requisition Items list for Finance/Bursar preview */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requisition Items</p>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl max-h-[150px] overflow-y-auto">
                                    <table className="w-full text-left text-[10px]">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-slate-400 font-black uppercase">
                                                <th className="pb-2">Item</th>
                                                <th className="pb-2 text-center">Qty</th>
                                                <th className="pb-2 text-right">Est. Unit Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                            {selectedLpo.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="py-2">{item.name}</td>
                                                    <td className="py-2 text-center">{item.quantity} {item.unit}</td>
                                                    <td className="py-2 text-right">KES {item.unitCost?.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <button
                                    onClick={() => handlePrintLpo(selectedLpo)}
                                    className="w-full py-4 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-3"
                                >
                                    <PrinterIcon className="w-4 h-4" />
                                    Generate & Print PDF
                                </button>
                                
                                <button
                                    disabled={!selectedLpo.supplierId || isSendingEmail}
                                    onClick={() => handleEmailLpo(selectedLpo)}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                                >
                                    {isSendingEmail ? (
                                        <ClockIcon className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <MailIcon className="w-4 h-4" />
                                    )}
                                    Email to Supplier
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Requisition Review & Details Modal */}
            {isReviewModalOpen && selectedReqForReview && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Requisition Review</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                                    ID: #{selectedReqForReview.id.slice(-6).toUpperCase()}
                                </p>
                            </div>
                            <button onClick={() => { setIsReviewModalOpen(false); setShowRejectInput(false); setRejectReason(''); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <PlusIcon className="w-6 h-6 rotate-45 text-white" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8 max-h-[80vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requested By</p>
                                    <p className="text-xs font-black text-slate-900 mt-1">
                                        {allUsers.find(u => u.id === selectedReqForReview.requestedBy)?.name || 'Store Manager'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date Requested</p>
                                    <p className="text-xs font-black text-slate-900 mt-1">
                                        {new Date(selectedReqForReview.requestedDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requested Items</p>
                                <div className="border border-slate-100 rounded-3xl overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50">
                                            <tr className="border-b border-slate-100">
                                                <th className="p-4 font-black uppercase text-[9px] tracking-wider text-slate-400">Item Name</th>
                                                <th className="p-4 font-black uppercase text-[9px] tracking-wider text-slate-400 text-center">Qty</th>
                                                <th className="p-4 font-black uppercase text-[9px] tracking-wider text-slate-400 text-right">Est. Unit Cost</th>
                                                <th className="p-4 font-black uppercase text-[9px] tracking-wider text-slate-400 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedReqForReview.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="p-4 font-bold text-slate-800">{item.name}</td>
                                                    <td className="p-4 text-center font-bold text-slate-600">{item.quantity} {item.unit}</td>
                                                    <td className="p-4 text-right font-semibold text-slate-600">KES {item.unitCost?.toLocaleString()}</td>
                                                    <td className="p-4 text-right font-black text-indigo-600">KES {(item.quantity * item.unitCost)?.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-50 font-black">
                                                <td colSpan={3} className="p-4 text-right uppercase text-[9px] tracking-wider text-slate-400">Total Value</td>
                                                <td className="p-4 text-right text-indigo-600 text-sm">KES {selectedReqForReview.totalEstimatedCost?.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {selectedReqForReview.rejectionReason && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-red-500">Rejection Note</p>
                                    <p className="text-xs font-bold text-red-700 mt-1">{selectedReqForReview.rejectionReason}</p>
                                </div>
                            )}

                            {selectedReqForReview.status === 'pending' && (currentUser.role === 'head_teacher' || currentUser.role === 'admin') && (
                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    {!showRejectInput ? (
                                        <div className="flex gap-4">
                                            <button
                                                onClick={async () => {
                                                    if (onUpdateRequisition) {
                                                        await onUpdateRequisition(selectedReqForReview.id, { status: 'accepted' });
                                                        
                                                        // Notify Finance Users
                                                        const financeUsers = (allUsers || []).filter(u => 
                                                            (u.role === 'finance' || u.role === 'finance_officer') && 
                                                            u.institutionId === institutionId
                                                        );
                                                        for (const fu of financeUsers) {
                                                            await apiService.createNotification(
                                                                fu.id, 
                                                                `Stock Requisition approved by ${currentUser.name} (Value: KES ${selectedReqForReview.totalEstimatedCost?.toLocaleString()}). Please dispatch LPO.`, 
                                                                'success'
                                                            );
                                                        }
                                                        
                                                        setIsReviewModalOpen(false);
                                                        alert("Requisition approved and forwarded to Finance!");
                                                    }
                                                }}
                                                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                Accept & Forward to Finance
                                            </button>
                                            <button
                                                onClick={() => setShowRejectInput(true)}
                                                className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                                            >
                                                Reject Request
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Rejection Note / Reason</label>
                                                <textarea
                                                    value={rejectReason}
                                                    onChange={(e) => setRejectReason(e.target.value)}
                                                    placeholder="Provide a brief reason for rejecting this requisition..."
                                                    className="w-full p-4 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none bg-transparent"
                                                    rows={3}
                                                />
                                            </div>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setShowRejectInput(false)}
                                                    className="flex-1 py-4 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                                                >
                                                    Back
                                                </button>
                                                <button
                                                    disabled={!rejectReason.trim()}
                                                    onClick={async () => {
                                                        if (onUpdateRequisition) {
                                                            await onUpdateRequisition(selectedReqForReview.id, { status: 'rejected', rejectionReason: rejectReason });
                                                            
                                                            await apiService.createNotification(
                                                                selectedReqForReview.requestedBy,
                                                                `Your Requisition (Value: KES ${selectedReqForReview.totalEstimatedCost?.toLocaleString()}) was rejected by ${currentUser.name}. Note: ${rejectReason}`,
                                                                'warning'
                                                            );
                                                            
                                                            setIsReviewModalOpen(false);
                                                            setShowRejectInput(false);
                                                            setRejectReason('');
                                                            alert("Requisition rejected and sender notified.");
                                                        }
                                                    }}
                                                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95"
                                                >
                                                    Confirm Rejection
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

