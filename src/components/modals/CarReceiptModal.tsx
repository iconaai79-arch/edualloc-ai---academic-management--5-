
import React from 'react';
import { CarInvoice, CarPayment, Institution } from '../../types';
import { XIcon } from '../icons/XIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { CheckBadgeIcon } from '../icons/CheckBadgeIcon';

interface CarReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: CarInvoice | null;
    payment: CarPayment | null;
    institution: Institution;
}

export const CarReceiptModal: React.FC<CarReceiptModalProps> = ({ isOpen, onClose, invoice, payment, institution }) => {
    if (!isOpen || !invoice || !payment) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in no-print">
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in border border-slate-100 dark:border-slate-700">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Official <span className="text-indigo-600">Receipt</span></h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Payment Confirmation Voucher</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="p-3 bg-indigo-600 text-white rounded-2xl transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none">
                            <PrinterIcon className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-100">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-12 space-y-10" id="printable-receipt">
                    <style>{`
                        @media print {
                            body * { visibility: hidden; }
                            #printable-receipt, #printable-receipt * { visibility: visible; }
                            #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; }
                            .no-print { display: none !important; }
                        }
                    `}</style>
                    
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            {institution.logoUrl ? (
                                <img src={institution.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                            ) : (
                                <div className="text-2xl font-black uppercase tracking-tighter text-slate-800">{institution.name}</div>
                            )}
                            <p className="text-xs font-bold text-slate-400 max-w-xs">{institution.address}</p>
                        </div>
                        <div className="text-right">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                <CheckBadgeIcon className="w-4 h-4" /> Payment Verified
                            </div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Receipt Number</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white italic">#{payment.receiptNumber}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">{new Date(payment.paymentDate).toLocaleDateString()} {new Date(payment.paymentDate).toLocaleTimeString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 py-10 border-y border-slate-100 dark:border-slate-700">
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Customer Information</p>
                            <div>
                                <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">{invoice.clientName}</p>
                                <p className="text-xs font-bold text-slate-500 mt-1">{invoice.clientPhone}</p>
                                <p className="text-xs font-medium text-slate-400">{invoice.clientEmail}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Invoice Details</p>
                            <div>
                                <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Reference #{invoice.invoiceNumber}</p>
                                <p className="text-xs font-bold text-slate-500 mt-1">Reg No: {invoice.registrationNumber || 'N/A'}</p>
                                <p className="text-xs font-bold text-slate-500 mt-1">Total Agreed: KES {invoice.totalAmount.toLocaleString()}</p>
                                <p className="text-xs font-bold text-indigo-600 mt-1 uppercase tracking-widest">Status: {invoice.status.replace('_', ' ')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Payment Summary</p>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] space-y-4 border border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-500">Amount Paid</span>
                                <span className="font-black text-slate-900 dark:text-white italic">KES {payment.amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-500">Payment Method</span>
                                <span className="font-bold text-slate-900 dark:text-white">{payment.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-500">Transaction ID</span>
                                <span className="font-black text-emerald-600 tracking-widest uppercase">{payment.transactionReference}</span>
                            </div>
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Remaining Balance</span>
                                <span className="text-xl font-black text-slate-900 dark:text-white italic">KES {invoice.balanceAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 flex justify-between items-end italic">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Issued By</p>
                            <p className="text-xs font-bold text-slate-500 underline decoration-slate-200 underline-offset-4">{institution.name} Sales Hub</p>
                        </div>
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Powered by Antigravity OS</p>
                    </div>
                </div>

                <div className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-50 dark:border-slate-700 flex justify-center">
                    <button onClick={onClose} className="px-10 py-4 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:bg-slate-800 active:scale-95">
                        Close Receipt
                    </button>
                </div>
            </div>
        </div>
    );
};
