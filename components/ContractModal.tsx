import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { LecturerContract, User, Institution, LetterheadConfig } from '../types';
import { XIcon, PrinterIcon, DocumentArrowDownIcon } from './icons';
import { generateContractPdf } from '../services/pdfService';

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
        if (isPreview) return; // Don't attach drawing listeners in preview mode
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
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
        } catch (e) {
            console.error("PDF Print Error:", e);
            alert("An error occurred while preparing the document for printing.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Teaching Contract & Workload Agreement</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} disabled={isGeneratingPdf} className="btn-secondary inline-flex items-center gap-2 text-sm"><PrinterIcon className="w-4 h-4" /> Print</button>
            <button onClick={handleDownload} disabled={isGeneratingPdf} className="btn-secondary inline-flex items-center gap-2 text-sm"><DocumentArrowDownIcon className="w-4 h-4" /> Download</button>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                <XIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 prose dark:prose-invert max-w-none">
            <style>{`
                .prose h1, .prose h3 { margin-top: 1em; margin-bottom: 0.5em; }
                .prose hr { margin-top: 1.5em; margin-bottom: 1.5em; }
            `}</style>
            {contract.content.split('\n').map((line, index) => {
                if (line.startsWith('# ')) return <h1 key={index}>{line.substring(2)}</h1>;
                if (line.startsWith('### ')) return <h3 key={index}>{line.substring(4)}</h3>;
                if (line.startsWith('- ')) return <li key={index}>{line.substring(2)}</li>;
                if (line.trim() === '---') return <hr key={index} />;
                return <p key={index}>{line}</p>;
            })}
        </div>
        
        {!showRejectionForm && !isPreview && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Signature Confirmation
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">Please sign below to confirm your acceptance of this contract.</p>
                <div className="mt-2 relative">
                    <canvas ref={canvasRef} width="450" height="150" className="w-full h-36 bg-slate-100 dark:bg-slate-700 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600 cursor-crosshair touch-none"></canvas>
                </div>
                <button type="button" onClick={clearSignature} className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:brightness-125">Clear Signature</button>
            </div>
        )}

        {isPreview && contract.signatureUrl && (
             <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Lecturer's Signature
                </label>
                <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-md inline-block">
                    <img src={contract.signatureUrl} alt="Lecturer's signature" className="h-24 w-auto" />
                </div>
             </div>
        )}

        {showRejectionForm ? (
             <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                 <label htmlFor="rejectionReason" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reason for Rejection</label>
                 <textarea
                     id="rejectionReason"
                     value={rejectionReason}
                     onChange={e => setRejectionReason(e.target.value)}
                     rows={3}
                     className="mt-1 shadow-sm block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                     placeholder="Please provide a brief reason..."
                 />
                 <div className="mt-2 flex justify-end gap-2">
                     <button onClick={() => setShowRejectionForm(false)} className="btn-secondary">Cancel</button>
                     <button onClick={handleRejectSubmit} className="btn-danger">Confirm Rejection</button>
                 </div>
            </div>
        ) : !isPreview ? (
            <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 flex flex-row-reverse gap-3">
                <button onClick={handleAccept} disabled={!hasSigned} className="btn-primary disabled:opacity-50">Accept & Agree</button>
                <button onClick={() => setShowRejectionForm(true)} className="btn-danger">Reject</button>
            </div>
        ) : null}

      </div>
       <style>{`
            .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 600; border: none; cursor: pointer; }
            .btn-primary:hover:not(:disabled) { filter: brightness(0.9); }
            .btn-danger { padding: 0.5rem 1rem; background-color: #dc2626; color: white; border-radius: 0.375rem; font-weight: 600; border: none; cursor: pointer; }
            .btn-danger:hover { background-color: #b91c1c; }
            .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
            .dark .btn-secondary { background-color: #4b5563; color: #e5e7eb; }
        `}</style>
    </div>
  );
};