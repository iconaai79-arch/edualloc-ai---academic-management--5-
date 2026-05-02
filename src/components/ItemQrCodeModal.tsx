
import React, { useEffect, useState } from 'react';
import type { InventoryItem } from '../types';

interface ItemQrCodeModalProps {
    item: InventoryItem;
    onClose: () => void;
}

export const ItemQrCodeModal: React.FC<ItemQrCodeModalProps> = ({ item, onClose }) => {
    const [qrUrl, setQrUrl] = useState('');

    useEffect(() => {
        const QRCodeLib = (window as any).QRCode;
        if (QRCodeLib) {
             QRCodeLib.toDataURL(JSON.stringify({ id: item.id, name: item.name }), { width: 256 }, (err: any, url: string) => {
                 if (!err) setQrUrl(url);
             });
        }
    }, [item]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">{item.name}</h3>
                {qrUrl ? (
                    <img loading="lazy" src={qrUrl} alt="QR Code" className="mx-auto mb-4" />
                ) : (
                    <div className="w-48 h-48 bg-slate-200 mx-auto mb-4 animate-pulse flex items-center justify-center">Generating...</div>
                )}
                <p className="text-sm text-slate-500 mb-4">Scan to view item details or process transaction.</p>
                <button onClick={() => window.print()} className="mb-2 w-full px-4 py-2 border rounded hover:bg-slate-50">Print QR</button>
                <button onClick={onClose} className="w-full px-4 py-2 bg-slate-200 rounded hover:bg-slate-300">Close</button>
            </div>
        </div>
    );
};

