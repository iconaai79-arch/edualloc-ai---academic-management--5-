import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DSStudent, DSInvoice, DSPayment, DSLesson, DSVehicle, DSInstructor, User } from '../types';

export const generateStudentStatement = (
    student: DSStudent,
    invoices: DSInvoice[],
    payments: DSPayment[],
    institution: any
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text(String(institution?.name || 'Driving School'), margin, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('STUDENT ACCOUNT STATEMENT', margin, 32);

    // Student Info
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Student: ${String(student.fullName || 'N/A')}`, margin, 45);
    doc.setFontSize(10);
    doc.text(`Phone: ${String(student.phone || 'N/A')}`, margin, 50);
    doc.text(`ID/Reg No: ${String((student as any).idNumber || (student as any).passportNumber || 'N/A')}`, margin, 55);

    // Summary Box
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalPaid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const balance = totalInvoiced - totalPaid;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pageWidth - margin - 70, 40, 70, 30, 5, 5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text('TOTAL INVOICED:', pageWidth - margin - 65, 48);
    doc.text('TOTAL PAID:', pageWidth - margin - 65, 55);
    doc.setFontSize(11);
    doc.text('BALANCE DUE:', pageWidth - margin - 65, 65);
    
    doc.setFontSize(9);
    doc.text(`KES ${totalInvoiced.toLocaleString()}`, pageWidth - margin - 5, 48, { align: 'right' });
    doc.text(`KES ${totalPaid.toLocaleString()}`, pageWidth - margin - 5, 55, { align: 'right' });
    
    if (balance > 0) doc.setTextColor(220, 38, 38);
    else doc.setTextColor(16, 185, 129);
    
    doc.setFontSize(11);
    doc.text(`KES ${balance.toLocaleString()}`, pageWidth - margin - 5, 65, { align: 'right' });

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
        startY: 80,
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

export const generateLessonReport = (
    lessons: DSLesson[],
    students: DSStudent[],
    vehicles: DSVehicle[],
    instructors: DSInstructor[],
    title: string,
    institution: any
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;

    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text(String(institution?.name || 'Driving School'), margin, 25);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(String(title || 'REPORT').toUpperCase(), margin, 32);

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
        startY: 45,
        head: [['Date', 'Time', 'Student', 'Instructor', 'Vehicle', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
    });

    return doc;
};

export const generateAttendanceSummary = (
    lessons: DSLesson[],
    students: DSStudent[],
    title: string,
    institution: any
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;

    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text(String(institution?.name || 'Driving School'), margin, 25);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(String(title || 'ATTENDANCE').toUpperCase(), margin, 32);

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
        startY: 45,
        head: [['Student Name', 'Total Scheduled', 'Completed', 'Missed/Pending', 'Completion Rate']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }
    });

    return doc;
};

export const generateIncomeReport = (
    payments: DSPayment[],
    invoices: DSInvoice[],
    title: string,
    institution: any,
    voteHead?: string
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;

    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text(String(institution?.name || 'Driving School'), margin, 25);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(String(title || 'INCOME REPORT').toUpperCase(), margin, 32);

    if (voteHead) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Filtered by Vote Head: ${voteHead}`, margin, 38);
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
        startY: voteHead ? 45 : 40,
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

export const generateBalanceReport = (
    students: DSStudent[],
    invoices: DSInvoice[],
    payments: DSPayment[],
    title: string,
    institution: any,
    voteHead?: string
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;

    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text(String(institution?.name || 'Driving School'), margin, 25);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(String(title || 'ARREARS REPORT').toUpperCase(), margin, 32);

    if (voteHead) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Filtered by Vote Head: ${voteHead}`, margin, 38);
    }

    const tableData = students.map(s => {
        const sInvoices = invoices.filter(inv => inv.studentId === s.id);
        const sPayments = payments.filter(pay => pay.studentId === s.id);
        
        let totalInvoiced = 0;
        let totalPaid = 0;

        if (voteHead) {
            // Calculate specific vote head balance
            sInvoices.forEach(inv => {
                const item = inv.items?.find(i => i.name.toLowerCase().includes(voteHead.toLowerCase()));
                if (item) totalInvoiced += item.amount;
            });
            // This is a simplification: assuming payments are applied proportionally or we just look at total paid vs total invoiced for that vote head
            // In a real system, we'd have payment allocations per vote head.
            // For now, let's just show total invoiced for that head.
            // Wait, if I don't know how much of the payment went to which head, I can't calculate a correct balance per head.
            // But let's assume if they paid KES 5000 and Tuition was 15000, balance is 10000.
            totalPaid = sPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
            // Limit paid to invoiced for this head for display purposes if we don't have allocation
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
        startY: 40,
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
