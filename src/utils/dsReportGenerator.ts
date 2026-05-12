import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DSStudent, DSInvoice, DSPayment, DSLesson, DSVehicle, DSInstructor, User } from '../types';
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
        doc.text(String(institution?.name || 'Driving School'), margin, currentY);
        currentY += 8;
    }

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(String(defaultTitle).toUpperCase(), margin, currentY);
    currentY += 12;

    return currentY;
};

export const generateStudentStatement = async (
    student: DSStudent,
    invoices: DSInvoice[],
    payments: DSPayment[],
    institution: any
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    let currentY = await renderHeader(doc, institution, 'STUDENT ACCOUNT STATEMENT');

    // Student Info
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Student: ${String(student.fullName || 'N/A')}`, margin, currentY);
    doc.setFontSize(10);
    doc.text(`Phone: ${String(student.phone || 'N/A')}`, margin, currentY + 5);
    doc.text(`ID/Reg No: ${String((student as any).idNumber || (student as any).passportNumber || 'N/A')}`, margin, currentY + 10);

    // Summary Box
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
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
    doc.text(`KES ${totalInvoiced.toLocaleString()}`, pageWidth - margin - 5, currentY + 3, { align: 'right' });
    doc.text(`KES ${totalPaid.toLocaleString()}`, pageWidth - margin - 5, currentY + 10, { align: 'right' });
    
    if (balance > 0) doc.setTextColor(220, 38, 38);
    else doc.setTextColor(16, 185, 129);
    
    doc.setFontSize(11);
    doc.text(`KES ${balance.toLocaleString()}`, pageWidth - margin - 5, currentY + 20, { align: 'right' });

    currentY += 35;

    // Ledger Table
    const ledger = [
        ...invoices.map(inv => ({
            date: inv.createdAt,
            desc: `Invoice #${inv.invoiceNumber}`,
            debit: inv.totalAmount,
            credit: 0,
            type: 'INV'
        })),
        ...payments.map(pay => ({
            date: pay.paymentDate,
            desc: `Payment - Receipt #${pay.receiptNumber} (${pay.paymentMethod})`,
            debit: 0,
            credit: pay.amount,
            type: 'PAY'
        }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const tableData = ledger.map(item => {
        runningBalance += (item.debit - item.credit);
        return [
            item.date ? new Date(item.date).toLocaleDateString() : 'N/A',
            item.desc,
            item.debit > 0 ? item.debit.toLocaleString() : '-',
            item.credit > 0 ? item.credit.toLocaleString() : '-',
            runningBalance.toLocaleString()
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

export const generateLessonReport = async (
    lessons: DSLesson[],
    students: DSStudent[],
    vehicles: DSVehicle[],
    instructors: DSInstructor[],
    title: string,
    institution: any
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    let currentY = await renderHeader(doc, institution, title || 'REPORT');

    const tableData = lessons.map(l => {
        const student = students.find(s => s.id === l.studentId);
        const instructor = instructors.find(i => i.id === l.instructorId);
        const vehicle = vehicles.find(v => v.id === l.vehicleId);
        return [
            String(l.lessonDate || 'N/A'),
            String(l.startTime || 'N/A'),
            String(student?.fullName || 'N/A'),
            String(instructor?.name || 'N/A'),
            String(vehicle?.plateNumber || 'N/A'),
            String(l.status || 'PENDING').toUpperCase()
        ];
    });

    autoTable(doc, {
        startY: currentY + 5,
        head: [['Date', 'Time', 'Student', 'Instructor', 'Vehicle', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
    });

    return doc;
};

export const generateAttendanceSummary = async (
    lessons: DSLesson[],
    students: DSStudent[],
    title: string,
    institution: any
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    let currentY = await renderHeader(doc, institution, title || 'ATTENDANCE');

    // Group by student
    const stats: Record<string, { present: number, total: number }> = {};
    lessons.forEach(l => {
        if (!stats[l.studentId]) stats[l.studentId] = { present: 0, total: 0 };
        stats[l.studentId].total++;
        if (l.status && l.status.toLowerCase() === 'completed') stats[l.studentId].present++;
    });

    const tableData = Object.entries(stats).map(([sid, s]) => {
        const student = students.find(x => x.id === sid);
        const percentage = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
        return [
            String(student?.fullName || 'N/A'),
            String(s.total),
            String(s.present),
            String(s.total - s.present),
            `${percentage}%`
        ];
    });

    autoTable(doc, {
        startY: currentY + 5,
        head: [['Student Name', 'Total Scheduled', 'Completed', 'Missed/Pending', 'Completion Rate']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }
    });

    return doc;
};

export const generateIncomeReport = async (
    payments: DSPayment[],
    invoices: DSInvoice[],
    title: string,
    institution: any,
    voteHead?: string
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    let currentY = await renderHeader(doc, institution, title || 'INCOME REPORT');

    if (voteHead) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Filtered by Vote Head: ${voteHead}`, margin, currentY);
        currentY += 8;
    } else {
        currentY += 4;
    }

    const tableData = payments.map(p => {
        let amount = p.amount;
        
        if (voteHead) {
            const invoice = invoices.find(inv => inv.id === p.invoiceId);
            if (invoice && invoice.items) {
                const item = invoice.items.find(i => i.name.toLowerCase().includes(voteHead.toLowerCase()));
                if (!item) amount = 0;
                else {
                    amount = Math.min(p.amount, item.amount);
                }
            }
        }

        if (amount <= 0 && voteHead) return null;

        return [
            p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A',
            String(p.receiptNumber || 'N/A'),
            String(p.studentName || 'N/A'),
            String(p.paymentMethod || 'N/A'),
            String(p.transactionReference || '-'),
            amount.toLocaleString()
        ];
    }).filter(Boolean) as any[];

    const total = tableData.reduce((sum, row) => sum + parseFloat(row[5].replace(/,/g, '')), 0);

    autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Receipt', 'Student', 'Method', 'Ref', 'Amount (KES)']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        foot: [['', '', '', '', 'TOTAL INCOME', total.toLocaleString()]],
        footStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 5: { halign: 'right' } }
    });

    return doc;
};

export const generateBalanceReport = async (
    students: DSStudent[],
    invoices: DSInvoice[],
    payments: DSPayment[],
    title: string,
    institution: any,
    voteHead?: string
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    let currentY = await renderHeader(doc, institution, title || 'ARREARS REPORT');

    if (voteHead) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Filtered by Vote Head: ${voteHead}`, margin, currentY);
        currentY += 8;
    } else {
        currentY += 4;
    }

    const tableData = students.map(s => {
        const sInvoices = invoices.filter(inv => inv.studentId === s.id);
        const sPayments = payments.filter(pay => pay.studentId === s.id);
        
        let totalInvoiced = 0;
        let totalPaid = 0;

        if (voteHead) {
            sInvoices.forEach(inv => {
                const item = inv.items?.find(i => i.name.toLowerCase().includes(voteHead.toLowerCase()));
                if (item) totalInvoiced += item.amount;
            });
            totalPaid = sPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
            totalPaid = Math.min(totalPaid, totalInvoiced);
        } else {
            totalInvoiced = sInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
            totalPaid = sPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
        }
        
        const balance = totalInvoiced - totalPaid;

        if (balance <= 0) return null;

        return [
            String(s.fullName || 'N/A'),
            String(s.phone || 'N/A'),
            totalInvoiced.toLocaleString(),
            totalPaid.toLocaleString(),
            balance.toLocaleString()
        ];
    }).filter(Boolean) as any[];

    const totalBalance = tableData.reduce((sum, row) => sum + parseFloat(row[4].replace(/,/g, '')), 0);

    autoTable(doc, {
        startY: currentY,
        head: [['Student Name', 'Phone', 'Invoiced (KES)', 'Paid (KES)', 'Balance (KES)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38] },
        foot: [['', '', '', 'TOTAL ARREARS', totalBalance.toLocaleString()]],
        footStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
    });

    return doc;
};
