
import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './icons/XIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { sendEmailNotification } from '../services/emailService';
import { PdfViewer } from './PdfViewer';

interface PdfPreviewModalProps {
    url: string;
    onClose: () => void;
    filename?: string;
    recipientEmail?: string;
    clientName?: string;
}

const createBlobUrlFromPdfData = (sourceUrl: string): string => {
    if (!sourceUrl) return '';
    if (!sourceUrl.startsWith('data:application/pdf;base64,')) {
        return sourceUrl;
    }
    try {
        const base64 = sourceUrl.split(',')[1];
        const binaryStr = atob(base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error("Failed to convert data URI to blob URL:", e);
        return sourceUrl;
    }
};

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ url, onClose, filename, recipientEmail, clientName }) => {
    const displayUrl = useMemo(() => createBlobUrlFromPdfData(url), [url]);
    const [isSending, setIsSending] = React.useState(false);

    useEffect(() => {
        return () => {
            if (displayUrl && displayUrl.startsWith('blob:')) {
                URL.revokeObjectURL(displayUrl);
            }
        };
    }, [displayUrl]);

    const handlePrint = () => {
        if (!displayUrl) return;
        const printWindow = window.open(displayUrl, '_blank');
        if (printWindow) {
            printWindow.focus();
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = displayUrl;
        link.download = filename || `Export_${Date.now()}.pdf`;
        link.click();
    };

    const handleEmail = async () => {
        let targetEmail = recipientEmail;
        if (!targetEmail) {
            const email = prompt("Enter parent / recipient email address:", "");
            if (!email) return;
            targetEmail = email;
        }

        setIsSending(true);
        try {
            const base64 = url.includes('base64,') ? url.split('base64,')[1] : null;
            const attachments = base64 ? [{
                filename: filename || 'document.pdf',
                content: base64,
                encoding: 'base64',
                contentType: 'application/pdf'
            }] : [];

            const res = await sendEmailNotification(
                targetEmail,
                `Document: ${filename || 'PDF Document'}`,
                `Dear ${clientName || 'Parent / Guardian'},\n\nPlease find the attached official document for your reference.\n\nRegards,\nAdministration`,
                undefined,
                undefined,
                attachments
            );

            if (res.success) {
                alert("Email dispatched successfully to parent!");
            } else {
                alert(`Failed to send email: ${res.message}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Document Preview</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Ready for Print, Dispatch or Archiving</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrint}
                            className="btn-secondary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6 cursor-pointer"
                            title="Print PDF"
                        >
                            <PrinterIcon className="w-4 h-4" /> Print
                        </button>
                        <button
                            onClick={handleEmail}
                            disabled={isSending}
                            className="btn-secondary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6 cursor-pointer"
                            title="Email PDF to Parent"
                        >
                            <EnvelopeIcon className="w-4 h-4" /> {isSending ? 'Sending...' : 'Email to Parent'}
                        </button>
                        <button
                            onClick={handleDownload}
                            className="btn-primary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6 cursor-pointer"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4" /> Save Local
                        </button>
                        <button 
                            onClick={onClose} 
                            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Close Preview"
                        >
                            <XIcon className="w-6 h-6" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline mr-1">Close</span>
                        </button>
                    </div>
                </div>
                <div className="flex-grow bg-slate-100 dark:bg-slate-950 p-4">
                    <PdfViewer
                        src={displayUrl}
                        className="w-full h-full rounded-2xl shadow-inner border border-slate-200 dark:border-slate-800 bg-white"
                        title="PDF Preview"
                    />
                </div>
            </div>
        </div>,
        document.body
    );
};
