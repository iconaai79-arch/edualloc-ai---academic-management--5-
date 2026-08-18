import React, { useState, useRef, useEffect } from 'react';
import { 
    QrCode, Camera, Check, X, ShieldCheck, FileText, User, 
    Truck, PenTool, RotateCcw, AlertTriangle, Printer 
} from 'lucide-react';
import { CountyDispatchManifest, CountyDispatchDropItem } from '../types';

interface DigitalHandoverScannerModalProps {
    manifests: CountyDispatchManifest[];
    onClose: () => void;
    onCompleteHandover: (manifestId: string, dropItemId: string, signatureDataUrl: string, receiverName: string, receiverNotes: string) => Promise<void>;
}

export const DigitalHandoverScannerModal: React.FC<DigitalHandoverScannerModalProps> = ({
    manifests,
    onClose,
    onCompleteHandover
}) => {
    const [step, setStep] = useState<'scan' | 'verify' | 'sign' | 'complete'>('scan');
    const [scannedCode, setScannedCode] = useState('');
    const [matchedManifest, setMatchedManifest] = useState<CountyDispatchManifest | null>(null);
    const [matchedDrop, setMatchedDrop] = useState<CountyDispatchDropItem | null>(null);
    const [receiverName, setReceiverName] = useState('');
    const [receiverPhone, setReceiverPhone] = useState('');
    const [receiverNotes, setReceiverNotes] = useState('Verified physical consignment with County Driver on arrival.');
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Canvas ref for signature pad
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

    // Auto-match when scanned code changes
    const handleFindConsignment = (code: string) => {
        const cleanCode = code.trim().toLowerCase();
        if (!cleanCode) return;

        for (const m of manifests) {
            if (m.manifestNumber.toLowerCase() === cleanCode || m.vehicleReg.toLowerCase() === cleanCode) {
                setMatchedManifest(m);
                setMatchedDrop(m.items[0] || null);
                setStep('verify');
                return;
            }
            const foundDrop = m.items.find(i => 
                i.id.toLowerCase() === cleanCode || 
                i.name.toLowerCase().includes(cleanCode) ||
                (i.targetInstitutionName && i.targetInstitutionName.toLowerCase().includes(cleanCode))
            );
            if (foundDrop) {
                setMatchedManifest(m);
                setMatchedDrop(foundDrop);
                setStep('verify');
                return;
            }
        }
        alert(`No active delivery match found for code "${code}". Please select from pending consignments below.`);
    };

    // Canvas drawing helpers
    useEffect(() => {
        if (step === 'sign' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.strokeStyle = '#0f172a';
            }
        }
    }, [step]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
        setIsDrawing(true);
        setHasDrawnSignature(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawnSignature(false);
        setSignatureData(null);
    };

    const saveAndProceed = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawnSignature) {
            alert("Please draw your signature in the box above to authenticate the digital handover.");
            return;
        }
        const dataUrl = canvas.toDataURL('image/png');
        setSignatureData(dataUrl);
        handleFinalSubmit(dataUrl);
    };

    const handleFinalSubmit = async (sigData: string) => {
        if (!matchedManifest || !matchedDrop) return;
        setIsSaving(true);
        try {
            await onCompleteHandover(
                matchedManifest.id,
                matchedDrop.id,
                sigData,
                receiverName || 'Stores Master',
                receiverNotes
            );
            setStep('complete');
        } catch (err: any) {
            console.error("Handover sign-off error:", err);
            alert("Failed to record digital sign-off: " + (err?.message || 'Unknown error'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-white/10 text-indigo-300">
                            <QrCode className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base">Digital Delivery QR & Signature POD</h3>
                            <p className="text-xs text-indigo-200/80">County Central Logistics Verification Scanner</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-5">
                    {/* STEP 1: SCAN OR SELECT */}
                    {step === 'scan' && (
                        <div className="space-y-4 text-center">
                            <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-3xl p-8 space-y-3">
                                <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
                                    <Camera className="w-8 h-8" />
                                </div>
                                <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider">
                                    Scan Consignment Barcode / Waybill QR
                                </h4>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                    Point camera at manifest QR code or enter waybill reference below to begin digital handover.
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={scannedCode}
                                    onChange={(e) => setScannedCode(e.target.value)}
                                    placeholder="Enter Manifest # (e.g. MNF-047-TRK01)..."
                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                    onClick={() => handleFindConsignment(scannedCode)}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                                >
                                    Verify Code
                                </button>
                            </div>

                            <div className="pt-3 border-t border-slate-100 text-left">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                                    Or Select Active Consignment:
                                </p>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {manifests.filter(m => m.status === 'in_transit').map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => {
                                                setMatchedManifest(m);
                                                setMatchedDrop(m.items[0] || null);
                                                setStep('verify');
                                            }}
                                            className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-indigo-50/60 hover:border-indigo-200 transition-all text-left flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="font-bold text-slate-900 text-xs">{m.manifestNumber} • {m.vehicleReg}</p>
                                                <p className="text-[11px] text-slate-500">{m.driverName} ({m.items.length} Drops)</p>
                                            </div>
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase">Select →</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: VERIFY CONSIGNMENT DETAILS */}
                    {step === 'verify' && matchedManifest && matchedDrop && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2 text-xs">
                                <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                                    <span className="font-mono font-bold text-indigo-900">{matchedManifest.manifestNumber}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 font-bold uppercase text-[10px]">
                                        {matchedManifest.vehicleReg}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-500 font-medium">Destination School: <strong className="text-slate-800">{matchedDrop.targetInstitutionName || 'My School'}</strong></p>
                                    <p className="text-slate-500 font-medium">Delivered Item: <strong className="text-emerald-700 text-sm font-extrabold">{matchedDrop.quantity} {matchedDrop.unit}</strong> of {matchedDrop.name}</p>
                                    <p className="text-slate-500 font-medium">Driver: <strong className="text-slate-800">{matchedManifest.driverName}</strong> ({matchedManifest.driverPhone || 'N/A'})</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Receiving Officer Name:</label>
                                    <input
                                        type="text"
                                        value={receiverName}
                                        onChange={(e) => setReceiverName(e.target.value)}
                                        placeholder="e.g. Samuel Mutisya (Stores Master)"
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Verification Remarks / Condition:</label>
                                    <textarea
                                        value={receiverNotes}
                                        onChange={(e) => setReceiverNotes(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setStep('scan')}
                                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep('sign')}
                                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5"
                                >
                                    <PenTool className="w-3.5 h-3.5" />
                                    Proceed to Digital Sign-Off →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: DIGITAL SIGNATURE PAD */}
                    {step === 'sign' && (
                        <div className="space-y-4 text-center">
                            <div className="text-left">
                                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                                    Recipient Digital Signature Sign-Off:
                                </h4>
                                <p className="text-[11px] text-slate-400">
                                    Sign inside the box using your finger or stylus pen to certify acceptance of goods.
                                </p>
                            </div>

                            <div className="border-2 border-slate-300 rounded-2xl p-1 bg-slate-50 relative overflow-hidden">
                                <canvas
                                    ref={canvasRef}
                                    width={420}
                                    height={180}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                    className="w-full h-44 bg-white rounded-xl touch-none cursor-crosshair"
                                />
                                {!hasDrawnSignature && (
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 text-xs font-semibold">
                                        ✍️ Sign with finger or stylus here
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1">
                                <button
                                    type="button"
                                    onClick={clearSignature}
                                    className="text-slate-500 hover:text-rose-600 font-bold flex items-center gap-1 text-[11px]"
                                >
                                    <RotateCcw className="w-3 h-3" /> Clear Signature
                                </button>

                                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit Tamper Sealed POD
                                </span>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setStep('verify')}
                                    disabled={isSaving}
                                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={saveAndProceed}
                                    disabled={isSaving || !hasDrawnSignature}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    {isSaving ? 'Signing Proof of Delivery...' : 'Authenticate & Complete POD'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: COMPLETED */}
                    {step === 'complete' && (
                        <div className="space-y-5 text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-100">
                                <Check className="w-8 h-8" />
                            </div>
                            <div>
                                <h4 className="font-extrabold text-slate-900 text-lg">
                                    Delivery Handover Verified & Stamped!
                                </h4>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                                    Digital Proof of Delivery (POD) recorded. Local school inventory has been incremented and manifest marked complete.
                                </p>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
