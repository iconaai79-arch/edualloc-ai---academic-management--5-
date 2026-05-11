import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DSStudent, DSInvoice, DSPayment, DSLesson, DSVehicle, User } from '../types';

export const generateStudentStatement = (
    student: DSStudent,
    invoices: DSInvoice[],
    payments: DSPayment[],
    institution: any
) => {
    const doc = new jsPDF() as any;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text(institution?.name || 'Driving School', margin, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('STUDENT ACCOUNT STATEMENT', margin, 32);

    // Student Info
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Student: ${student.fullName}`, margin, 45);
    doc.setFontSize(10);
    doc.text(`Phone: ${student.phone || 'N/A'}`, margin, 50);
    doc.text(`ID/Reg No: ${student.idNumber || 'N/A'}`, margin, 55);

    // Summary Box
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
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
    doc.setTextColor(balance > 0 ? [220, 38, 38] : [16, 185, 129]);
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
            new Date(item.date).toLocaleDateString(),
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
    instructors: User[],
    title: string,
    institution: any
) => {
    const doc = new jsPDF() as any;
    const margin = 20;

    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text(institution?.name || 'Driving School', margin, 25);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(title.toUpperCase(), margin, 32);

    const tableData = lessons.map(l => {
        const student = students.find(s => s.id === l.studentId);
        const instructor = instructors.find(i => i.id === l.instructorId);
        const vehicle = vehicles.find(v => v.id === l.vehicleId);
        return [
            l.date,
            l.startTime,
            student?.fullName || 'N/A',
            instructor?.name || 'N/A',
            vehicle?.plateNumber || 'N/A',
            l.status.toUpperCase()
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
    const doc = new jsPDF() as any;
    const margin = 20;

    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text(institution?.name || 'Driving School', margin, 25);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(title.toUpperCase(), margin, 32);

    // Group by student
    const stats: Record<string, { present: number, total: number }> = {};
    lessons.forEach(l => {
        if (!stats[l.studentId]) stats[l.studentId] = { present: 0, total: 0 };
        stats[l.studentId].total++;
        if (l.status === 'completed') stats[l.studentId].present++;
    });

    const tableData = Object.entries(stats).map(([sid, s]) => {
        const student = students.find(x => x.id === sid);
        const percentage = Math.round((s.present / s.total) * 100);
        return [
            student?.fullName || 'N/A',
            s.total,
            s.present,
            s.total - s.present,
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
