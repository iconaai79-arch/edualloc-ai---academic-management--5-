import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../services/apiService';

const loadImage = (url: string | null | undefined): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.warn("Report Generator: Failed to load letterhead image.", url);
            resolve(null);
        };
    });
};

const renderHeader = async (doc: any, institution: any, defaultTitle: string) => {
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const companyDetails = await apiService.fetchCompanySettings().catch(() => null);
    const letterheadUrl = institution?.letterheadConfig?.headerImageUrl || institution?.letterheadUrl || companyDetails?.letterheadConfig?.headerImageUrl || (companyDetails as any)?.letterheadUrl || (companyDetails as any)?.logoUrl;
    const headerImg = await loadImage(letterheadUrl);

    let currentY = 25;

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
        doc.setFontSize(20);
        doc.setTextColor(79, 70, 229);
        doc.text(String(institution?.name || 'Beauty College'), margin, currentY);
        currentY += 8;
    }

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(String(defaultTitle).toUpperCase(), margin, currentY);
    currentY += 12;

    return currentY;
};

export const generateStudentStatement = async (
    student: any,
    invoices: any[],
    payments: any[],
    institution: any
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    let currentY = await renderHeader(doc, institution, 'BEAUTY COLLEGE STUDENT ACCOUNT STATEMENT');

    // Student Info
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Student: ${String(student.fullName || 'N/A')}`, margin, currentY);
    doc.setFontSize(10);
    doc.text(`Phone: ${String(student.phone || 'N/A')}`, margin, currentY + 5);
    doc.text(`Email: ${String(student.email || 'N/A')}`, margin, currentY + 10);

    // Summary Box
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || inv.amount || 0), 0);
    const totalPaid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const balance = totalInvoiced - totalPaid;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pageWidth - margin - 70, currentY - 5, 70, 30, 5, 5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text('TOTAL INVOICED:', pageWidth - margin - 65, currentY + 3);
    doc.text('TOTAL PAID:', pageWidth - margin - 65, currentY + 10);
    doc.setFontSize(11);
    doc.text('BALANCE DUE:', pageWidth - margin - 65, currentY + 20);
    
    doc.setFontSize(9);
    doc.text(`KES ${totalInvoiced?.toLocaleString()}`, pageWidth - margin - 5, currentY + 3, { align: 'right' });
    doc.text(`KES ${totalPaid?.toLocaleString()}`, pageWidth - margin - 5, currentY + 10, { align: 'right' });
    
    if (balance > 0) doc.setTextColor(220, 38, 38);
    else doc.setTextColor(16, 185, 129);
    
    doc.setFontSize(11);
    doc.text(`KES ${balance?.toLocaleString()}`, pageWidth - margin - 5, currentY + 20, { align: 'right' });

    currentY += 35;

    // Ledger Table
    const ledger = [
        ...invoices.map(inv => ({
            date: inv.created_at || inv.createdAt || new Date().toISOString(),
            desc: `Invoice #${inv.invoiceNumber || inv.id?.slice(0, 8)}`,
            debit: inv.totalAmount || inv.amount || 0,
            credit: 0
        })),
        ...payments.map(pay => ({
            date: pay.created_at || pay.paymentDate || new Date().toISOString(),
            desc: `Payment - Receipt #${pay.receiptNumber || pay.id?.slice(0, 8)} (${pay.paymentMethod || 'M-Pesa'})`,
            debit: 0,
            credit: pay.amount || 0
        }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const tableData = ledger.map(item => {
        runningBalance += (item.debit - item.credit);
        return [
            item.date ? new Date(item.date).toLocaleDateString() : 'N/A',
            item.desc,
            item.debit > 0 ? item.debit?.toLocaleString() : '-',
            item.credit > 0 ? item.credit?.toLocaleString() : '-',
            runningBalance?.toLocaleString()
        ];
    });

    autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Description', 'Debit (KES)', 'Credit (KES)', 'Balance (KES)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        columnStyles: {
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' }
        }
    });

    return doc;
};

export const generatePracticalHoursLog = async (
    student: any,
    practicals: any[],
    trainers: any[],
    institution: any
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;

    let currentY = await renderHeader(doc, institution, 'PRACTICAL HOURS LOGBOOK LEDGER');

    // Student Info
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Student: ${String(student.fullName || 'N/A')}`, margin, currentY);
    doc.setFontSize(10);
    doc.text(`Phone: ${String(student.phone || 'N/A')}`, margin, currentY + 5);

    const sPracticals = practicals.filter(p => p.studentId === student.id);
    const totalHours = sPracticals.reduce((sum, p) => sum + (parseFloat(p.hours) || 0), 0);

    doc.text(`Total Hours Logged: ${totalHours} hrs`, margin, currentY + 12);
    currentY += 22;

    const tableData = sPracticals.map(p => {
        const trainer = trainers.find(t => t.id === p.trainerId);
        return [
            p.sessionDate ? new Date(p.sessionDate).toLocaleDateString() : 'N/A',
            String(p.topic || 'N/A'),
            `${p.hours} hrs`,
            String(trainer?.name || 'N/A'),
            String(p.notes || '-')
        ];
    });

    autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Topic/Session Details', 'Duration', 'Supervisor/Trainer', 'Notes/Assessment']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        columnStyles: {
            2: { halign: 'center' }
        }
    });

    return doc;
};
