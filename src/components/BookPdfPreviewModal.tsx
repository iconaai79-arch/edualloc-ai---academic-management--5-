import React, { useEffect, useState } from 'react';
import type { Book } from '../types';
import { XIcon } from './icons/XIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { EyeIcon } from './icons/EyeIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

interface BookPdfPreviewModalProps {
    book?: Book | null;
    allBooks?: Book[];
    institutionName?: string;
    onClose: () => void;
}

export const BookPdfPreviewModal: React.FC<BookPdfPreviewModalProps> = ({
    book,
    allBooks,
    institutionName = 'Institutional Library Management System',
    onClose
}) => {
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(true);
    const [viewMode, setViewMode] = useState<'slip' | 'digital_pdf'>('slip');
    const [error, setError] = useState<string | null>(null);

    const isCatalogReport = !book && Array.isArray(allBooks) && allBooks.length > 0;
    const documentTitle = isCatalogReport
        ? `Library Catalog Inventory (${allBooks?.length || 0} Titles)`
        : book
        ? `Resource Slip - ${book.title}`
        : 'Library PDF Preview';

    useEffect(() => {
        let isMounted = true;
        let objectUrl: string | null = null;

        const generatePdf = async () => {
            setIsGenerating(true);
            setError(null);

            try {
                const { jsPDF } = await import('jspdf');
                const autoTableMod = await import('jspdf-autotable');
                const autoTable = autoTableMod.default || (autoTableMod as any);

                const doc = new jsPDF({
                    orientation: isCatalogReport ? 'landscape' : 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                const now = new Date();
                const formattedDate = now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                const formattedTime = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                if (isCatalogReport && allBooks) {
                    // ── Multi-Page Catalog Inventory Register ──
                    doc.setFillColor(30, 41, 59); // slate-800
                    doc.rect(0, 0, 297, 24, 'F');

                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(14);
                    doc.text((institutionName || 'EDUAI ACADEMIC ECOSYSTEM').toUpperCase(), 14, 11);

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(203, 213, 225);
                    doc.text(`CENTRAL LIBRARY REPOSITORY • CATALOG INVENTORY REGISTER • ${formattedDate} ${formattedTime}`, 14, 18);

                    // Summary KPI Cards
                    const totalTitles = allBooks.length;
                    const totalCopies = allBooks.reduce((acc, b) => acc + (b.quantity || 0), 0);
                    const availableCopies = allBooks.reduce((acc, b) => acc + (b.available || 0), 0);
                    const inUse = Math.max(0, totalCopies - availableCopies);

                    doc.setFillColor(248, 250, 252);
                    doc.roundedRect(14, 28, 269, 14, 2, 2, 'F');
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(14, 28, 269, 14, 2, 2, 'S');

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(15, 23, 42);
                    doc.text(`Total Titles: ${totalTitles}`, 20, 37);
                    doc.text(`Total Stock Copies: ${totalCopies}`, 80, 37);
                    doc.text(`Available on Shelf: ${availableCopies}`, 155, 37);
                    doc.text(`In Active Circulation: ${inUse}`, 225, 37);

                    const tableRows = allBooks.map((b, index) => [
                        index + 1,
                        b.accessionNumber || 'N/A',
                        b.title || 'Untitled Resource',
                        b.author || 'Unknown',
                        b.category || 'General',
                        b.location || 'Main Shelf',
                        b.quantity ?? 1,
                        b.available ?? 1,
                        b.available === 0 ? 'All Issued' : b.available < b.quantity ? 'Circulating' : 'Available'
                    ]);

                    autoTable(doc, {
                        startY: 46,
                        head: [['#', 'Accession ID', 'Resource Title', 'Author', 'Category', 'Location', 'Total', 'Avail', 'Status']],
                        body: tableRows,
                        theme: 'grid',
                        styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica' },
                        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
                        alternateRowStyles: { fillColor: [248, 250, 252] },
                        columnStyles: {
                            0: { cellWidth: 10, halign: 'center' },
                            1: { cellWidth: 26, fontStyle: 'bold' },
                            2: { cellWidth: 70 },
                            3: { cellWidth: 45 },
                            4: { cellWidth: 35 },
                            5: { cellWidth: 30 },
                            6: { cellWidth: 14, halign: 'center' },
                            7: { cellWidth: 14, halign: 'center' },
                            8: { cellWidth: 25, halign: 'center' }
                        },
                        didDrawPage: (data: any) => {
                            const pageCount = (doc as any).internal.getNumberOfPages();
                            doc.setFontSize(7);
                            doc.setTextColor(148, 163, 184);
                            doc.text(`Page ${data.pageNumber} of ${pageCount} • Official Central Library Registry Record`, 14, 204);
                        }
                    });
                } else if (book) {
                    // ── Individual Resource Accession Slip & Barcode Card ──
                    doc.setFillColor(30, 41, 59); // slate-800
                    doc.rect(0, 0, 210, 30, 'F');

                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(15);
                    doc.text((institutionName || 'EDUAI ACADEMIC ECOSYSTEM').toUpperCase(), 14, 13);

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(199, 210, 254);
                    doc.text('CENTRAL LIBRARY REPOSITORY • OFFICIAL RESOURCE ACCESSION SLIP', 14, 22);

                    // Resource Highlight Card
                    doc.setFillColor(248, 250, 252);
                    doc.roundedRect(14, 38, 182, 60, 3, 3, 'F');
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(14, 38, 182, 60, 3, 3, 'S');

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(14);
                    doc.setTextColor(15, 23, 42);
                    const splitTitle = doc.splitTextToSize(book.title.toUpperCase(), 170);
                    doc.text(splitTitle, 20, 48);

                    const titleHeight = splitTitle.length * 6;

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    doc.setTextColor(71, 85, 105);
                    doc.text(`Author / Creator: ${book.author || 'General / Unknown'}`, 20, 52 + titleHeight);
                    doc.text(`Category / Dewey: ${book.category || 'General'}`, 20, 58 + titleHeight);
                    doc.text(`ISBN / Barcode ID: ${book.isbn || 'N/A'}`, 20, 64 + titleHeight);
                    doc.text(`Shelf / Department Location: ${book.location || 'Main Stacks'}`, 20, 70 + titleHeight);

                    // Accession Number Badge & Stock Status
                    doc.setFillColor(238, 242, 255); // indigo-50
                    doc.roundedRect(14, 106, 88, 38, 2, 2, 'F');
                    doc.setDrawColor(199, 210, 254);
                    doc.roundedRect(14, 106, 88, 38, 2, 2, 'S');

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(79, 70, 229);
                    doc.text('ACCESSION NUMBER', 20, 114);
                    doc.setFontSize(13);
                    doc.setTextColor(15, 23, 42);
                    doc.text(book.accessionNumber || 'N/A', 20, 122);

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(100, 116, 139);
                    doc.text(`Total Copies: ${book.quantity || 1} • Available on Shelf: ${book.available ?? 1}`, 20, 132);
                    doc.text(`Status: ${book.available === 0 ? 'All Copies Issued' : 'Available for Lending'}`, 20, 138);

                    // QR Verification Placeholder / Canvas Image
                    const QRCodeLib = (window as any).QRCode;
                    if (QRCodeLib) {
                        try {
                            const qrCanvas = document.createElement('canvas');
                            await new Promise<void>((resolve) => {
                                const qrData = JSON.stringify({
                                    type: 'library_book',
                                    id: book.id,
                                    accessionNumber: book.accessionNumber,
                                    title: book.title,
                                    isbn: book.isbn
                                });
                                QRCodeLib.toCanvas(qrCanvas, qrData, { width: 140, margin: 1 }, () => resolve());
                            });
                            const qrDataUrl = qrCanvas.toDataURL('image/png');
                            doc.addImage(qrDataUrl, 'PNG', 130, 106, 38, 38);
                        } catch (e) {
                            console.warn('QR code canvas conversion skipped:', e);
                        }
                    }

                    // Barcode Visualization Box
                    doc.setFillColor(255, 255, 255);
                    doc.roundedRect(14, 150, 182, 26, 2, 2, 'F');
                    doc.setDrawColor(203, 213, 225);
                    doc.roundedRect(14, 150, 182, 26, 2, 2, 'S');

                    doc.setFont('courier', 'bold');
                    doc.setFontSize(14);
                    doc.setTextColor(15, 23, 42);
                    doc.text(`* ${book.accessionNumber} *`, 105, 162, { align: 'center' });
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(100, 116, 139);
                    doc.text('Scan barcode or QR tag with optical reader for instant circulation intake', 105, 170, { align: 'center' });

                    // Circulation Policy & Verification Notice
                    doc.setFillColor(248, 250, 252);
                    doc.roundedRect(14, 184, 182, 44, 2, 2, 'F');
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(14, 184, 182, 44, 2, 2, 'S');

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(15, 23, 42);
                    doc.text('CIRCULATION POLICY & ASSET COMPLIANCE', 20, 193);

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(71, 85, 105);
                    doc.text('1. Standard loan duration: 14 calendar days per registered patron.', 20, 200);
                    doc.text('2. Resources must be returned in good condition. Late returns incur overdue charges.', 20, 206);
                    doc.text('3. This slip serves as official verification of asset registration in the institutional database.', 20, 212);
                    doc.text(`Generated on ${formattedDate} at ${formattedTime} • Verified by Central Repository Controller.`, 20, 220);

                    // Sign-off signature line
                    doc.setDrawColor(203, 213, 225);
                    doc.line(20, 255, 80, 255);
                    doc.line(130, 255, 190, 255);

                    doc.setFontSize(7.5);
                    doc.setTextColor(148, 163, 184);
                    doc.text('Librarian In-Charge Signature', 20, 260);
                    doc.text('Institutional Stamp / Verification', 130, 260);
                }

                const blob = doc.output('blob');
                objectUrl = URL.createObjectURL(blob);

                if (isMounted) {
                    setPdfBlobUrl(objectUrl);
                    setIsGenerating(false);
                }
            } catch (err: any) {
                console.error('Error generating book PDF preview:', err);
                if (isMounted) {
                    setError(err.message || 'Failed to render PDF preview.');
                    setIsGenerating(false);
                }
            }
        };

        generatePdf();

        return () => {
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [book, allBooks, isCatalogReport, institutionName]);

    const handlePrint = () => {
        if (!pdfBlobUrl) return;
        const printWindow = window.open(pdfBlobUrl, '_blank');
        if (printWindow) {
            printWindow.focus();
        }
    };

    const handleDownload = () => {
        if (!pdfBlobUrl) return;
        const a = document.createElement('a');
        a.href = pdfBlobUrl;
        const filename = isCatalogReport
            ? `Library_Catalog_Inventory_${new Date().toISOString().split('T')[0]}.pdf`
            : `Resource_Slip_${(book?.accessionNumber || 'book').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const digitalPdfUrl = (book as any)?.pdfUrl || (book as any)?.fileUrl || (book as any)?.digitalCopyUrl || (book as any)?.ebookUrl;

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-3 sm:p-6 animate-fade-in" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-5xl h-[92vh] max-h-[900px] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-scale-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                            <FileTextIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                {documentTitle}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                {book?.accessionNumber && (
                                    <span className="text-[9px] font-black px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded font-mono">
                                        {book.accessionNumber}
                                    </span>
                                )}
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Official PDF Preview & Document Service
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Segmented View Switcher (if digital book attachment is present) */}
                    {digitalPdfUrl && (
                        <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('slip')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                                    viewMode === 'slip'
                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                }`}
                            >
                                Accession Slip
                            </button>
                            <button
                                onClick={() => setViewMode('digital_pdf')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                                    viewMode === 'digital_pdf'
                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                }`}
                            >
                                E-Book PDF
                            </button>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                            onClick={handlePrint}
                            disabled={isGenerating || !pdfBlobUrl}
                            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 disabled:opacity-50 cursor-pointer"
                            title="Print PDF"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Print</span>
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={isGenerating || !pdfBlobUrl}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
                            title="Download PDF File"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Download</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                            title="Close"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* PDF Viewer Body */}
                <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-3 sm:p-6 overflow-hidden flex flex-col items-center justify-center">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                            <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-500" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Generating high-resolution vector PDF...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-rose-100 dark:border-rose-900 shadow-lg">
                            <p className="text-sm font-black text-rose-600 uppercase mb-2">Unable to Render PDF</p>
                            <p className="text-xs text-slate-500 mb-4">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-black uppercase rounded-xl"
                            >
                                Retry
                            </button>
                        </div>
                    ) : viewMode === 'digital_pdf' && digitalPdfUrl ? (
                        <iframe
                            src={digitalPdfUrl}
                            title="Digital E-Book PDF"
                            className="w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner bg-white"
                        />
                    ) : pdfBlobUrl ? (
                        <iframe
                            src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                            title={documentTitle}
                            className="w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner bg-white"
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
};
