import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DSInvoice, DSPayment, DSStudent, DSSettings } from '../types';

export const generateDSPDF = (
    type: 'invoice' | 'receipt',
    data: DSInvoice | DSPayment,
    student: DSStudent,
    settings: DSSettings | null,
    institution: any
) => {
    const doc = new jsPDF() as any;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text(institution?.name || 'Driving School', margin, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(institution?.address || '', margin, 38);
    doc.text(institution?.phone || '', margin, 43);
    doc.text(institution?.email || '', margin, 48);

    // Document Type & Number
    doc.setFontSize(28);
    doc.setTextColor(30, 41, 59); // Slate-800
    const title = type === 'invoice' ? 'INVOICE' : 'RECEIPT';
    const number = type === 'invoice' ? (data as DSInvoice).invoiceNumber : (data as DSPayment).receiptNumber;
    doc.text(title, pageWidth - margin, 35, { align: 'right' });
    
    doc.setFontSize(12);
    doc.text(`#${number}`, pageWidth - margin, 45, { align: 'right' });

    // Bill To / Paid By
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(type === 'invoice' ? 'BILL TO:' : 'PAID BY:', margin, 70);
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(student.fullName, margin, 78);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(student.phoneNumber, margin, 84);
    doc.text(student.email, margin, 89);

    // Date
    doc.text('DATE:', pageWidth - margin - 40, 70);
    doc.setTextColor(30, 41, 59);
    doc.text(new Date().toLocaleDateString(), pageWidth - margin, 70, { align: 'right' });

    // Table
    const tableData = type === 'invoice' ? [
        ['Tuition Fee', `KES ${(data as DSInvoice).totalAmount.toLocaleString()}`],
        ['Description', (data as DSInvoice).notes || 'Standard Driving Course Fee']
    ] : [
        ['Payment Method', (data as DSPayment).paymentMethod],
        ['Reference', (data as DSPayment).transactionId || 'N/A'],
        ['Amount Paid', `KES ${(data as DSPayment).amount.toLocaleString()}`]
    ];

    doc.autoTable({
        startY: 110,
        head: [[type === 'invoice' ? 'Description' : 'Payment Detail', 'Amount']],
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
    doc.text('TOTAL:', pageWidth - margin - 40, finalY + 20);
    doc.setFontSize(16);
    doc.text(`KES ${(data as any).totalAmount || (data as any).amount}.00`, pageWidth - margin, finalY + 20, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Thank you for choosing our Driving School!', pageWidth / 2, 280, { align: 'center' });
    
    return doc;
};
