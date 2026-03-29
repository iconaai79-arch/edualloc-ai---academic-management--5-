
import React, { useEffect, useState } from 'react';
import type { Book } from '../types';
import { XIcon } from './icons/XIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface BookQrCodeModalProps {
    book: Book;
    onClose: () => void;
}

export const BookQrCodeModal: React.FC<BookQrCodeModalProps> = ({ book, onClose }) => {
    const [qrUrl, setQrUrl] = useState('');

    useEffect(() => {
        const QRCodeLib = (window as any).QRCode;
        if (QRCodeLib) {
            const qrData = JSON.stringify({
                type: 'library_book',
                id: book.id,
                accessionNumber: book.accessionNumber,
                title: book.title,
                isbn: book.isbn
            });
            QRCodeLib.toDataURL(qrData, {
                width: 512,
                margin: 2,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                }
            }, (err: any, url: string) => {
                if (!err) setQrUrl(url);
            });
        }
    }, [book]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Book Label - ${book.title}</title>
                    <style>
                        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                        .label-container { border: 2px solid #000; padding: 20px; text-align: center; width: 300px; }
                        .qr-code { width: 200px; height: 200px; }
                        .title { font-weight: bold; font-size: 16px; margin: 10px 0; text-transform: uppercase; }
                        .isbn { font-family: monospace; font-size: 12px; color: #666; }
                        .institution { font-size: 10px; margin-top: 15px; color: #999; border-top: 1px solid #eee; pt: 5px; }
                    </style>
                </head>
                <body>
                    <div class="label-container">
                        <img src="${qrUrl}" class="qr-code" />
                        <div class="title">${book.title}</div>
                        <div class="isbn">ISBN: ${book.isbn}</div>
                        <div class="institution">SCHOOL LIBRARY ASSET</div>
                    </div>
                    <script>
                        setTimeout(() => { window.print(); window.close(); }, 500);
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 relative text-center" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all"
                >
                    <XIcon className="w-5 h-5 text-slate-400" />
                </button>

                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Resource Asset Label</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">{book.title}</p>

                <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 mb-8 inline-block mx-auto">
                    {qrUrl ? (
                        <img src={qrUrl} alt="QR Code" className="w-48 h-48 mx-auto mix-blend-multiply dark:mix-blend-normal rounded-xl" />
                    ) : (
                        <div className="w-48 h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse flex items-center justify-center">
                            <span className="text-[10px] font-black uppercase text-slate-400">Gen Syncing...</span>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide leading-relaxed">
                        Scan this labels' encrypted QR sequence to verify asset ownership or initiate rapid circulation transactions.
                    </p>

                    <div className="grid grid-cols-2 gap-3 pt-4">
                        <button
                            onClick={handlePrint}
                            className="flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            Print Label
                        </button>
                        <a
                            href={qrUrl}
                            download={`QR_${book.isbn}.png`}
                            className="flex items-center justify-center gap-2 py-4 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            SVG Export
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
