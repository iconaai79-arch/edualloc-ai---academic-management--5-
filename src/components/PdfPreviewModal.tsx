
import React, { useEffect } from 'react';
import { XIcon, DocumentArrowDownIcon } from './icons/index';

interface PdfPreviewModalProps {
    url: string;
    onClose: () => void;
    filename?: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ url, onClose, filename }) => {
    useEffect(() => {
        return () => {
            // Only revoke if we created it locally. 
            // If it's passed from parent, parent should manage it, 
            // but often it's generated right before opening the modal.
            // For safety, we keep the original logic but be mindful.
            // if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
        };
    }, [url]);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `Export_${Date.now()}.pdf`;
        link.click();
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
                        src={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
                        className="w-full h-full rounded-2xl shadow-inner border border-slate-200 dark:border-slate-800 bg-white"
                        title="PDF Preview"
                    />
                </div>
            </div>
        </div>
    );
};
