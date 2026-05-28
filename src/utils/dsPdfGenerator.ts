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
            item.amount.toLocaleString(),
            (item.paidAmount || 0).toLocaleString(),
            (item.amount - (item.paidAmount || 0)).toLocaleString()
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
            ['Date', new Date(pay.paymentDate).toLocaleString()],
            ['Amount Paid', `KES ${pay.amount.toLocaleString()}`]
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
            `KES ${item.amount.toLocaleString()}`,
            `KES ${(item.paidAmount || 0).toLocaleString()}`,
            `KES ${(item.amount - (item.paidAmount || 0)).toLocaleString()}`
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
    doc.text(`KES ${totalValue.toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 20, { align: 'right' });

    if (type === 'invoice') {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('AMOUNT PAID:', pageWidth - margin - 85, renderYAfterTable + 30);
        doc.setTextColor(30, 41, 59);
        doc.text(`KES ${(data as DSInvoice).paidAmount.toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 30, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('BALANCE DUE:', pageWidth - margin - 85, renderYAfterTable + 42);
        doc.setTextColor(220, 38, 38); // Red-600
        doc.text(`KES ${(data as DSInvoice).balance.toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 42, { align: 'right' });
    } else if (type === 'receipt' && associatedInvoice) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('INVOICE TOTAL:', pageWidth - margin - 85, renderYAfterTable + 30);
        doc.setTextColor(30, 41, 59);
        doc.text(`KES ${associatedInvoice.totalAmount.toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 30, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('OUTSTANDING BALANCE:', pageWidth - margin - 85, renderYAfterTable + 42);
        doc.setTextColor(220, 38, 38); // Red-600
        doc.text(`KES ${associatedInvoice.balance.toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 42, { align: 'right' });
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

    if (associatedInvoice && Array.isArray(associatedInvoice.items) && associatedInvoice.items.length > 0) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text("--- Votes Breakdown ---", margin, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        associatedInvoice.items.forEach(it => {
            doc.text(`${it.name}`, margin, yPos);
            doc.text(`Kes ${it.amount.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
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
    doc.text(`Kes ${payment.amount.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;

    if (associatedInvoice) {
        doc.setFontSize(9);
        doc.text("OUTSTANDING BAL:", margin, yPos);
        doc.text(`Kes ${associatedInvoice.balance.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
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
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - margin, currentY, { align: 'right' });
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
