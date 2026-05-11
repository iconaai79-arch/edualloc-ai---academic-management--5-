import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    if (student.admissionNumber) {
        doc.text(`Adm: ${student.admissionNumber}`, margin, 84);
        doc.text(student.phone || 'N/A', margin, 89);
        doc.text(student.email || 'N/A', margin, 94);
    } else {
        doc.text(student.phone || 'N/A', margin, 84);
        doc.text(student.email || 'N/A', margin, 89);
    }

    // Date
    doc.text('DATE:', pageWidth - margin - 40, 70);
    doc.setTextColor(30, 41, 59);
    doc.text(new Date().toLocaleDateString(), pageWidth - margin, 70, { align: 'right' });

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
        startY: 110,
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
