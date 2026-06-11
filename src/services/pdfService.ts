
import type { Requisition, Supplier, Invoice, Receipt, MpesaTransaction, Institution, CompanyDetails, EmailConfig, TimetableEntry, Subject, User, Role, Room, LetterheadConfig, RoomConflict, Course, CourseLevel, Internship, Department, LessonStructure, LecturerContract, Building, AcademicLevel, Semester, ExamTimetableEntry, TimetableSettings, StockTransaction, InventoryItem, LeaveOutRequest, LeaveOutWithDetails, LibraryTransaction, LibraryFine, CarWashAccount, CarWashJournalEntry, CarWashJournalLine, CarWashExpense, CarWashPayroll, CarWashJob, CarWashPackage, CarWashFeedback, CarWashCustomer, CarWashAddOn, PMTenant, PMLandlord, PMPayment, PMLease, PMUnit, PMProperty, PMInvoice, RetailSale, RetailStore, RetailInventoryItem, RetailCommissionLedger, CoopFarmer, CoopRider, HISPharmacyInventory, HISPharmacyBatch, PharmacyStaff, PharmacySale, PharmacySaleItem, PharmacySettings, CarListing, CarInvoice, CarPayment } from '../types';

import { timeToMinutes, minutesToTime, generatePeriodLabels, generateDisplaySlots } from '../utils/timeUtils';
import { generatePastelColor, generatePastelColorRgb } from '../utils/colorUtils';
import { getInitials } from '../utils/stringUtils';
import { formatRoleDisplayName } from '../utils/roleUtils';


// Use a safer way to access the global jsPDF object which might be on window or just global
const getJsPdf = () => {
    if (typeof window !== 'undefined' && (window as any).jspdf) {
        return (window as any).jspdf;
    }
    // @ts-ignore
    if (typeof jspdf !== 'undefined') return jspdf;
    return null;
};

// Internal utility to load images safely for PDF insertion
const loadImage = (url: string | null | undefined): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.warn("PDF Service: Failed to load asset image. Proceeding without it.", url);
            resolve(null);
        };
    });
};

const setupPdfHeader = (doc: any, headerImg: HTMLImageElement | null) => {
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    let startY = 15;

    if (headerImg) {
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (headerImg.height * imgWidth) / headerImg.width;
        const maxHeight = 40;
        if (imgHeight > maxHeight) {
            const finalHeight = maxHeight;
            const finalWidth = (headerImg.width * finalHeight) / headerImg.height;
            const xPos = (pageWidth - finalWidth) / 2;
            doc.addImage(headerImg, 'JPEG', xPos, startY, finalWidth, finalHeight);
            startY += finalHeight + 5;
        } else {
            doc.addImage(headerImg, 'JPEG', margin, startY, imgWidth, imgHeight);
            startY += imgHeight + 5;
        }
    } else {
        startY += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text("OFFICIAL RECORD", margin, startY);
        startY += 10;
    }

    doc.setDrawColor(180, 180, 180);
    doc.line(margin, startY, pageWidth - margin, startY);

    return startY + 10;
};

const setupPdfFooter = (doc: any, footerImg: HTMLImageElement | null, footerText?: string) => {
    const pageCount = doc.internal.getNumberOfPages();
    if (pageCount === 0) return;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        if (footerImg) {
            const footerMargin = 10; // Reduced from 15
            const availableWidth = pageWidth - (margin * 2);
            const aspectRatio = footerImg.width / footerImg.height;
            let finalWidth = availableWidth;
            let finalHeight = finalWidth / aspectRatio;
            const maxHeight = 20;
            if (finalHeight > maxHeight) {
                finalHeight = maxHeight;
                finalWidth = finalHeight * aspectRatio;
            }
            const xPos = (pageWidth - finalWidth) / 2;
            const yPos = pageHeight - finalHeight - footerMargin;
            doc.addImage(footerImg, 'PNG', xPos, yPos, finalWidth, finalHeight);
        }

        const copyrightText = footerText || "EduAi Automation - Secure Document";
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text(copyrightText, margin, pageHeight - 7); // Pushed down from 10

        const pageNumText = `Page ${i} of ${pageCount}`;
        doc.text(pageNumText, pageWidth - margin, pageHeight - 7, { align: 'right' }); // Pushed down from 10
    }
};

const createPdfWithLetterhead = (
    doc: any,
    title: string,
    companyDetails: CompanyDetails,
    institution: Institution,
    logoImg: HTMLImageElement | null,
    headerImg: HTMLImageElement | null = null
) => {
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    if (headerImg) {
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (headerImg.height * imgWidth) / headerImg.width;
        const maxHeight = 40;
        let finalHeight = imgHeight;
        let finalWidth = imgWidth;
        if (imgHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = (headerImg.width * finalHeight) / headerImg.height;
        }
        const xPos = (pageWidth - finalWidth) / 2;
        doc.addImage(headerImg, 'JPEG', xPos, 15, finalWidth, finalHeight);

        const lineY = 15 + finalHeight + 5;
        doc.setDrawColor(180, 180, 180);
        doc.line(margin, lineY, pageWidth - margin, lineY);

        // Draw Document Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        doc.text(title, margin, lineY + 15);

        return lineY + 25;
    }

    // Draw Logo
    if (logoImg) {
        const logoWidth = 25;
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        doc.addImage(logoImg, 'PNG', margin, margin, logoWidth, logoHeight);
    }

    // Draw Organization Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(institution.name, pageWidth - margin, margin + 5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Email: ${institution.email}`, pageWidth - margin, margin + 11, { align: 'right' });
    doc.text(`Phone: ${institution.phoneNumber}`, pageWidth - margin, margin + 15, { align: 'right' });

    // Draw Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(0, 0, 0);
    doc.text(title, margin, margin + 40);

    return margin + 80;
};

// Standard Pastel Generator for PDF use (RGB)
const getPastelRgb = (seed: string): [number, number, number] => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    const s = 60; // Moderate saturation
    const l = 92; // High lightness for pastel

    // HSL to RGB conversion
    const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = (l / 100) - c / 2;
    let r = 0, g = 0, b = 0;

    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
};

