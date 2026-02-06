
import type { Invoice, Receipt, MpesaTransaction, Institution, CompanyDetails, EmailConfig, TimetableEntry, Subject, User, Room, LetterheadConfig, Course, CourseLevel, Internship, Department, LessonStructure, LecturerContract, Building, AcademicLevel, Semester, ExamTimetableEntry, TimetableSettings, StockTransaction, InventoryItem, RoomConflict } from '../types';
import { timeToMinutes, minutesToTime, generatePeriodLabels, generateDisplaySlots } from '../utils/timeUtils';
import { getInitials } from '../utils/stringUtils';


// Let TypeScript know that these are global variables from the script tags
declare var jspdf: any;

// Internal utility to load images safely for PDF insertion
const loadImage = (url: string | null): Promise<HTMLImageElement | null> => {
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

const setupPdfFooter = (doc: any, footerImg: HTMLImageElement | null) => {
    const pageCount = doc.internal.getNumberOfPages();
    if (pageCount === 0) return;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        if (footerImg) {
            const footerMargin = 15;
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

        const copyrightText = "EduAi Academic Management Portal - Secure Document";
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text(copyrightText, margin, pageHeight - 10);
        
        const pageNumText = `Page ${i} of ${pageCount}`;
        doc.text(pageNumText, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
};

const createPdfWithLetterhead = (
    doc: any,
    title: string,
    companyDetails: CompanyDetails,
    institution: Institution,
    logoImg: HTMLImageElement | null
) => {
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

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
    const doc = new jspdf.jsPDF();
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
    // FIXED: Changed issue_date to issueDate to match types.ts
    doc.text(new Date(invoice.issueDate).toLocaleDateString(), pageWidth - margin, margin + 60, { align: 'right' });
    
    const head = [['#', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT (KES)']];
    const body = (invoice.items || []).map((item, index) => [
        index + 1,
        item.description,
        item.quantity,
        item.unitPrice.toLocaleString(),
        item.amount.toLocaleString()
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
            // FIXED: Changed total_amount to totalAmount to match types.ts
            doc.text(`KES ${invoice.totalAmount.toLocaleString()}`, pageWidth - margin, finalY + 10, { align: 'right' });
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
    const doc = new jspdf.jsPDF();
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
    // FIXED: Changed payment_date to paymentDate to match types.ts
    doc.text(new Date(receipt.paymentDate).toLocaleDateString(), pageWidth - margin, margin + 60, { align: 'right' });
    
    const body = [
        // FIXED: Changed paid_for to paidFor to match types.ts
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
    // FIXED: Changed amount_paid to amountPaid to match types.ts
    doc.text(`KES ${receipt.amountPaid.toLocaleString()}`, pageWidth - margin, finalY + 15, { align: 'right' });

    return doc.output('datauristring');
};

export const downloadInvoicePdf = async (invoice: Invoice, institution: Institution, companyDetails: CompanyDetails, logoUrl: string | null) => {
    const dataUri = await generateInvoicePdfDataUri(invoice, institution, companyDetails, logoUrl);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
    link.click();
};

export const downloadReceiptPdf = async (receipt: Receipt, transaction: MpesaTransaction, institution: Institution, companyDetails: CompanyDetails, logoUrl: string | null) => {
    const dataUri = await generateReceiptPdfDataUri(receipt, transaction, institution, companyDetails, logoUrl);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `Receipt-${receipt.receiptNumber}.pdf`;
    link.click();
};

export const generateUserListPdf = async (
    users: User[],
    title: string,
    letterheadConfig: LetterheadConfig,
    logoUrl: string | null,
    footerImageUrl: string | null,
    departments: Department[],
    courses: Course[]
): Promise<string> => {
    const doc = new jspdf.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig.headerImageUrl),
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
            u.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
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
    letterheadConfig: LetterheadConfig,
    logoUrl: string | null,
    footerImageUrl: string | null,
    departments: Department[],
    academicLevels: AcademicLevel[]
): Promise<string> => {
    const doc = new jspdf.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig.headerImageUrl),
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
    letterheadConfig: LetterheadConfig,
    footerImageUrl: string | null,
    title: string,
    courses: Course[],
    activeSemester: Semester | null,
    timetableSettings: TimetableSettings,
    workloadSummary?: { name: string; subjectNames: string; subjectCount: number; totalPeriods: number }[]
): Promise<string> => {
    const doc = new jspdf.jsPDF({ orientation: 'landscape' });

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
        loadImage(letterheadConfig.headerImageUrl), 
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
    
    const daysOfWeek = timetableSettings.operatingDays;
    const periodHeaders = generatePeriodLabels(timetableSettings);

    const head = [
        ['Day', ...periodHeaders.map(period => period.label)],
        ['', ...periodHeaders.map(period => `${period.startTime}-${period.endTime}`)]
    ];
    const body: any[] = [];

    const displaySlots = generateDisplaySlots(timetableSettings);
    const cellSpanMinutes = timetableSettings.cellSpanMinutes || 60;

    for (const day of daysOfWeek) {
        const row: any[] = [day];
        const rowOccupiedSlots = new Set<number>();

        for (let i = 0; i < displaySlots.length; i++) {
            const slot = displaySlots[i];
            const slotStartMinutes = timeToMinutes(slot.start);

            if (rowOccupiedSlots.has(slotStartMinutes)) continue;

            const entry = (generatedTimetable || []).find(e => 
                e.day === day && 
                timeToMinutes(e.startTime) === slotStartMinutes
            );

            let cellContent = '';
            let cellColSpan = 1;

            if (entry) {
                const subject = getSubjectById(entry.subjectId);
                const lecturer = getLecturerById(entry.lecturerId);
                const room = getRoomById(entry.roomId);
                const levelInfo = subject ? subjectToLevelMap.get(subject.id) : null;
                
                cellContent = [
                    `${subject?.name || 'Unknown'}`,
                    levelInfo ? `${levelInfo.courseCode} (${levelInfo.levelName})` : '',
                    `${lecturer?.name || 'N/A'}`,
                    `${room?.name || 'N/A'}`,
                ].filter(Boolean).join('\n');

                const entryDurationMinutes = (entry.duration || (timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime)));
                cellColSpan = Math.max(1, Math.round(entryDurationMinutes / cellSpanMinutes));

                for(let k = 0; k < cellColSpan; k++) {
                    rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                }
            }

            row.push({
                content: cellContent,
                colSpan: cellColSpan,
                styles: { valign: 'middle', halign: 'center', fontSize: 8 },
            });

            if (cellColSpan > 1) i += cellColSpan - 1;
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

    return doc.output('datauristring');
};

/**
 * Generates an official employment contract PDF.
 */
export const generateContractPdf = async (
    contract: LecturerContract,
    lecturer: User,
    institution: Institution,
    letterheadConfig: LetterheadConfig,
    footerImageUrl: string | null,
    signatureUrl: string | null
): Promise<string> => {
    const doc = new jspdf.jsPDF();
    const [headerImg, footerImg, sigImg] = await Promise.all([
        loadImage(letterheadConfig.headerImageUrl),
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
        doc.text(`Authenticated on: ${new Date(contract.acceptanceTimestamp || '').toLocaleString()}`, margin, yPos);
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
    letterheadConfig: LetterheadConfig,
    footerImageUrl: string | null,
    logoUrl: string | null
): Promise<string> => {
    const doc = new jspdf.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig.headerImageUrl), loadImage(footerImageUrl)]);
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
    letterheadConfig: LetterheadConfig,
    footerImageUrl: string | null,
    logoUrl: string | null
): Promise<string> => {
    const doc = new jspdf.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig.headerImageUrl), loadImage(footerImageUrl)]);
    let yPos = setupPdfHeader(doc, headerImg);
    doc.text(title, 14, yPos);
    yPos += 15;
    (summaryStats || []).forEach(s => { doc.text(`${s.label}: ${s.value}`, 14, yPos); yPos += 7; });
    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateRoomUtilizationPdf = async (
    data: any[],
    title: string,
    letterheadConfig: LetterheadConfig,
    footerImageUrl: string | null,
    logoUrl: string | null
): Promise<string> => {
    const doc = new jspdf.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig.headerImageUrl), loadImage(footerImageUrl)]);
    let yPos = setupPdfHeader(doc, headerImg);
    doc.text(title, 14, yPos);
    yPos += 10;
    const head = [['Room', 'Capacity', 'Utilization %']];
    const body = (data || []).map(d => [d.room.name, d.room.capacity, `${d.utilizationPercentage.toFixed(1)}%`]);
    doc.autoTable({ startY: yPos, head, body, theme: 'grid' });
    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateAdvisoryReportPdf = async (
    conflicts: RoomConflict[],
    totalRooms: number,
    letterheadConfig: LetterheadConfig,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const doc = new jspdf.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig.headerImageUrl), loadImage(footerImageUrl)]);
    let yPos = setupPdfHeader(doc, headerImg);
    doc.text("Advisory Report", 14, yPos);
    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateStudentTimetablePdf = async (
    student: User,
    entries: TimetableEntry[],
    getSubjectById: (id: string) => Subject | undefined,
    getLecturerById: (id: string) => User | undefined,
    getRoomById: (id: string) => Room | undefined,
    letterheadConfig: LetterheadConfig,
    footerImageUrl: string | null,
    course: Course,
    level: CourseLevel,
    timetableSettings: TimetableSettings
): Promise<string> => {
    const doc = new jspdf.jsPDF({ orientation: 'landscape' });
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig.headerImageUrl), loadImage(footerImageUrl)]);
    let yPos = setupPdfHeader(doc, headerImg);
    doc.text(`Student: ${student.name}`, 14, yPos);
    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateInternshipReportPdf = async (
    student: User,
    internship: Internship,
    courseName: string,
    report: string,
    letterheadConfig: LetterheadConfig,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const doc = new jspdf.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig.headerImageUrl), loadImage(footerImageUrl)]);
    let yPos = setupPdfHeader(doc, headerImg);
    doc.text(`Attachment Report: ${student.name}`, 14, yPos);
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
    letterheadConfig: LetterheadConfig,
    footerImageUrl: string | null,
    logoUrl: string | null,
    academicYearName: string,
    activeSemesterName: string,
    timetableSettings: TimetableSettings,
    getSubjectById: (id: string) => Subject | undefined,
    getLecturerById: (id: string) => User | undefined,
    getRoomById: (id: string) => Room | undefined
): Promise<Blob> => {
    const doc = new jspdf.jsPDF({ orientation: 'landscape' });
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    const margin = 14;
    let yPos = setupPdfHeader(doc, headerImg);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${academicYearName} • ${activeSemesterName}`, margin, yPos);
    yPos += 15;

    const days = timetableSettings.operatingDays;
    const periodHeaders = generatePeriodLabels(timetableSettings);
    const displaySlots = generateDisplaySlots(timetableSettings);
    const cellSpanMinutes = timetableSettings.cellSpanMinutes || 60;

    (courses || []).forEach((course) => {
        (course.levels || []).forEach((level) => {
            // Check if we need a new page
            if (yPos > 170) {
                doc.addPage();
                yPos = setupPdfHeader(doc, headerImg);
            }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${course.name} (${course.code}) - ${level.name}`, margin, yPos);
            yPos += 5;

            const tableHead = [['Day', ...periodHeaders.map(p => `${p.label}\n${p.startTime}-${p.endTime}`)]];
            const tableBody: any[] = [];

            days.forEach(day => {
                const row: any[] = [day];
                const rowOccupiedSlots = new Set<number>();

                for (let i = 0; i < displaySlots.length; i++) {
                    const slot = displaySlots[i];
                    const slotStartMinutes = timeToMinutes(slot.start);

                    if (rowOccupiedSlots.has(slotStartMinutes)) continue;

                    const entry = (generatedTimetable || []).find(e => 
                        e.day === day && 
                        (level.subjectIds || []).includes(e.subjectId) &&
                        timeToMinutes(e.startTime) === slotStartMinutes
                    );

                    if (entry) {
                        const subject = getSubjectById(entry.subjectId);
                        const lecturer = getLecturerById(entry.lecturerId);
                        const room = getRoomById(entry.roomId);
                        
                        const text = [
                            subject?.shortName || subject?.code || 'N/A',
                            getInitials(lecturer?.name || ''),
                            room?.name || ''
                        ].filter(Boolean).join('\n');

                        const duration = timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime);
                        const colSpan = Math.max(1, Math.round(duration / cellSpanMinutes));
                        
                        for(let k=0; k<colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k*cellSpanMinutes));

                        row.push({
                            content: text,
                            colSpan,
                            styles: { halign: 'center', valign: 'middle', fontSize: 7, fillColor: getPastelRgb(entry.subjectId) }
                        });
                        i += colSpan - 1;
                    } else {
                        row.push('');
                    }
                }
                tableBody.push(row);
            });

            doc.autoTable({
                startY: yPos,
                head: tableHead,
                body: tableBody,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 1, lineWidth: 0.1 },
                headStyles: { fillColor: [45, 55, 72], textColor: 255 },
                columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
                pageBreak: 'avoid'
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
        });
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('blob');
};

export const generateStudentContactListPdf = async (
    students: User[],
    courseName: string,
    departmentName: string,
    letterheadConfig: LetterheadConfig,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const doc = new jspdf.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig.headerImageUrl), loadImage(footerImageUrl)]);
    let yPos = setupPdfHeader(doc, headerImg);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Contacts: ${courseName}`, 14, yPos);
    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};
