
import React, { useEffect } from 'react';
import { XIcon } from './icons/XIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { sendEmailNotification } from '../services/emailService';

interface PdfPreviewModalProps {
    url: string;
    onClose: () => void;
    filename?: string;
    recipientEmail?: string;
    clientName?: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ url, onClose, filename, recipientEmail, clientName }) => {
    const [displayUrl, setDisplayUrl] = React.useState<string>(url);
    const [isSending, setIsSending] = React.useState(false);

    useEffect(() => {
        let activeUrl = url;
        let blobUrl: string | null = null;

        if (url && url.startsWith('data:application/pdf;base64,')) {
            try {
                const base64 = url.split(',')[1];
                const binary = atob(base64);
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    array[i] = binary.charCodeAt(i);
                }
                const blob = new Blob([array], { type: 'application/pdf' });
                blobUrl = URL.createObjectURL(blob);
                activeUrl = blobUrl;
                setDisplayUrl(blobUrl);
            } catch (e) {
                console.error("Failed to convert data URI to blob:", e);
            }
        } else {
            setDisplayUrl(url);
        }

        return () => {
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [url]);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = displayUrl;
        link.download = filename || `Export_${Date.now()}.pdf`;
        link.click();
    };

    const handleEmail = async () => {
        let targetEmail = recipientEmail;
        if (!targetEmail) {
            const email = prompt("Enter recipient email address:", "");
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
                `Document: ${filename || 'PDF Export'}`,
                `Dear ${clientName || 'Valued Client'},\n\nPlease find the attached document for your reference.\n\nRegards,\nManagement`,
                undefined,
                undefined,
                attachments
            );

            if (res.success) {
                alert("Email dispatched successfully!");
            } else {
                alert(`Failed to send email: ${res.message}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Document Preview</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Ready for Print or Archiving</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleEmail}
                            disabled={isSending}
                            className="btn-secondary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6"
                        >
                            <EnvelopeIcon className="w-4 h-4" /> {isSending ? 'Sending...' : 'Email to Client'}
                        </button>
                        <button
                            onClick={handleDownload}
                            className="btn-primary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4" /> Save Local
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                <div className="flex-grow bg-slate-100 dark:bg-slate-950 p-4">
                    <iframe
                        src={`${displayUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                        className="w-full h-full rounded-2xl shadow-inner border border-slate-200 dark:border-slate-800 bg-white"
                        title="PDF Preview"
                    />
                </div>
            </div>
        </div>
    );
};
