import React, { useRef } from 'react';
import { CountyInventoryItem, Institution, County, CountyDispatchManifest } from '../types';
import { 
    Printer, X, Truck, QrCode, CheckCircle2, Shield, 
    Building2, Calendar, User, MapPin, FileText, Download,
    Check, ArrowRight, Package
} from 'lucide-react';

interface CountyWaybillModalProps {
    item?: CountyInventoryItem | null;
    manifest?: CountyDispatchManifest | null;
    county?: County;
    destinationInstitution?: Institution;
    institutions?: Institution[];
    onClose: () => void;
    onMarkDelivered?: (item: CountyInventoryItem) => void;
    onMarkManifestDelivered?: (manifestId: string) => void;
    onMarkDropDelivered?: (manifestId: string, dropId: string) => void;
}

export const CountyWaybillModal: React.FC<CountyWaybillModalProps> = ({
    item,
    manifest,
    county,
    destinationInstitution,
    institutions = [],
    onClose,
    onMarkDelivered,
    onMarkManifestDelivered,
    onMarkDropDelivered
}) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        window.print();
    };

    const isManifest = !!manifest;

    const waybillNumber = manifest 
        ? manifest.manifestNumber || `MNF-${(county?.code || 'CTY')}-${manifest.id.slice(-6).toUpperCase()}`
        : item?.trackingNumber || `WB-${(county?.code || 'CTY')}-${item?.id.slice(-6).toUpperCase()}`;

    const rawDate = manifest ? manifest.dispatchDate : item?.dispatchedAt || item?.dispatchedDate;
    const dispatchDate = rawDate ? new Date(rawDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB');

    const vehicleReg = manifest ? manifest.vehicleReg : (item?.vehicleReg || item?.trackingNumber || 'GK Truck');
    const driverName = manifest ? manifest.driverName : (item?.driverName || 'Designated Driver');
    const driverPhone = manifest ? manifest.driverPhone : item?.driverPhone;
    const departureDepot = manifest ? manifest.departureDepot : (item?.departureDepot || 'Central County HQ Logistics Warehouse');
    const routeDesc = manifest ? manifest.routeDescription : item?.routeDescription;

    // Group manifest items by destination institution
    const dropsBySchool = isManifest && manifest?.items ? manifest.items.reduce((acc, drop) => {
        const key = drop.targetInstitutionId || 'unassigned';
        if (!acc[key]) {
            const inst = institutions.find(i => i.id === drop.targetInstitutionId);
            acc[key] = {
                institution: inst,
                schoolName: inst?.name || drop.targetInstitutionName || 'Destination School',
                subCounty: inst?.subCounty || 'County HQ',
                items: [] as typeof manifest.items
            };
        }
        acc[key].items.push(drop);
        return acc;
    }, {} as Record<string, { institution?: Institution; schoolName: string; subCounty: string; items: typeof manifest.items }>) : {};

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full border border-slate-100 overflow-hidden my-8">
                {/* Header Modal Bar */}
                <div className="bg-slate-900 px-8 py-5 text-white flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                            {isManifest ? <Truck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="text-base font-black uppercase tracking-tight">
                                {isManifest ? 'Multi-School Consignment Trip Manifest' : 'Official Supply Chain Waybill'}
                            </h3>
                            <p className="text-[10px] font-mono text-slate-400">Waybill / Manifest ID: {waybillNumber}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                        >
                            <Printer className="w-4 h-4" /> Print Document
                        </button>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Printable Document Body */}
                <div ref={printRef} className="p-8 md:p-12 space-y-8 bg-white text-slate-900 print:p-0">
                    {/* Official Letterhead */}
                    <div className="text-center pb-6 border-b-2 border-slate-900 flex flex-col items-center">
                        {county?.logoUrl ? (
                            <img src={county.logoUrl} alt="County Logo" className="w-16 h-16 object-contain mb-2" />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-black text-xl mb-2">
                                {county?.code || 'CTY'}
                            </div>
                        )}
                        <h1 className="text-xl font-black uppercase tracking-wide text-slate-900">
                            COUNTY GOVERNMENT OF {(county?.name || 'COUNTY').toUpperCase()}
                        </h1>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
                            Department of Education, Vocational Training & Supply Logistics
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 mt-1">
                            {county?.address || 'County Headquarters, P.O. Box Private Bag'} • {county?.email || 'supplies@county.go.ke'}
                        </p>
                        <div className="mt-3 inline-block px-4 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-black uppercase tracking-widest border border-slate-300">
                            {isManifest ? 'OFFICIAL MULTI-SCHOOL CONSIGNMENT & TRUCK TRIP MANIFEST' : 'OFFICIAL GOODS DISPATCH & DELIVERY NOTE'}
                        </div>
                    </div>

                    {/* Metadata Strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Waybill / Manifest Ref:</span>
                            <span className="font-mono font-black text-indigo-700">{waybillNumber}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Dispatch Date:</span>
                            <span className="font-bold text-slate-800">{dispatchDate}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Carrier Vehicle / Plate:</span>
                            <span className="font-mono font-black text-slate-900">{vehicleReg}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Status:</span>
                            <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-md inline-block ${
                                (isManifest ? manifest?.status === 'completed' : item?.status === 'received')
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                            }`}>
                                {isManifest ? (manifest?.status?.replace('_', ' ') || 'in transit') : (item?.status?.replace('_', ' ') || 'in transit')}
                            </span>
                        </div>
                    </div>

                    {/* Carrier & Logistics Route Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                            <div className="flex items-center gap-2 text-indigo-700 text-xs font-black uppercase tracking-wider">
                                <Building2 className="w-4 h-4" /> Origin Dispatch Depot
                            </div>
                            <div className="text-sm font-black text-slate-900 uppercase">{departureDepot}</div>
                            <div className="text-xs text-slate-600">Department of Procurement & Central Stores</div>
                            <div className="text-[11px] font-mono text-slate-500">Authorized by: County Stores Keeper</div>
                        </div>

                        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                            <div className="flex items-center gap-2 text-emerald-700 text-xs font-black uppercase tracking-wider">
                                <Truck className="w-4 h-4" /> Assigned Driver & Route Details
                            </div>
                            <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <span>{driverName}</span>
                                {driverPhone && (
                                    <span className="text-xs font-mono font-normal text-slate-600">({driverPhone})</span>
                                )}
                            </div>
                            <div className="text-xs text-slate-600">
                                {routeDesc ? `Route: ${routeDesc}` : 'Direct Sub-County Distribution Circuit'}
                            </div>
                            {isManifest && (
                                <div className="text-[11px] font-bold text-indigo-700">
                                    Delivering to {Object.keys(dropsBySchool).length} Destination Schools on this load
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Consignment Line Items Table */}
                    {isManifest && manifest ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">
                                    Consignment Breakdown by Destination School
                                </h4>
                                <span className="text-xs font-mono font-bold text-slate-500">
                                    Total Cargo: {manifest.totalUnits || manifest.items.reduce((s, i) => s + i.quantity, 0)} Units ({manifest.items.length} Line Items)
                                </span>
                            </div>

                            <div className="space-y-4">
                                {Object.entries(dropsBySchool).map(([instId, dropGroup], groupIdx) => (
                                    <div key={instId} className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                                        <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                                                    #{groupIdx + 1}
                                                </span>
                                                <span className="font-black text-sm text-slate-900 uppercase">
                                                    {dropGroup.schoolName}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 uppercase">
                                                    {dropGroup.subCounty}
                                                </span>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-indigo-700">
                                                {dropGroup.items.reduce((s, i) => s + i.quantity, 0)} Units
                                            </span>
                                        </div>

                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase font-black text-[9px]">
                                                <tr>
                                                    <th className="p-3">Item Description</th>
                                                    <th className="p-3">Category</th>
                                                    <th className="p-3 text-right">Quantity</th>
                                                    <th className="p-3">Recipient / Notes</th>
                                                    <th className="p-3 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {dropGroup.items.map((itemDrop) => (
                                                    <tr key={itemDrop.id} className="font-medium text-slate-800">
                                                        <td className="p-3">
                                                            <div className="font-bold text-slate-900 uppercase">{itemDrop.name}</div>
                                                        </td>
                                                        <td className="p-3 text-slate-600">{itemDrop.category || 'General Supplies'}</td>
                                                        <td className="p-3 font-black text-indigo-700 text-sm text-right">
                                                            {itemDrop.quantity} {itemDrop.unit}
                                                        </td>
                                                        <td className="p-3 text-slate-600 text-[11px]">
                                                            {itemDrop.recipientName ? `${itemDrop.recipientName} ${itemDrop.recipientPhone ? `(${itemDrop.recipientPhone})` : ''}` : 'School Storekeeper'}
                                                            {itemDrop.notes && <div className="text-[10px] text-slate-400 italic">{itemDrop.notes}</div>}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                                itemDrop.status === 'received' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                            }`}>
                                                                {itemDrop.status === 'received' ? 'Delivered' : 'In Transit'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* School Head Sign-off Bar per School */}
                                        <div className="bg-slate-50 p-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-600">
                                            <div>
                                                <strong>{dropGroup.schoolName} Receiving Sign-off:</strong> ____________________________
                                            </div>
                                            <div>
                                                <strong>Date:</strong> ____________ <strong>Stamp:</strong> [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : item ? (
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Bill of Consignment & Cargo</h4>
                            <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-black text-[10px]">
                                        <tr>
                                            <th className="p-3">#</th>
                                            <th className="p-3">Item Description</th>
                                            <th className="p-3">Category</th>
                                            <th className="p-3">Qty Dispatched</th>
                                            <th className="p-3">Manufacturer / Supplier</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="font-medium text-slate-800">
                                            <td className="p-3 font-mono font-bold text-slate-400">01</td>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-900 uppercase">{item.name}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">Tracking: {item.qrCode || item.trackingNumber || 'QR-VERIFIED'}</div>
                                            </td>
                                            <td className="p-3 text-slate-600">{item.category || 'General Supplies'}</td>
                                            <td className="p-3 font-black text-indigo-700 text-sm">
                                                {item.quantity} {item.unit}
                                            </td>
                                            <td className="p-3 text-slate-600">{item.supplierName || 'Government Procurement'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : null}

                    {/* Driver & Master Chain of Custody Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                        {/* Driver / Carrier Signature */}
                        <div className="p-4 rounded-2xl border border-dashed border-slate-300 space-y-3">
                            <div className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                                <Truck className="w-4 h-4 text-indigo-600" /> Carrier / Driver Custody Declaration
                            </div>
                            <div className="text-xs text-slate-700 font-medium space-y-1">
                                <div><strong>Driver Name:</strong> {driverName}</div>
                                <div><strong>Vehicle Reg:</strong> {vehicleReg}</div>
                            </div>
                            <div className="pt-6 border-b border-slate-300"></div>
                            <div className="text-[10px] font-mono text-slate-400 text-center uppercase">Driver Signature & Departure Date</div>
                        </div>

                        {/* Central Stores Clearance */}
                        <div className="p-4 rounded-2xl border border-dashed border-slate-300 space-y-3">
                            <div className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Central Warehouse Clearance
                            </div>
                            <div className="text-xs text-slate-700 font-medium space-y-1">
                                <div><strong>Cleared By:</strong> County Stores Controller</div>
                                <div><strong>Dispatch Gate Stamp:</strong> Verified for Multi-Drop Transit</div>
                            </div>
                            <div className="pt-6 border-b border-slate-300"></div>
                            <div className="text-[10px] font-mono text-slate-400 text-center uppercase">Stores Controller Official Stamp & Sign</div>
                        </div>
                    </div>

                    {/* Footer Verification Notice */}
                    <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-1">
                        <p className="font-mono">This is an automated legal chain-of-custody dispatch manifest issued by the County Government ERP.</p>
                        <p>Upon delivery, each receiving institution head must sign and stamp their respective drop-off entry.</p>
                    </div>
                </div>

                {/* Bottom Action Footer (Screen only) */}
                <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-between print:hidden">
                    <div className="text-xs text-slate-500 font-medium">
                        Need an electronic audit record? Print or save as PDF.
                    </div>

                    <div className="flex items-center gap-3">
                        {isManifest && manifest && manifest.status !== 'completed' && onMarkManifestDelivered && (
                            <button
                                onClick={() => {
                                    onMarkManifestDelivered(manifest.id);
                                    onClose();
                                }}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                            >
                                <Check className="w-4 h-4" /> Mark All Drops Delivered
                            </button>
                        )}
                        {!isManifest && item && item.status === 'in_transit' && onMarkDelivered && (
                            <button
                                onClick={() => {
                                    onMarkDelivered(item);
                                    onClose();
                                }}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                            >
                                Confirm Delivery Received
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
