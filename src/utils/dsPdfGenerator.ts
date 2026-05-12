import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DSInvoice, DSPayment, DSStudent, DSSettings } from '../types';
import { apiService } from '../services/apiService';

// Internal utility to load images safely for PDF insertion
const loadImage = (url: string | null | undefined): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.warn("PDF Generator: Failed to load asset image. Proceeding without it.", url);
            resolve(null);
        };
    });
};

export const generateDSPDF = async (
    type: 'invoice' | 'receipt',
    data: DSInvoice | DSPayment,
    student: DSStudent,
    settings: DSSettings | null,
    institution: any
) => {
    const doc = new jsPDF() as any;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Fetch system-wide default company settings to support global letterhead fallback
    const companyDetails = await apiService.fetchCompanySettings().catch(() => null);

    // Letterhead Support cascade: Institution -> System Default
    const letterheadUrl = institution?.letterheadConfig?.headerImageUrl || institution?.letterheadUrl || companyDetails?.letterheadConfig?.headerImageUrl || companyDetails?.letterheadUrl || (companyDetails as any)?.logoUrl;
    const headerImg = await loadImage(letterheadUrl);

    let currentY = 30;

    if (headerImg) {
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (headerImg.height * imgWidth) / headerImg.width;
        const maxHeight = 45;

        if (imgHeight > maxHeight) {
            const finalHeight = maxHeight;
            const finalWidth = (headerImg.width * finalHeight) / headerImg.height;
            const xPos = (pageWidth - finalWidth) / 2;
            doc.addImage(headerImg, 'JPEG', xPos, 15, finalWidth, finalHeight);
            currentY = finalHeight + 25;
        } else {
            doc.addImage(headerImg, 'JPEG', margin, 15, imgWidth, imgHeight);
            currentY = imgHeight + 25;
        }
    } else {
        // Fallback Header
        doc.setFontSize(22);
        doc.setTextColor(79, 70, 229); // Indigo-600
        doc.text(institution?.name || 'Driving School', margin, currentY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(institution?.address || '', margin, currentY + 8);
        doc.text(institution?.phone || '', margin, currentY + 13);
        doc.text(institution?.email || '', margin, currentY + 18);
        currentY += 25;
    }

    // Document Type & Number
    doc.setFontSize(28);
    doc.setTextColor(30, 41, 59); // Slate-800
    const title = type === 'invoice' ? 'INVOICE' : 'RECEIPT';
    const number = type === 'invoice' ? (data as DSInvoice).invoiceNumber : (data as DSPayment).receiptNumber;
    doc.text(title, pageWidth - margin, currentY - 5, { align: 'right' });

    doc.setFontSize(12);
    doc.text(`#${number}`, pageWidth - margin, currentY + 5, { align: 'right' });

    // Bill To / Paid By
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(type === 'invoice' ? 'BILL TO:' : 'PAID BY:', margin, currentY + 25);
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(student.fullName, margin, currentY + 33);
    doc.setFontSize(10);
    doc.setTextColor(100);
    if (student.admissionNumber) {
        doc.text(`Adm: ${student.admissionNumber}`, margin, currentY + 39);
        let nextY = currentY + 44;
        if (student.enrollmentDate) {
            doc.text(`Admission: ${new Date(student.enrollmentDate).toLocaleDateString()}`, margin, nextY);
            nextY += 5;
        }
        doc.text(student.phone || 'N/A', margin, nextY);
        doc.text(student.email || 'N/A', margin, nextY + 5);
    } else {
        let nextY = currentY + 39;
        if (student.enrollmentDate) {
            doc.text(`Admission: ${new Date(student.enrollmentDate).toLocaleDateString()}`, margin, nextY);
            nextY += 5;
        }
        doc.text(student.phone || 'N/A', margin, nextY);
        doc.text(student.email || 'N/A', margin, nextY + 5);
    }

    // Date
    doc.text('DATE:', pageWidth - margin - 40, currentY + 25);
    doc.setTextColor(30, 41, 59);
    doc.text(new Date().toLocaleDateString(), pageWidth - margin, currentY + 25, { align: 'right' });

    // Table
    let tableHead: string[] = [];
    let tableData: any[][] = [];

    if (type === 'invoice') {
        const inv = data as DSInvoice;
        tableHead = ['Description', 'Amount (KES)', 'Paid (KES)', 'Balance (KES)'];
        tableData = (inv.items || []).map(item => [
            item.name,
            item.amount.toLocaleString(),
            (item.paidAmount || 0).toLocaleString(),
            (item.amount - (item.paidAmount || 0)).toLocaleString()
        ]);
        // Add notes as a footer row if exists
        if (inv.notes) {
            tableData.push(['Notes', inv.notes, '', '']);
        }
    } else {
        const pay = data as DSPayment;
        tableHead = ['Payment Detail', 'Value'];
        tableData = [
            ['Payment Method', pay.paymentMethod],
            ['Reference', pay.transactionReference || 'N/A'],
            ['Date', new Date(pay.paymentDate).toLocaleString()],
            ['Amount Paid', `KES ${pay.amount.toLocaleString()}`]
        ];
    }

    autoTable(doc, {
        startY: currentY + 65,
        head: [tableHead],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: margin, right: margin }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;

    // Totals
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    const totalLabel = type === 'invoice' ? 'INVOICE TOTAL:' : 'PAYMENT TOTAL:';
    const totalValue = type === 'invoice' ? (data as DSInvoice).totalAmount : (data as DSPayment).amount;

    doc.text(totalLabel, pageWidth - margin - 85, finalY + 20);
    doc.setFontSize(16);
    doc.text(`KES ${totalValue.toLocaleString()}.00`, pageWidth - margin, finalY + 20, { align: 'right' });

    if (type === 'invoice') {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('AMOUNT PAID:', pageWidth - margin - 85, finalY + 30);
        doc.setTextColor(30, 41, 59);
        doc.text(`KES ${(data as DSInvoice).paidAmount.toLocaleString()}.00`, pageWidth - margin, finalY + 30, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('BALANCE DUE:', pageWidth - margin - 85, finalY + 42);
        doc.setTextColor(220, 38, 38); // Red-600
        doc.text(`KES ${(data as DSInvoice).balance.toLocaleString()}.00`, pageWidth - margin, finalY + 42, { align: 'right' });
    }

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Thank you for choosing our Driving School!', pageWidth / 2, 280, { align: 'center' });

    return doc;
};

export const generateDSThermalReceipt = async (
    payment: DSPayment,
    student: DSStudent,
    institution: any,
    isReprint: boolean = false
): Promise<string> => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 150]
    }) as any;

    const margin = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 10;

    const centerText = (text: string, y: number) => {
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    centerText(institution?.name || 'Driving School', yPos);
    yPos += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (institution?.address) {
        centerText(institution.address, yPos);
        yPos += 4;
    }
    centerText(`Tel: ${institution?.phone || 'N/A'}`, yPos);
    yPos += 6;

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    if (isReprint) {
        centerText("*** REPRINT ***", yPos);
        yPos += 6;
    }
    centerText("PAYMENT RECEIPT", yPos);
    yPos += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(payment.paymentDate).toLocaleString()}`, margin, yPos);
    yPos += 4;
    doc.text(`Receipt #: ${payment.receiptNumber}`, margin, yPos);
    yPos += 4;
    doc.text(`Student: ${student.fullName}`, margin, yPos);
    if (student.admissionNumber) {
        yPos += 4;
        doc.text(`Adm: ${student.admissionNumber}`, margin, yPos);
    }
    yPos += 6;

    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'bold');
    doc.text("Description", margin, yPos);
    doc.text("Amount", pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.text(payment.paymentMethod || 'Payment', margin, yPos);
    doc.text(`Kes ${payment.amount.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("TOTAL PAID:", margin, yPos);
    doc.text(`Kes ${payment.amount.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    centerText("Thank you for your payment!", yPos);
    yPos += 5;
    doc.setFontSize(7);
    centerText("Powered by EduAi Automation", yPos);

    return doc.output('bloburl');
};
