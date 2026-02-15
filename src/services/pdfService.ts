
import type { Invoice, Receipt, MpesaTransaction, Institution, CompanyDetails, EmailConfig, TimetableEntry, Subject, User, Room, LetterheadConfig, RoomConflict, Course, CourseLevel, Internship, Department, LessonStructure, LecturerContract, Building, AcademicLevel, Semester, ExamTimetableEntry, TimetableSettings, StockTransaction, InventoryItem, LeaveOutRequest, LeaveOutWithDetails } from '../types';

import { timeToMinutes, minutesToTime, generatePeriodLabels, generateDisplaySlots } from '../utils/timeUtils';
import { generatePastelColor, generatePastelColorRgb } from '../utils/colorUtils';
import { getInitials } from '../utils/stringUtils';


// Use a safer way to access the global jsPDF object which might be on window or just global
const getJsPdf = () => {
    if (typeof window !== 'undefined' && (window as any).jspdf) {
        return (window as any).jspdf;
    }
    // @ts-ignore
    if (typeof jspdf !== 'undefined') return jspdf;
    return null;
};

// Internal utility to load images safely for PDF insertion
const loadImage = (url: string | null | undefined): Promise<HTMLImageElement | null> => {
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
            const footerMargin = 10; // Reduced from 15
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
        doc.text(copyrightText, margin, pageHeight - 7); // Pushed down from 10

        const pageNumText = `Page ${i} of ${pageCount}`;
        doc.text(pageNumText, pageWidth - margin, pageHeight - 7, { align: 'right' }); // Pushed down from 10
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
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
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
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
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
    doc.text(new Date(receipt.paymentDate).toLocaleDateString(), pageWidth - margin, margin + 60, { align: 'right' });

    const body = [
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
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null,
    departments: Department[],
    courses: Course[]
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
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
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null,
    departments: Department[],
    academicLevels: AcademicLevel[]
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
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
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    title: string,
    courses: Course[],
    activeSemester: Semester | null,
    timetableSettings: TimetableSettings,
    workloadSummary?: { name: string; subjectNames: string; subjectCount: number; totalPeriods: number }[]
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({ orientation: 'landscape' });

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
        loadImage(letterheadConfig?.headerImageUrl),
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

    // Defensive checks for settings
    const daysOfWeek = timetableSettings?.operatingDays || [];
    const periodHeaders = generatePeriodLabels(timetableSettings, true);
    const displaySlots = generateDisplaySlots(timetableSettings, true);
    const cellSpanMinutes = timetableSettings?.cellSpanMinutes || 60;
    const breaks = timetableSettings?.breaks || [];

    const head = [
        ['Day', ...periodHeaders.map(period => `${period.label}\n${period.startTime} - ${period.endTime}`)]
    ];
    const body: any[] = [];

    for (const day of daysOfWeek) {
        const row: any[] = [day];
        const rowOccupiedSlots = new Set<number>();

        for (let i = 0; i < displaySlots.length; i++) {
            const slot = displaySlots[i];
            const slotStartMinutes = timeToMinutes(slot.start);

            if (rowOccupiedSlots.has(slotStartMinutes)) continue;

            // Improved Break Detection: Check if a break starts at this slot OR covers this slot
            const breakObj = breaks.find(b =>
                b.status !== 'inactive' &&
                timeToMinutes(b.startTime) <= slotStartMinutes &&
                timeToMinutes(b.endTime) > slotStartMinutes
            );
            const isBreak = !!breakObj;

            const slotEntries = (generatedTimetable || []).filter(e =>
                e.day === day &&
                timeToMinutes(e.startTime) === slotStartMinutes
            );

            let cellContent = '';
            let cellColSpan = 1;
            let cellStyle: any = { valign: 'middle', halign: 'center', fontSize: 8 };

            if (isBreak) {
                cellContent = breakObj?.name || 'BREAK';
                cellStyle.fillColor = [220, 220, 220]; // Darker grey for visibility
                cellStyle.fontStyle = 'bold';
                cellStyle.textColor = [80, 80, 80];

                // Calculate break duration to determine colspan
                const breakDuration = timeToMinutes(breakObj!.endTime) - timeToMinutes(breakObj!.startTime);
                cellColSpan = Math.max(1, Math.round(breakDuration / cellSpanMinutes));

                // Mark slots as occupied
                for (let k = 0; k < cellColSpan; k++) {
                    rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                }

            } else if (slotEntries.length > 0) {
                // If multiple entries (block), join them
                cellContent = slotEntries.map(e => {
                    const subject = getSubjectById(e.subjectId);
                    const lecturer = getLecturerById(e.lecturerId);
                    const room = getRoomById(e.roomId);
                    const levelInfo = subject ? subjectToLevelMap.get(subject.id) : null;

                    return [
                        `${subject?.name || 'Unknown'}`,
                        levelInfo ? `${levelInfo.courseCode} (${levelInfo.levelName})` : '',
                        `${lecturer?.name || 'N/A'}`,
                        `${room?.name || 'N/A'}`,
                    ].filter(Boolean).join(' | ');
                }).join('\n---\n');

                const maxDuration = Math.max(...slotEntries.map(e => (e.duration || (timeToMinutes(e.endTime) - timeToMinutes(e.startTime)))));
                cellColSpan = Math.max(1, Math.round(maxDuration / cellSpanMinutes));

                for (let k = 0; k < cellColSpan; k++) {
                    rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                }
            }

            row.push({
                content: cellContent,
                colSpan: cellColSpan,
                styles: cellStyle,
            });

            // Skip columns if colspan > 1 (autoTable handles the span, but we need to skip the iteration count to align with displaySlots logic if we were iterating strictly 1-by-1,
            // BUT here 'i' is the index of displaySlots. If displaySlots are purely time slices, we need to advance 'i'.
            // displaySlots usually contains ALL slots (breaks + periods).
            // If cellColSpan represents number of *displaySlots* covered, we skip.
            // If cellColSpan represents number of *cellSpanMinutes* units, and displaySlots are also chunked by cellSpanMinutes, we skip.
            // Assuming displaySlots are atomic units of 'cellSpanMinutes' or the exact periods/breaks.
            // If displaySlots is [Period1, Break, Period2], and Break is 1 slot, colSpan=1.
            // If period is double, colSpan=2. We need to verify if displaySlots has the next period.

            // SIMPLIFICATION: just let the loop proceed, but check `rowOccupiedSlots`.
            // We already have `if (rowOccupiedSlots.has(slotStartMinutes)) continue;` at the top.
            // So we don't need to manually increment `i` here, just ensure `rowOccupiedSlots` is populated correctly.
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

    return doc.output('bloburl'); // Return Blob URL instead of Data URI
};

/**
 * Generates an official employment contract PDF.
 */
export const generateContractPdf = async (
    contract: LecturerContract,
    lecturer: User,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    signatureUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg, sigImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
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
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig?.headerImageUrl), loadImage(footerImageUrl)]);
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
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig?.headerImageUrl), loadImage(footerImageUrl)]);
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
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig?.headerImageUrl), loadImage(footerImageUrl)]);
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
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig?.headerImageUrl), loadImage(footerImageUrl)]);
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
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    course: Course,
    level: CourseLevel,
    timetableSettings: TimetableSettings
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({ orientation: 'landscape' });
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig?.headerImageUrl), loadImage(footerImageUrl)]);
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
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig?.headerImageUrl), loadImage(footerImageUrl)]);
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
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    logoUrl: string | null,
    academicYearName: string,
    activeSemesterName: string,
    timetableSettings: TimetableSettings,
    getSubjectById: (id: string) => Subject | undefined,
    getLecturerById: (id: string) => User | undefined,
    getRoomById: (id: string) => Room | undefined,
    preview: boolean = false,
    layoutMode: 'horizontal' | 'vertical' = 'vertical'
): Promise<Blob> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({
        orientation: 'landscape',
        format: 'a4'
    });
    const margin = 14;
    let yPos = 20;

    try {
        const [headerImg, footerImg] = await Promise.all([
            loadImage(letterheadConfig?.headerImageUrl),
            loadImage(footerImageUrl)
        ]);

        yPos = setupPdfHeader(doc, headerImg);

        // Debug: Print visible config
        console.log("PDF Gen: internal config", { layoutMode, coursesLen: courses?.length });

        // Safe access to timetableSettings properties
        const days = timetableSettings?.operatingDays || [];

        // DEBUG: Check for missing data and render a debug page if necessary
        if (!courses || courses.length === 0 || !days || days.length === 0) {
            doc.addPage();
            doc.setFontSize(20);
            doc.setTextColor(255, 0, 0);
            doc.text("DEBUG: NO DATA TO DISPLAY", margin, 40);
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text(`Courses Found: ${courses?.length || 0}`, margin, 60);
            doc.text(`Days Configured: ${days?.length || 0}`, margin, 70);
            doc.text(`Timetable Entries: ${generatedTimetable?.length || 0}`, margin, 80);
            doc.text(`Layout Mode: ${layoutMode}`, margin, 90);
            setupPdfFooter(doc, footerImg);
            return doc.output('blob');
        }

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, yPos);
        yPos += 7;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(subTitle, margin, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.text(`${academicYearName} • ${activeSemesterName}`, margin, yPos);
        yPos += 15;

        const periodHeaders = generatePeriodLabels(timetableSettings, true);
        const displaySlots = generateDisplaySlots(timetableSettings, true);
        const cellSpanMinutes = timetableSettings?.cellSpanMinutes || 60;
        const breaks = timetableSettings?.breaks || [];

        let pageCount = 0;

        if (layoutMode === 'horizontal') {
            // --- HORIZONTAL / GRID LAYOUT ---
            for (const day of days) {
                if (preview && pageCount > 0) break;

                if (pageCount > 0) {
                    doc.addPage();
                    yPos = setupPdfHeader(doc, headerImg);
                }
                pageCount++;

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(`${day}`, margin, yPos); // Simplified title
                yPos += 10;

                const tableHead = [['Class', ...periodHeaders.map(p => `${p.label}\n${p.startTime} - ${p.endTime}`)]];
                const tableBody: any[] = [];

                for (const course of (courses || [])) {
                    for (const level of (course.levels || [])) {
                        const row: any[] = [`${course.code} ${level.name}`];
                        const rowOccupiedSlots = new Set<number>();

                        for (let i = 0; i < displaySlots.length; i++) {
                            const slot = displaySlots[i];
                            const slotStartMinutes = timeToMinutes(slot.start);

                            if (rowOccupiedSlots.has(slotStartMinutes)) continue;

                            const isBreak = breaks.some(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);
                            const breakObj = breaks.find(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);

                            const entries = (generatedTimetable || []).filter(e =>
                                e.day === day &&
                                (level.subjectIds || []).includes(e.subjectId) &&
                                timeToMinutes(e.startTime) === slotStartMinutes
                            );

                            if (isBreak) {
                                const breakText = (breakObj?.name || 'BREAK').split('').join('\n');
                                row.push({ content: breakText, colSpan: 1, styles: { halign: 'center', valign: 'middle', fontSize: 9, fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [150, 150, 150], cellPadding: 1 } });
                            } else if (entries.length > 0) {
                                const isBlock = entries.length > 1;
                                const text = entries.map(e => {
                                    const s = getSubjectById(e.subjectId);
                                    const l = getLecturerById(e.lecturerId);
                                    // STRICT ROOM LOOKUP LOGIC
                                    // 1. Use the explicitly assigned room (e.roomId) if available.
                                    // 2. Fallback to Dedicated Subject Room.
                                    // 3. (Optional) Fallback to Class Base Room (not implemented here but common).

                                    const subjMeta = (level.subjectMetadata || []).find(m => m.subjectId === e.subjectId);
                                    let effectiveRoomId = e.roomId;

                                    // Only override if NO room is assigned
                                    if (!effectiveRoomId && subjMeta?.dedicatedRoomId) {
                                        effectiveRoomId = subjMeta.dedicatedRoomId;
                                    }

                                    const r = getRoomById(effectiveRoomId);
                                    return [s?.shortName || s?.code || 'N/A', r?.name || ''].filter(Boolean).join(' ');
                                }).join('\n---\n');

                                const maxDuration = Math.max(...entries.map(e => timeToMinutes(e.endTime) - timeToMinutes(e.startTime)));
                                const colSpan = Math.max(1, Math.round(maxDuration / cellSpanMinutes));
                                for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));

                                const customColors = entries.map(e => generatePastelColorRgb(e.subjectId));
                                row.push({ content: text, colSpan, customColors, styles: { halign: 'center', valign: 'middle', fontSize: 7, fontStyle: 'bold', fillColor: customColors[0] } });
                                i += colSpan - 1;
                            } else {
                                row.push('');
                            }
                        }
                        tableBody.push(row);
                    }
                }

                (doc as any).autoTable({
                    startY: yPos,
                    head: tableHead,
                    body: tableBody,
                    theme: 'grid',
                    styles: { fontSize: 7, cellPadding: 2, lineWidth: 0.1, overflow: 'linebreak', valign: 'middle', halign: 'center' },
                    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                    columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 'auto', halign: 'left' } },
                    pageBreak: 'avoid',
                    tableWidth: 'auto',
                    margin: { left: margin, right: margin, bottom: 25 },
                    willDrawCell: (data: any) => {
                        const cell = data.cell;
                        const raw = cell.raw as any;
                        if (raw && raw.customColors && raw.customColors.length > 1) {
                            const colors = raw.customColors;
                            const stripeHeight = cell.height / colors.length;
                            for (let k = 0; k < colors.length; k++) {
                                const [r, g, b] = colors[k];
                                data.doc.setFillColor(r, g, b);
                                data.doc.rect(cell.x, cell.y + (k * stripeHeight), cell.width, stripeHeight, 'F');
                            }
                            cell.styles.fillColor = null; // Skip default background drawing
                        }
                    },
                    didDrawCell: (data: any) => {
                        const cell = data.cell;
                        const raw = cell.raw as any;
                        if (raw && raw.customColors && raw.customColors.length > 1) {
                            // Redraw the border to stay on top
                            data.doc.setDrawColor(200);
                            data.doc.setLineWidth(0.1);
                            data.doc.rect(cell.x, cell.y, cell.width, cell.height, 'S');
                        }
                    }
                });

                yPos = (doc as any).lastAutoTable.finalY + 15;
                if (preview) {
                    setupPdfFooter(doc, footerImg);
                    return doc.output('blob');
                }
            }
        } else {
            // --- VERTICAL LAYOUT ---

            // Proceed with Main Timetable Blocks
            for (const course of (courses || [])) {
                if (!course) continue;
                for (const level of (course.levels || [])) {
                    if (!level) continue;
                    if (preview && pageCount >= 3) break;

                    if (pageCount > 0) {
                        doc.addPage();
                        yPos = setupPdfHeader(doc, headerImg);
                    }
                    pageCount++;

                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${course.name} (${course.code}) - ${level.name}`, margin, yPos);

                    if (level.classTeacherId) {
                        try {
                            const classTeacher = getLecturerById(level.classTeacherId);
                            if (classTeacher) {
                                doc.setFontSize(10);
                                doc.setFont('helvetica', 'italic');
                                doc.setTextColor(100);
                                const teacherText = `Class Teacher: ${classTeacher.name || 'Unknown'}`;
                                const textWidth = doc.getTextWidth(teacherText);
                                const pageWidth = doc.internal.pageSize.getWidth ? doc.internal.pageSize.getWidth() : doc.internal.pageSize.width;
                                doc.text(teacherText, pageWidth - margin - textWidth, yPos);
                                doc.setTextColor(0);
                            }
                        } catch (err) { console.warn("Class teacher lookup error:", err); }
                    }
                    yPos += 10;

                    // --- PER-CLASS WORKLOAD SUMMARY ---
                    const classEntries = (generatedTimetable || []).filter(e => (level.subjectIds || []).includes(e.subjectId));
                    const classLecturerWorkload = new Map<string, { periods: number, subjects: Set<string> }>();

                    classEntries.forEach(e => {
                        const lStat = classLecturerWorkload.get(e.lecturerId) || { periods: 0, subjects: new Set() };
                        lStat.periods += 1;
                        lStat.subjects.add(e.subjectId);
                        classLecturerWorkload.set(e.lecturerId, lStat);
                    });

                    const workloadBody = Array.from(classLecturerWorkload.entries()).map(([id, stats]) => {
                        const l = getLecturerById(id);
                        const subjNames = Array.from(stats.subjects).map(sid => getSubjectById(sid)?.shortName || 'Unknown').join(', ');
                        return [l?.name || 'Unknown', subjNames, stats.periods];
                    }).sort((a, b) => String(a[0]).localeCompare(String(b[0])));

                    (doc as any).autoTable({
                        startY: yPos,
                        head: [['Staff Name', 'Subjects Taught', 'Periods']],
                        body: workloadBody,
                        theme: 'striped',
                        headStyles: { fillColor: [45, 55, 72] },
                        styles: { fontSize: 6.5, cellPadding: 1.5 },
                        margin: { left: margin, right: margin, bottom: 25 }
                    });

                    yPos = (doc as any).lastAutoTable.finalY + 10;

                    // START TIMETABLE ON A NEW PAGE
                    doc.addPage();
                    yPos = setupPdfHeader(doc, headerImg);

                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${course.name} (${course.code}) - ${level.name} (TIMETABLE)`, margin, yPos);
                    yPos += 10;
                    const tableHead = [['Day', ...periodHeaders.map(p => `${p.label}\n${p.startTime} - ${p.endTime}`)]];
                    const tableBody: any[] = [];

                    days.forEach((day, dIndex) => {
                        const row: any[] = [day];
                        const rowOccupiedSlots = new Set<number>();

                        for (let i = 0; i < displaySlots.length; i++) {
                            const slot = displaySlots[i];
                            const slotStartMinutes = timeToMinutes(slot.start);
                            if (rowOccupiedSlots.has(slotStartMinutes)) continue;

                            const isBreak = breaks.some(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);
                            const breakObj = breaks.find(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);
                            const entries = (generatedTimetable || []).filter(e =>
                                e.day === day &&
                                (level.subjectIds || []).includes(e.subjectId) &&
                                timeToMinutes(e.startTime) === slotStartMinutes
                            );

                            if (isBreak) {
                                if (dIndex === 0) {
                                    const breakText = (breakObj?.name || 'BREAK').split('').join('\n');
                                    row.push({
                                        content: breakText,
                                        colSpan: 1,
                                        rowSpan: days.length,
                                        styles: { halign: 'center', valign: 'middle', fontSize: 10, fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [100, 100, 100], cellPadding: 2 }
                                    });
                                }
                            } else if (entries.length > 0) {
                                const isBlock = entries.length > 1;
                                const firstEntry = entries[0];
                                const text = entries.map(e => {
                                    const s = getSubjectById(e.subjectId);
                                    const l = getLecturerById(e.lecturerId);
                                    const subjMeta = (level.subjectMetadata || []).find(m => m.subjectId === e.subjectId);
                                    let effectiveRoomId = e.roomId;
                                    if (!effectiveRoomId && subjMeta?.dedicatedRoomId) effectiveRoomId = subjMeta.dedicatedRoomId;
                                    const r = getRoomById(effectiveRoomId);
                                    return [s?.shortName || s?.code || 'N/A', r?.name || ''].filter(Boolean).join('\n');
                                }).join('\n---\n');

                                const maxDuration = Math.max(...entries.map(e => timeToMinutes(e.endTime) - timeToMinutes(e.startTime)));
                                const colSpan = Math.max(1, Math.round(maxDuration / cellSpanMinutes));
                                for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));

                                const customColors = entries.map(e => generatePastelColorRgb(e.subjectId));
                                row.push({ content: text, colSpan, customColors, styles: { halign: 'center', valign: 'middle', fontSize: 7, fontStyle: 'bold', fillColor: customColors[0] } });
                                i += colSpan - 1;
                            } else {
                                row.push('');
                            }
                        }
                        tableBody.push(row);
                    });

                    (doc as any).autoTable({
                        startY: yPos,
                        head: tableHead,
                        body: tableBody,
                        theme: 'grid',
                        styles: {
                            fontSize: 6.5,
                            cellPadding: 1.5,
                            lineWidth: 0.1,
                            overflow: 'linebreak',
                            valign: 'middle',
                            halign: 'center'
                        },
                        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 7 },
                        columnStyles: {
                            0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 20, halign: 'left' }
                        },
                        pageBreak: 'auto',
                        tableWidth: 'auto',
                        margin: { left: margin, right: margin, bottom: 25 },
                        willDrawCell: (data: any) => {
                            const cell = data.cell;
                            const raw = cell.raw as any;
                            if (raw && raw.customColors && raw.customColors.length > 1) {
                                const colors = raw.customColors;
                                const stripeHeight = cell.height / colors.length;
                                for (let k = 0; k < colors.length; k++) {
                                    const [r, g, b] = colors[k];
                                    data.doc.setFillColor(r, g, b);
                                    data.doc.rect(cell.x, cell.y + (k * stripeHeight), cell.width, stripeHeight, 'F');
                                }
                                cell.styles.fillColor = null;
                            }
                        },
                        didDrawCell: (data: any) => {
                            const cell = data.cell;
                            const raw = cell.raw as any;
                            if (raw && raw.customColors && raw.customColors.length > 1) {
                                data.doc.setDrawColor(200);
                                data.doc.setLineWidth(0.1);
                                data.doc.rect(cell.x, cell.y, cell.width, cell.height, 'S');
                            }
                        }
                    });

                    yPos = (doc as any).lastAutoTable.finalY + 15;
                    // In Vertical/List mode, we want to show all classes for the first course at least, 
                    // or up to a few classes globally if multiple courses exist.
                    if (preview && pageCount >= 3) {
                        setupPdfFooter(doc, footerImg);
                        return doc.output('blob');
                    }
                }
                if (preview && pageCount >= 3) break;
            }
        }

        setupPdfFooter(doc, footerImg);
        return doc.output('blob');

    } catch (error: any) {
        console.error("PDF Gen Error:", error);
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(255, 0, 0);
        doc.text("ERROR GENERATING PDF", margin, 40);
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(error?.message || String(error), margin, 60);
        return doc.output('blob');
    }
};

