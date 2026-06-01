import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DSInvoice, DSPayment, DSStudent, DSSettings, DSLesson, DSInstructor, DSVehicle } from '../types';
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
    institution: any,
    invoicesList?: DSInvoice[]
) => {
    const doc = new jsPDF() as any;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Fetch system-wide default company settings to support global letterhead fallback
    const companyDetails = await apiService.fetchCompanySettings().catch(() => null);

    // Letterhead Support cascade: Institution -> System Default
    const letterheadUrl = institution?.letterheadConfig?.headerImageUrl || institution?.letterheadUrl || companyDetails?.letterheadConfig?.headerImageUrl || (companyDetails as any)?.letterheadUrl || (companyDetails as any)?.logoUrl;

    // Footer Support cascade: Institution -> System Default
    const footerUrl = institution?.letterheadConfig?.footerImageUrl || institution?.footerImageUrl || companyDetails?.letterheadConfig?.footerImageUrl || (companyDetails as any)?.footerImageUrl;
    const footerText = institution?.letterheadConfig?.footerText || companyDetails?.letterheadConfig?.footerText || '';

    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadUrl),
        loadImage(footerUrl)
    ]);

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
            currentY = finalHeight + 30; // extra space below letterhead
        } else {
            doc.addImage(headerImg, 'JPEG', margin, 15, imgWidth, imgHeight);
            currentY = imgHeight + 30; // extra space below letterhead
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
        currentY += 30;
    }

    // Lookup associated invoice if type is receipt
    let associatedInvoice: DSInvoice | null = null;
    if (type === 'receipt') {
        const pay = data as DSPayment;
        if (invoicesList) {
            associatedInvoice = invoicesList.find(inv => inv.id === pay.invoiceId) || null;
        } else if (institution?.id) {
            const fetched = await apiService.fetchModuleRecords<DSInvoice>('ds_invoices', institution.id).catch(() => []);
            associatedInvoice = fetched?.find(inv => inv.id === pay.invoiceId) || null;
        }
    }

    // Document Type & Number — always placed BELOW the header with clear spacing
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59); // Slate-800
    const title = type === 'invoice' ? 'INVOICE' : 'RECEIPT';
    const number = type === 'invoice' ? (data as DSInvoice).invoiceNumber : (data as DSPayment).receiptNumber;
    doc.text(title, pageWidth - margin, currentY + 5, { align: 'right' });

    doc.setFont(undefined, 'normal');
    doc.setFontSize(12);
    doc.text(`#${number}`, pageWidth - margin, currentY + 15, { align: 'right' });

    // Bill To / Paid By — anchored relative to title block
    const billBlockY = currentY + 30;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont(undefined, 'bold');
    doc.text(type === 'invoice' ? 'BILL TO:' : 'PAID BY:', margin, billBlockY);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(student.fullName, margin, billBlockY + 8);
    doc.setFontSize(10);
    doc.setTextColor(100);
    let detailY = billBlockY + 14;
    if (student.admissionNumber) {
        doc.text(`Adm: ${student.admissionNumber}`, margin, detailY);
        detailY += 5;
    }
    if (student.enrollmentDate) {
        doc.text(`Enrolled: ${new Date(student.enrollmentDate).toLocaleDateString()}`, margin, detailY);
        detailY += 5;
    }
    doc.text(student.phone || 'N/A', margin, detailY);
    doc.text(student.email || 'N/A', margin, detailY + 5);

    // Date (right-aligned beside the title)
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont(undefined, 'bold');
    doc.text('DATE:', pageWidth - margin - 40, billBlockY);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(new Date().toLocaleDateString(), pageWidth - margin, billBlockY, { align: 'right' });

    // Table
    let tableHead: string[] = [];
    let tableData: any[][] = [];

    if (type === 'invoice') {
        const inv = data as DSInvoice;
        tableHead = ['Description', 'Amount (KES)', 'Paid (KES)', 'Balance (KES)'];
        tableData = (inv.items || []).map(item => [
            item.name,
            item.amount?.toLocaleString(),
            (item.paidAmount || 0)?.toLocaleString(),
            (item.amount - (item.paidAmount || 0))?.toLocaleString()
        ]);
        if (inv.notes) {
            tableData.push(['Notes', inv.notes, '', '']);
        }
    } else {
        const pay = data as DSPayment;
        tableHead = ['Payment Detail', 'Value'];
        tableData = [
            ['Payment Method', pay.paymentMethod],
            ['Reference', pay.transactionReference || 'N/A'],
            ['Date', new Date(pay.paymentDate)?.toLocaleString()],
            ['Amount Paid', `KES ${pay.amount?.toLocaleString()}`]
        ];
    }

    autoTable(doc, {
        startY: currentY + 75,  // enough clearance below bill-to block
        head: [tableHead],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: margin, right: margin }
    });

    let renderYAfterTable = (doc as any).lastAutoTable.finalY || 150;

    // Render Votes Breakdown for Receipts if associated invoice exists
    if (type === 'receipt' && associatedInvoice && Array.isArray(associatedInvoice.items) && associatedInvoice.items.length > 0) {
        renderYAfterTable += 12;
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.setFont(undefined, 'bold');
        doc.text("VOTES BREAKDOWN (FEE ALLOCATION)", margin, renderYAfterTable);

        const votesData = associatedInvoice.items.map(item => [
            item.name,
            `KES ${item.amount?.toLocaleString()}`,
            `KES ${(item.paidAmount || 0)?.toLocaleString()}`,
            `KES ${(item.amount - (item.paidAmount || 0))?.toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: renderYAfterTable + 4,
            head: [['Vote Item', 'Allocated', 'Paid', 'Balance']],
            body: votesData,
            theme: 'grid',
            headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 4 },
            margin: { left: margin, right: margin }
        });

        renderYAfterTable = (doc as any).lastAutoTable.finalY || renderYAfterTable + 30;
    }

    // Totals
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    const totalLabel = type === 'invoice' ? 'INVOICE TOTAL:' : 'PAYMENT TOTAL:';
    const totalValue = type === 'invoice' ? (data as DSInvoice).totalAmount : (data as DSPayment).amount;

    doc.text(totalLabel, pageWidth - margin - 85, renderYAfterTable + 20);
    doc.setFontSize(16);
    doc.text(`KES ${totalValue?.toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 20, { align: 'right' });

    if (type === 'invoice') {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('AMOUNT PAID:', pageWidth - margin - 85, renderYAfterTable + 30);
        doc.setTextColor(30, 41, 59);
        doc.text(`KES ${(data as DSInvoice).paidAmount?.toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 30, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('BALANCE DUE:', pageWidth - margin - 85, renderYAfterTable + 42);
        doc.setTextColor(220, 38, 38); // Red-600
        doc.text(`KES ${(data as DSInvoice).balance?.toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 42, { align: 'right' });
    } else if (type === 'receipt' && associatedInvoice) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('INVOICE TOTAL:', pageWidth - margin - 85, renderYAfterTable + 30);
        doc.setTextColor(30, 41, 59);
        doc.text(`KES ${associatedInvoice.totalAmount?.toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 30, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('OUTSTANDING BALANCE:', pageWidth - margin - 85, renderYAfterTable + 42);
        doc.setTextColor(220, 38, 38); // Red-600
        doc.text(`KES ${associatedInvoice.balance?.toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 42, { align: 'right' });
    }

    // Footer Layout & Page Numbers
    const pageCount = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        if (footerImg) {
            const footerMargin = 10;
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

        const copyrightText = footerText || 'Thank you for choosing our Driving School!';
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text(copyrightText, margin, pageHeight - 7);

        const pageNumText = `Page ${i} of ${pageCount}`;
        doc.text(pageNumText, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }

    return doc;
};

export const generateDSThermalReceipt = async (
    payment: DSPayment,
    student: DSStudent,
    institution: any,
    isReprint: boolean = false,
    invoicesList?: DSInvoice[]
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

    let associatedInvoice: DSInvoice | null = null;
    if (invoicesList) {
        associatedInvoice = invoicesList.find(inv => inv.id === payment.invoiceId) || null;
    } else if (institution?.id) {
        const fetched = await apiService.fetchModuleRecords<DSInvoice>('ds_invoices', institution.id).catch(() => []);
        associatedInvoice = fetched?.find(inv => inv.id === payment.invoiceId) || null;
    }

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
    doc.text(`Date: ${new Date(payment.paymentDate)?.toLocaleString()}`, margin, yPos);
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
    doc.text(`Kes ${payment.amount?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;

    if (associatedInvoice && Array.isArray(associatedInvoice.items) && associatedInvoice.items.length > 0) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text("--- Votes Breakdown ---", margin, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        associatedInvoice.items.forEach(it => {
            doc.text(`${it.name}`, margin, yPos);
            doc.text(`Kes ${it.amount?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
            yPos += 4;
        });
        yPos += 4;
    }

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("TOTAL PAID:", margin, yPos);
    doc.text(`Kes ${payment.amount?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;

    if (associatedInvoice) {
        doc.setFontSize(9);
        doc.text("OUTSTANDING BAL:", margin, yPos);
        doc.text(`Kes ${associatedInvoice.balance?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 8;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    centerText("Thank you for your payment!", yPos);
    yPos += 5;
    doc.setFontSize(7);
    centerText("Powered by EduAi Automation", yPos);

    return doc.output('bloburl');
};

export const generateDSSchedulePDF = async (
    lessons: DSLesson[],
    students: DSStudent[],
    instructors: DSInstructor[],
    vehicles: DSVehicle[],
    institution: any,
    letterheadConfig?: any
) => {
    const doc = new jsPDF() as any;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Fetch system-wide default company settings to support global letterhead fallback
    const companyDetails = await apiService.fetchCompanySettings().catch(() => null);

    // Letterhead Support cascade
    const letterheadUrl = letterheadConfig?.headerImageUrl || institution?.letterheadConfig?.headerImageUrl || institution?.letterheadUrl || companyDetails?.letterheadConfig?.headerImageUrl || (companyDetails as any)?.letterheadUrl || (companyDetails as any)?.logoUrl;
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
        doc.setFontSize(22);
        doc.setTextColor(79, 70, 229); // Indigo-600
        doc.text(institution?.name || 'Driving School Academy', margin, currentY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(institution?.address || 'Official Campus', margin, currentY + 8);
        doc.text(`Tel: ${institution?.phone || 'N/A'}`, margin, currentY + 13);
        currentY += 25;
    }

    // Document Title
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('OFFICIAL TRAINING SCHEDULE REPORT', margin, currentY);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date()?.toLocaleString()}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 12;

    // Table mapping
    const tableHead = ['Date & Time', 'Type', 'Student', 'Instructor', 'Vehicle', 'Status'];
    const tableData = lessons.map(lesson => {
        const student = students.find(s => s.id === lesson.studentId);
        const instructor = instructors.find(i => i.id === lesson.instructorId);
        const vehicle = vehicles.find(v => v.id === lesson.vehicleId);
        
        const dateStr = lesson.lessonDate ? new Date(lesson.lessonDate).toLocaleDateString() : 'No Date';
        const timeStr = `${lesson.startTime} - ${lesson.endTime}`;

        return [
            `${dateStr}\n${timeStr}`,
            lesson.lessonType || 'Practical',
            student?.fullName || 'Unknown Student',
            instructor?.name || 'Unassigned',
            vehicle?.plateNumber || 'N/A',
            lesson.status
        ];
    });

    autoTable(doc, {
        startY: currentY + 5,
        head: [tableHead],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        margin: { left: margin, right: margin }
    });

    const finalY = (doc as any).lastAutoTable.finalY || currentY + 50;

    // Footer asset if present
    const footerUrl = letterheadConfig?.footerImageUrl || institution?.letterheadConfig?.footerImageUrl || companyDetails?.letterheadConfig?.footerImageUrl;
    const footerImg = await loadImage(footerUrl);

    if (footerImg) {
        const fWidth = pageWidth - (margin * 2);
        const fHeight = (footerImg.height * fWidth) / footerImg.width;
        const maxFHeight = 25;
        const renderedHeight = fHeight > maxFHeight ? maxFHeight : fHeight;
        const renderedWidth = (footerImg.width * renderedHeight) / footerImg.height;
        const fX = (pageWidth - renderedWidth) / 2;
        
        // Ensure footer fits on current page or start new page if needed
        if (finalY + renderedHeight + 15 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            doc.addImage(footerImg, 'JPEG', fX, doc.internal.pageSize.getHeight() - renderedHeight - 15, renderedWidth, renderedHeight);
        } else {
            doc.addImage(footerImg, 'JPEG', fX, doc.internal.pageSize.getHeight() - renderedHeight - 15, renderedWidth, renderedHeight);
        }
    } else {
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Official Training Roster • Generated by EduAi Driving School Management', pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });
    }

    return doc;
};

export const generateDSStudentLogbookPDF = async (
    student: DSStudent,
    lessons: DSLesson[],
    instructors: DSInstructor[],
    institution: any,
    letterheadConfig?: any
) => {
    const doc = new jsPDF() as any;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    const companyDetails = await apiService.fetchCompanySettings().catch(() => null);
    const letterheadUrl = letterheadConfig?.headerImageUrl || institution?.letterheadConfig?.headerImageUrl || institution?.letterheadUrl || companyDetails?.letterheadConfig?.headerImageUrl || (companyDetails as any)?.letterheadUrl || (companyDetails as any)?.logoUrl;
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
        doc.setFontSize(22);
        doc.setTextColor(79, 70, 229);
        doc.text(institution?.name || 'Driving School Academy', margin, currentY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(institution?.address || 'Official Training Logbook', margin, currentY + 8);
        doc.text(`Tel: ${institution?.phone || 'N/A'}`, margin, currentY + 13);
        currentY += 25;
    }

    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('OFFICIAL STUDENT TRAINING LOGBOOK', margin, currentY);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('REGULATORY COMPLIANCE CHECKLIST', pageWidth - margin, currentY, { align: 'right' });
    currentY += 12;

    // Student identity grid
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`Student Name: ${student.fullName}`, margin, currentY);
    doc.text(`Admission #: ${student.admissionNumber || 'N/A'}`, pageWidth / 2, currentY);
    currentY += 7;
    doc.text(`Enrolled Class: ${(student as any).licenseCategory || student.licenseTypeInterested || 'CLASS B'}`, margin, currentY);
    doc.text(`Phone: ${student.phone || 'N/A'}`, pageWidth / 2, currentY);
    currentY += 12;

    // Mandatory Curriculum Counters Summary
    const studentLessons = lessons.filter(l => l.studentId === student.id);
    const theoryCount = studentLessons.filter(l => l.lessonType === 'Theory' && l.status === 'Completed').length;
    const practicalCount = studentLessons.filter(l => l.lessonType === 'Practical' && l.status === 'Completed').length;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 22, 'FD');

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`Theory Sessions Logged: ${theoryCount} / 20 Hours`, margin + 5, currentY + 8);
    doc.text(`Practical Highway Drives: ${practicalCount} / 15 Sessions`, pageWidth / 2, currentY + 8);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Overall Progress Rating: ${Math.max(student.practicalProgressPercent || 0, student.theoryProgressPercent || 0)}% Completed`, margin + 5, currentY + 16);
    currentY += 32;

    // Logbook detail matrix
    const tableHead = ['Date', 'Session Type', 'Time Slot', 'Instructor', 'Status', 'Official Sign-off'];
    const tableData = studentLessons.map(l => {
        const inst = instructors.find(i => i.id === l.instructorId);
        return [
            l.lessonDate ? new Date(l.lessonDate).toLocaleDateString() : 'N/A',
            l.lessonType || 'Practical',
            `${l.startTime || ''} - ${l.endTime || ''}`,
            inst?.name || 'Unassigned',
            l.status || 'Scheduled',
            l.status === 'Completed' ? '[ Verified OK ]' : '[ _________ ]'
        ];
    });

    if (tableData.length === 0) {
        tableData.push(['No lessons scheduled yet', '-', '-', '-', '-', '-']);
    }

    autoTable(doc, {
        startY: currentY,
        head: [tableHead],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        margin: { left: margin, right: margin }
    });

    const finalY = (doc as any).lastAutoTable.finalY || currentY + 50;

    // Authority declaration block
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("DECLARATION: I certify that the above lessons were successfully instructed according to the approved national syllabus.", margin, finalY + 15);
    
    doc.setDrawColor(150);
    doc.line(margin, finalY + 30, margin + 60, finalY + 30);
    doc.text("Chief Instructor Signature & Stamp", margin, finalY + 35);

    doc.line(pageWidth - margin - 60, finalY + 30, pageWidth - margin, finalY + 30);
    doc.text("Student Signature", pageWidth - margin - 60, finalY + 35);

    return doc;
};

export const generateDSStudentDirectoryPDF = async (
    reportType: 'all_students' | 'active_students' | 'ntsa_booked' | 'payment_behind',
    students: DSStudent[],
    lessons: DSLesson[],
    invoices: DSInvoice[],
    settings: DSSettings | null,
    institution: any,
    letterheadConfig?: any
) => {
    const doc = new jsPDF() as any;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    const companyDetails = await apiService.fetchCompanySettings().catch(() => null);
    const letterheadUrl = letterheadConfig?.headerImageUrl || institution?.letterheadConfig?.headerImageUrl || institution?.letterheadUrl || companyDetails?.letterheadConfig?.headerImageUrl || (companyDetails as any)?.letterheadUrl || (companyDetails as any)?.logoUrl;
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
        doc.setFontSize(22);
        doc.setTextColor(79, 70, 229);
        doc.text(institution?.name || 'Driving School Academy', margin, currentY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(institution?.address || 'Student Reports Directory', margin, currentY + 8);
        doc.text(`Tel: ${institution?.phone || 'N/A'}`, margin, currentY + 13);
        currentY += 25;
    }

    let titleText = 'STUDENT DIRECTORY REPORT';
    let subtitleText = 'ALL REGISTERED STUDENTS';

    if (reportType === 'active_students') {
        titleText = 'ACTIVE STUDENTS ROSTER';
        subtitleText = 'CURRENTLY ACTIVE ENROLLED CANDIDATES';
    } else if (reportType === 'ntsa_booked') {
        titleText = 'NTSA BOOKING ROSTER';
        subtitleText = 'CANDIDATES WITH REGULATORY NTSA BOOKINGS';
    } else if (reportType === 'payment_behind') {
        titleText = 'PAYMENT SHORTFALL REPORT';
        subtitleText = 'CANDIDATES BEHIND EXPECTED TUITION FEES';
    }

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(titleText, margin, currentY);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitleText, margin, currentY + 5);
    doc.text(`Generated on: ${new Date()?.toLocaleString()}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 15;

    // Filter students
    let filteredList = [...students];
    if (reportType === 'active_students') {
        filteredList = filteredList.filter(s => !s.status || s.status === 'Enrolled');
    } else if (reportType === 'ntsa_booked') {
        filteredList = filteredList.filter(s => s.ntsaBookingStatus && s.ntsaBookingStatus !== 'Not Booked' && s.ntsaBookingStatus !== 'Eligible');
    } else if (reportType === 'payment_behind') {
        filteredList = filteredList.filter(s => {
            const invoice = (invoices || []).find(inv => inv.studentId === s.id && inv.status !== 'Cancelled');
            if (!invoice) return false;
            const systemDays = (lessons || []).filter(l => l.studentId === s.id && l.status === 'Completed').length;
            const priorDays = s.priorAttendedDays || 0;
            const effectiveDays = systemDays + priorDays;
            const courseDuration = s.courseDurationDays || settings?.schedulingRules?.requiredDaysToComplete || settings?.defaultCourseDuration || 21;
            const totalFee = invoice.totalAmount || 0;
            const paidAmount = invoice.paidAmount || 0;
            const nextSession = effectiveDays + 1;
            const expectedByNextSession = totalFee > 0 ? Math.round((nextSession / courseDuration) * totalFee) : 0;
            const shortfall = Math.max(0, expectedByNextSession - paidAmount);
            return shortfall > 0;
        });
    }

    // Build Table
    const tableHead = ['Student', 'Contact', 'Category', 'Status', 'Progress', 'Fee Status'];
    const tableData = filteredList.map(s => {
        // Milestone shortfall calculation
        const invoice = (invoices || []).find(inv => inv.studentId === s.id && inv.status !== 'Cancelled');
        let paymentStatusStr = 'No Invoice';
        if (invoice) {
            const systemDays = (lessons || []).filter(l => l.studentId === s.id && l.status === 'Completed').length;
            const priorDays = s.priorAttendedDays || 0;
            const effectiveDays = systemDays + priorDays;
            const courseDuration = s.courseDurationDays || settings?.schedulingRules?.requiredDaysToComplete || settings?.defaultCourseDuration || 21;
            const totalFee = invoice.totalAmount || 0;
            const paidAmount = invoice.paidAmount || 0;
            const nextSession = effectiveDays + 1;
            const expectedByNextSession = totalFee > 0 ? Math.round((nextSession / courseDuration) * totalFee) : 0;
            const shortfall = Math.max(0, expectedByNextSession - paidAmount);
            
            if (shortfall <= 0) {
                paymentStatusStr = 'On Track';
            } else {
                paymentStatusStr = `KES ${shortfall?.toLocaleString()} Behind`;
            }
        }

        const progressStr = `${s.practicalProgressPercent || 0}%`;

        return [
            `${s.fullName}\n${s.admissionNumber || ''}`,
            `${s.phone || ''}\n${s.email || ''}`,
            s.licenseTypeInterested || 'Class B',
            s.status || 'Enrolled',
            progressStr,
            paymentStatusStr
        ];
    });

    if (tableData.length === 0) {
        tableData.push(['No students match this report criteria', '-', '-', '-', '-', '-']);
    }

    autoTable(doc, {
        startY: currentY,
        head: [tableHead],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        margin: { left: margin, right: margin }
    });

    const finalY = (doc as any).lastAutoTable.finalY || currentY + 50;

    // Footer asset if present
    const footerUrl = letterheadConfig?.footerImageUrl || institution?.letterheadConfig?.footerImageUrl || companyDetails?.letterheadConfig?.footerImageUrl;
    const footerImg = await loadImage(footerUrl);

    if (footerImg) {
        const fWidth = pageWidth - (margin * 2);
        const fHeight = (footerImg.height * fWidth) / footerImg.width;
        const maxFHeight = 25;
        const renderedHeight = fHeight > maxFHeight ? maxFHeight : fHeight;
        const renderedWidth = (footerImg.width * renderedHeight) / footerImg.height;
        const fX = (pageWidth - renderedWidth) / 2;
        
        if (finalY + renderedHeight + 15 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            doc.addImage(footerImg, 'JPEG', fX, doc.internal.pageSize.getHeight() - renderedHeight - 15, renderedWidth, renderedHeight);
        } else {
            doc.addImage(footerImg, 'JPEG', fX, doc.internal.pageSize.getHeight() - renderedHeight - 15, renderedWidth, renderedHeight);
        }
    } else {
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Official Student Directory Report • Generated by Driving School Management', pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });
    }

    return doc;
};

export const generateDSLeavingCertificatePDF = async (
    student: DSStudent,
    institution: any,
    letterheadConfig?: any
) => {
    // Landscape A4 size: 297mm x 210mm
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    }) as any;

    const pageWidth = doc.internal.pageSize.getWidth(); // 297
    const pageHeight = doc.internal.pageSize.getHeight(); // 210

    // Fetch system-wide default company settings to support global letterhead fallback
    const companyDetails = await apiService.fetchCompanySettings().catch(() => null);

    // Header image
    const letterheadUrl = letterheadConfig?.headerImageUrl || institution?.letterheadConfig?.headerImageUrl || institution?.letterheadUrl || companyDetails?.letterheadConfig?.headerImageUrl || (companyDetails as any)?.letterheadUrl || (companyDetails as any)?.logoUrl;
    const headerImg = await loadImage(letterheadUrl);

    // 1. Draw elegant certificate borders (Double border)
    doc.setDrawColor(79, 70, 229); // Indigo border
    doc.setLineWidth(1.5);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

    doc.setDrawColor(30, 41, 59); // Slate inner border
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // Corner decorative details
    doc.setFillColor(79, 70, 229);
    doc.rect(8, 8, 6, 6, 'F');
    doc.rect(pageWidth - 14, 8, 6, 6, 'F');
    doc.rect(8, pageHeight - 14, 6, 6, 'F');
    doc.rect(pageWidth - 14, pageHeight - 14, 6, 6, 'F');

    let currentY = 20;

    // 2. Render Header/Logo
    if (headerImg) {
        const imgWidth = 80;
        const imgHeight = (headerImg.height * imgWidth) / headerImg.width;
        const xPos = (pageWidth - imgWidth) / 2;
        doc.addImage(headerImg, 'JPEG', xPos, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 10;
    } else {
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        const instName = (institution?.name || 'DRIVING SCHOOL ACADEMY').toUpperCase();
        doc.text(instName, pageWidth / 2, currentY, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(institution?.address || 'Official Training Campus', pageWidth / 2, currentY + 6, { align: 'center' });
        doc.text(`Tel: ${institution?.phone || 'N/A'} | Email: ${institution?.email || 'N/A'}`, pageWidth / 2, currentY + 11, { align: 'center' });
        currentY += 20;
    }

    // 3. Certificate Title
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('SCHOOL LEAVING CERTIFICATE', pageWidth / 2, currentY, { align: 'center' });
    
    // Gold/Yellow accent bar under title
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(1);
    doc.line(pageWidth / 2 - 40, currentY + 4, pageWidth / 2 + 40, currentY + 4);
    currentY += 16;

    // 4. Main Body Text
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('This is to certify that candidate:', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Student Name (Large and bold)
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(student.fullName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Details paragraph
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);

    const categoryText = student.licenseTypeInterested || student.licenseCategory || 'CLASS B';
    const admissionNo = student.admissionNumber || 'N/A';
    const enrollDate = student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : 'N/A';
    const gradDate = new Date().toLocaleDateString();

    const certText = `bearing Admission No. ${admissionNo} has been a student of our academy, training under the ${categoryText} licensing category.\n` +
                     `The student was enrolled on ${enrollDate} and successfully completed the training syllabus on ${gradDate}.`;
    
    doc.text(certText, pageWidth / 2, currentY, { align: 'center', lineHeightFactor: 1.5 });
    currentY += 22;

    // Conduct and performance review
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10.5);
    doc.setTextColor(100);
    const conductText = `During the training period, the candidate demonstrated commendable conduct and satisfactory progress in road safety, traffic rules, and practical driving skills.`;
    doc.text(conductText, pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // Official Sign-off declaration
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('This leaving certificate is officially issued without erasure or alteration.', pageWidth / 2, currentY, { align: 'center' });
    currentY += 20;

    // 5. Signature Lines (placed at bottom)
    const sigY = pageHeight - 35;
    
    doc.setDrawColor(150);
    doc.setLineWidth(0.5);
    
    // Left Signature
    doc.line(40, sigY, 110, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('Chief Instructor Signature', 75, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Training & Assessment Dept.', 75, sigY + 9, { align: 'center' });

    // Right Signature
    doc.line(pageWidth - 110, sigY, pageWidth - 40, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Director / School Manager', pageWidth - 75, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Official Seal & Date Stamp', pageWidth - 75, sigY + 9, { align: 'center' });

    return doc;
};

export const generateDSCompletionCertificatePDF = async (
    student: DSStudent,
    institution: any,
    letterheadConfig?: any
) => {
    // Landscape A4 size: 297mm x 210mm
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    }) as any;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const companyDetails = await apiService.fetchCompanySettings().catch(() => null);

    const letterheadUrl = letterheadConfig?.headerImageUrl || institution?.letterheadConfig?.headerImageUrl || institution?.letterheadUrl || companyDetails?.letterheadConfig?.headerImageUrl || (companyDetails as any)?.letterheadUrl || (companyDetails as any)?.logoUrl;
    const headerImg = await loadImage(letterheadUrl);

    // 1. Draw elegant border (triple line effect with gold borders)
    doc.setDrawColor(245, 158, 11); // Gold outer border
    doc.setLineWidth(2);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

    doc.setDrawColor(30, 41, 59); // Dark blue-grey middle border
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    doc.setDrawColor(245, 158, 11); // Gold thin inner border
    doc.setLineWidth(0.5);
    doc.rect(11.5, 11.5, pageWidth - 23, pageHeight - 23);

    // Corner decorative details
    doc.setFillColor(245, 158, 11);
    doc.circle(10, 10, 3, 'F');
    doc.circle(pageWidth - 10, 10, 3, 'F');
    doc.circle(10, pageHeight - 10, 3, 'F');
    doc.circle(pageWidth - 10, pageHeight - 10, 3, 'F');

    let currentY = 22;

    // 2. Render Header/Logo
    if (headerImg) {
        const imgWidth = 70;
        const imgHeight = (headerImg.height * imgWidth) / headerImg.width;
        const xPos = (pageWidth - imgWidth) / 2;
        doc.addImage(headerImg, 'JPEG', xPos, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 10;
    } else {
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        const instName = (institution?.name || 'DRIVING SCHOOL ACADEMY').toUpperCase();
        doc.text(instName, pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;
    }

    // 3. Certificate Title
    doc.setFontSize(28);
    doc.setFont('times', 'bolditalic');
    doc.setTextColor(180, 83, 9); // Gold/Bronze hue
    doc.text('Certificate of Course Completion', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // 4. Main Body Text
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('PROUDLY AWARDED TO', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Student Name (Large and elegant)
    doc.setFontSize(24);
    doc.setFont('times', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(student.fullName, pageWidth / 2, currentY, { align: 'center' });
    
    // Thin separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 60, currentY + 3, pageWidth / 2 + 60, currentY + 3);
    currentY += 13;

    // Description text
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    
    const category = student.licenseTypeInterested || student.licenseCategory || 'CLASS B';
    const descText = `for successfully satisfying the national training curriculum and safety requirements for:\n` +
                     `MOTOR VEHICLE DRIVING COURSE (CATEGORY: ${category.toUpperCase()})`;
    doc.text(descText, pageWidth / 2, currentY, { align: 'center', lineHeightFactor: 1.4 });
    currentY += 18;

    // 5. Test Scores / Metrics Box
    const theoryScore = student.theoryTestScore !== undefined && student.theoryTestScore !== null ? `${student.theoryTestScore}%` : 'N/A';
    const practicalScore = student.practicalTestScore !== undefined && student.practicalTestScore !== null ? `${student.practicalTestScore}%` : 'N/A';

    // Outer score container
    doc.setFillColor(254, 252, 243); // Cream background
    doc.setDrawColor(254, 243, 199); // Soft gold border
    doc.setLineWidth(0.5);
    doc.rect(pageWidth / 2 - 70, currentY, 140, 20, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text(`Internal Theory Assessment: ${theoryScore}`, pageWidth / 2 - 60, currentY + 11.5);
    doc.text(`Internal Practical Drive Score: ${practicalScore}`, pageWidth / 2 + 5, currentY + 11.5);
    currentY += 32;

    // 6. Signatures (placed at bottom)
    const sigY = pageHeight - 35;
    doc.setDrawColor(150);
    doc.setLineWidth(0.5);

    // Left Signature
    doc.line(40, sigY, 110, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Chief Instructor Signature', 75, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Training Verification Stamp', 75, sigY + 9, { align: 'center' });

    // Right Signature
    doc.line(pageWidth - 110, sigY, pageWidth - 40, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Director / School Principal', pageWidth - 75, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Date of Issue: ${new Date().toLocaleDateString()}`, pageWidth - 75, sigY + 9, { align: 'center' });

    return doc;
};