export const generateInvoicePdfDataUri = async (
    invoice: Invoice,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const tableStartY = createPdfWithLetterhead(doc, 'INVOICE', companyDetails, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Invoice Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('INVOICE #:', pageWidth - margin - 40, margin + 55);
    doc.text('ISSUE DATE:', pageWidth - margin - 40, margin + 60);

    doc.setFont('helvetica', 'normal');
    doc.text(invoice.invoiceNumber, pageWidth - margin, margin + 55, { align: 'right' });
    doc.text(new Date(invoice.issueDate).toLocaleDateString(), pageWidth - margin, margin + 60, { align: 'right' });

    const head = [['#', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT (KES)']];
    const body = (invoice.items || []).map((item, index) => [
        index + 1,
        item.description,
        item.quantity,
        item.unitPrice?.toLocaleString(),
        item.amount?.toLocaleString()
    ]);

    doc.autoTable({
        head: head,
        body: body,
        startY: tableStartY,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] },
        didDrawPage: (data: any) => {
            const finalY = data.cursor.y;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL:', pageWidth - margin - 40, finalY + 10);
            doc.text(`KES ${invoice.totalAmount?.toLocaleString()}`, pageWidth - margin, finalY + 10, { align: 'right' });
        }
    });

    return doc.output('datauristring');
};

export const generateReceiptPdfDataUri = async (
    receipt: Receipt,
    transaction: MpesaTransaction,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const tableStartY = createPdfWithLetterhead(doc, 'RECEIPT', companyDetails, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('RECEIPT #:', pageWidth - margin - 40, margin + 55);
    doc.text('PAYMENT DATE:', pageWidth - margin - 40, margin + 60);

    doc.setFont('helvetica', 'normal');
    doc.text(receipt.receiptNumber, pageWidth - margin, margin + 55, { align: 'right' });
    doc.text(new Date(receipt.paymentDate).toLocaleDateString(), pageWidth - margin, margin + 60, { align: 'right' });

    const body = [
        ['Payment For', receipt.paidFor],
        ['Payment Method', receipt.paymentMethod],
        ['Transaction ID', transaction.transactionId],
        ['Payer Name', transaction.payerName],
    ];

    doc.autoTable({
        body: body,
        startY: tableStartY,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AMOUNT PAID:', margin, finalY + 15);
    doc.text(`KES ${receipt.amountPaid?.toLocaleString()}`, pageWidth - margin, finalY + 15, { align: 'right' });

    return doc.output('datauristring');
};

export const generateCarInvoicePdfDataUri = async (
    invoice: CarInvoice,
    listing: CarListing,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    const tableStartY = createPdfWithLetterhead(doc, 'SALES INVOICE', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Invoice Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('INVOICE #:', pageWidth - margin - 40, tableStartY - 25);
    doc.text('ISSUE DATE:', pageWidth - margin - 40, tableStartY - 20);

    doc.setFont('helvetica', 'normal');
    doc.text(invoice.invoiceNumber, pageWidth - margin, tableStartY - 25, { align: 'right' });
    doc.text(new Date(invoice.createdAt || Date.now()).toLocaleDateString(), pageWidth - margin, tableStartY - 20, { align: 'right' });

    const head = [['#', 'VEHICLE DESCRIPTION', 'REGISTRATION', 'TOTAL PRICE (KES)']];
    const body = [
        [
            1,
            `${listing.year} ${listing.make} ${listing.model}`,
            invoice.registrationNumber || listing.registrationNumber || 'N/A',
            invoice.totalAmount?.toLocaleString()
        ]
    ];

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: tableStartY,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        didDrawPage: (data: any) => {
            const finalY = data.cursor.y;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL PAYABLE:', pageWidth - margin - 85, finalY + 15);
            doc.text(`KES ${invoice.totalAmount?.toLocaleString()}`, pageWidth - margin, finalY + 15, { align: 'right' });
            
            doc.setFontSize(10);
            doc.text('CLIENT DETAILS:', margin, finalY + 15);
            doc.setFont('helvetica', 'normal');
            doc.text(invoice.clientName, margin, finalY + 22);
            doc.text(invoice.clientPhone || '', margin, finalY + 27);
            doc.text(invoice.clientEmail || '', margin, finalY + 32);
        }
    });

    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const generateCarReceiptPdfDataUri = async (
    payment: CarPayment,
    invoice: CarInvoice,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    const tableStartY = createPdfWithLetterhead(doc, 'SALES RECEIPT', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('RECEIPT #:', pageWidth - margin - 40, tableStartY - 25);
    doc.text('PAYMENT DATE:', pageWidth - margin - 40, tableStartY - 20);

    doc.setFont('helvetica', 'normal');
    doc.text(payment.receiptNumber, pageWidth - margin, tableStartY - 25, { align: 'right' });
    doc.text(new Date(payment.paymentDate).toLocaleDateString(), pageWidth - margin, tableStartY - 20, { align: 'right' });

    const body = [
        ['Client Name', invoice.clientName],
        ['Invoice Ref', invoice.invoiceNumber],
        ['Payment Method', payment.paymentMethod],
        ['Transaction ID', payment.transactionReference],
        ['Amount Paid', `KES ${payment.amount?.toLocaleString()}`],
        ['Remaining Balance', `KES ${invoice.balanceAmount?.toLocaleString()}`],
    ];

    (doc as any).autoTable({
        body: body,
        startY: tableStartY,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AMOUNT PAID:', margin, finalY + 20);
    doc.text(`KES ${payment.amount?.toLocaleString()}`, pageWidth - margin, finalY + 20, { align: 'right' });

    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const generateCarSaleAgreementPdfDataUri = async (
    invoice: CarInvoice,
    listing: CarListing,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    const tableStartY = createPdfWithLetterhead(doc, 'VEHICLE SALE & INSTALLMENT AGREEMENT', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('1. PARTIES TO THE AGREEMENT', margin, tableStartY + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`SELLER: ${institution.name}`, margin, tableStartY + 18);
    doc.text(`BUYER: ${invoice.clientName}`, margin, tableStartY + 24);
    doc.text(`Phone: ${invoice.clientPhone}`, margin, tableStartY + 30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('2. VEHICLE DESCRIPTION', margin, tableStartY + 45);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Make/Model: ${listing.year} ${listing.make} ${listing.model}`, margin, tableStartY + 53);
    doc.text(`Registration: ${listing.registrationNumber}`, margin, tableStartY + 59);
    doc.text(`Chassis No: ${(listing as any).chassisNumber || 'N/A'}`, margin, tableStartY + 65);
    doc.text(`Engine No: ${(listing as any).engineNumber || 'N/A'}`, margin, tableStartY + 71);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('3. FINANCIAL TERMS', margin, tableStartY + 86);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Sale Price: KES ${invoice.totalAmount?.toLocaleString()}`, margin, tableStartY + 94);
    
    if (invoice.isInstallment) {
        doc.text(`Payment Mode: Installment Plan`, margin, tableStartY + 100);
        doc.text(`Frequency: ${invoice.installmentFrequency}`, margin, tableStartY + 106);
        doc.text(`Total Installments: ${invoice.totalInstallments}`, margin, tableStartY + 112);
        doc.text(`Amount per Installment: KES ${invoice.installmentAmount?.toLocaleString()}`, margin, tableStartY + 118);
        doc.text(`Commencement Date: ${invoice.startDate}`, margin, tableStartY + 124);
    } else {
        doc.text(`Payment Mode: Full Payment`, margin, tableStartY + 100);
        doc.text(`Due Date: ${invoice.dueDate}`, margin, tableStartY + 106);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('4. DECLARATION', margin, tableStartY + 140);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const declaration = "The Buyer agrees to purchase the vehicle described above under the terms and conditions set forth in this agreement. Ownership shall remain with the Seller until the total amount is paid in full. In case of default on any installment, the Seller reserves the right to repossess the vehicle.";
    const splitText = doc.splitTextToSize(declaration, pageWidth - (margin * 2));
    doc.text(splitText, margin, tableStartY + 148);

    doc.setFont('helvetica', 'bold');
    doc.text('SELLER SIGNATURE: _______________________', margin, tableStartY + 180);
    doc.text('BUYER SIGNATURE: _______________________', margin, tableStartY + 195);
    doc.text('DATE: _______________________', margin, tableStartY + 210);

    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const generateCarClientStatementPdfDataUri = async (
    clientName: string,
    invoices: CarInvoice[],
    payments: CarPayment[],
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    const tableStartY = createPdfWithLetterhead(doc, 'CLIENT STATEMENT OF ACCOUNT', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`CLIENT: ${clientName}`, margin, tableStartY + 10);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin, tableStartY + 10, { align: 'right' });

    const head = [['DATE', 'REFERENCE', 'DESCRIPTION', 'DEBIT (KES)', 'CREDIT (KES)', 'BALANCE (KES)']];
    const body: any[] = [];
    let runningBalance = 0;

    // Combine invoices and payments, sort by date
    const transactions = [
        ...invoices.map(inv => ({ 
            date: inv.createdAt || '', 
            ref: inv.invoiceNumber, 
            desc: inv.registrationNumber ? `Vehicle Invoice (${inv.registrationNumber})` : 'Vehicle Invoice', 
            amount: inv.totalAmount, 
            type: 'debit' 
        })),
        ...payments.map(pay => ({ date: pay.paymentDate, ref: pay.receiptNumber, desc: `Payment - ${pay.paymentMethod}`, amount: pay.amount, type: 'credit' }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    transactions.forEach(t => {
        if (t.type === 'debit') runningBalance += t.amount;
        else runningBalance -= t.amount;

        body.push([
            new Date(t.date).toLocaleDateString(),
            t.ref,
            t.desc,
            t.type === 'debit' ? t.amount?.toLocaleString() : '',
            t.type === 'credit' ? t.amount?.toLocaleString() : '',
            runningBalance?.toLocaleString()
        ]);
    });

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: tableStartY + 20,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('OUTSTANDING BALANCE:', margin, finalY + 15);
    doc.text(`KES ${runningBalance?.toLocaleString()}`, pageWidth - margin, finalY + 15, { align: 'right' });

    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const generateCarShowroomInventoryPdf = async (
    listings: CarListing[],
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    const tableStartY = createPdfWithLetterhead(doc, 'SHOWROOM INVENTORY LEDGER', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`TOTAL VEHICLES: ${listings.length}`, margin, tableStartY + 10);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin, tableStartY + 10, { align: 'right' });

    const head = [['MAKE & MODEL', 'YEAR', 'REGISTRATION', 'MILEAGE', 'FUEL / TRANS', 'PRICE (KES)', 'STATUS']];
    const body: any[] = [];
    let totalValue = 0;

    listings.forEach(listing => {
        totalValue += listing.price || 0;
        body.push([
            `${listing.make} ${listing.model}`,
            listing.year.toString(),
            listing.registrationNumber || 'N/A',
            `${(listing.mileage || 0)?.toLocaleString()} KM`,
            `${listing.fuelType} / ${listing.transmission}`,
            (listing.price || 0)?.toLocaleString(),
            (listing.status || 'active').toUpperCase()
        ]);
    });

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: tableStartY + 20,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL SHOWROOM VALUE:', margin, finalY + 15);
    doc.text(`KES ${totalValue?.toLocaleString()}`, pageWidth - margin, finalY + 15, { align: 'right' });

    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const generateCarSalesSummaryPdf = async (
    invoices: CarInvoice[],
    payments: CarPayment[],
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    const tableStartY = createPdfWithLetterhead(doc, 'SHOWROOM SALES & REVENUE SUMMARY', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    let totalInvoiced = 0;
    let totalReceived = 0;
    let totalOutstanding = 0;

    invoices.forEach(inv => {
        if (inv.status !== 'cancelled') {
            totalInvoiced += inv.totalAmount || 0;
            totalReceived += inv.paidAmount || 0;
            totalOutstanding += inv.balanceAmount || 0;
        }
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`TOTAL INVOICES: ${invoices.length}`, margin, tableStartY + 10);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin, tableStartY + 10, { align: 'right' });

    // Summary boxes layout
    doc.setFillColor(248, 250, 252); // light slate background
    doc.rect(margin, tableStartY + 15, pageWidth - (margin * 2), 22, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL INVOICED SALES', margin + 10, tableStartY + 23);
    doc.text('TOTAL PAYMENTS RECEIVED', pageWidth / 2, tableStartY + 23, { align: 'center' });
    doc.text('TOTAL OUTSTANDING BALANCE', pageWidth - margin - 10, tableStartY + 23, { align: 'right' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`KES ${totalInvoiced?.toLocaleString()}`, margin + 10, tableStartY + 31);
    doc.text(`KES ${totalReceived?.toLocaleString()}`, pageWidth / 2, tableStartY + 31, { align: 'center' });
    doc.text(`KES ${totalOutstanding?.toLocaleString()}`, pageWidth - margin - 10, tableStartY + 31, { align: 'right' });

    const head = [['DATE', 'INVOICE #', 'CLIENT NAME', 'VEHICLE REG', 'TOTAL (KES)', 'PAID (KES)', 'BALANCE (KES)', 'STATUS']];
    const body: any[] = [];

    invoices.forEach(inv => {
        body.push([
            inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A',
            inv.invoiceNumber,
            inv.clientName,
            inv.registrationNumber || 'N/A',
            (inv.totalAmount || 0)?.toLocaleString(),
            (inv.paidAmount || 0)?.toLocaleString(),
            (inv.balanceAmount || 0)?.toLocaleString(),
            (inv.status || 'pending').toUpperCase().replace('_', ' ')
        ]);
    });

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: tableStartY + 45,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
    });

    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const downloadInvoicePdf = async (invoice: Invoice, institution: Institution, companyDetails: CompanyDetails, logoUrl: string | null) => {
    const dataUri = await generateInvoicePdfDataUri(invoice, institution, companyDetails, logoUrl);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
    link.click();
};

export const generateQuotePdfDataUri = async (
    quote: Invoice,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const tableStartY = createPdfWithLetterhead(doc, 'QUOTATION', companyDetails, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Quotation Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('QUOTATION #:', pageWidth - margin - 40, margin + 55);
    doc.text('ISSUE DATE:', pageWidth - margin - 40, margin + 60);
    doc.text('VALID UNTIL:', pageWidth - margin - 40, margin + 65);

    doc.setFont('helvetica', 'normal');
    doc.text(quote.invoiceNumber, pageWidth - margin, margin + 55, { align: 'right' });
    doc.text(new Date(quote.issueDate).toLocaleDateString(), pageWidth - margin, margin + 60, { align: 'right' });
    const validUntil = new Date(quote.issueDate);
    validUntil.setDate(validUntil.getDate() + 30);
    doc.text(validUntil.toLocaleDateString(), pageWidth - margin, margin + 65, { align: 'right' });

    const head = [['#', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT (KES)']];
    const body = (quote.items || []).map((item, index) => [
        index + 1,
        item.description,
        item.quantity,
        item.unitPrice?.toLocaleString(),
        item.amount?.toLocaleString()
    ]);

    doc.autoTable({
        head: head,
        body: body,
        startY: tableStartY,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] },
        didDrawPage: (data: any) => {
            const finalY = data.cursor.y;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL ESTIMATED:', pageWidth - margin - 50, finalY + 10);
            doc.text(`KES ${quote.totalAmount?.toLocaleString()}`, pageWidth - margin, finalY + 10, { align: 'right' });
        }
    });

    return doc.output('datauristring');
};

export const downloadQuotePdf = async (quote: Invoice, institution: Institution, companyDetails: CompanyDetails, logoUrl: string | null) => {
    const dataUri = await generateQuotePdfDataUri(quote, institution, companyDetails, logoUrl);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `Quotation-${quote.invoiceNumber}.pdf`;
    link.click();
};

export const downloadReceiptPdf = async (receipt: Receipt, transaction: MpesaTransaction, institution: Institution, companyDetails: CompanyDetails, logoUrl: string | null) => {
    const dataUri = await generateReceiptPdfDataUri(receipt, transaction, institution, companyDetails, logoUrl);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `Receipt-${receipt.receiptNumber}.pdf`;
    link.click();
};

export const generateDSQuotationPdfDataUri = async (
    lead: any,
    targetCategory: any,
    baseFeeAmount: number,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const tableStartY = createPdfWithLetterhead(doc, 'FEE STRUCTURE QUOTATION', companyDetails, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('QUOTATION REF:', pageWidth - margin - 40, margin + 55);
    doc.text('DATE ISSUED:', pageWidth - margin - 40, margin + 60);
    doc.text('VALID UNTIL:', pageWidth - margin - 40, margin + 65);

    doc.setFont('helvetica', 'normal');
    doc.text(lead.id?.toUpperCase() || 'DS-QUOTE', pageWidth - margin, margin + 55, { align: 'right' });
    doc.text(new Date().toLocaleDateString(), pageWidth - margin, margin + 60, { align: 'right' });
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    doc.text(validUntil.toLocaleDateString(), pageWidth - margin, margin + 65, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PREPARED FOR:', margin, margin + 55);
    doc.setFont('helvetica', 'normal');
    doc.text(lead.fullName || 'Walk-in Client', margin, margin + 60);
    doc.text(lead.phone || '', margin, margin + 65);
    if (lead.email) doc.text(lead.email, margin, margin + 70);

    const head = [['#', 'FEE ITEM DESCRIPTION', 'CATEGORY', 'AMOUNT (KES)']];
    const catName = targetCategory ? `${targetCategory.name} (${targetCategory.code})` : (lead.licenseTypeInterested || 'Class B');
    
    // Split base fee into typical sub-items if available
    const pdlFee = Math.min(1450, Math.floor(baseFeeAmount * 0.1));
    const testFee = Math.min(2500, Math.floor(baseFeeAmount * 0.15));
    const tuitionFee = baseFeeAmount - pdlFee - testFee;

    const body = [
        [1, 'Standard Tuition & Instruction Fee', catName, tuitionFee?.toLocaleString()],
        [2, 'NTSA PDL (Provisional Driving License) Processing', catName, pdlFee?.toLocaleString()],
        [3, 'Practical & Theory Test Booking Fee', catName, testFee?.toLocaleString()]
    ];

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: tableStartY + 10,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        didDrawPage: (data: any) => {
            const finalY = data.cursor.y;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL ESTIMATED FEES:', pageWidth - margin - 60, finalY + 15);
            doc.text(`KES ${baseFeeAmount?.toLocaleString()}`, pageWidth - margin, finalY + 15, { align: 'right' });
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text('Note: Fees are subject to official NTSA compliance policies and registration rules.', margin, finalY + 25);
        }
    });

    return doc.output('datauristring');
};

export const generateRetailReceiptPdf = async (
    saleData: any,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    isReprint: boolean = false,
    isEducation: boolean = false
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");

    // 80mm Thermal Receipt (width: 80mm, dynamic height)
    // We estimate height based on items
    const baseHeight = isEducation ? 170 : 150;
    const itemHeight = 10;
    const itemsCount = saleData.items?.length || 0;
    const estimatedHeight = baseHeight + (itemsCount * itemHeight);

    // Create jsPDF instance with custom dimensions for thermal printer
    const doc = new lib.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, estimatedHeight]
    });

    const logoImg = await loadImage(logoUrl);
    const margin = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 10;

    // Center alignment helper
    const centerText = (text: string, y: number) => {
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // 1. Header (Logo & Clinic/Store Name)
    if (logoImg) {
        const logoWidth = 20;
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        doc.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, yPos, logoWidth, logoHeight);
        yPos += logoHeight + 5;
    }

    doc.setFontSize(isEducation ? 11 : 14);
    doc.setFont('helvetica', 'bold');
    centerText(institution.name || 'Learning Institution', yPos);
    yPos += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (institution.phoneNumber) {
        centerText(`Tel: ${institution.phoneNumber}`, yPos);
        yPos += 4;
    }
    if (institution.email) {
        centerText(`Email: ${institution.email}`, yPos);
        yPos += 4;
    }

    yPos += 2;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0); // reset
    yPos += 6;

    // 2. Receipt Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    if (isReprint) {
        centerText("*** REPRINT ***", yPos);
        yPos += 6;
    }
    centerText(isEducation ? "STOCK ISSUANCE NOTE" : "SALES RECEIPT", yPos);
    yPos += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(saleData.createdAt || new Date())?.toLocaleString()}`, margin, yPos);
    yPos += 4;
    doc.text(`${isEducation ? 'Issue Note #' : 'Receipt #'}: ${saleData.id?.substring(0, 8).toUpperCase() || 'N/A'}`, margin, yPos);
    yPos += 4;
    doc.text(`${isEducation ? 'Storekeeper' : 'Cashier'}: ${saleData.agentId ? 'Agent ' + saleData.agentId.substring(0, 4) : 'Main Store'}`, margin, yPos);
    yPos += 4;

    if (saleData.customerName) {
        doc.text(`${isEducation ? 'Recipient' : 'Customer'}: ${saleData.customerName}`, margin, yPos);
        yPos += 4;
    }

    yPos += 2;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 6;

    // 3. Items Header
    doc.setFont('helvetica', 'bold');
    doc.text("Item", margin, yPos);
    if (isEducation) {
        doc.text("Qty Issued", pageWidth - margin, yPos, { align: 'right' });
    } else {
        doc.text("Qty", 45, yPos, { align: 'right' });
        doc.text("Total", pageWidth - margin, yPos, { align: 'right' });
    }
    yPos += 4;

    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // 4. Items List
    doc.setFont('helvetica', 'normal');
    let totalItems = 0;
    (saleData.items || []).forEach((item: any) => {
        const itemName = item.name.length > 20 ? item.name.substring(0, 18) + '...' : item.name;
        doc.text(itemName, margin, yPos);

        if (isEducation) {
            doc.text(`${item.quantity}`, pageWidth - margin, yPos, { align: 'right' });
        } else {
            doc.text(`${item.quantity} x ${item.unitPrice}`, 45, yPos, { align: 'right' });
            const lineTotal = item.quantity * item.unitPrice;
            doc.text(lineTotal?.toLocaleString(), pageWidth - margin, yPos, { align: 'right' });
        }

        yPos += 5;
        totalItems += item.quantity;
    });

    yPos += 2;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 6;

    // 5. Totals & Summaries
    if (isEducation) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("TOTAL ITEMS ISSUED:", margin, yPos);
        doc.text(totalItems.toString(), pageWidth - margin, yPos, { align: 'right' });
        yPos += 10;

        // Dotted Signature Line
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("Recipient Signature:", margin, yPos);
        yPos += 8;
        doc.setLineDashPattern([1, 1], 0);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        doc.setLineDashPattern([], 0);
        yPos += 8;
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("TOTAL DUE:", 30, yPos);
        doc.text(`Kes ${saleData.totalAmount?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("Payment Method:", 30, yPos);
        doc.text(saleData.paymentMethod?.toUpperCase() || 'CASH', pageWidth - margin, yPos, { align: 'right' });
        yPos += 6;

        doc.text("Items Count:", 30, yPos);
        doc.text(totalItems.toString(), pageWidth - margin, yPos, { align: 'right' });
        yPos += 8;
    }

    // 6. Footer
    doc.setFont('helvetica', 'italic');
    centerText(isEducation ? "Issued for Academic Use Only" : "Thank you for your business!", yPos);
    yPos += 4;

    doc.setFontSize(6);
    centerText("Powered by Eduai Automation", yPos);

    return doc.output('bloburl');
};

export const generateUserListPdf = async (
    users: User[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null,
    departments: Department[],
    courses: Course[],
    institution: Institution
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(title, margin, yPos);
    yPos += 10;

    const head = [['Name', 'Gender', 'Role', 'ID', 'Contact', 'Dept/Course']];
    const body = (users || []).map(u => {
        let deptOrCourse = 'N/A';
        if (u.role === 'student') {
            const course = (courses || []).find(c => c.id === u.courseId);
            deptOrCourse = course ? course.name : 'N/A';
        } else {
            const dept = (departments || []).find(d => d.id === u.departmentId);
            deptOrCourse = dept ? dept.name : 'N/A';
        }

        return [
            u.name,
            u.gender || '-',
            formatRoleDisplayName(u.role, institution),
            u.staffId,
            u.phoneNumber || u.email,
            deptOrCourse
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateCourseListPdf = async (
    courses: Course[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null,
    departments: Department[],
    academicLevels: AcademicLevel[]
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 10;

    const head = [['Code', 'Name', 'Department', 'Academic Level', 'Streams']];
    const body = (courses || []).map(c => {
        const dept = (departments || []).find(d => d.id === c.departmentId);
        const level = (academicLevels || []).find(l => l.id === c.academicLevelId);
        return [
            c.code,
            c.name,
            dept ? dept.name : 'N/A',
            level ? level.name : 'N/A',
            (c.levels || []).length
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateTimetablePdf = async (
    generatedTimetable: TimetableEntry[],
    getSubjectById: (id: string) => Subject | undefined,
    getLecturerById: (id: string) => User | undefined,
    getRoomById: (id: string) => Room | undefined,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    title: string,
    courses: Course[],
    activeSemester: Semester | null,
    timetableSettings: TimetableSettings,
    workloadSummary?: { name: string; subjectNames: string; subjectCount: number; totalPeriods: number }[]
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({ orientation: 'landscape' });

    const subjectToLevelMap = new Map<string, { courseCode: string, levelName: string }>();
    (courses || []).forEach(course => {
        (course.levels || []).forEach(level => {
            (level.subjectIds || []).forEach(subjectId => {
                if (!subjectToLevelMap.has(subjectId)) {
                    subjectToLevelMap.set(subjectId, { courseCode: course.code, levelName: level.name });
                }
            });
        });
    });

    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let tableStartY = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(title, margin, tableStartY - 5);

    if (activeSemester?.sessions && activeSemester.sessions.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        const sessionText = "Sessions: " + activeSemester.sessions.map(s => `${s.name} (${s.startDate} to ${s.endDate})`).join(', ');
        const splitText = doc.splitTextToSize(sessionText, doc.internal.pageSize.getWidth() - margin * 2);
        doc.text(splitText, margin, tableStartY);
        tableStartY += (splitText.length * 4) + 2;
    } else {
        tableStartY += 5;
    }

    // Defensive checks for settings
    const daysOfWeek = timetableSettings?.operatingDays || [];
    const periodHeaders = generatePeriodLabels(timetableSettings, true);
    const displaySlots = generateDisplaySlots(timetableSettings, true);
    const cellSpanMinutes = timetableSettings?.cellSpanMinutes || 60;
    const breaks = timetableSettings?.breaks || [];

    const head = [
        ['Day', ...periodHeaders.map(period => `${period.label}\n${period.startTime} - ${period.endTime}`)]
    ];
    const body: any[] = [];

    for (const day of daysOfWeek) {
        const row: any[] = [day];
        const rowOccupiedSlots = new Set<number>();

        for (let i = 0; i < displaySlots.length; i++) {
            const slot = displaySlots[i];
            const slotStartMinutes = timeToMinutes(slot.start);

            if (rowOccupiedSlots.has(slotStartMinutes)) continue;

            // Improved Break Detection: Check if a break starts at this slot OR covers this slot
            const breakObj = breaks.find(b =>
                b.status !== 'inactive' &&
                timeToMinutes(b.startTime) <= slotStartMinutes &&
                timeToMinutes(b.endTime) > slotStartMinutes
            );
            const isBreak = !!breakObj;

            const slotEntries = (generatedTimetable || []).filter(e =>
                e.day === day &&
                timeToMinutes(e.startTime) === slotStartMinutes
            );

            let cellContent = '';
            let cellColSpan = 1;
            let cellStyle: any = { valign: 'middle', halign: 'center', fontSize: 8 };

            if (isBreak) {
                cellContent = breakObj?.name || 'BREAK';
                cellStyle.fillColor = [220, 220, 220]; // Darker grey for visibility
                cellStyle.fontStyle = 'bold';
                cellStyle.textColor = [80, 80, 80];

                // Calculate break duration to determine colspan
                const breakDuration = timeToMinutes(breakObj!.endTime) - timeToMinutes(breakObj!.startTime);
                cellColSpan = Math.max(1, Math.round(breakDuration / cellSpanMinutes));

                // Mark slots as occupied
                for (let k = 0; k < cellColSpan; k++) {
                    rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                }

            } else if (slotEntries.length > 0) {
                // If multiple entries (block), join them
                cellContent = slotEntries.map(e => {
                    const subject = getSubjectById(e.subjectId);
                    const lecturer = getLecturerById(e.lecturerId);
                    const room = getRoomById(e.roomId);
                    const levelInfo = subject ? subjectToLevelMap.get(subject.id) : null;

                    return [
                        `${subject?.name || 'Unknown'}`,
                        levelInfo ? `${levelInfo.courseCode} (${levelInfo.levelName})` : '',
                        `${lecturer?.name || 'N/A'}`,
                        `${room?.name || 'N/A'}`,
                    ].filter(Boolean).join(' | ');
                }).join('\n---\n');

                const maxDuration = Math.max(...slotEntries.map(e => (e.duration || (timeToMinutes(e.endTime) - timeToMinutes(e.startTime)))));
                cellColSpan = Math.max(1, Math.round(maxDuration / cellSpanMinutes));

                for (let k = 0; k < cellColSpan; k++) {
                    rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                }
            }

            row.push({
                content: cellContent,
                colSpan: cellColSpan,
                styles: cellStyle,
            });

            // Skip columns if colspan > 1 (autoTable handles the span, but we need to skip the iteration count to align with displaySlots logic if we were iterating strictly 1-by-1,
            // BUT here 'i' is the index of displaySlots. If displaySlots are purely time slices, we need to advance 'i'.
            // displaySlots usually contains ALL slots (breaks + periods).
            // If cellColSpan represents number of *displaySlots* covered, we skip.
            // If cellColSpan represents number of *cellSpanMinutes* units, and displaySlots are also chunked by cellSpanMinutes, we skip.
            // Assuming displaySlots are atomic units of 'cellSpanMinutes' or the exact periods/breaks.
            // If displaySlots is [Period1, Break, Period2], and Break is 1 slot, colSpan=1.
            // If period is double, colSpan=2. We need to verify if displaySlots has the next period.

            // SIMPLIFICATION: just let the loop proceed, but check `rowOccupiedSlots`.
            // We already have `if (rowOccupiedSlots.has(slotStartMinutes)) continue;` at the top.
            // So we don't need to manually increment `i` here, just ensure `rowOccupiedSlots` is populated correctly.
        }
        body.push(row);
    }

    doc.autoTable({
        head,
        body,
        startY: tableStartY,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        didDrawPage: () => setupPdfFooter(doc, footerImg),
    });

    return doc.output('bloburl'); // Return Blob URL instead of Data URI
};

/**
 * Generates an official employment contract PDF.
 */
export const generateContractPdf = async (
    contract: LecturerContract,
    lecturer: User,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    signatureUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg, sigImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl),
        loadImage(signatureUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("EMPLOYMENT CONTRACT", margin, yPos);
    yPos += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const contentLines = doc.splitTextToSize(contract.content, doc.internal.pageSize.getWidth() - (margin * 2));
    doc.text(contentLines, margin, yPos);
    yPos += (contentLines.length * 5) + 20;

    if (sigImg) {
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFont('helvetica', 'bold');
        doc.text("Electronic Signature:", margin, yPos);
        yPos += 5;
        const sigWidth = 40;
        const sigHeight = (sigImg.height * sigWidth) / sigImg.width;
        doc.addImage(sigImg, 'PNG', margin, yPos, sigWidth, sigHeight);
        yPos += sigHeight + 10;
        doc.setFont('helvetica', 'normal');
        doc.text(`Authenticated on: ${new Date((contract as any).acceptanceTimestamp || Date.now())?.toLocaleString()}`, margin, yPos);
    }

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateExamTimetablePdf = async (
    entries: ExamTimetableEntry[],
    getSubjectById: (id: string) => Subject | undefined,
    getLecturerById: (id: string) => User | undefined,
    getRoomById: (id: string) => Room | undefined,
    buildings: Building[],
    courses: Course[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig?.headerImageUrl), loadImage(footerImageUrl)]);
    let yPos = setupPdfHeader(doc, headerImg);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, yPos);
    yPos += 10;
    const head = [['Date', 'Time', 'Subject', 'Room', 'Invigilator']];
    const body = (entries || []).map(e => [
        new Date(e.date).toLocaleDateString(),
        `${e.startTime}-${e.endTime}`,
        getSubjectById(e.subjectId)?.name || 'N/A',
        getRoomById(e.roomId)?.name || 'N/A',
        getLecturerById(e.invigilatorId)?.name || 'N/A'
    ]);
    doc.autoTable({ startY: yPos, head, body, theme: 'grid' });
    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateWorkloadStatisticsPdf = async (
    summaryStats: { label: string; value: number | string }[],
    departmentWorkload: any[],
    lecturerWorkload: any[],
    subjectAllocationStatus: any[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig?.headerImageUrl), loadImage(footerImageUrl)]);
    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 12;

    // Summary Statistics Cards (Row layout)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    let xPos = margin;
    const cardWidth = (pageWidth - (margin * 2)) / 4;

    (summaryStats || []).forEach(s => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(s.label.toUpperCase(), xPos, yPos);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(45, 55, 72);
        doc.text(String(s.value), xPos, yPos + 7);
        xPos += cardWidth;
    });

    yPos += 20;

    // Faculty Workload Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text("Faculty Workload Summary", margin, yPos);
    yPos += 5;

    const workloadHead = [['Faculty Member', 'Allocated Units', 'Rooms', 'Cnt', 'Periods', 'Hrs/Wk']];
    const workloadBody = (lecturerWorkload || []).map(lec => [
        lec.name,
        lec.subjectNames || 'None',
        lec.roomNames || 'N/A',
        lec.subjectCount,
        lec.totalPeriods,
        lec.totalHours.toFixed(1)
    ]);

    const grandTotalHours = (lecturerWorkload || []).reduce((sum, lec) => sum + lec.totalHours, 0);
    const grandTotalPeriods = (lecturerWorkload || []).reduce((sum, lec) => sum + lec.totalPeriods, 0);

    doc.autoTable({
        startY: yPos,
        head: workloadHead,
        body: workloadBody,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30 },
            3: { cellWidth: 10, halign: 'center' },
            4: { cellWidth: 15, halign: 'center' },
            5: { cellWidth: 15, halign: 'center' }
        },
        foot: [[
            { content: 'GRAND TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: String(grandTotalPeriods), styles: { halign: 'center', fontStyle: 'bold' } },
            { content: `${grandTotalHours.toFixed(1)} Hrs`, styles: { halign: 'center', fontStyle: 'bold' } }
        ]],
        footStyles: { fillColor: [240, 240, 240], textColor: 0 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Subject Allocation Status
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Subject Allocation Audit", margin, yPos);
    yPos += 5;

    const subjectHead = [['Code', 'Subject Name', 'Department', 'Status']];
    const subjectBody = (subjectAllocationStatus || []).map(s => [
        s.code,
        s.name,
        s.departmentName,
        s.allocatedPeriods > 0 ? 'ALLOCATED' : 'PENDING'
    ]);

    doc.autoTable({
        startY: yPos,
        head: subjectHead,
        body: subjectBody,
        theme: 'striped',
        headStyles: { fillColor: [74, 85, 104], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7 },
        columnStyles: {
            3: { fontStyle: 'bold', textColor: [0, 100, 0] } // Default green for status
        },
        didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 3) {
                if (data.cell.raw === 'PENDING') {
                    data.cell.styles.textColor = [200, 0, 0];
                }
            }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateRoomUtilizationPdf = async (
    data: any[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig?.headerImageUrl), loadImage(footerImageUrl)]);
    let yPos = setupPdfHeader(doc, headerImg);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, yPos);
    yPos += 10;

    const head = [['Room / Facility', 'Capacity', 'Utilization %', 'Occupancy Attribution']];
    const body = (data || []).map(d => {
        const attribution = Object.entries(d.usageBreakdown || {})
            .map(([cls, hrs]) => `${cls}: ${Number(hrs).toFixed(1)}h`)
            .join(', ');

        return [
            d.room.name, 
            d.room.capacity, 
            `${d.utilizationPercentage.toFixed(1)}%`,
            attribution || 'No active sessions'
        ];
    });

    doc.autoTable({ 
        startY: yPos, 
        head, 
        body, 
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8 },
        columnStyles: {
            3: { cellWidth: 80 } // Give more space for attribution strings
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateAdvisoryReportPdf = async (
    conflicts: RoomConflict[],
    totalRooms: number,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("Room Allocation Advisory Report", margin, yPos);
    yPos += 12;

    // Summary Section
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 25, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text("REPORT SUMMARY", margin + 5, yPos + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Concurrent Room Capacity: ${totalRooms}`, margin + 5, yPos + 16);
    doc.text(`Detected Conflicting Time Slots: ${conflicts.length}`, margin + 80, yPos + 16);
    yPos += 35;

    if (conflicts.length > 0) {
        const head = [['Day', 'Time Slot', 'Lessons', 'Capacity', 'Shortfall']];
        const body = conflicts.map(c => [
            c.day,
            `${c.startTime} - ${c.endTime}`,
            c.concurrentLessons.toString(),
            totalRooms.toString(),
            { content: c.roomShortfall.toString(), styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }
        ]);

        (doc as any).autoTable({
            startY: yPos,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 3 },
            margin: { left: margin }
        });
    } else {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        doc.text("No room allocation conflicts were detected in the current timetable configuration.", margin, yPos);
    }

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateStudentTimetablePdf = async (
    student: User,
    entries: TimetableEntry[],
    getSubjectById: (id: string) => Subject | undefined,
    getLecturerById: (id: string) => User | undefined,
    getRoomById: (id: string) => Room | undefined,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    course: Course,
    level: CourseLevel,
    timetableSettings: TimetableSettings
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({ orientation: 'landscape' });
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Student Timetable: ${student.name}`, margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${course.name} - ${level.name} (${student.staffId || 'No ID'})`, margin, yPos);
    yPos += 12;

    const days = timetableSettings?.operatingDays || [];
    const head = [['Day', 'Time', 'Subject', 'Lecturer', 'Room']];

    // Day order for sorting
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedEntries = [...entries].sort((a, b) => {
        const d1 = dayOrder.indexOf(a.day);
        const d2 = dayOrder.indexOf(b.day);
        if (d1 !== d2) return d1 - d2;
        return a.startTime.localeCompare(b.startTime);
    });

    const body = sortedEntries.map(e => {
        const s = getSubjectById(e.subjectId);
        const l = getLecturerById(e.lecturerId);
        const r = getRoomById(e.roomId);
        return [
            e.day,
            `${e.startTime} - ${e.endTime}`,
            s?.name || s?.code || 'N/A',
            l?.name || 'N/A',
            r?.name || 'N/A'
        ];
    });

    (doc as any).autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: margin }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateInternshipReportPdf = async (
    student: User,
    internship: Internship,
    courseName: string,
    report: string,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("Industrial Attachment / Internship Report", margin, yPos);
    yPos += 12;

    // Student & Internship Details Table
    const detailsHead = [['Attribute', 'Details']];
    const detailsBody = [
        ['Student Name', student.name],
        ['Registration Number', student.staffId || 'N/A'],
        ['Course of Study', courseName],
        ['Company/Organization', internship.industryName],
        ['Position', (internship as any).position || 'Student Intern'],
        ['Duration', `${new Date(internship.startDate).toLocaleDateString()} to ${new Date(internship.endDate).toLocaleDateString()}`],
        ['Supervisor', (internship as any).supervisorName || 'N/A']
    ];

    (doc as any).autoTable({
        startY: yPos,
        head: detailsHead,
        body: detailsBody,
        theme: 'grid',
        headStyles: { fillColor: [74, 85, 104], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: margin },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Report Content
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Internship Summary & Activities", margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitReport = doc.splitTextToSize(report || "No activity report provided.", pageWidth - (margin * 2));
    doc.text(splitReport, margin, yPos);

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates a comprehensive Master Timetable PDF for courses and their levels.
 * Returns a Blob suitable for preview or download.
 */
export const generateMasterCourseTimetablePdf = async (
    generatedTimetable: TimetableEntry[],
    courses: Course[],
    title: string,
    subTitle: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    logoUrl: string | null,
    academicYearName: string,
    activeSemesterName: string,
    timetableSettings: TimetableSettings,
    getSubjectById: (id: string) => Subject | undefined,
    getLecturerById: (id: string) => User | undefined,
    getRoomById: (id: string) => Room | undefined,
    preview: boolean = false,
    layoutMode: 'horizontal' | 'vertical' = 'vertical'
): Promise<Blob> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({
        orientation: 'landscape',
        format: 'a4'
    });
    const margin = 14;
    let yPos = 20;

    try {
        const [headerImg, footerImg] = await Promise.all([
            loadImage(letterheadConfig?.headerImageUrl),
            loadImage(footerImageUrl)
        ]);

        yPos = setupPdfHeader(doc, headerImg);

        // Debug: Print visible config
        console.log("PDF Gen: internal config", { layoutMode, coursesLen: courses?.length });

        // Safe access to timetableSettings properties
        const days = timetableSettings?.operatingDays || [];

        // DEBUG: Check for missing data and render a debug page if necessary
        if (!courses || courses.length === 0 || !days || days.length === 0) {
            doc.addPage();
            doc.setFontSize(20);
            doc.setTextColor(255, 0, 0);
            doc.text("DEBUG: NO DATA TO DISPLAY", margin, 40);
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text(`Courses Found: ${courses?.length || 0}`, margin, 60);
            doc.text(`Days Configured: ${days?.length || 0}`, margin, 70);
            doc.text(`Timetable Entries: ${generatedTimetable?.length || 0}`, margin, 80);
            doc.text(`Layout Mode: ${layoutMode}`, margin, 90);
            setupPdfFooter(doc, footerImg);
            return doc.output('blob');
        }

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, yPos);
        yPos += 7;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(subTitle, margin, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.text(`${academicYearName} • ${activeSemesterName}`, margin, yPos);
        yPos += 15;

        const periodHeaders = generatePeriodLabels(timetableSettings, true);
        const displaySlots = generateDisplaySlots(timetableSettings, true);
        const cellSpanMinutes = timetableSettings?.cellSpanMinutes || 60;
        const breaks = timetableSettings?.breaks || [];

        let pageCount = 0;

        if (layoutMode === 'horizontal') {
            // --- HORIZONTAL / GRID LAYOUT ---
            for (const day of days) {
                if (preview && doc.internal.getNumberOfPages() >= 2) break;

                if (pageCount > 0) {
                    doc.addPage();
                    yPos = setupPdfHeader(doc, headerImg);
                }
                pageCount++;

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(`${day}`, margin, yPos); // Simplified title
                yPos += 10;

                const tableHead = [['Class', ...periodHeaders.map(p => `${p.label}\n${p.startTime} - ${p.endTime}`)]];
                const tableBody: any[] = [];

                for (const course of (courses || [])) {
                    for (const level of (course.levels || [])) {
                        const row: any[] = [`${course.code} ${level.name}`];
                        const rowOccupiedSlots = new Set<number>();

                        for (let i = 0; i < displaySlots.length; i++) {
                            const slot = displaySlots[i];
                            const slotStartMinutes = timeToMinutes(slot.start);

                            if (rowOccupiedSlots.has(slotStartMinutes)) continue;

                            const isBreak = slot.isBreak;
                            const breakText = (slot.label || 'BREAK').split('').join('\n');

                            const entries = (generatedTimetable || []).filter(e =>
                                e.day === day &&
                                (String(e.courseLevelId) === String(level.id) || String((e as any).courseLevelId) === String(level.id) || String((e as any).course_level_id) === String(level.id)) &&
                                timeToMinutes(e.startTime) === slotStartMinutes
                            );

                            if (isBreak) {
                                // Calculate break colSpan to ensure display consistency
                                const slotEndMinutes = timeToMinutes(slot.end);
                                const breakObj = timetableSettings.breaks.find(b => b.status !== 'inactive' && b.startTime === slot.start);
                                let colSpan = 1;
                                if (breakObj) {
                                  const breakEndMinutes = timeToMinutes(breakObj.endTime);
                                  if (breakEndMinutes > slotEndMinutes) {
                                      for (let k = i + 1; k < displaySlots.length; k++) {
                                          if (timeToMinutes(displaySlots[k].start) < breakEndMinutes) {
                                              colSpan++;
                                          } else {
                                              break;
                                          }
                                      }
                                  }
                                }
                                
                                row.push({ 
                                  content: breakText, 
                                  colSpan, 
                                  styles: { halign: 'center', valign: 'middle', fontSize: 9, fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [150, 150, 150], cellPadding: 1 } 
                                });
                                for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                                i += colSpan - 1;
                            } else if (entries.length > 0) {
                                const isBlock = entries.length > 1;
                                const text = entries.map(e => {
                                    const s = getSubjectById(e.subjectId);
                                    const l = getLecturerById(e.lecturerId);
                                    // STRICT ROOM LOOKUP LOGIC
                                    // 1. Use the explicitly assigned room (e.roomId) if available.
                                    // 2. Fallback to Dedicated Subject Room.
                                    // 3. (Optional) Fallback to Class Base Room (not implemented here but common).

                                    const subjMeta = (level.subjectMetadata || []).find(m => m.subjectId === e.subjectId);
                                    let effectiveRoomId = e.roomId;

                                    // Only override if NO room is assigned
                                    if (!effectiveRoomId && subjMeta?.dedicatedRoomId) {
                                        effectiveRoomId = subjMeta.dedicatedRoomId;
                                    }

                                    const r = getRoomById(effectiveRoomId);
                                    const lecturerInitials = l ? l.name.split(' ').map((n: string) => n[0]).join('') : '';
                                    return [
                                        s?.shortName || s?.code || 'N/A',
                                        lecturerInitials ? `${lecturerInitials} • ${r?.name || ''}` : r?.name || ''
                                    ].filter(Boolean).join('\n');
                                }).join('\n---\n');

                                const slotEndMinutes = timeToMinutes(displaySlots[i].end);
                                const maxEntryEndMinutes = Math.max(...entries.map(e => timeToMinutes(e.endTime)));

                                // Calculate colSpan based on how many periods this lesson actually covers
                                let colSpan = 1;
                                if (maxEntryEndMinutes > slotEndMinutes) {
                                    for (let k = i + 1; k < displaySlots.length; k++) {
                                        if (timeToMinutes(displaySlots[k].start) < maxEntryEndMinutes) {
                                            colSpan++;
                                        } else {
                                            break;
                                        }
                                    }
                                }
                                for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));

                                const customColors = entries.map(e => generatePastelColorRgb(e.subjectId));
                                row.push({ content: text, colSpan, customColors, styles: { halign: 'center', valign: 'middle', fontSize: 7, fontStyle: 'bold', fillColor: customColors[0] } });
                                i += colSpan - 1;
                            } else {
                                row.push('');
                            }
                        }
                        tableBody.push(row);
                    }
                }

                (doc as any).autoTable({
                    startY: yPos,
                    head: tableHead,
                    body: tableBody,
                    theme: 'grid',
                    styles: { fontSize: 7, cellPadding: 2, lineWidth: 0.1, overflow: 'linebreak', valign: 'middle', halign: 'center' },
                    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                    columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 'auto', halign: 'left' } },
                    pageBreak: 'avoid',
                    tableWidth: 'auto',
                    margin: { left: margin, right: margin, bottom: 25 },
                    willDrawCell: (data: any) => {
                        const cell = data.cell;
                        const raw = cell.raw as any;
                        if (raw && raw.customColors && raw.customColors.length > 1) {
                            const colors = raw.customColors;
                            const stripeHeight = cell.height / colors.length;
                            for (let k = 0; k < colors.length; k++) {
                                const [r, g, b] = colors[k];
                                data.doc.setFillColor(r, g, b);
                                data.doc.rect(cell.x, cell.y + (k * stripeHeight), cell.width, stripeHeight, 'F');
                            }
                            cell.styles.fillColor = null; // Skip default background drawing
                        }
                    },
                    didDrawCell: (data: any) => {
                        const cell = data.cell;
                        const raw = cell.raw as any;
                        if (raw && raw.customColors && raw.customColors.length > 1) {
                            // Redraw the border to stay on top
                            data.doc.setDrawColor(200);
                            data.doc.setLineWidth(0.1);
                            data.doc.rect(cell.x, cell.y, cell.width, cell.height, 'S');
                        }
                    }
                });

                yPos = (doc as any).lastAutoTable.finalY + 15;
            }
        } else {
            // --- VERTICAL LAYOUT ---

            // Proceed with Main Timetable Blocks
            for (const course of (courses || [])) {
                if (!course) continue;
                for (const level of (course.levels || [])) {
                    if (!level) continue;
                    if (preview && pageCount >= 1) break;

                    if (pageCount > 0) {
                        doc.addPage();
                        yPos = setupPdfHeader(doc, headerImg);
                    }
                    pageCount++;

                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${course.name} (${course.code}) - ${level.name}`, margin, yPos);

                    if (level.classTeacherId) {
                        try {
                            const classTeacher = getLecturerById(level.classTeacherId);
                            if (classTeacher) {
                                doc.setFontSize(10);
                                doc.setFont('helvetica', 'italic');
                                doc.setTextColor(100);
                                const teacherText = `Class Teacher: ${classTeacher.name || 'Unknown'}`;
                                const textWidth = doc.getTextWidth(teacherText);
                                const pageWidth = doc.internal.pageSize.getWidth ? doc.internal.pageSize.getWidth() : doc.internal.pageSize.width;
                                doc.text(teacherText, pageWidth - margin - textWidth, yPos);
                                doc.setTextColor(0);
                            }
                        } catch (err) { console.warn("Class teacher lookup error:", err); }
                    }
                    yPos += 10;

                    // --- PER-CLASS WORKLOAD SUMMARY ---
                    const classEntries = (generatedTimetable || []).filter(e => (String(e.courseLevelId) === String(level.id) || String((e as any).course_level_id) === String(level.id)));
                    const classLecturerWorkload = new Map<string, { periods: number, subjects: Set<string> }>();

                    classEntries.forEach(e => {
                        const lStat = classLecturerWorkload.get(e.lecturerId) || { periods: 0, subjects: new Set() };
                        lStat.periods += 1;
                        lStat.subjects.add(e.subjectId);
                        classLecturerWorkload.set(e.lecturerId, lStat);
                    });

                    const workloadBody = Array.from(classLecturerWorkload.entries()).map(([id, stats]) => {
                        const l = getLecturerById(id);
                        const subjNames = Array.from(stats.subjects).map(sid => {
                            const s = getSubjectById(sid);
                            // Find metadata for this subject in this level to get dedicated room
                            const subjMeta = (level.subjectMetadata || []).find(m => m.subjectId === sid);
                            const roomId = subjMeta?.dedicatedRoomId;
                            const r = roomId ? getRoomById(roomId) : undefined;
                            const roomText = r ? ` (${r.name})` : '';
                            return (s?.shortName || s?.code || 'Unknown') + roomText;
                        }).join(', ');
                        return [l?.name || 'Unknown', subjNames, stats.periods];
                    }).sort((a, b) => String(a[0]).localeCompare(String(b[0])));

                    (doc as any).autoTable({
                        startY: yPos,
                        head: [['Staff Name', 'Subjects Taught', 'Periods']],
                        body: workloadBody,
                        theme: 'striped',
                        headStyles: { fillColor: [45, 55, 72] },
                        styles: { fontSize: 7, cellPadding: 1.5 },
                        margin: { left: margin, right: margin, bottom: 25 }
                    });

                    yPos = (doc as any).lastAutoTable.finalY + 10;

                    // Check space before starting timetable (Relaxed check to allow fitting on same page)
                    if (yPos > doc.internal.pageSize.getHeight() - 20) {
                        doc.addPage();
                        yPos = setupPdfHeader(doc, headerImg);
                    }

                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${course.name} (${course.code}) - ${level.name} (TIMETABLE)`, margin, yPos);
                    yPos += 10;
                    const tableHead = [['Day', ...periodHeaders.map(p => `${p.label}\n${p.startTime} - ${p.endTime}`)]];
                    const tableBody: any[] = [];

                    days.forEach((day, dIndex) => {
                        const row: any[] = [day];
                        const rowOccupiedSlots = new Set<number>();

                        for (let i = 0; i < displaySlots.length; i++) {
                            const slot = displaySlots[i];
                            const slotStartMinutes = timeToMinutes(slot.start);
                            if (rowOccupiedSlots.has(slotStartMinutes)) continue;

                            const isBreak = slot.isBreak;
                            const breakText = (slot.label || 'BREAK').split('').join('\n');
                            const entries = (generatedTimetable || []).filter(e =>
                                e.day === day &&
                                (String(e.courseLevelId) === String(level.id) || String((e as any).courseLevelId) === String(level.id) || String((e as any).course_level_id) === String(level.id)) &&
                                timeToMinutes(e.startTime) === slotStartMinutes
                            );

                            if (isBreak) {
                                // Calculate break colSpan
                                const slotEndMinutes = timeToMinutes(slot.end);
                                const breakObj = timetableSettings.breaks.find(b => b.status !== 'inactive' && b.startTime === slot.start);
                                let colSpan = 1;
                                if (breakObj) {
                                  const breakEndMinutes = timeToMinutes(breakObj.endTime);
                                  if (breakEndMinutes > slotEndMinutes) {
                                      for (let k = i + 1; k < displaySlots.length; k++) {
                                          if (timeToMinutes(displaySlots[k].start) < breakEndMinutes) {
                                              colSpan++;
                                          } else {
                                              break;
                                          }
                                      }
                                  }
                                }

                                if (dIndex === 0) {
                                    row.push({
                                        content: breakText,
                                        colSpan: colSpan,
                                        rowSpan: days.length,
                                        styles: {
                                            halign: 'center',
                                            valign: 'middle',
                                            fontSize: 8,
                                            fillColor: [240, 240, 240],
                                            fontStyle: 'bold',
                                            textColor: [100, 100, 100],
                                            cellPadding: 1
                                        }
                                    });
                                }
                                for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                                i += colSpan - 1;
                            } else if (entries.length > 0) {
                                const isBlock = entries.length > 1;
                                const firstEntry = entries[0];
                                const text = entries.map(e => {
                                    const s = getSubjectById(e.subjectId);
                                    // Room info hidden for list layout as requested
                                    return s?.shortName || s?.code || 'N/A';
                                }).join('\n---\n');

                                const slotEndMinutes = timeToMinutes(periodHeaders[i].endTime); 
                                const maxEntryEndMinutes = Math.max(...entries.map(e => timeToMinutes(e.endTime)));

                                // Calculate colSpan based on how many periods this lesson actually covers
                                let colSpan = 1;
                                if (maxEntryEndMinutes > slotEndMinutes) {
                                    for (let k = i + 1; k < periodHeaders.length; k++) {
                                        if (timeToMinutes(periodHeaders[k].startTime) < maxEntryEndMinutes) {
                                            colSpan++;
                                        } else {
                                            break;
                                        }
                                    }
                                }
                                for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));

                                const customColors = entries.map(e => generatePastelColorRgb(e.subjectId));
                                row.push({ content: text, colSpan, customColors, styles: { halign: 'center', valign: 'middle', fontSize: 7, fontStyle: 'bold', fillColor: customColors[0] } });
                                i += colSpan - 1;
                            } else {
                                row.push('');
                            }
                        }
                        tableBody.push(row);
                    });

                    (doc as any).autoTable({
                        startY: yPos,
                        head: tableHead,
                        body: tableBody,
                        theme: 'grid',
                        styles: {
                            fontSize: 7,
                            cellPadding: 1.5,
                            lineWidth: 0.1,
                            overflow: 'linebreak',
                            valign: 'middle',
                            halign: 'center'
                        },
                        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                        columnStyles: {
                            0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 20, halign: 'left' }
                        },
                        pageBreak: 'avoid',
                        margin: { left: margin, right: margin, bottom: 25 },
                        willDrawCell: (data: any) => {
                            const cell = data.cell;
                            const raw = cell.raw as any;
                            if (raw && raw.customColors && raw.customColors.length > 1) {
                                const colors = raw.customColors;
                                const stripeHeight = cell.height / colors.length;
                                for (let k = 0; k < colors.length; k++) {
                                    const [r, g, b] = colors[k];
                                    data.doc.setFillColor(r, g, b);
                                    data.doc.rect(cell.x, cell.y + (k * stripeHeight), cell.width, stripeHeight, 'F');
                                }
                                cell.styles.fillColor = null;
                            }
                        },
                        didDrawCell: (data: any) => {
                            const cell = data.cell;
                            const raw = cell.raw as any;
                            if (raw && raw.customColors && raw.customColors.length > 1) {
                                data.doc.setDrawColor(200);
                                data.doc.setLineWidth(0.1);
                                data.doc.rect(cell.x, cell.y, cell.width, cell.height, 'S');
                            }
                        }
                    });

                    yPos = (doc as any).lastAutoTable.finalY + 15;
                    // In Vertical/List mode, we want to show all classes for the first course at least, 
                    // or up to a few classes globally if multiple courses exist.
                    if (preview && pageCount >= 1) {
                        setupPdfFooter(doc, footerImg);
                        return doc.output('blob');
                    }
                }
                if (preview && pageCount >= 1) break;
            }
        }

        setupPdfFooter(doc, footerImg);
        return doc.output('blob');

    } catch (error: any) {
        console.error("PDF Gen Error:", error);
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(255, 0, 0);
        doc.text("ERROR GENERATING PDF", margin, 40);
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(error?.message || String(error), margin, 60);
        return doc.output('blob');
    }
};

export const generateStudentContactListPdf = async (
    students: User[],
    courseName: string,
    departmentName: string,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig?.headerImageUrl), loadImage(footerImageUrl)]);
    let yPos = setupPdfHeader(doc, headerImg);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Contacts: ${courseName}`, 14, yPos);
    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates an official Student Leave Out / Exeat Permission Sheet.
 */
export const generateLeaveOutSheetPdf = async (
    request: LeaveOutWithDetails | LeaveOutRequest,
    institution: Institution,
    companyDetails: CompanyDetails,
    users: User[],
    courses: Course[]
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    // Enrich request if it's only LeaveOutRequest
    let req: LeaveOutWithDetails;
    if ('studentName' in request) {
        req = request as LeaveOutWithDetails;
    } else {
        const student = users.find(u => u.id === request.studentId);
        const teacher = users.find(u => u.id === request.classTeacherId);
        const course = courses.find(c => c.id === student?.courseId);
        const level = (course?.levels || []).find(l => l.id === student?.courseLevelId);
        req = {
            ...request,
            studentName: student?.name || 'Unknown',
            studentClass: `${course?.code || ''} ${level?.name || ''}`.trim(),
            parentPhone: '',
            parentEmail: '',
            classTeacherName: teacher?.name || 'Unknown'
        };
    }

    const [headerImg, footerImg] = await Promise.all([
        loadImage(institution.letterheadConfig?.headerImageUrl || companyDetails.letterheadConfig?.headerImageUrl),
        loadImage(institution.footerImageUrl || companyDetails.footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("PERMISSION SHEET", pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Request ID & Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sheet ID: ${req.id}`, margin, yPos);
    doc.text(`Generated: ${new Date()?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 10;

    // Student Information Block
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 40, 'F');
    yPos += 8;

    doc.setFont('helvetica', 'bold');
    doc.text("STUDENT INFORMATION", margin + 5, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    const studentInfo = [
        ['Full Name:', req.studentName],
        ['Class/Course:', req.studentClass],
        ['Leave Reason:', req.reason],
    ];

    studentInfo.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, margin + 45, yPos);
        yPos += 6;
    });

    yPos += 10;

    // Duration Block
    doc.setFont('helvetica', 'bold');
    doc.text("PERMISSION PERIOD", margin, yPos);
    yPos += 8;

    const durationInfo = [
        ['Departure Date:', new Date(req.leaveDate).toLocaleDateString()],
        ['Return Date:', new Date(req.returnDate).toLocaleDateString()],
    ];

    durationInfo.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, margin + 40, yPos);
        yPos += 6;
    });

    yPos += 20;

    // Verification Stages
    doc.setFont('helvetica', 'bold');
    doc.text("AUTHORIZATION TRACKING", margin, yPos);
    yPos += 10;

    const stages = [
        ['1. Class Teacher', req.classTeacherName, 'AUTHORIZED', req.createdAt ? new Date(req.createdAt)?.toLocaleString() : '---'],
        ['2. Boarding Master', req.boardingMasterName || '---', req.boardingMasterName ? 'CHECKED OUT' : 'PENDING', req.houseCheckedOutAt ? new Date(req.houseCheckedOutAt)?.toLocaleString() : '---'],
        ['3. Security Gate', req.securityName || '---', req.securityName ? 'EXIT GRANTED' : 'PENDING', req.gateCheckedOutAt ? new Date(req.gateCheckedOutAt)?.toLocaleString() : '---'],
    ];

    doc.autoTable({
        startY: yPos,
        head: [['Stage', 'Authorized By', 'Status', 'Timestamp']],
        body: stages,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 9 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 30;

    // Official Stamp Area
    const boxSize = 50;
    doc.setDrawColor(200);
    // doc.rect(pageWidth - margin - boxSize, yPos, boxSize, boxSize); // Skip rect if we want it cleaner or if yPos is close to edge
    if (yPos + boxSize < doc.internal.pageSize.getHeight() - 20) {
        doc.rect(pageWidth - margin - boxSize, yPos, boxSize, boxSize);
        doc.setFontSize(8);
        doc.text("OFFICIAL STAMP", pageWidth - margin - (boxSize / 2), yPos + (boxSize / 2), { align: 'center' });
    }

    // Warning
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    const warningText = "Notice: This document is a valid permission for the student to be outside the institution for the specified period. It must be surrendered to security upon return.";
    const splitWarning = doc.splitTextToSize(warningText, pageWidth - (margin * 2) - boxSize - 10);
    doc.text(splitWarning, margin, yPos + 10);

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateLibraryUnreturnedReportPdf = async (
    data: any[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    getBookTitle: (id: string) => string
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 10;

    const head = [['Recipient', 'ID', 'Item Borrowed', 'Due Date', 'Status']];
    const body = data.map(item => {
        const isOverdue = new Date(item.dueDate) < new Date();
        return [
            item.user?.name || 'Unknown',
            item.user?.staffId || '-',
            getBookTitle(item.bookId),
            new Date(item.dueDate).toLocaleDateString(),
            isOverdue ? 'OVERDUE' : 'Active'
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: {
            4: { fontStyle: 'bold' }
        },
        didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 4 && data.cell.raw === 'OVERDUE') {
                data.cell.styles.textColor = [220, 38, 38]; // rose-600
            }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateMasterFacilityGridPdf = async (
    generatedTimetable: TimetableEntry[],
    buildings: Building[],
    rooms: Room[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    logoUrl: string | null,
    academicYearName: string,
    activeSemesterName: string,
    timetableSettings: TimetableSettings,
    selectedDay: string,
    getSubjectById: (id: string) => Subject | undefined,
    getLecturerById: (id: string) => User | undefined,
    getCourseById: (id: string) => Course | undefined,
    courses: Course[],
    preview: boolean = false
): Promise<Blob> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({ orientation: 'landscape', format: 'a4' });
    const margin = 14;
    let yPos = 20;

    try {
        const [headerImg, footerImg] = await Promise.all([
            loadImage(letterheadConfig?.headerImageUrl),
            loadImage(footerImageUrl)
        ]);

        yPos = setupPdfHeader(doc, headerImg);

        // Build Subject Dedicated Room Map for strict enforcement
        const subjectDedicatedRoomMap = new Map<string, string>();
        (courses || []).forEach(c => {
            (c.levels || []).forEach(l => {
                (l.subjectMetadata || []).forEach(m => {
                    if (m.dedicatedRoomId) {
                        subjectDedicatedRoomMap.set(m.subjectId, m.dedicatedRoomId);
                    }
                });
            });
        });

        const days = timetableSettings?.operatingDays || [];
        const periodHeaders = generatePeriodLabels(timetableSettings, true);
        const displaySlots = generateDisplaySlots(timetableSettings, true);
        const cellSpanMinutes = timetableSettings?.cellSpanMinutes || 60;
        const breaks = timetableSettings?.breaks || [];

        // Filter rooms and buildings
        const safeRooms = (rooms || []).filter(Boolean);
        const safeBuildings = (buildings || []).filter(Boolean).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        let pageCount = 0;

        // Determine which days to include. If it's a "Facility Grid" we might want all days like the Grade Map.
        // We'll loop through days to match Grade Map behavior if that's what's requested.
        for (const day of days) {
            if (preview && doc.internal.getNumberOfPages() >= 2) break;

            if (pageCount > 0) {
                doc.addPage();
                yPos = setupPdfHeader(doc, headerImg);
            }
            pageCount++;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(title, margin, yPos);
            yPos += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${day} • ${academicYearName} • ${activeSemesterName}`, margin, yPos);
            yPos += 15;

            const tableHead = [['Room / Facility', ...periodHeaders.map(p => `${p.label}\n${p.startTime} - ${p.endTime}`)]];
            const tableBody: any[] = [];

            for (const building of safeBuildings) {
                // Section header for Building
                tableBody.push([{
                    content: building.name.toUpperCase(),
                    colSpan: periodHeaders.length + 1,
                    styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [71, 85, 105], halign: 'left', cellPadding: 3 }
                }]);

                const buildingRooms = safeRooms.filter(r => r.buildingId === building.id).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                for (const room of buildingRooms) {
                    const row: any[] = [room.name];
                    const rowOccupiedSlots = new Set<number>();

                     for (let i = 0; i < displaySlots.length; i++) {
                        const slot = displaySlots[i];
                        const slotStartMinutes = timeToMinutes(slot.start);
                        if (rowOccupiedSlots.has(slotStartMinutes)) continue;

                        const entries = (generatedTimetable || []).filter(e => {
                            if (e.day !== day) return false;
                            if (timeToMinutes(e.startTime) !== slotStartMinutes) return false;
                            if (e.roomId === room.id) return true;
                            if (!e.roomId) {
                                const dedicatedId = subjectDedicatedRoomMap.get(e.subjectId);
                                if (dedicatedId === room.id) return room.isShared === true;
                            }
                            return false;
                        });

                        if (slot.isBreak) {
                            const breakText = (slot.label || 'BREAK').split('').join('\n');
                            const slotEndMinutes = timeToMinutes(slot.end);
                            const breakObj = timetableSettings.breaks.find(b => b.status !== 'inactive' && b.startTime === slot.start);
                            let colSpan = 1;
                            if (breakObj) {
                                const breakEndMinutes = timeToMinutes(breakObj.endTime);
                                if (breakEndMinutes > slotEndMinutes) {
                                    for (let k = i + 1; k < displaySlots.length; k++) {
                                        if (timeToMinutes(displaySlots[k].start) < breakEndMinutes) {
                                            colSpan++;
                                        } else {
                                            break;
                                        }
                                    }
                                }
                            }

                            row.push({
                                content: breakText, colSpan,
                                styles: { halign: 'center', valign: 'middle', fontSize: 9, fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [150, 150, 150], cellPadding: 1 }
                            });
                            for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                            i += colSpan - 1;
                        } else if (entries.length > 0) {
                            const isBlock = entries.length > 1;
                            const firstEntry = entries[0];
                            const text = entries.map(e => {
                                const s = getSubjectById(e.subjectId);
                                return (s?.shortName || s?.code || 'N/A');
                            }).join('\n---\n');

                            const maxDuration = Math.max(...entries.map(e => timeToMinutes(e.endTime) - timeToMinutes(e.startTime)));
                            const colSpan = Math.max(1, Math.round(maxDuration / cellSpanMinutes));
                            for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));

                            const customColors = entries.map(e => generatePastelColorRgb(e.subjectId));
                            row.push({
                                content: text, colSpan, customColors,
                                styles: { halign: 'center', valign: 'middle', fontSize: 6, fontStyle: 'bold', fillColor: customColors[0] }
                            });
                            i += colSpan - 1;
                        } else {
                            row.push('');
                        }
                    }
                    tableBody.push(row);
                }
            }

            (doc as any).autoTable({
                startY: yPos,
                head: tableHead,
                body: tableBody,
                theme: 'grid',
                styles: { fontSize: 6, cellPadding: 2, lineWidth: 0.1, overflow: 'linebreak', valign: 'middle', halign: 'center' },
                headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 7 },
                columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 'auto', halign: 'left' } },
                pageBreak: 'auto',
                tableWidth: 'auto',
                margin: { left: margin, right: margin, bottom: 25 },
                willDrawCell: (data: any) => {
                    const cell = data.cell;
                    const raw = cell.raw as any;
                    if (raw && raw.customColors && raw.customColors.length > 1) {
                        const colors = raw.customColors;
                        const stripeHeight = cell.height / colors.length;
                        for (let k = 0; k < colors.length; k++) {
                            const [r, g, b] = colors[k];
                            data.doc.setFillColor(r, g, b);
                            data.doc.rect(cell.x, cell.y + (k * stripeHeight), cell.width, stripeHeight, 'F');
                        }
                        cell.styles.fillColor = null;
                    }
                },
                didDrawCell: (data: any) => {
                    const cell = data.cell;
                    const raw = cell.raw as any;
                    if (raw && raw.customColors && raw.customColors.length > 1) {
                        data.doc.setDrawColor(200);
                        data.doc.setLineWidth(0.1);
                        data.doc.rect(cell.x, cell.y, cell.width, cell.height, 'S');
                    }
                }
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        setupPdfFooter(doc, footerImg);
        return doc.output('blob');

    } catch (error: any) {
        console.error("Facility Grid PDF Error:", error);
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(255, 0, 0);
        doc.text("ERROR GENERATING FACILITY PDF", margin, 40);
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(error?.message || String(error), margin, 60);
        return doc.output('blob');
    }
};

export const generateLecturerTimetablePdf = async (
    generatedTimetable: TimetableEntry[],
    lecturers: User[],
    title: string,
    subtitle: string,
    letterheadConfig: LetterheadConfig,
    footerImageUrl: string | null,
    logoUrl: string | null,
    academicYearName: string,
    semesterName: string,
    timetableSettings: TimetableSettings,
    getSubjectById: (id: string) => Subject | undefined,
    getRoomById: (id: string) => Room | undefined,
    courses: Course[],
    preview: boolean = false
): Promise<Blob> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({ orientation: 'landscape', format: 'a4' });
    const margin = 14;
    let yPos = 20;

    try {
        const [headerImg, footerImg] = await Promise.all([
            loadImage(letterheadConfig?.headerImageUrl),
            loadImage(footerImageUrl)
        ]);

        yPos = setupPdfHeader(doc, headerImg);

        const days = timetableSettings?.operatingDays || [];
        const periodHeaders = generatePeriodLabels(timetableSettings, true);
        const displaySlots = generateDisplaySlots(timetableSettings, true);
        let pageCount = 0;

        for (const lecturer of lecturers) {
            if (preview && pageCount >= 1) break;

            if (pageCount > 0) {
                doc.addPage();
                yPos = setupPdfHeader(doc, headerImg);
            }
            pageCount++;

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`${lecturer.name} - Timetable`, margin, yPos);
            yPos += 7;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${academicYearName} ${semesterName ? `- ${semesterName}` : ''}`, margin, yPos);
            yPos += 10;

            const lecturerEntries = (generatedTimetable || []).filter(e => e.lecturerId === lecturer.id);
            const workloadStats = {
                periods: lecturerEntries.length,
                hours: lecturerEntries.reduce((acc, e) => acc + (timeToMinutes(e.endTime) - timeToMinutes(e.startTime)) / 60, 0),
                subjects: new Set(lecturerEntries.map(e => e.subjectId)).size
            };

            const workloadBody = [
                ['Total Periods', workloadStats.periods.toString()],
                ['Total Hours', workloadStats.hours.toFixed(1)],
                ['Distinct Subjects', workloadStats.subjects.toString()]
            ];

            // Workload Summary - Compact
            (doc as any).autoTable({
                startY: yPos,
                head: [['Metric', 'Value']],
                body: workloadBody,
                theme: 'striped',
                headStyles: { fillColor: [45, 55, 72], fontSize: 7, fontStyle: 'bold' },
                styles: { fontSize: 7, cellPadding: 1 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 20 } },
                margin: { left: margin, right: margin }
            });

            yPos = (doc as any).lastAutoTable.finalY + 5; // Reduced gap

            const tableHead = [['Day', 'Time', 'Subject', 'Class', 'Room']];
            const tableBodyRows: any[] = [];

            // Sort entries for this lecturer: Day (in order of operatingDays), then StartTime
            const dayOrder = (timetableSettings?.operatingDays || []) as string[];
            const sortedEntries = [...lecturerEntries].sort((a, b) => {
                const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
                if (dayDiff !== 0) return dayDiff;
                return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
            });

            sortedEntries.forEach(entry => {
                const subject = getSubjectById(entry.subjectId);
                const room = getRoomById(entry.roomId);

                let className = '';
                const course = courses.find(c => c.levels.some(l => (l.subjectIds || []).includes(entry.subjectId)));
                if (course) {
                    const lvl = course.levels.find(l => (l.subjectIds || []).includes(entry.subjectId));
                    className = `${course.code} ${lvl?.name || ''}`;
                }

                tableBodyRows.push([
                    entry.day,
                    `${entry.startTime} - ${entry.endTime}`,
                    subject?.name || subject?.shortName || subject?.code || 'N/A',
                    className,
                    room?.name || 'N/A'
                ]);
            });

            if (tableBodyRows.length === 0) {
                tableBodyRows.push([{ content: 'No lessons scheduled', colSpan: 5, styles: { halign: 'center', fontStyle: 'italic' } }]);
            }

            (doc as any).autoTable({
                startY: yPos,
                head: tableHead,
                body: tableBodyRows,
                theme: 'striped', // Changed to striped for list layout
                headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 25 },
                    1: { cellWidth: 35 },
                    2: { fontStyle: 'bold' },
                    3: { cellWidth: 40 },
                    4: { cellWidth: 40 }
                },
                margin: { left: margin, right: margin, bottom: 25 },
                pageBreak: 'auto' // Allow list to span pages if long
            });
        }

    } catch (e) {
        console.error("PDF Generation Error", e);
        // Fallback or error page
        const err = e as Error;
        doc.addPage();
        doc.text(`Error: ${err.message}`, margin, 20);
    }
    return doc.output('blob');
};

export const generateCourseProgressPdf = async (
    reportData: any[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 10;

    reportData.forEach((course) => {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 55, 72);
        doc.text(course.name, margin, yPos);
        yPos += 7;

        course.levels.forEach((level: any) => {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(74, 85, 104);
            doc.text(`${level.name} - Coverage: ${level.overallPercent}%`, margin, yPos);
            yPos += 5;

            const head = [['Subject', 'Code', 'Scheduled', 'Required', 'Coverage (%)']];
            const body = level.subjects.map((s: any) => [
                s.name,
                s.code,
                s.scheduled,
                s.required,
                `${s.percent}%`
            ]);

            doc.autoTable({
                startY: yPos,
                head: head,
                body: body,
                theme: 'striped',
                headStyles: { fillColor: [45, 55, 72], fontSize: 8 },
                styles: { fontSize: 8 },
                margin: { left: margin },
            });

            yPos = (doc as any).lastAutoTable.finalY + 10;
        });

        yPos += 5;
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateEnrollmentCapacityPdf = async (
    analysis: any[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 12;

    // Executive Summary Card Layout
    const metrics = [
        { label: 'Critical Areas', value: `${analysis.filter(r => r.overcrowdedSessions > 0).length} Rooms` },
        { label: 'Avg. Occupancy', value: `${Math.round(analysis.reduce((sum, r) => sum + r.avgRatio, 0) / (analysis.length || 1))}%` },
        { label: 'Optimized', value: `${analysis.filter(r => r.avgRatio > 50 && r.avgRatio <= 100).length} Rooms` },
        { label: 'Underused', value: `${analysis.filter(r => r.sessionCount > 0 && r.avgRatio < 30).length} Rooms` }
    ];

    let xPos = margin;
    const cardWidth = (pageWidth - (margin * 2)) / 4;
    metrics.forEach(m => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(m.label.toUpperCase(), xPos, yPos);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 55, 72);
        doc.text(m.value, xPos, yPos + 6);
        xPos += cardWidth;
    });

    yPos += 20;

    // Detailed Table
    const head = [['Facility Name', 'Capacity', 'Peak Students', 'Avg Density', 'Risk Status']];
    const body = analysis.map(room => [
        room.roomName,
        room.capacity,
        room.maxEnrollment,
        `${Math.round(room.avgRatio)}%`,
        room.overcrowdedSessions > 0 ? `${room.overcrowdedSessions} Overcrowded` : room.sessionCount === 0 ? 'Not in Use' : 'Optimal'
    ]);

    (doc as any).autoTable({
        startY: yPos,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], fontSize: 8 },
        styles: { fontSize: 8 },
        didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 4) {
                if (data.cell.raw.includes('Overcrowded')) {
                    data.cell.styles.textColor = [200, 0, 0];
                } else if (data.cell.raw === 'Optimal') {
                    data.cell.styles.textColor = [0, 128, 0];
                }
            }
        }
    });

    // Session Breakdowns (Top 5 critical rooms)
    const criticalRooms = analysis.filter(r => r.overcrowdedSessions > 0).slice(0, 5);
    if (criticalRooms.length > 0) {
        doc.addPage();
        yPos = setupPdfHeader(doc, headerImg);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("Critical Overcrowding Insights (Top 5)", margin, yPos);
        yPos += 10;

        criticalRooms.forEach(room => {
            if (yPos > 240) {
                doc.addPage();
                yPos = setupPdfHeader(doc, headerImg);
            }

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Facility: ${room.roomName}`, margin, yPos);
            yPos += 5;

            const subHead = [['Day', 'Time', 'Subject / Class', 'Enrollment', 'Status']];
            const subBody = room.sessionInsights.map((s: any) => [
                s.day,
                s.time,
                `${s.subjectName}\n${s.className}`,
                `${s.enrollment}/${s.capacity}`,
                s.isOvercrowded ? 'CRITICAL' : 'OK'
            ]);

            (doc as any).autoTable({
                startY: yPos,
                head: subHead,
                body: subBody,
                theme: 'striped',
                headStyles: { fillColor: [74, 85, 104], fontSize: 7 },
                styles: { fontSize: 7 },
                columnStyles: { 4: { fontStyle: 'bold' } },
                didParseCell: (data: any) => {
                    if (data.section === 'body' && data.column.index === 4 && String(data.cell.raw) === 'CRITICAL') {
                        data.cell.styles.textColor = [200, 0, 0];
                    }
                }
            });

            yPos = (doc as any).lastAutoTable.finalY + 10;
        });
    }

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateRoomDistanceReportPdf = async (
    stats: any,
    buildingLocations: any[],
    buildingMatrix: any[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 12;

    // Stats Cards
    const metrics = [
        { label: 'Mapped Rooms', value: `${stats.geocodedCount}` },
        { label: 'Avg. Walk', value: stats.avgDistanceText },
        { label: 'Max Span', value: stats.maxDistanceText }
    ];

    let xPos = margin;
    const cardWidth = (pageWidth - (margin * 2)) / 3;
    metrics.forEach(m => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(m.label.toUpperCase(), xPos, yPos);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 55, 72);
        doc.text(m.value, xPos, yPos + 6);
        xPos += cardWidth;
    });

    yPos += 25;

    // Building matrix Section
    if (buildingLocations.length > 1) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("Inter-Building Distance Matrix", margin, yPos);
        yPos += 8;

        const head = [['From \\ To', ...buildingLocations.map(b => b.name)]];
        const body = buildingMatrix.map(row => [
            row.source.name,
            ...row.distances.map((dist: number, idx: number) => {
                if (row.source.id === buildingLocations[idx].id) return '-';
                const km = dist >= 1000;
                const dText = km ? `${(dist / 1000).toFixed(2)} km` : `${Math.round(dist)} m`;
                return dText;
            })
        ]);

        (doc as any).autoTable({
            startY: yPos,
            head,
            body,
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72], fontSize: 7 },
            styles: { fontSize: 7 },
            margin: { left: margin }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Footnote
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text("* Distances are calculated using Haversine formula (air distance). Estimated walking times assume 84m/min.", margin, doc.internal.pageSize.getHeight() - 40);

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateRoomProximityReportPdf = async (
    baseRoomName: string,
    neighbors: any[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Reference Facility: ${baseRoomName}`, margin, yPos);
    yPos += 15;

    // Table
    const head = [['Nearest Room', 'Building', 'Distance', 'Est. Walk Time']];
    const body = neighbors.map(n => [
        n.name,
        n.buildingName,
        n.distanceText,
        n.timeText
    ]);

    (doc as any).autoTable({
        startY: yPos,
        head,
        body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], fontSize: 9 },
        styles: { fontSize: 8 },
        margin: { left: margin }
    });

    // Footnote
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text("* Results represent the closest 10 facilities by air distance.", margin, finalY);

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateMemberLibraryHistoryPdf = async (
    member: User,
    transactions: LibraryTransaction[],
    fines: LibraryFine[],
    getBookTitle: (id: string) => string,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [logoImg, footerImg] = await Promise.all([
        loadImage(logoUrl),
        loadImage(footerImageUrl)
    ]);

    const tableStartY = createPdfWithLetterhead(doc, 'LIBRARY MEMBER STATEMENT', companyDetails, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Member Information Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('MEMBER DETAILS', margin, tableStartY - 15);
    doc.line(margin, tableStartY - 12, pageWidth - margin, tableStartY - 12);

    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${member.name}`, margin, tableStartY - 5);
    doc.text(`ID/Reg: ${member.staffId || 'N/A'}`, margin, tableStartY);

    // Guard for member.role - Fixed positioning to avoid overlap with Name
    const roleText = (Array.isArray(member.roles) && member.roles.length > 0)
        ? member.roles.map(r => formatRoleDisplayName(r as Role, institution)).join(', ').toUpperCase()
        : (member.role ? formatRoleDisplayName(member.role, institution).toUpperCase() : 'N/A');
    doc.text(`Role: ${roleText}`, margin, tableStartY + 5);

    // Institution Contact Details
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    const contactInfo = `Email: ${institution.email || 'N/A'} | Phone: ${institution.phoneNumber || 'N/A'}`;
    doc.text(contactInfo, margin, tableStartY + 15);

    // Transactions Table
    let tableY = tableStartY + 25;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('BOOK CIRCULATION HISTORY', margin, tableY - 5);

    const transactionBody = transactions.map(t => ([
        t.issueDate ? new Date(t.issueDate).toLocaleDateString() : 'N/A',
        getBookTitle(t.bookId),
        t.returnDate ? new Date(t.returnDate).toLocaleDateString() : 'NOT RETURNED',
        (t.status || 'unknown').toUpperCase()
    ]));

    const autoTable = (doc as any).autoTable;
    if (autoTable) {
        autoTable.call(doc, {
            startY: tableY,
            head: [['Borrow Date', 'Book Title', 'Return Date', 'Status']],
            body: transactionBody.length > 0 ? transactionBody : [['No transactions found', '', '', '']],
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72], textColor: 255 },
            styles: { fontSize: 8 }
        });

        tableY = ((doc as any).lastAutoTable?.finalY || tableY) + 20;
    } else {
        tableY += 20;
    }

    // Financial Ledger Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FINANCIAL LEDGER (FINES)', margin, tableY - 5);

    const finesBody = fines.map(f => {
        const amount = Number(f.amount || 0);
        const paidAmount = Number(f.paidAmount || 0);
        return [
            f.description || 'Fine',
            amount?.toLocaleString(),
            paidAmount?.toLocaleString(),
            (amount - paidAmount)?.toLocaleString(),
            (f.status || 'pending').toUpperCase()
        ];
    });

    if (autoTable) {
        autoTable.call(doc, {
            startY: tableY,
            head: [['Description', 'Fine Amount', 'Paid', 'Balance', 'Status']],
            body: finesBody.length > 0 ? finesBody : [['No fines recorded', '', '', '', '']],
            theme: 'grid',
            headStyles: { fillColor: [220, 38, 38], textColor: 255 },
            styles: { fontSize: 8 }
        });
        tableY = (doc as any).lastAutoTable?.finalY || tableY;
    }

    const totalDue = fines.reduce((acc, f) => acc + (Number(f.amount || 0) - Number(f.paidAmount || 0)), 0);
    const finalY = (doc as any).lastAutoTable?.finalY || (tableY + 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0); // Reset color
    doc.text('TOTAL OUTSTANDING FINE:', pageWidth - margin - 55, finalY + 10);
    doc.setTextColor(totalDue > 0 ? [200, 0, 0] : [0, 100, 0]);
    doc.text(`KES ${totalDue?.toLocaleString()}`, pageWidth - margin, finalY + 10, { align: 'right' });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates a PDF sheet of QR codes for all provided members.
 */
export const generateMemberQrCodesPdf = async (
    members: User[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<Blob> => {
    const institutionName = institution.name || 'Institution';
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    const QRCodeLib = (window as any).QRCode;
    if (!QRCodeLib) throw new Error("QRCode library not available on window.");

    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const cols = 3;
    const rows = 5;
    const padding = 10;
    const cellWidth = (pageWidth - (margin * 2)) / cols;
    const cellHeight = (pageHeight - (margin * 2) - 40) / rows; // Adjust for header/footer

    let currentMemberIdx = 0;
    let pageNum = 0;

    while (currentMemberIdx < members.length) {
        if (pageNum > 0) doc.addPage();
        pageNum++;

        let yPos = setupPdfHeader(doc, headerImg);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${institutionName} - Member QR Access Cards`, margin, yPos);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${pageNum} | Total Members: ${members.length}`, margin, yPos + 5);
        yPos += 15;

        for (let r = 0; r < rows && currentMemberIdx < members.length; r++) {
            for (let c = 0; c < cols && currentMemberIdx < members.length; c++) {
                const member = members[currentMemberIdx];
                const x = margin + (c * cellWidth);
                const y = yPos + (r * cellHeight);

                // Draw Card Border
                doc.setDrawColor(230);
                doc.rect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);

                try {
                    const qrData = JSON.stringify({
                        type: 'member',
                        id: member.id,
                        staffId: member.staffId,
                        name: member.name,
                        role: member.role
                    });

                    // Generate QR Code as Data URL
                    const qrUrl = await new Promise<string>((resolve, reject) => {
                        QRCodeLib.toDataURL(qrData, { margin: 1, width: 256 }, (err: any, url: string) => {
                            if (err) reject(err);
                            else resolve(url);
                        });
                    });

                    // Add QR Code Image
                    doc.addImage(qrUrl, 'PNG', x + (cellWidth / 2) - 15, y + 5, 30, 30);

                    // Add Member Info
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text(member.name, x + (cellWidth / 2), y + 42, { align: 'center', maxWidth: cellWidth - 10 });
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.setFont('courier', 'normal');
                    doc.text(member.staffId || 'ID: Pending', x + (cellWidth / 2), y + 47, { align: 'center' });
                    doc.setFont('helvetica', 'normal');
                    doc.text(formatRoleDisplayName(member.role, institution).toUpperCase(), x + (cellWidth / 2), y + 52, { align: 'center' });

                } catch (err) {
                    console.error("QR Error for member:", member.name, err);
                }

                currentMemberIdx++;
            }
        }

        setupPdfFooter(doc, footerImg);
    }

    return doc.output('blob');
};

export const generateCarWashTrialBalancePdf = async (
    accounts: CarWashAccount[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("TRIAL BALANCE", margin, yPos);
    yPos += 10;

    const head = [['Account Code', 'Account Name', 'Type', 'Balance (KES)']];
    const body = (accounts || []).map(acc => [
        acc.accountCode,
        acc.name,
        acc.type,
        (acc.balance || 0)?.toLocaleString()
    ]);

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 9 },
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateCarWashCashbookPdf = async (
    entries: CarWashJournalEntry[],
    lines: CarWashJournalLine[],
    accounts: CarWashAccount[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("GENERAL JOURNAL / CASHBOOK", margin, yPos);
    yPos += 10;

    const head = [['Date', 'Reference / Description', 'Account', 'Debit', 'Credit']];
    const body: any[] = [];

    (entries || []).sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()).forEach(entry => {
        const entryLines = (lines || []).filter(l => l.entryId === entry.id);
        entryLines.forEach((line, idx) => {
            const acc = accounts.find(a => a.id === line.accountId);
            body.push([
                idx === 0 ? new Date(entry.entryDate).toLocaleDateString() : '',
                idx === 0 ? `${entry.entryNumber}\n${entry.description}` : '',
                acc ? acc.name : 'Unknown Account',
                line.debit > 0 ? line.debit?.toLocaleString() : '',
                line.credit > 0 ? line.credit?.toLocaleString() : ''
            ]);
        });
    });

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 50 },
            3: { halign: 'right' },
            4: { halign: 'right' }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateCarWashExpensesPdf = async (
    expenses: CarWashExpense[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("OPERATING EXPENSES REPORT", margin, yPos);
    yPos += 10;

    const head = [['Date', 'Category', 'Description', 'Method', 'Amount (KES)']];
    const body = (expenses || []).sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()).map(exp => [
        new Date(exp.expenseDate).toLocaleDateString(),
        exp.category.toUpperCase(),
        exp.description,
        exp.paymentMethod.replace('_', ' ').toUpperCase(),
        (exp.amount || 0)?.toLocaleString()
    ]);

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: { 4: { halign: 'right' } }
    });

    const total = (expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL EXPENSES: KES ${total?.toLocaleString()}`, doc.internal.pageSize.getWidth() - margin, finalY, { align: 'right' });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateCarWashPayrollPdf = async (
    payroll: CarWashPayroll[],
    attendants: User[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({ orientation: 'landscape' });
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("STAFF PAYROLL HISTORY", margin, yPos);
    yPos += 10;

    const head = [['Period', 'Staff Member', 'Base Salary', 'Commission', 'Advances/Deductions', 'Total Paid (KES)', 'Status']];
    const body = (payroll || []).sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()).map(pr => {
        const staff = attendants.find(a => a.id === pr.staffId);
        return [
            `${new Date(pr.periodStart).toLocaleDateString()} - ${new Date(pr.periodEnd).toLocaleDateString()}`,
            staff?.name || 'Unknown',
            (pr.baseSalary || 0)?.toLocaleString(),
            (pr.commissionEarned || 0)?.toLocaleString(),
            ((pr.advancesTaken || 0) + (pr.deductions || 0))?.toLocaleString(),
            (pr.totalPay || 0)?.toLocaleString(),
            pr.status.toUpperCase()
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateCarWashOperationalSummaryPdf = async (
    jobs: CarWashJob[],
    packages: CarWashPackage[],
    users: User[],
    customers: CarWashCustomer[],
    feedbacks: CarWashFeedback[],
    addOns: CarWashAddOn[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    reportsTab: 'all' | 'revenue' | 'staff' | 'customers' | 'services' | 'feedback' | 'trends' = 'all',
    startDate?: string,
    endDate?: string
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');

    let title = "OPERATIONAL SUMMARY REPORT";
    if (reportsTab !== 'all') {
        title = `${reportsTab.toUpperCase()} REPORT`;
    }

    doc.text(title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let periodLabel = 'All Time';
    if (startDate && endDate) {
        periodLabel = `${new Date(startDate + 'T00:00:00').toLocaleDateString()} – ${new Date(endDate + 'T00:00:00').toLocaleDateString()}`;
    } else if (startDate) {
        periodLabel = `From ${new Date(startDate + 'T00:00:00').toLocaleDateString()}`;
    } else if (endDate) {
        periodLabel = `Up to ${new Date(endDate + 'T00:00:00').toLocaleDateString()}`;
    }

    doc.text(`Report Period: ${periodLabel}   |   Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 10;

    let sectionNum = 1;

    // 1. REVENUE OVERVIEW
    if (reportsTab === 'all' || reportsTab === 'revenue') {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sectionNum++}. Revenue Overview`, margin, yPos);
        yPos += 6;

        const completedJobs = jobs.filter(j => j.status === 'completed');
        const totalRev = completedJobs.reduce((s, j) => s + (j.amountPaid || 0), 0);

        const revBody = [
            ['Total Completed Washes', completedJobs.length.toString()],
            ['Gross Revenue (KES)', totalRev?.toLocaleString()],
            ['Average Ticket Size (KES)', (totalRev / (completedJobs.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })]
        ];

        doc.autoTable({
            startY: yPos,
            body: revBody,
            theme: 'plain',
            styles: { fontSize: 10 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // 2. STAFF PERFORMANCE
    if (reportsTab === 'all' || reportsTab === 'staff') {
        if (reportsTab === 'all' && yPos > 240) { doc.addPage(); yPos = setupPdfHeader(doc, headerImg); }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sectionNum++}. Staff Efficiency`, margin, yPos);
        yPos += 6;

        const attendants = users.filter(u => u.role === 'carwash_attendant' || u.role === 'carwash_admin' || u.role === 'carwash_cashier');
        const staffData = attendants.map(att => {
            const attJobs = jobs.filter(j => j.attendantId === att.id && j.status === 'completed');
            const rev = attJobs.reduce((s, j) => s + (j.amountPaid || 0), 0);
            const attFeedbacks = feedbacks.filter(f => attJobs.some(j => j.id === f.jobId));
            const rating = attFeedbacks.length ? (attFeedbacks.reduce((s, f) => s + f.rating, 0) / attFeedbacks.length).toFixed(1) : '—';
            return [att.name, attJobs.length.toString(), rev?.toLocaleString(), rating];
        });

        doc.autoTable({
            startY: yPos,
            head: [['Staff Member', 'Washes', 'Revenue (KES)', 'Avg Rating']],
            body: staffData.length > 0 ? staffData : [['No staff data', '', '', '']],
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72] },
            styles: { fontSize: 9 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // CUSTOMER INSIGHTS
    if (reportsTab === 'all' || reportsTab === 'customers') {
        if (reportsTab === 'all' && yPos > 240) { doc.addPage(); yPos = setupPdfHeader(doc, headerImg); }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sectionNum++}. Customer Insights`, margin, yPos);
        yPos += 6;

        const customerData = customers.map(c => {
            const cj = jobs.filter(j => j.customerId === c.id && j.status === 'completed');
            const totalSpent = cj.reduce((s, j) => s + (j.amountPaid || 0), 0);
            return [c.name, cj.length.toString(), totalSpent?.toLocaleString(), c.loyaltyStamps.toString()];
        }).sort((a, b) => Number(b[2].replace(/,/g, '')) - Number(a[2].replace(/,/g, ''))).slice(0, 15);

        doc.autoTable({
            startY: yPos,
            head: [['Customer Name', 'Washes', 'Total Spent (KES)', 'Loyalty Points']],
            body: customerData.length > 0 ? customerData : [['No customers found', '', '', '']],
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72] },
            styles: { fontSize: 9 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // 3. SERVICE MIX
    if (reportsTab === 'all' || reportsTab === 'services') {
        if (reportsTab === 'all' && yPos > 240) { doc.addPage(); yPos = setupPdfHeader(doc, headerImg); }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sectionNum++}. Service Mix Performance`, margin, yPos);
        yPos += 6;

        const serviceData = packages.map(pkg => {
            const pkgJobs = jobs.filter(j => j.packageId === pkg.id && j.status === 'completed');
            const rev = pkgJobs.reduce((s, j) => s + (j.amountPaid || 0), 0);
            return [pkg.name, pkgJobs.length.toString(), rev?.toLocaleString()];
        }).sort((a, b) => Number(b[2].replace(/,/g, '')) - Number(a[2].replace(/,/g, '')));

        doc.autoTable({
            startY: yPos,
            head: [['Package Name', 'Bookings', 'Total Revenue (KES)']],
            body: serviceData.length > 0 ? serviceData : [['No packages found', '', '']],
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72] },
            styles: { fontSize: 9 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // 4. CUSTOMER SATISFACTION
    if (reportsTab === 'all' || reportsTab === 'feedback') {
        if (reportsTab === 'all' && yPos > 240) { doc.addPage(); yPos = setupPdfHeader(doc, headerImg); }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sectionNum++}. Customer Sentiment`, margin, yPos);
        yPos += 6;

        const avgRating = feedbacks.length ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : '—';
        const sentimentBody = [
            ['Overall CSAT Score', `${avgRating} / 5.0`],
            ['Total Reviews Received', feedbacks.length.toString()],
            ['Positive Reviews (4-5★)', feedbacks.filter(f => f.rating >= 4).length.toString()],
            ['Critical Reviews (1-2★)', feedbacks.filter(f => f.rating <= 2).length.toString()]
        ];

        doc.autoTable({
            startY: yPos,
            body: sentimentBody,
            theme: 'plain',
            styles: { fontSize: 10 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } }
        });
    }

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateCarWashBillsAndPaymentsPdf = async (
    jobs: CarWashJob[],
    customers: CarWashCustomer[],
    packages: CarWashPackage[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    startDate?: string,
    endDate?: string
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error('jsPDF library not available.');
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLS & PAYMENTS REPORT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let periodLabel = 'All Time';
    if (startDate && endDate) {
        periodLabel = `${new Date(startDate + 'T00:00:00').toLocaleDateString()} \u2013 ${new Date(endDate + 'T00:00:00').toLocaleDateString()}`;
    } else if (startDate) {
        periodLabel = `From ${new Date(startDate + 'T00:00:00').toLocaleDateString()}`;
    } else if (endDate) {
        periodLabel = `Up to ${new Date(endDate + 'T00:00:00').toLocaleDateString()}`;
    }
    doc.text(`Report Period: ${periodLabel}   |   Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 12;

    const completed = jobs.filter(j => j.status === 'completed');
    const totalBilled = completed.reduce((s, j) => s + (j.amountCharged || 0), 0);
    const totalPaid = completed.reduce((s, j) => s + (j.amountPaid || 0), 0);
    const totalBalance = totalBilled - totalPaid;
    const cashJobs = completed.filter(j => j.paymentMethod === 'cash');
    const mpesaJobs = completed.filter(j => j.paymentMethod === 'mpesa');
    const cardJobs = completed.filter(j => j.paymentMethod === 'card');
    const creditJobs = completed.filter(j => j.paymentMethod === 'credit');

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Summary', margin, yPos);
    yPos += 6;

    doc.autoTable({
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
            ['Total Jobs (Period)', jobs.length.toString()],
            ['Completed Jobs', completed.length.toString()],
            ['Total Billed (KES)', totalBilled?.toLocaleString()],
            ['Total Collected (KES)', totalPaid?.toLocaleString()],
            ['Outstanding Balance (KES)', totalBalance?.toLocaleString()],
            ['Cash', `${cashJobs.length} jobs \u2014 KES ${cashJobs.reduce((s, j) => s + (j.amountPaid || 0), 0)?.toLocaleString()}`],
            ['M-Pesa', `${mpesaJobs.length} jobs \u2014 KES ${mpesaJobs.reduce((s, j) => s + (j.amountPaid || 0), 0)?.toLocaleString()}`],
            ['Card', `${cardJobs.length} jobs \u2014 KES ${cardJobs.reduce((s, j) => s + (j.amountPaid || 0), 0)?.toLocaleString()}`],
            ['Credit / Unpaid', `${creditJobs.length} jobs \u2014 KES ${creditJobs.reduce((s, j) => s + (j.amountPaid || 0), 0)?.toLocaleString()}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 14;

    if (yPos > 230) { doc.addPage(); yPos = setupPdfHeader(doc, headerImg); }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Itemised Transactions', margin, yPos);
    yPos += 6;

    const jobRows = jobs.map(j => {
        const customer = customers.find(c => c.id === j.customerId);
        const pkg = packages.find(p => p.id === j.packageId);
        return [
            j.createdAt ? new Date(j.createdAt).toLocaleDateString() : '—',
            customer?.name || '—',
            customer?.phoneNumber || '—',
            pkg?.name || '\u2014',
            j.status || '\u2014',
            `KES ${(j.amountCharged || 0)?.toLocaleString()}`,
            `KES ${(j.amountPaid || 0)?.toLocaleString()}`,
            j.paymentMethod ? j.paymentMethod.toUpperCase() : '\u2014',
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: [['Date', 'Customer', 'Phone', 'Package', 'Status', 'Billed', 'Paid', 'Method']],
        body: jobRows,
        theme: 'striped',
        headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 30 },
            2: { cellWidth: 22 },
            3: { cellWidth: 26 },
            4: { cellWidth: 18 },
            5: { cellWidth: 18 },
            6: { cellWidth: 18 },
            7: { cellWidth: 18 },
        },
        didDrawPage: () => { yPos = setupPdfHeader(doc, headerImg); }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};
export const generateBoardingReportPdf = async (
    data: any[],
    title: string,
    reportType: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    institution: Institution
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({ orientation: 'landscape' });
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(title, margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date()?.toLocaleString()}`, margin, yPos);
    yPos += 12;

    let head: string[][] = [];
    let body: any[][] = [];

    if (reportType === 'Occupancy') {
        head = [['House', 'Gender', 'Capacity', 'Occupied', 'Available', 'Rate %']];
        body = data.map(i => [
            i.name,
            i.gender,
            i.capacity,
            i.occupiedBeds,
            i.availableBeds,
            `${i.occupancyRate}%`
        ]);
    } else if (reportType === 'Allocations') {
        head = [['Student', 'House', 'Room', 'Bed', 'Term', 'Year', 'Date']];
        body = data.map(i => [
            i.studentName || 'N/A',
            i.houseName || 'N/A',
            i.roomNumber || 'N/A',
            i.bedNumber || 'N/A',
            i.term,
            i.academicYear,
            i.allocationDate
        ]);
    } else if (reportType === 'Maintenance') {
        head = [['Issue', 'Location', 'Priority', 'Status', 'Reported By', 'Date']];
        body = data.map(i => [
            i.issueDescription,
            `${i.houseName || 'Common'} - ${i.roomNumber || 'N/A'}`,
            i.priority,
            i.status,
            i.reportedByName,
            i.reportedDate
        ]);
    } else if (reportType === 'Check-ins' || reportType === 'Check-outs') {
        head = [['Student', 'House', 'Room', 'Bed', 'Date', 'Time', 'By']];
        body = data.map(i => [
            i.studentName || 'N/A',
            i.houseName || 'N/A',
            i.roomNumber || 'N/A',
            i.bedNumber || 'N/A',
            reportType === 'Check-ins' ? i.checkInDate : i.checkOutDate,
            reportType === 'Check-ins' ? i.checkInTime || '-' : i.checkOutTime || '-',
            reportType === 'Check-ins' ? i.checkedInByName || '-' : i.checkedOutByName || '-'
        ]);
    } else {
        // Fallback or generic table
        if (data.length > 0) {
            const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
            head = [keys.map(k => k.replace(/([A-Z])/g, ' $1').toUpperCase())];
            body = data.map(i => keys.map(k => String(i[k])));
        }
    }

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
        didDrawPage: () => setupPdfFooter(doc, footerImg)
    });

    return doc.output('bloburl');
};

export const generateTenantStatementPdf = async (
    tenant: PMTenant,
    payments: PMPayment[],
    leases: PMLease[],
    units: PMUnit[],
    startDate: string,
    endDate: string,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    
    // Header & Branding
    let yPos = createPdfWithLetterhead(doc, 'TENANT STATEMENT', {} as any, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Tenant Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TENANT:', margin, margin + 55);
    doc.text('PERIOD:', pageWidth - margin - 60, margin + 55);

    doc.setFont('helvetica', 'normal');
    doc.text(tenant.name, margin + 20, margin + 55);
    doc.text(`${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, pageWidth - margin, margin + 55, { align: 'right' });

    const head = [['Date', 'Description', 'Ref #', 'Debit (Due)', 'Credit (Paid)', 'Balance']];
    let allTx: any[] = [];
    let openingBal = 0;

    const tenantLeases = leases.filter(l => l.tenantId === tenant.id);
    tenantLeases.forEach(lease => {
        let curr = new Date(lease.startDate);
        const endDateObj = new Date(endDate);
        while (curr <= endDateObj) {
            const dateStr = curr.toISOString().split('T')[0];
            allTx.push({
                date: dateStr,
                description: `Rent Due - ${curr.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                type: 'debit',
                amount: lease.rentAmount,
                ref: `L-${lease.id.split('_')[1]}`
            });
            curr.setMonth(curr.getMonth() + 1);
        }
    });

    payments.forEach(p => {
        const lease = leases.find(l => l.id === p.leaseId);
        if (lease?.tenantId === tenant.id) {
            allTx.push({
                date: p.paymentDate,
                description: `Payment - ${p.paymentType} (${p.paymentMethod})`,
                type: 'credit',
                amount: p.amount,
                ref: p.id.split('_')[1]
            });
        }
    });

    allTx.sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'debit' ? -1 : 1));

    const filtered = allTx.filter(t => {
        if (t.date < startDate) {
            openingBal += (t.type === 'debit' ? t.amount : -t.amount);
            return false;
        }
        return t.date <= endDate;
    });

    let runningBal = openingBal;
    const body = [
        [new Date(startDate).toLocaleDateString(), 'Opening Balance Brought Forward', '---', '---', '---', openingBal?.toLocaleString()],
        ...filtered.map(t => {
            runningBal += (t.type === 'debit' ? t.amount : -t.amount);
            return [
                new Date(t.date).toLocaleDateString(),
                t.description,
                t.ref,
                t.type === 'debit' ? t.amount?.toLocaleString() : '---',
                t.type === 'credit' ? t.amount?.toLocaleString() : '---',
                runningBal?.toLocaleString()
            ];
        })
    ];

    doc.autoTable({
        head,
        body,
        startY: yPos,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 8 },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CLOSING BALANCE:', pageWidth - margin - 80, finalY);
    doc.text(`KES ${runningBal?.toLocaleString()}`, pageWidth - margin, finalY, { align: 'right' });

    return doc.output('datauristring');
};

export const generateLandlordStatementPdf = async (
    landlord: PMLandlord,
    payments: PMPayment[],
    leases: PMLease[],
    units: PMUnit[],
    properties: PMProperty[],
    startDate: string,
    endDate: string,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    
    let yPos = createPdfWithLetterhead(doc, 'LANDLORD STATEMENT', {} as any, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('LANDLORD:', margin, margin + 55);
    doc.text('PERIOD:', pageWidth - margin - 60, margin + 55);

    doc.setFont('helvetica', 'normal');
    doc.text(landlord.name, margin + 25, margin + 55);
    doc.text(`${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, pageWidth - margin, margin + 55, { align: 'right' });

    const landlordProperties = properties.filter(p => p.landlordId === landlord.id);
    const propertyIds = landlordProperties.map(p => p.id);
    const landlordUnits = units.filter(u => propertyIds.includes(u.propertyId));
    const unitIds = landlordUnits.map(u => u.id);
    const landlordLeases = leases.filter(l => unitIds.includes(l.unitId));

    const landlordPayments = payments.filter(p => {
        return landlordLeases.some(l => l.id === p.leaseId) && p.paymentDate >= startDate && p.paymentDate <= endDate;
    }).sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));

    const head = [['Date', 'Unit / Property', 'Ref #', 'Gross Collected', 'Mgt Fee', 'Net Payout']];
    const body = landlordPayments.map(p => {
        const lease = leases.find(l => l.id === p.leaseId);
        const unit = units.find(u => u.id === lease?.unitId);
        const property = properties.find(prop => prop.id === unit?.propertyId);
        const comm = p.commissionAmount || 0;
        return [
            new Date(p.paymentDate).toLocaleDateString(),
            `${unit?.unitNumber} - ${property?.name}`,
            p.id.split('_')[1],
            p.amount?.toLocaleString(),
            comm?.toLocaleString(),
            (p.amount - comm)?.toLocaleString()
        ];
    });

    doc.autoTable({
        head,
        body,
        startY: yPos,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 8 },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const totalGross = landlordPayments.reduce((s, p) => s + p.amount, 0);
    const totalComm = landlordPayments.reduce((s, p) => s + (p.commissionAmount || 0), 0);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY OF COLLECTIONS', margin, finalY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Gross Collected:', margin, finalY + 8);
    doc.text(`KES ${totalGross?.toLocaleString()}`, margin + 60, finalY + 8);
    
    doc.text('Total Management Fees:', margin, finalY + 14);
    doc.text(`KES ${totalComm?.toLocaleString()}`, margin + 60, finalY + 14);
    
    doc.setFont('helvetica', 'bold');
    doc.text('NET PAYOUT DUE:', margin, finalY + 22);
    doc.text(`KES ${(totalGross - totalComm)?.toLocaleString()}`, margin + 60, finalY + 22);

    return doc.output('datauristring');
};

export const generateLpoPdf = async (
    requisition: Requisition,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    supplier?: Supplier
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    
    // Header & Letterhead
    const tableStartY = createPdfWithLetterhead(doc, 'PURCHASE ORDER', companyDetails, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // LPO Header Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('LPO #:', pageWidth - margin - 50, margin + 55);
    doc.text('DATE:', pageWidth - margin - 50, margin + 60);
    doc.text('REQUISITION ID:', pageWidth - margin - 50, margin + 65);

    doc.setFont('helvetica', 'normal');
    doc.text(requisition.lpoNumber || 'DRAFT', pageWidth - margin, margin + 55, { align: 'right' });
    doc.text(new Date().toLocaleDateString(), pageWidth - margin, margin + 60, { align: 'right' });
    doc.text(requisition.id.substring(0, 8).toUpperCase(), pageWidth - margin, margin + 65, { align: 'right' });

    // Supplier Section
    let nextY = margin + 80;
    if (supplier) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('SUPPLIER:', margin, nextY);
        doc.setFont('helvetica', 'normal');
        doc.text(supplier.name, margin, nextY + 5);
        if (supplier.email) doc.text(`Email: ${supplier.email}`, margin, nextY + 10);
        if (supplier.phone) doc.text(`Phone: ${supplier.phone}`, margin, nextY + 15);
        nextY += 25;
    }

    // Items Table
    const items = requisition.items || [];
    const head = [['#', 'DESCRIPTION', 'QTY', 'UNIT COST', 'TOTAL']];
    const body = items.map((item: any, index: number) => [
        index + 1,
        item.name || 'Unknown Item',
        `${item.quantity || 0} ${item.unit || 'pcs'}`,
        (item.unitCost || 0)?.toLocaleString(),
        ((item.quantity || 0) * (item.unitCost || 0))?.toLocaleString()
    ]);

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: nextY,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 9 },
        columnStyles: {
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right' }
        }
    });

    const finalY = ((doc as any).lastAutoTable?.finalY || nextY) + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL ORDER VALUE:', pageWidth - margin - 100, finalY);
    doc.text(`KES ${requisition.totalEstimatedCost?.toLocaleString()}`, pageWidth - margin, finalY, { align: 'right' });

    // Footer / Authorization
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const authY = finalY + 30;
    doc.line(margin, authY, margin + 60, authY);
    doc.text('Authorized Signature', margin, authY + 5);
    
    doc.line(pageWidth - margin - 60, authY, pageWidth - margin, authY);
    doc.text('Supplier Acceptance', pageWidth - margin, authY + 5, { align: 'right' });

    return doc.output('datauristring');
};

export const generateRetailSalesStatementPdf = async (
    type: 'general' | 'store' | 'agent' | 'student' | 'teacher',
    target: RetailStore | User | null,
    sales: RetailSale[],
    startDate: string,
    endDate: string,
    institution: Institution,
    letterheadConfig?: LetterheadConfig,
    logoUrl?: string | null
) => {
    const jspdf = getJsPdf();
    if (!jspdf) throw new Error("jsPDF not found");
    const doc = new jspdf.jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    const headerImg = await loadImage(letterheadConfig?.headerImageUrl || logoUrl);
    setupPdfHeader(doc, headerImg);

    let nextY = 60;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const title = type === 'general' 
        ? 'General Sales Statement' 
        : type === 'store' 
        ? `Sales Statement: ${target?.name}` 
        : type === 'student'
        ? `Student Issuance Statement: ${target?.name}`
        : type === 'teacher'
        ? `Teacher Issuance Statement: ${target?.name}`
        : `Agent Sales Statement: ${target?.name}`;
    doc.text(title.toUpperCase(), margin, nextY);
    
    nextY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Period: ${startDate} to ${endDate}`, margin, nextY);
    doc.text(`Generated on: ${new Date()?.toLocaleString()}`, pageWidth - margin, nextY, { align: 'right' });

    nextY += 15;
    const head = [['Date', 'Description', 'Store', 'Payment', 'Amount (KES)']];
    
    let body = [];
    if (sales.length > 0) {
        body = sales.map(s => [
            new Date(s.createdAt).toLocaleDateString(),
            `Sale - ${s.customerName || 'Walk-in Customer'}`,
            institution.name,
            s.paymentMethod,
            s.totalAmount?.toLocaleString()
        ]);
    } else {
        body = [['-', 'No transactions found for the selected period', '-', '-', '0.00']];
    }

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: nextY,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8 },
        columnStyles: {
            4: { halign: 'right' }
        }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || nextY + 20;
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);

    nextY = finalY + 15;
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, nextY, pageWidth - (margin * 2), 20, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 72);
    doc.text('TOTAL REVENUE:', margin + 10, nextY + 13);
    doc.text(`KES ${totalRevenue?.toLocaleString()}`, pageWidth - margin - 10, nextY + 13, { align: 'right' });

    return doc.output('datauristring');
};

export const generateRetailInventoryReportPdf = async (
    inventory: RetailInventoryItem[],
    stores: RetailStore[],
    institution: Institution,
    letterheadConfig?: LetterheadConfig,
    logoUrl?: string | null
) => {
    const jspdf = getJsPdf();
    if (!jspdf) throw new Error("jsPDF not found");
    const doc = new jspdf.jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    const headerImg = await loadImage(letterheadConfig?.headerImageUrl || logoUrl);
    setupPdfHeader(doc, headerImg);

    let nextY = 60;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INVENTORY VALUATION REPORT', margin, nextY);
    
    nextY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date()?.toLocaleString()}`, margin, nextY);

    const totalCost = inventory.reduce((acc, i) => acc + (i.costPrice * i.quantity), 0);
    const totalSrp = inventory.reduce((acc, i) => acc + (i.srpPrice * i.quantity), 0);

    nextY += 15;
    // Summary Cards
    doc.setFillColor(79, 70, 229);
    doc.rect(margin, nextY, 60, 25, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255);
    doc.text('TOTAL COST BASIS', margin + 5, nextY + 10);
    doc.setFontSize(12);
    doc.text(`KES ${totalCost?.toLocaleString()}`, margin + 5, nextY + 18);

    doc.setFillColor(16, 185, 129);
    doc.rect(margin + 65, nextY, 60, 25, 'F');
    doc.setFontSize(8);
    doc.text('TOTAL RETAIL VALUE', margin + 70, nextY + 10);
    doc.setFontSize(12);
    doc.text(`KES ${totalSrp?.toLocaleString()}`, margin + 70, nextY + 18);

    doc.setFillColor(245, 158, 11);
    doc.rect(margin + 130, nextY, pageWidth - margin - (margin + 130), 25, 'F');
    doc.setFontSize(8);
    doc.text('LOW STOCK ITEMS', margin + 135, nextY + 10);
    const lowStockCount = inventory.filter(i => i.quantity <= i.reorderLevel).length;
    doc.setFontSize(12);
    doc.text(`${lowStockCount} ALERT(S)`, margin + 135, nextY + 18);

    nextY += 35;
    const head = [['Item / SKU', 'Category', 'Quantity', 'Unit Cost', 'Unit SRP', 'Total SRP Val']];
    const body = inventory.map(item => [
        `${item.name}\n${item.sku}`,
        item.category,
        `${item.quantity} ${item.unit}`,
        item.costPrice?.toLocaleString(),
        item.srpPrice?.toLocaleString(),
        (item.srpPrice * item.quantity)?.toLocaleString()
    ]);

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: nextY,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 7 },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' }
        }
    });

    return doc.output('datauristring');
};

export const generatePMInvoicePdfDataUri = async (
    invoice: PMInvoice,
    tenant: PMTenant,
    unit: PMUnit,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const tableStartY = createPdfWithLetterhead(doc, 'RENT INVOICE', companyDetails, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Tenant info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('BILL TO:', margin, tableStartY - 15);
    doc.setFont('helvetica', 'normal');
    doc.text(tenant.name, margin, tableStartY - 10);
    doc.text(`Unit: ${unit.unitNumber}`, margin, tableStartY - 5);
    doc.text(`Phone: ${tenant.phoneNumber}`, margin, tableStartY);

    // Invoice Meta
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE #:', pageWidth - margin - 50, tableStartY - 15);
    doc.text('DATE:', pageWidth - margin - 50, tableStartY - 10);
    doc.text('DUE DATE:', pageWidth - margin - 50, tableStartY - 5);
    
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.invoiceNumber, pageWidth - margin, tableStartY - 15, { align: 'right' });
    doc.text(new Date(invoice.issueDate).toLocaleDateString(), pageWidth - margin, tableStartY - 10, { align: 'right' });
    doc.text(new Date(invoice.dueDate).toLocaleDateString(), pageWidth - margin, tableStartY - 5, { align: 'right' });

    const head = [['#', 'DESCRIPTION', 'AMOUNT (KES)']];
    const body = [
        ['1', invoice.description, invoice.amount?.toLocaleString()]
    ];

    doc.autoTable({
        head: head,
        body: body,
        startY: tableStartY + 10,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] },
        didDrawPage: (data: any) => {
            const finalY = data.cursor.y;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL AMOUNT DUE:', pageWidth - margin - 60, finalY + 15);
            doc.text(`KES ${invoice.amount?.toLocaleString()}`, pageWidth - margin, finalY + 15, { align: 'right' });
        }
    });

    return doc.output('datauristring');
};

export const generatePMReceiptPdfDataUri = async (
    payment: PMPayment,
    tenant: PMTenant,
    unit: PMUnit,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const tableStartY = createPdfWithLetterhead(doc, 'PAYMENT RECEIPT', companyDetails, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Receipt Meta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RECEIPT FOR:', margin, tableStartY - 15);
    doc.setFont('helvetica', 'normal');
    doc.text(tenant.name, margin, tableStartY - 10);
    doc.text(`Unit: ${unit.unitNumber}`, margin, tableStartY - 5);

    doc.setFont('helvetica', 'bold');
    doc.text('DATE:', pageWidth - margin - 40, tableStartY - 15);
    doc.text('STATUS:', pageWidth - margin - 40, tableStartY - 10);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(payment.paymentDate).toLocaleDateString(), pageWidth - margin, tableStartY - 15, { align: 'right' });
    doc.text(payment.status.toUpperCase(), pageWidth - margin, tableStartY - 10, { align: 'right' });

    const body = [
        ['Payment Method', payment.paymentMethod],
        ['Payment Type', payment.paymentType],
        ['Reference ID', payment.id.substring(0, 8).toUpperCase()],
        ['Month/Year', payment.periodMonth && payment.periodYear ? `${payment.periodMonth}/${payment.periodYear}` : 'N/A'],
    ];

    doc.autoTable({
        body: body,
        startY: tableStartY + 10,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { halign: 'right' } },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AMOUNT RECEIVED:', margin, finalY + 20);
    doc.text(`KES ${payment.amount?.toLocaleString()}`, pageWidth - margin, finalY + 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing us!', pageWidth / 2, finalY + 40, { align: 'center' });

    return doc.output('datauristring');
};
export const generateOphthalPrescriptionPdf = async (
    od: any,
    os: any,
    patientName: string,
    institution: any,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = margin;

    // 1. Header & Logo
    if (logoImg) {
        const logoWidth = 25;
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        doc.addImage(logoImg, 'PNG', margin, yPos, logoWidth, logoHeight);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(institution.name || 'Clinical Unit', pageWidth - margin, yPos + 5, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Email: ${institution.email || 'N/A'}`, pageWidth - margin, yPos + 11, { align: 'right' });
    doc.text(`Phone: ${institution.phoneNumber || 'N/A'}`, pageWidth - margin, yPos + 15, { align: 'right' });

    yPos += 35;
    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    // 2. Title & Date
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(0);
    doc.text("OPTICAL PRESCRIPTION", margin, yPos);
    
    doc.setFontSize(9);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin, yPos, { align: 'right' });

    // 3. Patient Info
    yPos += 15;
    doc.setFontSize(10);
    doc.text("PATIENT NAME:", margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(patientName.toUpperCase(), margin + 30, yPos);

    // 4. Refraction Matrix
    yPos += 15;
    const head = [['EYE', 'SPHERE (SPH)', 'CYLINDER (CYL)', 'AXIS', 'ADD', 'V/A']];
    const body = [
        ['Right (OD)', od.sphere || 'Plano', od.cylinder || '-', od.axis || '-', od.add || '-', od.va || '6/6'],
        ['Left (OS)', os.sphere || 'Plano', os.cylinder || '-', os.axis || '-', os.add || '-', os.va || '6/6']
    ];

    doc.autoTable({
        head: head,
        body: body,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255, halign: 'center' },
        styles: { halign: 'center', fontSize: 10, cellPadding: 8 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // 5. Notes & Signature
    doc.setFont('helvetica', 'bold');
    doc.text("RECOMMENDATIONS:", margin, yPos);
    doc.setFont('helvetica', 'normal');
    const notes = [
        "• Anti-Reflective Coating (ARC) recommended for night driving.",
        "• Blue-Cut Filter recommended for prolonged computer use.",
        "• Photochromic lenses suggested for outdoor UV protection.",
        "• Re-examination recommended in 12 months."
    ];
    notes.forEach((note, i) => {
        doc.text(note, margin, yPos + 10 + (i * 7));
    });

    yPos += 60;
    doc.line(pageWidth - margin - 60, yPos, pageWidth - margin, yPos);
    doc.setFontSize(8);
    doc.text("Attending Optometrist / Ophthalmologist", pageWidth - margin, yPos + 5, { align: 'right' });
    doc.text("Official Medical Registry Stamp", pageWidth - margin, yPos + 10, { align: 'right' });

    return doc.output('datauristring');
};



export const generateCoopSettlementSchedulePdf = async (
    data: any[],
    monthName: string,
    year: number,
    totalNet: number,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF('l', 'mm', 'a4'); // Landscape
    const logoImg = await loadImage(logoUrl);
    const tableStartY = createPdfWithLetterhead(doc, `SETTLEMENT SCHEDULE: ${monthName.toUpperCase()} ${year}`, {} as any, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    const head = [['FARMER NAME', 'PHONE', 'TOTAL QTY', 'GROSS PAYOUT', 'ADVANCES', 'DEDUCTIONS', 'NET PAYOUT']];
    const body = data.map(item => [
        item.name,
        item.phone,
        item.totalQty?.toLocaleString(),
        item.gross?.toLocaleString(),
        item.advances?.toLocaleString(),
        item.deductions?.toLocaleString(),
        item.net?.toLocaleString()
    ]);

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: tableStartY + 10,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 8 },
        columnStyles: { 
            2: { halign: 'center' }, 
            3: { halign: 'right' }, 
            4: { halign: 'right' }, 
            5: { halign: 'right' },
            6: { halign: 'right', fontStyle: 'bold' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || tableStartY + 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL NET SETTLEMENT: KES ${totalNet?.toLocaleString()}`, pageWidth - margin, finalY + 15, { align: 'right' });

    return doc.output('datauristring');
};

export const generateInventoryRegistryPdfDataUri = async (
    inventory: InventoryItem[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("INVENTORY REGISTRY", margin, yPos);
    yPos += 10;

    const head = [['Name', 'Category', 'Unit', 'Qty', 'Reorder Level', 'Value']];
    const body = (inventory || []).map(item => [
        item.name,
        item.category || 'N/A',
        item.unit || 'unit',
        item.quantity,
        item.reorderLevel || 0,
        (item.quantity * (item.price || 0))?.toLocaleString()
    ]);

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateIssuanceReportPdfDataUri = async (
    transactions: StockTransaction[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("INVENTORY ISSUANCE REPORT", margin, yPos);
    yPos += 10;

    const head = [['Recipient', 'ID', 'Class', 'Item', 'Qty', 'Signature', 'Date']];
    const body = (transactions || []).map(t => [
        t.recipientOrSupplier || 'N/A',
        (t as any).recipientDisplayId || (t.recipientId ? t.recipientId.substring(0, 8) : 'N/A'),
        (t as any).recipientClass || 'N/A',
        t.itemName,
        t.quantity,
        '', // Placeholder for signature image
        new Date(t.date).toLocaleDateString()
    ]);

    doc.autoTable({
        startY: yPos,
        head,
        body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 7, cellPadding: 2, minCellHeight: 12 },
        columnStyles: {
            5: { cellWidth: 20 } // Signature column width
        },
        didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 5) {
                const txn = transactions[data.row.index];
                if (txn.signature) {
                    try {
                        const imgSize = 8;
                        const x = data.cell.x + (data.cell.width - imgSize) / 2;
                        const y = data.cell.y + (data.cell.height - imgSize) / 2;
                        doc.addImage(txn.signature, 'PNG', x, y, imgSize, imgSize);
                    } catch (e) {
                        console.error('Error adding signature to PDF:', e);
                    }
                }
            }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateInventoryStatementPdfDataUri = async (
    transactions: StockTransaction[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("INVENTORY TRANSACTION STATEMENT", margin, yPos);
    yPos += 10;

    const head = [['Date', 'Item', 'Type', 'Qty', 'Recipient/Supplier']];
    const body = (transactions || []).map(t => [
        new Date(t.date).toLocaleDateString(),
        t.itemName,
        t.type,
        t.quantity,
        t.recipientOrSupplier || 'N/A'
    ]);

    doc.autoTable({
        startY: yPos,
        head,
        body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateInventoryAnalyticsPdfDataUri = async (
    inventory: InventoryItem[],
    issuanceHistory: StockTransaction[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("INVENTORY ANALYTICS & INSIGHTS", margin, yPos);
    yPos += 15;

    // 1. Executive Summary Cards
    const totalValuation = inventory.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0);
    const criticalSkus = inventory.filter(i => i.quantity <= (i.reorderLevel || 0)).length;
    const optimizationLevel = ((inventory.filter(i => i.quantity > (i.reorderLevel || 0)).length / Math.max(1, inventory.length)) * 100).toFixed(0);

    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.roundedRect(margin, yPos, 55, 25, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("TOTAL VALUATION", margin + 5, yPos + 8);
    doc.setFontSize(12);
    doc.text(`KES ${totalValuation?.toLocaleString()}`, margin + 5, yPos + 18);

    doc.setFillColor(245, 158, 11); // Amber-500
    doc.roundedRect(margin + 60, yPos, 55, 25, 3, 3, 'F');
    doc.setFontSize(8);
    doc.text("CRITICAL SKUS", margin + 65, yPos + 8);
    doc.setFontSize(12);
    doc.text(`${criticalSkus} items`, margin + 65, yPos + 18);

    doc.setFillColor(16, 185, 129); // Emerald-500
    doc.roundedRect(margin + 120, yPos, 55, 25, 3, 3, 'F');
    doc.setFontSize(8);
    doc.text("OPTIMIZATION", margin + 125, yPos + 8);
    doc.setFontSize(12);
    doc.text(`${optimizationLevel}%`, margin + 125, yPos + 18);

    yPos += 40;

    // 2. AI Insights Section
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 3, 3, 'FD');
    doc.setTextColor(79, 70, 229);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("AI INTELLIGENCE INSIGHT", margin + 5, yPos + 8);
    
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    const insightText = criticalSkus > 3 
        ? "Current low stock levels in key categories may disrupt operations within 14 days. Recommend prioritizing restock for items below reorder thresholds." 
        : "Inventory levels are currently optimized. Focus on reconciling high-frequency issuance items to maintain accuracy.";
    const splitInsight = doc.splitTextToSize(insightText, pageWidth - (margin * 2) - 15);
    doc.text(splitInsight, margin + 5, yPos + 15);

    yPos += 40;

    // 3. Category Valuation Details
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("CATEGORY VALUATION DISTRIBUTION", margin, yPos);
    yPos += 8;

    const categoryData = Object.entries(inventory.reduce((acc, i) => {
        acc[i.category] = (acc[i.category] || 0) + (i.quantity * (i.price || 0));
        return acc;
    }, {} as Record<string, number>)).sort((a,b) => b[1]-a[1]).slice(0, 10);

    const catHead = [['Category', 'Valuation (KES)', 'Contribution (%)']];
    const catBody = categoryData.map(([cat, val]) => [
        cat.toUpperCase(),
        val?.toLocaleString(),
        ((val / Math.max(1, totalValuation)) * 100).toFixed(1) + '%'
    ]);

    doc.autoTable({
        startY: yPos,
        head: catHead,
        body: catBody,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // 4. Issuance Velocity (Top items)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("TOP ISSUED ITEMS (30-DAY VELOCITY)", margin, yPos);
    yPos += 8;

    const issuanceData = Object.entries(issuanceHistory.reduce((acc, txn) => {
        acc[txn.itemName] = (acc[txn.itemName] || 0) + txn.quantity;
        return acc;
    }, {} as Record<string, number>)).sort((a,b) => b[1]-a[1]).slice(0, 5);

    const issueHead = [['Item Name', 'Quantity Issued', 'Relative Velocity']];
    const maxQty = Math.max(1, ...issuanceData.map(d => d[1]));
    
    const issueBody = issuanceData.map(([item, qty]) => [
        item.toUpperCase(),
        qty?.toLocaleString(),
        '|'.repeat(Math.round((qty/maxQty) * 20)) // Simple text-based bar
    ]);

    doc.autoTable({
        startY: yPos,
        head: issueHead,
        body: issueBody,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right' }, 2: { textColor: [79, 70, 229], fontStyle: 'bold' } }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateInventorySummaryPdfDataUri = async (
    inventory: InventoryItem[],
    issuanceHistory: StockTransaction[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("INVENTORY EXECUTIVE SUMMARY", margin, yPos);
    yPos += 15;

    // 1. Executive Summary Cards
    const healthyItems = inventory.filter(i => i.quantity > (i.reorderLevel || 0)).length;
    const criticalItems = inventory.filter(i => i.quantity <= (i.reorderLevel || 0)).length;
    const totalTransactions = issuanceHistory.length;

    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.roundedRect(margin, yPos, 55, 25, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("STOCK HEALTH", margin + 5, yPos + 8);
    doc.setFontSize(14);
    doc.text(`${healthyItems}/${inventory.length}`, margin + 5, yPos + 18);

    doc.setFillColor(225, 29, 72); // Rose-600
    doc.roundedRect(margin + 60, yPos, 55, 25, 3, 3, 'F');
    doc.setFontSize(8);
    doc.text("CRITICAL ALERTS", margin + 65, yPos + 8);
    doc.setFontSize(14);
    doc.text(`${criticalItems} items`, margin + 65, yPos + 18);

    doc.setFillColor(15, 23, 42); // Slate-900
    doc.roundedRect(margin + 120, yPos, 55, 25, 3, 3, 'F');
    doc.setFontSize(8);
    doc.text("TOTAL ISSUANCES", margin + 125, yPos + 8);
    doc.setFontSize(14);
    doc.text(`${totalTransactions}`, margin + 125, yPos + 18);

    yPos += 40;

    // 2. Recent Distributions Table
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("RECENT DISTRIBUTIONS (TOP 10)", margin, yPos);
    yPos += 8;

    const tableHead = [['Recipient', 'Item', 'Qty', 'Date']];
    const tableBody = issuanceHistory.slice(0, 10).map(t => [
        t.recipientOrSupplier?.toUpperCase() || 'N/A',
        t.itemName.toUpperCase(),
        t.quantity.toString(),
        new Date(t.date).toLocaleDateString()
    ]);

    doc.autoTable({
        startY: yPos,
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [71, 85, 105] },
        columnStyles: {
            2: { halign: 'center' },
            3: { halign: 'right' }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates a comprehensive statement for a cooperative farmer.
 */
export const generateFarmerStatementPdf = async (
    farmer: CoopFarmer,
    transactions: any[],
    openingBalance: number,
    totals: { credit: number; debit: number; balance: number; totalQty?: number; deductionsBreakdown?: Record<string, number> },
    startDate: string,
    endDate: string,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title & Date Range
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("FARMER PRODUCTION STATEMENT", margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Farmer Details Card
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 35, 2, 2, 'FD');
    
    let cardY = yPos + 8;
    doc.setFont('helvetica', 'bold');
    doc.text("FARMER DETAILS", margin + 5, cardY);
    cardY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${farmer.name.toUpperCase()}`, margin + 5, cardY);
    doc.text(`ID/Member No: ${farmer.nationalId || farmer.memberId || 'N/A'}`, pageWidth / 2, cardY);
    cardY += 5;
    doc.text(`Phone: ${farmer.phone || 'N/A'}`, margin + 5, cardY);
    doc.text(`Route/Area: ${farmer.location || 'Main'}`, pageWidth / 2, cardY);
    cardY += 5;
    doc.text(`Status: ${farmer.status?.toUpperCase() || 'ACTIVE'}`, margin + 5, cardY);
    
    yPos += 45;

    // Summary Table
    const summaryHead = [['Opening Bal', 'Total Deliveries (Qty)', 'Gross Earnings', 'Total Deductions', 'Closing Balance']];
    const summaryBody = [[
        openingBalance?.toLocaleString(),
        (totals.totalQty || 0)?.toLocaleString(),
        totals.credit?.toLocaleString(),
        totals.debit?.toLocaleString(),
        totals.balance?.toLocaleString()
    ]];

    doc.autoTable({
        startY: yPos,
        head: summaryHead,
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255, fontSize: 9 },
        styles: { fontSize: 11, halign: 'center' },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Itemized Deductions
    if (totals.deductionsBreakdown && Object.keys(totals.deductionsBreakdown).length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("DEDUCTIONS BREAKDOWN", margin, yPos);
        yPos += 5;

        const dedHead = [['Category', 'Amount (KES)']];
        const dedBody = Object.entries(totals.deductionsBreakdown).map(([cat, amt]) => [cat, amt?.toLocaleString()]);

        doc.autoTable({
            startY: yPos,
            head: dedHead,
            body: dedBody,
            theme: 'grid',
            headStyles: { fillColor: [244, 63, 94] }, // Rose-500
            styles: { fontSize: 9 },
            margin: { left: margin, right: margin + 100 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
        yPos += 5;
    }

    // Transactions Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("TRANSACTION LEDGER", margin, yPos);
    yPos += 6;

    const transHead = [['Date', 'Description', 'Reference', 'Qty/In', 'Amt/Out', 'Balance']];
    const transBody = transactions.map((t: any) => [
        new Date(t.date).toLocaleDateString(),
        t.description || (t.type === 'credit' ? 'Milk Delivery' : 'Cash Advance'),
        t.reference || t.id?.substring(0, 8).toUpperCase() || '-',
        t.type === 'credit' ? (t.quantity || 0)?.toLocaleString() : '-',
        t.type === 'debit' ? t.amount?.toLocaleString() : '-',
        t.balance?.toLocaleString()
    ]);

    doc.autoTable({
        startY: yPos,
        head: transHead,
        body: transBody,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold' }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates a comprehensive statement for a cooperative rider.
 */
export const generateRiderStatementPdf = async (
    rider: CoopRider,
    transactions: any[],
    openingBalance: number,
    totals: { credit: number; debit: number; balance: number; totalQty?: number; deductionsBreakdown?: Record<string, number> },
    startDate: string,
    endDate: string,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title & Date Range
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("RIDER EARNINGS STATEMENT", margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Rider Details Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 30, 2, 2, 'FD');
    
    let cardY = yPos + 8;
    doc.setFont('helvetica', 'bold');
    doc.text("RIDER DETAILS", margin + 5, cardY);
    cardY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${rider.name.toUpperCase()}`, margin + 5, cardY);
    doc.text(`Phone: ${rider.phone || 'N/A'}`, pageWidth / 2, cardY);
    cardY += 5;
    doc.text(`License No: ${rider.licenseNumber || 'N/A'}`, margin + 5, cardY);
    doc.text(`Vehicle: ${rider.vehiclePlate || rider.vehicleNumber || 'N/A'}`, pageWidth / 2, cardY);
    
    yPos += 40;

    // Summary Table
    const summaryHead = [['Opening Bal', 'Gross Earnings', 'Deductions', 'Net Payable']];
    const summaryBody = [[
        openingBalance?.toLocaleString(),
        totals.credit?.toLocaleString(),
        totals.debit?.toLocaleString(),
        totals.balance?.toLocaleString()
    ]];

    doc.autoTable({
        startY: yPos,
        head: summaryHead,
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 11, halign: 'center' },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Itemized Deductions
    if (totals.deductionsBreakdown && Object.keys(totals.deductionsBreakdown).length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("DEDUCTIONS BREAKDOWN", margin, yPos);
        yPos += 5;

        const dedHead = [['Category', 'Amount (KES)']];
        const dedBody = Object.entries(totals.deductionsBreakdown).map(([cat, amt]) => [cat, amt?.toLocaleString()]);

        doc.autoTable({
            startY: yPos,
            head: dedHead,
            body: dedBody,
            theme: 'grid',
            headStyles: { fillColor: [244, 63, 94] }, // Rose-500
            styles: { fontSize: 9 },
            margin: { left: margin, right: margin + 100 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
        yPos += 5;
    }

    // Transactions Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("EARNINGS LEDGER", margin, yPos);
    yPos += 6;

    const transHead = [['Date', 'Description', 'Credit', 'Debit', 'Balance']];
    const transBody = transactions.map((t: any) => [
        new Date(t.date).toLocaleDateString(),
        t.description || (t.type === 'credit' ? 'Delivery Fee' : 'Payment'),
        t.type === 'credit' ? t.amount?.toLocaleString() : '-',
        t.type === 'debit' ? t.amount?.toLocaleString() : '-',
        t.balance?.toLocaleString()
    ]);

    doc.autoTable({
        startY: yPos,
        head: transHead,
        body: transBody,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] }, // Green-600
        styles: { fontSize: 8 },
        columnStyles: {
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right', fontStyle: 'bold' }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates a Payment Schedule Report for cooperative payouts.
 * Filters by settlement method (MPESA, BANK, CASH).
 */
export const generatePaymentSchedulePdf = async (
    payouts: any[],
    farmers: any[],
    method: 'mpesa' | 'bank' | 'cash' | 'all',
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Filter payouts by method if not 'all'
    const filteredPayouts = payouts.filter(p => {
        const farmer = farmers.find(f => f.id === p.farmerId);
        return method === 'all' || (farmer?.paymentMethod || 'mpesa') === method;
    });

    const methodName = method === 'all' ? 'ALL METHODS' : method.toUpperCase();
    const payoutMonth = payouts[0]?.payoutMonth || 'N/A';

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("PAYMENT SETTLEMENT SCHEDULE", margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const subtitle = `Settlement Method: ${methodName} | Period: ${payoutMonth}`;
    doc.text(subtitle, margin, yPos);
    yPos += 15;

    const head = [['#', 'Farmer Name / ID', 'Phone', 'Account / Phone', 'Method', 'Net Payout']];
    const body = filteredPayouts.map((p, index) => {
        const farmer = farmers.find(f => f.id === p.farmerId);
        return [
            index + 1,
            `${farmer?.name || 'Unknown'} (${farmer?.memberId || 'N/A'})`,
            farmer?.phone || 'N/A',
            farmer?.accountNumber || farmer?.phone || 'N/A',
            (farmer?.paymentMethod || 'mpesa').toUpperCase(),
            `KES ${p.netPayout?.toLocaleString()}`
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' }, // Indigo-600
        styles: { fontSize: 8 },
        columnStyles: {
            5: { halign: 'right', fontStyle: 'bold' }
        }
    });

    const total = filteredPayouts.reduce((sum, p) => sum + p.netPayout, 0);
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL SETTLEMENT: KES ${total?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates an Inventory Report for Pharmacy Medications.
 */
export const generatePharmacyInventoryReportPdf = async (
    items: HISPharmacyInventory[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("NEO-PHARMACEUTICS: INVENTORY STATUS", 14, yPos);
    yPos += 10;

    const head = [['SKU', 'Medication/Item', 'Category', 'Stock Qty', 'Unit Price (KES)', 'Value (KES)']];
    const body = items.map(item => [
        item.sku || 'N/A',
        item.name,
        item.category || 'Medication',
        item.stockQuantity?.toLocaleString(),
        item.unitPrice?.toLocaleString(),
        (item.stockQuantity * item.unitPrice)?.toLocaleString()
    ]);

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo
        styles: { fontSize: 8 },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold' }
        }
    });

    const totalValue = items.reduce((sum, item) => sum + (item.stockQuantity * item.unitPrice), 0);
    yPos = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL INVENTORY VALUATION: KES ${totalValue?.toLocaleString()}`, pageWidth - 14, yPos, { align: 'right' });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates an Expiry Report for Pharmacy Stock Batches.
 */
export const generatePharmacyExpiryReportPdf = async (
    batches: HISPharmacyBatch[],
    inventory: HISPharmacyInventory[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("PHARMACY RISK AUDIT: EXPIRY LEDGER", 14, yPos);
    yPos += 10;

    const head = [['Batch #', 'Item Name', 'Expiry Date', 'Remaining Qty', 'Risk Level']];
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    const body = batches.map(batch => {
        const item = inventory.find(i => i.id === batch.medicationId);
        const expiry = new Date(batch.expiryDate);
        let risk = 'Normal';
        if (expiry <= today) risk = 'EXPIRED';
        else if (expiry <= threeMonthsLater) risk = 'HIGH RISK';

        return [
            batch.batchNumber,
            item?.name || 'Unknown Item',
            new Date(batch.expiryDate).toLocaleDateString(),
            batch.currentQuantity?.toLocaleString(),
            risk
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [244, 63, 94] }, // Rose Red for risk
        styles: { fontSize: 8 },
        columnStyles: {
            4: { fontStyle: 'bold' }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates a Payslip for Pharmacy Staff.
 */
export const generatePharmacyStaffPayslipPdf = async (
    staff: PharmacyStaff,
    month: string,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("OFFICIAL PAYSLIP", 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Earnings Month: ${month}`, 14, yPos);
    yPos += 15;

    // Staff Details Card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, yPos, pageWidth - 28, 40, 3, 3, 'F');
    
    let detailsY = yPos + 10;
    doc.setFont('helvetica', 'bold');
    doc.text("EMPLOYEE INFORMATION", 20, detailsY);
    detailsY += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${staff.fullName || 'N/A'}`, 20, detailsY);
    doc.text(`ID: ${staff.id.substring(0, 8)}`, pageWidth / 2, detailsY);
    detailsY += 6;
    doc.text(`Role: ${staff.role}`, 20, detailsY);
    doc.text(`License: ${staff.licenseNumber}`, pageWidth / 2, detailsY);
    yPos += 50;

    const head = [['Description', 'Earnings', 'Deductions']];
    const body = [
        ['Base Salary', staff.salary?.toLocaleString(), '0.00'],
        ['Statutory Contributions', '-', '0.00'],
        ['NET PAYABLE', { content: staff.salary?.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [240, 249, 255] } }, '-']
    ];

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] }
    });

    yPos = (doc as any).lastAutoTable.finalY + 30;
    doc.text("---------------------------------", 14, yPos);
    doc.text("Employee Signature", 14, yPos + 5);
    
    doc.text("---------------------------------", pageWidth - 70, yPos);
    doc.text("Director Signature", pageWidth - 70, yPos + 5);

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates a POS Receipt for Pharmacy Sales.
 */
export const generatePharmacyReceiptPdf = async (
    sale: PharmacySale,
    items: PharmacySaleItem[],
    inventory: HISPharmacyInventory[],
    settings: PharmacySettings | null,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    
    // Receipt size is typically smaller/narrower
    const doc = new lib.jsPDF({
        unit: 'mm',
        format: [80, 200] // 80mm roll width
    });

    const margin = 5;
    const pageWidth = 80;
    let yPos = 10;

    // Header Branding from Settings
    if (settings?.pharmacyName) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(settings.pharmacyName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
        yPos += 6;
    }

    if (settings?.receiptHeader) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const splitHeader = doc.splitTextToSize(settings.receiptHeader, pageWidth - (margin * 2));
        doc.text(splitHeader, pageWidth / 2, yPos, { align: 'center' });
        yPos += (splitHeader.length * 4) + 2;
    }

    doc.setLineWidth(0.1);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`RECEIPT: ${sale.id.substring(0, 12)}`, margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(sale.createdAt)?.toLocaleString()}`, margin, yPos);
    yPos += 5;
    if (sale.customerName) {
        doc.text(`Patient: ${sale.customerName}`, margin, yPos);
        yPos += 8;
    }

    // Items Table
    doc.setFont('helvetica', 'bold');
    doc.text("ITEM", margin, yPos);
    doc.text("QTY", pageWidth - 35, yPos, { align: 'right' });
    doc.text("AMT", pageWidth - margin, yPos, { align: 'right' });
    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    items.forEach(item => {
        const invItem = inventory.find(i => i.id === item.medicationId);
        const name = invItem?.name || 'Medication';
        const splitName = doc.splitTextToSize(name, 40);
        
        doc.text(splitName, margin, yPos);
        doc.text(item.quantity.toString(), pageWidth - 35, yPos, { align: 'right' });
        doc.text(item.totalPrice?.toLocaleString(), pageWidth - margin, yPos, { align: 'right' });
        
        yPos += (splitName.length * 4) + 1;
    });

    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("TOTAL DUE:", margin, yPos);
    doc.text(`KES ${sale.totalAmount?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment: ${sale.paymentMethod} (${sale.paymentStatus})`, margin, yPos);
    yPos += 10;

    if (settings?.receiptFooter) {
        doc.setFont('helvetica', 'italic');
        const splitFooter = doc.splitTextToSize(settings.receiptFooter, pageWidth - (margin * 2));
        doc.text(splitFooter, pageWidth / 2, yPos, { align: 'center' });
    }

    return doc.output('datauristring');
};

/**
 * Generates a comprehensive Sales Report and Analysis for the Pharmacy.
 */
export const generatePharmacySalesReportPdf = async (
    sales: PharmacySale[],
    saleItems: any[],
    inventory: HISPharmacyInventory[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("PHARMACY SALES ANALYSIS & REVENUE REPORT", margin, yPos);
    yPos += 12;

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const avgSale = sales.length > 0 ? totalRevenue / sales.length : 0;

    // Executive Summary
    doc.setFillColor(79, 70, 229, 0.05);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 35, 3, 3, 'F');
    
    let summaryY = yPos + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("EXECUTIVE PERFORMANCE SUMMARY", margin + 5, summaryY);
    summaryY += 8;
    
    doc.setFont('helvetica', 'normal');
    const summaryData = [
        [`Total Transactions: ${sales.length}`, `Gross Revenue: KES ${totalRevenue?.toLocaleString()}`],
        [`Average Order Value: KES ${avgSale?.toLocaleString()}`, `Report Period: ${new Date().toLocaleDateString()} (Full History)`]
    ];

    summaryData.forEach(row => {
        doc.text(row[0], margin + 5, summaryY);
        doc.text(row[1], pageWidth / 2, summaryY);
        summaryY += 6;
    });

    yPos += 45;

    // Top Selling Products Analysis
    const productStats = new Map<string, { qty: number, revenue: number }>();
    saleItems.forEach(item => {
        const stats = productStats.get(item.medicationId) || { qty: 0, revenue: 0 };
        stats.qty += Number(item.quantity);
        stats.revenue += Number(item.totalPrice);
        productStats.set(item.medicationId, stats);
    });

    const topSelling = Array.from(productStats.entries())
        .map(([id, stats]) => {
            const medication = inventory.find(i => i.id === id);
            return {
                name: medication?.name || 'Unknown Medication',
                qty: stats.qty,
                revenue: stats.revenue
            };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("TOP 10 MEDICATIONS BY REVENUE", margin, yPos);
    yPos += 8;

    doc.autoTable({
        startY: yPos,
        head: [['Medication', 'Units Sold', 'Total Revenue (KES)', '% of Total']],
        body: topSelling.map(p => [
            p.name,
            p.qty?.toLocaleString(),
            p.revenue?.toLocaleString(),
            ((p.revenue / totalRevenue) * 100).toFixed(1) + '%'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Daily Trends (Last 7 Days)
    const dailyData = new Map<string, number>();
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(date => dailyData.set(date, 0));
    sales.forEach(sale => {
        const date = sale.createdAt.split('T')[0];
        if (dailyData.has(date)) {
            dailyData.set(date, dailyData.get(date)! + Number(sale.totalAmount));
        }
    });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("DAILY REVENUE TREND (LAST 7 DAYS)", margin, yPos);
    yPos += 8;

    doc.autoTable({
        startY: yPos,
        head: [['Date', 'Daily Revenue (KES)']],
        body: Array.from(dailyData.entries()).map(([date, rev]) => [
            new Date(date).toDateString(),
            rev?.toLocaleString()
        ]),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }, // Emerald
        styles: { fontSize: 8 }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};
/**
 * Generates a detailed itemized sales report for the pharmacy.
 */
export const generateDetailedPharmacySalesReportPdf = async (
    sales: PharmacySale[],
    saleItems: PharmacySaleItem[],
    inventory: HISPharmacyInventory[],
    startDate: string,
    endDate: string,
    institution: Institution,
    settings: PharmacySettings,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(settings.letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("DETAILED PHARMACY SALES REPORT", margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Aggregate items
    const aggregated = new Map<string, { sku: string, name: string, qty: number, total: number }>();
    saleItems.forEach(item => {
        const inv = inventory.find(i => i.id === item.medicationId);
        const key = item.medicationId || 'unknown';
        const existing = aggregated.get(key) || { sku: inv?.sku || 'N/A', name: inv?.name || 'Unknown', qty: 0, total: 0 };
        existing.qty += Number(item.quantity);
        existing.total += Number(item.totalPrice);
        aggregated.set(key, existing);
    });

    const head = [['SKU/Code', 'Item Name', 'Total Quantity', 'Total Amount (KES)']];
    const body = Array.from(aggregated.values())
        .sort((a, b) => b.total - a.total)
        .map(item => [
            item.sku,
            item.name.toUpperCase(),
            item.qty?.toLocaleString(),
            item.total?.toLocaleString()
        ]);

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
        columnStyles: {
            2: { halign: 'center' },
            3: { halign: 'right', fontStyle: 'bold' }
        }
    });

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL REVENUE FOR PERIOD: KES ${totalRevenue?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};


export const generateStudentIdCardPdf = async (student: any, institution: any, logoImgData?: string, photoImgData?: string): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF('l', 'mm', [85.6, 54]);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(30, 64, 175); // Dark blue header
    doc.rect(0, 0, pageWidth, 12, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(institution.name || 'INSTITUTION', pageWidth / 2, 8, { align: 'center' });

    // Photo area
    doc.setDrawColor(200, 200, 200);
    doc.rect(5, 15, 25, 30);
    if (photoImgData) {
        try {
            doc.addImage(photoImgData, 'JPEG', 5, 15, 25, 30);
        } catch(e) {}
    } else {
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text('PHOTO', 17.5, 31, { align: 'center' });
    }

    // Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text((student.name || '').toUpperCase(), 35, 22);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Admission Number:', 35, 28);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(student.staffId || student.admissionNumber || (student.id ? student.id.substring(0,8) : ''), 35, 33);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Category / Role:', 35, 39);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text((student.role || 'Student').toUpperCase(), 35, 43);

    // Footer barcode area
    doc.setFillColor(243, 244, 246);
    doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Official Digital Identification. If found, please return to the institution.', pageWidth / 2, pageHeight - 2.5, { align: 'center' });

    return doc.output('datauristring');
};
