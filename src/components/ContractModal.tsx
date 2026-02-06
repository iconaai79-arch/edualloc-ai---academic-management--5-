import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { LecturerContract, User, Institution, LetterheadConfig } from '../types';
// Fixed: Added missing ClipboardListIcon import
import { XIcon, PrinterIcon, DocumentArrowDownIcon, ClipboardListIcon } from './icons';
import { generateContractPdf } from '../services/pdfService';
import { BrandedPaper } from './BrandedPaper';

interface ContractModalProps {
  contract: LecturerContract;
  user: User;
  institution: Institution;
  letterheadConfig: LetterheadConfig;
  footerImageUrl: string | null;
  onClose: () => void;
  onAccept: (signatureUrl: string) => void;
  onReject: (reason: string) => void;
  isPreview?: boolean;
}

export const ContractModal: React.FC<ContractModalProps> = ({ contract, user, institution, letterheadConfig, footerImageUrl, onClose, onAccept, onReject, isPreview = false }) => {
    const [showRejectionForm, setShowRejectionForm] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);

    const getCanvasContext = () => canvasRef.current?.getContext('2d');

    const getCoordinates = (event: MouseEvent | TouchEvent): { x: number, y: number } | null => {
        if (!canvasRef.current) return null;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const touch = event instanceof MouseEvent ? event : event.touches[0];
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const startDrawing = useCallback((event: MouseEvent | TouchEvent) => {
        event.preventDefault();
        const coords = getCoordinates(event);
        if (!coords) return;
        const ctx = getCanvasContext();
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
            setIsDrawing(true);
            if (!hasSigned) setHasSigned(true);
        }
    }, [hasSigned]);

    const draw = useCallback((event: MouseEvent | TouchEvent) => {
        if (!isDrawing) return;
        event.preventDefault();
        const coords = getCoordinates(event);
        if (!coords) return;
        const ctx = getCanvasContext();
        if (ctx) {
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
        }
    }, [isDrawing]);

    const stopDrawing = useCallback(() => setIsDrawing(false), []);

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = getCanvasContext();
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasSigned(false);
        }
    };

    useEffect(() => {
        if (isPreview) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        }
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);
        return () => {
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('mouseleave', stopDrawing);
            canvas.removeEventListener('touchstart', startDrawing);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', stopDrawing);
        };
    }, [isPreview, startDrawing, draw, stopDrawing]);


    const handleAccept = () => {
        if (!hasSigned || !canvasRef.current) {
            alert('Please sign the contract in the space provided before accepting.');
            return;
        }
        const signatureUrl = canvasRef.current.toDataURL('image/png');
        onAccept(signatureUrl);
    };

    const handleRejectSubmit = () => {
        if (!rejectionReason.trim()) {
            alert('Please provide a reason for rejecting the contract.');
            return;
        }
        onReject(rejectionReason);
    };

    const handleDownload = async () => {
        setIsGeneratingPdf(true);
        try {
            const signatureUrl: string | null = isPreview ? (contract.signatureUrl ?? null) : (hasSigned && canvasRef.current ? canvasRef.current.toDataURL('image/png') : null);
            const pdfDataUri = await generateContractPdf(contract, user, institution, letterheadConfig, footerImageUrl, signatureUrl);
            const link = document.createElement('a');
            link.href = pdfDataUri;
            link.download = `Contract_${user.name.replace(/\s/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) { 
            console.error("PDF Download Error:", e);
            alert("An error occurred while generating the PDF.");
        }
        finally { setIsGeneratingPdf(false); }
    };
    
    const handlePrint = async () => {
        setIsGeneratingPdf(true);
        try {
            const signatureUrl: string | null = isPreview ? (contract.signatureUrl ?? null) : (hasSigned && canvasRef.current ? canvasRef.current.toDataURL('image/png') : null);
            const pdfDataUri = await generateContractPdf(contract, user, institution, letterheadConfig, footerImageUrl, signatureUrl);
            const pdfWindow = window.open("");
            pdfWindow?.document.write(`<html><head><title>Print Contract</title></head><body style="margin: 0; padding: 0;"><iframe width='100%' height='100%' style="border: none;" src='${pdfDataUri}'></iframe></body></html>`);
            pdfWindow?.document.close();
            pdfWindow?.focus();
        } catch (error) {
            console.error("PDF Print Error:", error);
            alert("An error occurred while preparing the document for printing.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
    <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <ClipboardListIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Teaching Contract & Workload Agreement</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} disabled={isGeneratingPdf} className="btn-secondary inline-flex items-center gap-2 text-sm"><PrinterIcon className="w-4 h-4" /> Print</button>
            <button onClick={handleDownload} disabled={isGeneratingPdf} className="btn-secondary inline-flex items-center gap-2 text-sm"><DocumentArrowDownIcon className="w-4 h-4" /> Download</button>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <XIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 sm:p-8 bg-slate-200 dark:bg-slate-950 flex justify-center">
            <BrandedPaper 
                institution={institution} 
                letterheadConfig={letterheadConfig} 
                footerImageUrl={footerImageUrl}
            >
                <div className="prose dark:prose-invert max-w-none">
                    <style>{`
                        .prose h1, .prose h3 { margin-top: 1em; margin-bottom: 0.5em; color: #0f172a; }
                        .prose p { color: #334155; line-height: 1.6; margin-bottom: 1em; }
                        .prose hr { margin-top: 1.5em; margin-bottom: 1.5em; border-color: #e2e8f0; }
                        .prose li { color: #334155; }
                    `}</style>
                    {contract.content.split('\n').map((line, index) => {
                        if (line.startsWith('# ')) return <h1 key={index}>{line.substring(2)}</h1>;
                        if (line.startsWith('### ')) return <h3 key={index}>{line.substring(4)}</h3>;
                        if (line.startsWith('- ')) return <li key={index}>{line.substring(2)}</li>;
                        if (line.trim() === '---') return <hr key={index} />;
                        return <p key={index}>{line}</p>;
                    })}

                    {contract.signatureUrl && isPreview && (
                         <div className="mt-12 pt-8 border-t border-slate-100">
                             <p className="text-xs font-bold uppercase text-slate-400 mb-2">Lecturer's Digital Signature</p>
                             <div className="inline-block p-4 border rounded-xl bg-slate-50">
                                <img src={contract.signatureUrl} alt="Signature" className="h-20 w-auto object-contain" />
                             </div>
                             <p className="mt-2 text-xs text-slate-500 italic">Signed electronically on {new Date(contract.acceptanceTimestamp || '').toLocaleString()}</p>
                         </div>
                    )}
                </div>
            </BrandedPaper>
        </div>
        
        {!showRejectionForm && !isPreview && (
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-8">
                    <div className="flex-1">
                        <label className="block text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3">
                            Confirm with Signature
                        </label>
                        <div className="relative group">
                            <canvas ref={canvasRef} width="450" height="150" className="w-full h-32 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 cursor-crosshair touch-none transition-all group-hover:border-indigo-400"></canvas>
                            <button type="button" onClick={clearSignature} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 transition-colors">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="sm:w-48 flex flex-col justify-center gap-3">
                         <button onClick={handleAccept} disabled={!hasSigned} className="w-full btn-primary h-12 shadow-lg shadow-indigo-200 disabled:opacity-50">Accept & Sign</button>
                         <button onClick={() => setShowRejectionForm(true)} className="w-full text-sm font-bold text-red-600 hover:bg-red-50 py-2 rounded-lg transition-all">Decline Offer</button>
                    </div>
                </div>
            </div>
        )}

        {showRejectionForm && (
             <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 animate-fade-in-up">
                 <div className="max-w-xl mx-auto">
                    <label htmlFor="rejectionReason" className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3">Reason for Rejection</label>
                    <textarea
                        id="rejectionReason"
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        rows={3}
                        className="w-full rounded-2xl border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-4 focus:ring-red-50 p-4 transition-all"
                        placeholder="Please explain why you are declining this contract..."
                    />
                    <div className="mt-4 flex justify-end gap-3">
                        <button onClick={() => setShowRejectionForm(false)} className="btn-secondary">Cancel</button>
                        <button onClick={handleRejectSubmit} className="btn-danger">Confirm Rejection</button>
                    </div>
                 </div>
            </div>
        )}
      </div>
       <style>{`
            .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.75rem; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; }
            .btn-primary:hover:not(:disabled) { filter: brightness(0.9); transform: translateY(-1px); }
            .btn-danger { padding: 0.5rem 1rem; background-color: #dc2626; color: white; border-radius: 0.75rem; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; }
            .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #475569; border-radius: 0.75rem; font-weight: 600; border: 1px solid #e2e8f0; cursor: pointer; }
            .dark .btn-secondary { background-color: #1e293b; color: #f1f5f9; border-color: #334155; }
        `}</style>
    </div>
  );
};