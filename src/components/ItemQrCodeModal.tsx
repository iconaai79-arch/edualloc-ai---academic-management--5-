
import React, { useEffect, useRef } from 'react';
import type { InventoryItem } from '../types';

interface ItemQrCodeModalProps {
    item: InventoryItem;
    onClose: () => void;
}

const QRCodeCanvas: React.FC<{ text: string; size?: number }> = ({ text, size = 128 }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && (window as any).QRCode) {
            containerRef.current.innerHTML = '';
            try {
                new (window as any).QRCode(containerRef.current, {
                    text: text,
                    width: size,
                    height: size,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : (window as any).QRCode.CorrectLevel.H
                });
            } catch (e) {
                console.error("QR Generation failed", e);
                containerRef.current.innerHTML = "QR Error";
            }
        }
    }, [text, size]);

    if (!(window as any).QRCode) {
        return <div className="text-xs text-red-500 animate-pulse">Library Loading...</div>;
    }

    return <div ref={containerRef} className="inline-block" />;
};

export const ItemQrCodeModal: React.FC<ItemQrCodeModalProps> = ({ item, onClose }) => {
    const qrData = JSON.stringify({ id: item.id, name: item.name });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">{item.name}</h3>
                
                <div className="flex justify-center mb-4 p-4 bg-white rounded-lg border border-slate-200">
                    <QRCodeCanvas text={qrData} size={180} />
                </div>
                
                <p className="text-sm text-slate-500 mb-6">Scan to view item details or process transaction.</p>
                <button onClick={() => window.print()} className="mb-2 w-full px-4 py-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white transition-colors">Print QR</button>
                <button onClick={onClose} className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600 dark:text-white transition-colors">Close</button>
            </div>
             <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .bg-white, .bg-white * { visibility: visible; }
                    .bg-white { position: absolute; left: 0; top: 0; }
                    button { display: none; }
                }
            `}</style>
        </div>
    );
};