export const generateStudentContactListPdf = async (
    students: User[],
    courseName: string,
    departmentName: string,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([loadImage(letterheadConfig?.headerImageUrl), loadImage(footerImageUrl)]);
    let yPos = setupPdfHeader(doc, headerImg);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Contacts: ${courseName}`, 14, yPos);
    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates an official Student Leave Out / Exeat Permission Sheet.
 */
export const generateLeaveOutSheetPdf = async (
    request: LeaveOutWithDetails | LeaveOutRequest,
    institution: Institution,
    companyDetails: CompanyDetails,
    users: User[],
    courses: Course[]
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    // Enrich request if it's only LeaveOutRequest
    let req: LeaveOutWithDetails;
    if ('studentName' in request) {
        req = request as LeaveOutWithDetails;
    } else {
        const student = users.find(u => u.id === request.studentId);
        const teacher = users.find(u => u.id === request.classTeacherId);
        const course = courses.find(c => c.id === student?.courseId);
        const level = (course?.levels || []).find(l => l.id === student?.courseLevelId);
        req = {
            ...request,
            studentName: student?.name || 'Unknown',
            studentClass: `${course?.code || ''} ${level?.name || ''}`.trim(),
            parentPhone: '',
            parentEmail: '',
            classTeacherName: teacher?.name || 'Unknown'
        };
    }

    const [headerImg, footerImg] = await Promise.all([
        loadImage(institution.letterheadConfig?.headerImageUrl || companyDetails.letterheadConfig?.headerImageUrl),
        loadImage(institution.footerImageUrl || companyDetails.footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("PERMISSION SHEET", pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Request ID & Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sheet ID: ${req.id}`, margin, yPos);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 10;

    // Student Information Block
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 40, 'F');
    yPos += 8;

    doc.setFont('helvetica', 'bold');
    doc.text("STUDENT INFORMATION", margin + 5, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    const studentInfo = [
        ['Full Name:', req.studentName],
        ['Class/Course:', req.studentClass],
        ['Leave Reason:', req.reason],
    ];

    studentInfo.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, margin + 45, yPos);
        yPos += 6;
    });

    yPos += 10;

    // Duration Block
    doc.setFont('helvetica', 'bold');
    doc.text("PERMISSION PERIOD", margin, yPos);
    yPos += 8;

    const durationInfo = [
        ['Departure Date:', new Date(req.leaveDate).toLocaleDateString()],
        ['Return Date:', new Date(req.returnDate).toLocaleDateString()],
    ];

    durationInfo.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, margin + 40, yPos);
        yPos += 6;
    });

    yPos += 20;

    // Verification Stages
    doc.setFont('helvetica', 'bold');
    doc.text("AUTHORIZATION TRACKING", margin, yPos);
    yPos += 10;

    const stages = [
        ['1. Class Teacher', req.classTeacherName, 'AUTHORIZED', req.createdAt ? new Date(req.createdAt).toLocaleString() : '---'],
        ['2. Boarding Master', req.boardingMasterName || '---', req.boardingMasterName ? 'CHECKED OUT' : 'PENDING', req.houseCheckedOutAt ? new Date(req.houseCheckedOutAt).toLocaleString() : '---'],
        ['3. Security Gate', req.securityName || '---', req.securityName ? 'EXIT GRANTED' : 'PENDING', req.gateCheckedOutAt ? new Date(req.gateCheckedOutAt).toLocaleString() : '---'],
    ];

    doc.autoTable({
        startY: yPos,
        head: [['Stage', 'Authorized By', 'Status', 'Timestamp']],
        body: stages,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 9 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 30;

    // Official Stamp Area
    const boxSize = 50;
    doc.setDrawColor(200);
    // doc.rect(pageWidth - margin - boxSize, yPos, boxSize, boxSize); // Skip rect if we want it cleaner or if yPos is close to edge
    if (yPos + boxSize < doc.internal.pageSize.getHeight() - 20) {
        doc.rect(pageWidth - margin - boxSize, yPos, boxSize, boxSize);
        doc.setFontSize(8);
        doc.text("OFFICIAL STAMP", pageWidth - margin - (boxSize / 2), yPos + (boxSize / 2), { align: 'center' });
    }

    // Warning
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    const warningText = "Notice: This document is a valid permission for the student to be outside the institution for the specified period. It must be surrendered to security upon return.";
    const splitWarning = doc.splitTextToSize(warningText, pageWidth - (margin * 2) - boxSize - 10);
    doc.text(splitWarning, margin, yPos + 10);

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateLibraryUnreturnedReportPdf = async (
    data: any[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    getBookTitle: (id: string) => string
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 10;

    const head = [['Recipient', 'ID', 'Item Borrowed', 'Due Date', 'Status']];
    const body = data.map(item => {
        const isOverdue = new Date(item.dueDate) < new Date();
        return [
            item.user?.name || 'Unknown',
            item.user?.staffId || '-',
            getBookTitle(item.bookId),
            new Date(item.dueDate).toLocaleDateString(),
            isOverdue ? 'OVERDUE' : 'Active'
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: {
            4: { fontStyle: 'bold' }
        },
        didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 4 && data.cell.raw === 'OVERDUE') {
                data.cell.styles.textColor = [220, 38, 38]; // rose-600
            }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateMasterFacilityGridPdf = async (
    generatedTimetable: TimetableEntry[],
    buildings: Building[],
    rooms: Room[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    logoUrl: string | null,
    academicYearName: string,
    activeSemesterName: string,
    timetableSettings: TimetableSettings,
    selectedDay: string,
    getSubjectById: (id: string) => Subject | undefined,
    getLecturerById: (id: string) => User | undefined,
    getCourseById: (id: string) => Course | undefined,
    courses: Course[],
    preview: boolean = false
): Promise<Blob> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({ orientation: 'landscape', format: 'a4' });
    const margin = 14;
    let yPos = 20;

    try {
        const [headerImg, footerImg] = await Promise.all([
            loadImage(letterheadConfig?.headerImageUrl),
            loadImage(footerImageUrl)
        ]);

        yPos = setupPdfHeader(doc, headerImg);

        // Build Subject Dedicated Room Map for strict enforcement
        const subjectDedicatedRoomMap = new Map<string, string>();
        (courses || []).forEach(c => {
            (c.levels || []).forEach(l => {
                (l.subjectMetadata || []).forEach(m => {
                    if (m.dedicatedRoomId) {
                        subjectDedicatedRoomMap.set(m.subjectId, m.dedicatedRoomId);
                    }
                });
            });
        });

        const days = timetableSettings?.operatingDays || [];
        const periodHeaders = generatePeriodLabels(timetableSettings, true);
        const displaySlots = generateDisplaySlots(timetableSettings, true);
        const cellSpanMinutes = timetableSettings?.cellSpanMinutes || 60;
        const breaks = timetableSettings?.breaks || [];

        // Filter rooms and buildings
        const safeRooms = (rooms || []).filter(Boolean);
        const safeBuildings = (buildings || []).filter(Boolean).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        let pageCount = 0;

        // Determine which days to include. If it's a "Facility Grid" we might want all days like the Grade Map.
        // We'll loop through days to match Grade Map behavior if that's what's requested.
        for (const day of days) {
            if (preview && pageCount > 0) break;

            if (pageCount > 0) {
                doc.addPage();
                yPos = setupPdfHeader(doc, headerImg);
            }
            pageCount++;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(title, margin, yPos);
            yPos += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${day} • ${academicYearName} • ${activeSemesterName}`, margin, yPos);
            yPos += 15;

            const tableHead = [['Room / Facility', ...periodHeaders.map(p => `${p.label}\n${p.startTime} - ${p.endTime}`)]];
            const tableBody: any[] = [];

            for (const building of safeBuildings) {
                // Section header for Building
                tableBody.push([{
                    content: building.name.toUpperCase(),
                    colSpan: periodHeaders.length + 1,
                    styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [71, 85, 105], halign: 'left', cellPadding: 3 }
                }]);

                const buildingRooms = safeRooms.filter(r => r.buildingId === building.id).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                for (const room of buildingRooms) {
                    const row: any[] = [room.name];
                    const rowOccupiedSlots = new Set<number>();

                    for (let i = 0; i < displaySlots.length; i++) {
                        const slot = displaySlots[i];
                        const slotStartMinutes = timeToMinutes(slot.start);
                        if (rowOccupiedSlots.has(slotStartMinutes)) continue;

                        const isBreak = breaks.some(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);
                        const breakObj = breaks.find(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);

                        const entries = (generatedTimetable || []).filter(e => {
                            if (e.day !== day) return false;
                            if (timeToMinutes(e.startTime) !== slotStartMinutes) return false;
                            if (e.roomId === room.id) return true;
                            if (!e.roomId) {
                                const dedicatedId = subjectDedicatedRoomMap.get(e.subjectId);
                                if (dedicatedId === room.id) return room.isShared === true;
                            }
                            return false;
                        });

                        if (isBreak) {
                            const breakText = (breakObj?.name || 'BREAK').split('').join('\n');
                            row.push({
                                content: breakText, colSpan: 1,
                                styles: { halign: 'center', valign: 'middle', fontSize: 9, fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [150, 150, 150], cellPadding: 1 }
                            });
                        } else if (entries.length > 0) {
                            const isBlock = entries.length > 1;
                            const firstEntry = entries[0];
                            const text = entries.map(e => {
                                const s = getSubjectById(e.subjectId);
                                return (s?.shortName || s?.code || 'N/A');
                            }).join('\n---\n');

                            const maxDuration = Math.max(...entries.map(e => timeToMinutes(e.endTime) - timeToMinutes(e.startTime)));
                            const colSpan = Math.max(1, Math.round(maxDuration / cellSpanMinutes));
                            for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));

                            const customColors = entries.map(e => generatePastelColorRgb(e.subjectId));
                            row.push({
                                content: text, colSpan, customColors,
                                styles: { halign: 'center', valign: 'middle', fontSize: 6, fontStyle: 'bold', fillColor: customColors[0] }
                            });
                            i += colSpan - 1;
                        } else {
                            row.push('');
                        }
                    }
                    tableBody.push(row);
                }
            }

            (doc as any).autoTable({
                startY: yPos,
                head: tableHead,
                body: tableBody,
                theme: 'grid',
                styles: { fontSize: 6, cellPadding: 2, lineWidth: 0.1, overflow: 'linebreak', valign: 'middle', halign: 'center' },
                headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 7 },
                columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 'auto', halign: 'left' } },
                pageBreak: 'auto',
                tableWidth: 'auto',
                margin: { left: margin, right: margin, bottom: 25 },
                willDrawCell: (data: any) => {
                    const cell = data.cell;
                    const raw = cell.raw as any;
                    if (raw && raw.customColors && raw.customColors.length > 1) {
                        const colors = raw.customColors;
                        const stripeHeight = cell.height / colors.length;
                        for (let k = 0; k < colors.length; k++) {
                            const [r, g, b] = colors[k];
                            data.doc.setFillColor(r, g, b);
                            data.doc.rect(cell.x, cell.y + (k * stripeHeight), cell.width, stripeHeight, 'F');
                        }
                        cell.styles.fillColor = null;
                    }
                },
                didDrawCell: (data: any) => {
                    const cell = data.cell;
                    const raw = cell.raw as any;
                    if (raw && raw.customColors && raw.customColors.length > 1) {
                        data.doc.setDrawColor(200);
                        data.doc.setLineWidth(0.1);
                        data.doc.rect(cell.x, cell.y, cell.width, cell.height, 'S');
                    }
                }
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
            if (preview) {
                setupPdfFooter(doc, footerImg);
                return doc.output('blob');
            }
        }

        setupPdfFooter(doc, footerImg);
        return doc.output('blob');

    } catch (error: any) {
        console.error("Facility Grid PDF Error:", error);
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(255, 0, 0);
        doc.text("ERROR GENERATING FACILITY PDF", margin, 40);
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(error?.message || String(error), margin, 60);
        return doc.output('blob');
    }
};
