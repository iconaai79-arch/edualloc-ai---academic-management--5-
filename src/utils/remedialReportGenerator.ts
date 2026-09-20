import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { apiService } from '../services/apiService';

// Helper to safely load image for letterhead
const loadImage = (url: string | null | undefined): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
        let safeUrl = (url || '').trim();
        if (!safeUrl) return resolve(null);
        if (safeUrl.startsWith('data:image/svg+xml;utf8,')) {
            safeUrl = safeUrl.replace('data:image/svg+xml;utf8,', 'data:image/svg+xml;charset=utf-8,');
        }
        const img = new Image();
        if (!safeUrl.startsWith('data:') && !safeUrl.startsWith('blob:')) {
            img.crossOrigin = "Anonymous";
        }
        img.src = safeUrl;
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.warn("[Remedial Report] Failed to load letterhead image:", safeUrl.slice(0, 100));
            resolve(null);
        };
    });
};

// Universal Header with School Letterhead or Branding
const renderReportHeader = async (
    doc: any,
    institution: any,
    reportTitle: string,
    subtitle: string,
    filtersSummary?: string
) => {
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    let companyDetails: any = null;
    try {
        companyDetails = await apiService.fetchCompanySettings();
    } catch {
        // Fallback
    }

    const letterheadUrl = institution?.letterheadConfig?.headerImageUrl ||
        institution?.letterheadUrl ||
        companyDetails?.letterheadConfig?.headerImageUrl ||
        companyDetails?.letterheadUrl ||
        companyDetails?.logoUrl;

    const headerImg = await loadImage(letterheadUrl);
    let currentY = 18;

    if (headerImg) {
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (headerImg.height * imgWidth) / headerImg.width;
        const maxHeight = 35;

        if (imgHeight > maxHeight) {
            const finalHeight = maxHeight;
            const finalWidth = (headerImg.width * finalHeight) / headerImg.height;
            const xPos = (pageWidth - finalWidth) / 2;
            doc.addImage(headerImg, 'PNG', xPos, 10, finalWidth, finalHeight);
            currentY = finalHeight + 16;
        } else {
            doc.addImage(headerImg, 'PNG', margin, 10, imgWidth, imgHeight);
            currentY = imgHeight + 16;
        }
    } else {
        // Fallback stylized institution name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text(String(institution?.name || 'Academic Institution').toUpperCase(), margin, currentY);
        currentY += 6;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const address = institution?.address || institution?.location || 'Official Academic Program';
        doc.text(address, margin, currentY);
        currentY += 8;
    }

    // Horizontal Rule
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 7;

    // Report Title & Meta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(67, 56, 202); // Indigo-700
    doc.text(reportTitle.toUpperCase(), margin, currentY);

    // Generation Date & Status Stamp on the right
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const dateStr = `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    doc.text(dateStr, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, margin, currentY);

    if (filtersSummary) {
        doc.text(`Scope: ${filtersSummary}`, pageWidth - margin, currentY, { align: 'right' });
    }
    currentY += 8;

    return currentY;
};

// Universal Sign-off & Page Numbering Footer
const renderReportFooter = (doc: any, currentY: number, needSignOff: boolean = true) => {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Sign-off block only on the last page if requested
        if (needSignOff && i === pageCount) {
            let sigY = Math.max(currentY + 15, pageHeight - 38);
            if (sigY > pageHeight - 25) {
                doc.addPage();
                sigY = 40;
            }

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);

            const colWidth = (pageWidth - (margin * 2)) / 3;

            // Signer 1: Director of Studies
            doc.setDrawColor(148, 163, 184);
            doc.line(margin, sigY, margin + colWidth - 10, sigY);
            doc.text('DIRECTOR OF STUDIES (DOS)', margin, sigY + 5);
            doc.setFont('helvetica', 'normal');
            doc.text('Signature & Date Stamp', margin, sigY + 9);

            // Signer 2: Bursar / Accounts
            doc.setFont('helvetica', 'bold');
            doc.line(margin + colWidth, sigY, margin + (colWidth * 2) - 10, sigY);
            doc.text('BURSAR / FINANCE OFFICER', margin + colWidth, sigY + 5);
            doc.setFont('helvetica', 'normal');
            doc.text('Payment Audit & Clearance', margin + colWidth, sigY + 9);

            // Signer 3: Principal
            doc.setFont('helvetica', 'bold');
            doc.line(margin + (colWidth * 2), sigY, margin + (colWidth * 3), sigY);
            doc.text('PRINCIPAL / HEADTEACHER', margin + (colWidth * 2), sigY + 5);
            doc.setFont('helvetica', 'normal');
            doc.text('Executive Sign-off & Seal', margin + (colWidth * 2), sigY + 9);
        }

        // Bottom page line & watermark
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
            'EduAI Remedial Intervention & Academic Integrity Management System',
            margin,
            pageHeight - 6
        );
        doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth - margin,
            pageHeight - 6,
            { align: 'right' }
        );
    }
};

/**
 * 1. TEACHER PAYOUT & CLAIMS LEDGER PDF
 */
export const generateTeacherPayoutLedgerPdf = async ({
    institution,
    payoutsData,
    dateRange,
    rateSetting,
    filtersSummary
}: {
    institution: any;
    payoutsData: Array<{
        teacherName: string;
        teacherEmail?: string;
        weekdayHours: number;
        weekendHours: number;
        totalHours: number;
        hourlyRate: number;
        weekendRate: number;
        totalAmount: number;
        status: string;
        sessionCount: number;
    }>;
    dateRange?: { startDate: string; endDate: string };
    rateSetting?: any;
    filtersSummary?: string;
}) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    let currentY = await renderReportHeader(
        doc,
        institution,
        'Teacher Remedial Claims & Payout Ledger',
        'Official teacher extra tuition compensation, tariff audit and disbursement schedule',
        filtersSummary
    );

    // Summary Metric Cards
    const totalTeachers = payoutsData.length;
    const totalWeekdayHrs = payoutsData.reduce((acc, p) => acc + (p.weekdayHours || 0), 0);
    const totalWeekendHrs = payoutsData.reduce((acc, p) => acc + (p.weekendHours || 0), 0);
    const totalHours = payoutsData.reduce((acc, p) => acc + (p.totalHours || 0), 0);
    const totalPayable = payoutsData.reduce((acc, p) => acc + (p.totalAmount || 0), 0);

    // Render Stat Boxes
    const cardWidth = (pageWidth - (margin * 2) - 9) / 4;
    const cardHeight = 16;

    const stats = [
        { label: 'DELIVERY INSTRUCTORS', value: totalTeachers.toString(), color: [248, 250, 252], textCol: [30, 41, 59] },
        { label: 'WEEKDAY HOURS', value: `${totalWeekdayHrs.toFixed(1)} hrs`, color: [240, 253, 250], textCol: [15, 118, 110] },
        { label: 'WEEKEND HOURS', value: `${totalWeekendHrs.toFixed(1)} hrs`, color: [254, 243, 199], textCol: [180, 83, 9] },
        { label: 'TOTAL LIABILITY', value: `KES ${Math.round(totalPayable).toLocaleString()}`, color: [238, 242, 255], textCol: [67, 56, 202] },
    ];

    stats.forEach((s, idx) => {
        const x = margin + (idx * (cardWidth + 3));
        doc.setFillColor(s.color[0], s.color[1], s.color[2]);
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(s.label, x + 4, currentY + 5);
        doc.setFontSize(10.5);
        doc.setTextColor(s.textCol[0], s.textCol[1], s.textCol[2]);
        doc.text(s.value, x + 4, currentY + 12);
    });

    currentY += cardHeight + 8;

    // Table Data
    const tableRows = payoutsData.map((item, idx) => [
        (idx + 1).toString(),
        item.teacherName || 'Unknown Teacher',
        `${item.weekdayHours || 0} hrs`,
        `${item.weekendHours || 0} hrs`,
        `${item.totalHours || 0} hrs`,
        `KES ${item.hourlyRate?.toLocaleString() || 1000} / ${item.weekendRate?.toLocaleString() || 1500}`,
        `KES ${Math.round(item.totalAmount || 0).toLocaleString()}`,
        item.status || 'Pending Approval'
    ]);

    // Totals Row
    tableRows.push([
        '',
        'TOTALS / GRAND SUM',
        `${totalWeekdayHrs.toFixed(1)} hrs`,
        `${totalWeekendHrs.toFixed(1)} hrs`,
        `${totalHours.toFixed(1)} hrs`,
        '-',
        `KES ${Math.round(totalPayable).toLocaleString()}`,
        ''
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['#', 'Teacher / Instructor', 'Weekday', 'Weekend', 'Total Hrs', 'Tariff Rate', 'Gross Payable', 'Disbursement Status']],
        body: tableRows,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: {
            fillColor: [67, 56, 202],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59]
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 50, fontStyle: 'bold' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center', fontStyle: 'bold' },
            5: { halign: 'center', fontSize: 7.5 },
            6: { halign: 'right', fontStyle: 'bold' },
            7: { halign: 'center' }
        },
        didParseCell: (data) => {
            // Highlight Grand Total row
            if (data.row.index === tableRows.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [241, 245, 249];
                data.cell.styles.textColor = [15, 23, 42];
            }
        }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || currentY + 50;
    renderReportFooter(doc, finalY, true);

    return doc;
};

/**
 * 2. PREFECT QR VERIFICATION & SESSION AUDIT REPORT PDF
 */
export const generatePrefectAuditReportPdf = async ({
    institution,
    sessionsData,
    filtersSummary
}: {
    institution: any;
    sessionsData: Array<{
        date: string;
        subjectName: string;
        className: string;
        stream?: string;
        teacherName: string;
        prefectName: string;
        qrToken?: string;
        hours: number;
        status: string;
        verifiedAt?: string;
    }>;
    filtersSummary?: string;
}) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    let currentY = await renderReportHeader(
        doc,
        institution,
        'Prefect QR Verification & Session Audit Trail',
        'Authentication log of student leader verified extra remedial hours and delivery integrity',
        filtersSummary
    );

    // Metrics
    const totalSessions = sessionsData.length;
    const confirmedCount = sessionsData.filter(s => s.status === 'Prefect Confirmed' || s.status === 'Approved' || s.status === 'Paid').length;
    const totalHours = sessionsData.reduce((acc, s) => acc + (s.hours || 0), 0);
    const integrityScore = totalSessions > 0 ? Math.round((confirmedCount / totalSessions) * 100) : 100;

    // Stat Boxes
    const cardWidth = (pageWidth - (margin * 2) - 9) / 4;
    const cardHeight = 16;

    const stats = [
        { label: 'TOTAL SESSIONS', value: totalSessions.toString(), color: [248, 250, 252], textCol: [30, 41, 59] },
        { label: 'VERIFIED SESSIONS', value: `${confirmedCount} / ${totalSessions}`, color: [240, 253, 244], textCol: [22, 101, 52] },
        { label: 'HOURS DELIVERED', value: `${totalHours.toFixed(1)} hrs`, color: [238, 242, 255], textCol: [67, 56, 202] },
        { label: 'QR INTEGRITY SCORE', value: `${integrityScore}%`, color: [254, 242, 242], textCol: integrityScore >= 85 ? [22, 101, 52] : [185, 28, 28] }
    ];

    stats.forEach((s, idx) => {
        const x = margin + (idx * (cardWidth + 3));
        doc.setFillColor(s.color[0], s.color[1], s.color[2]);
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(s.label, x + 4, currentY + 5);
        doc.setFontSize(10.5);
        doc.setTextColor(s.textCol[0], s.textCol[1], s.textCol[2]);
        doc.text(s.value, x + 4, currentY + 12);
    });

    currentY += cardHeight + 8;

    // Table Data
    const tableRows = sessionsData.map((item, idx) => [
        (idx + 1).toString(),
        item.date || 'N/A',
        item.subjectName || 'Remedial Tuition',
        `${item.className || 'General'}${item.stream ? ` (${item.stream})` : ''}`,
        item.teacherName || 'Teacher',
        item.prefectName || 'Class Leader',
        `${item.hours || 0} hrs`,
        item.qrToken ? String(item.qrToken).slice(0, 10) : 'QR Scanned',
        item.status || 'Pending'
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['#', 'Date', 'Subject', 'Class & Stream', 'Teacher', 'Prefect Signer', 'Duration', 'Token Pass', 'Status']],
        body: tableRows,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
        },
        bodyStyles: {
            fontSize: 7.5,
            textColor: [30, 41, 59]
        },
        columnStyles: {
            0: { cellWidth: 7, halign: 'center' },
            1: { cellWidth: 20 },
            2: { cellWidth: 32, fontStyle: 'bold' },
            3: { cellWidth: 25 },
            4: { cellWidth: 28 },
            5: { cellWidth: 28 },
            6: { cellWidth: 14, halign: 'center' },
            7: { cellWidth: 18, halign: 'center', fontSize: 6.5 },
            8: { halign: 'center' }
        }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || currentY + 50;
    renderReportFooter(doc, finalY, true);

    return doc;
};

/**
 * 3. STUDENT REMEDIAL BILLING & ARREARS STATEMENT PDF
 */
export const generateStudentBillingReportPdf = async ({
    institution,
    billingData,
    filtersSummary
}: {
    institution: any;
    billingData: Array<{
        studentName: string;
        className: string;
        stream?: string;
        invoiceNumber?: string;
        termFee: number;
        paidAmount: number;
        balance: number;
        parentPhone?: string;
        status: string;
    }>;
    filtersSummary?: string;
}) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    let currentY = await renderReportHeader(
        doc,
        institution,
        'Student Remedial Billing & Fee Recovery Statement',
        'Term tuition invoicing status, collections breakdown and parent fee recovery ledger',
        filtersSummary
    );

    const totalStudents = billingData.length;
    const totalInvoiced = billingData.reduce((acc, b) => acc + (b.termFee || 0), 0);
    const totalCollected = billingData.reduce((acc, b) => acc + (b.paidAmount || 0), 0);
    const totalArrears = billingData.reduce((acc, b) => acc + (b.balance || 0), 0);

    // Stat Boxes
    const cardWidth = (pageWidth - (margin * 2) - 9) / 4;
    const cardHeight = 16;

    const stats = [
        { label: 'STUDENTS INVOICED', value: totalStudents.toString(), color: [248, 250, 252], textCol: [30, 41, 59] },
        { label: 'TOTAL INVOICED', value: `KES ${Math.round(totalInvoiced).toLocaleString()}`, color: [238, 242, 255], textCol: [67, 56, 202] },
        { label: 'TOTAL COLLECTED', value: `KES ${Math.round(totalCollected).toLocaleString()}`, color: [240, 253, 244], textCol: [22, 101, 52] },
        { label: 'OUTSTANDING ARREARS', value: `KES ${Math.round(totalArrears).toLocaleString()}`, color: [254, 242, 242], textCol: [185, 28, 28] }
    ];

    stats.forEach((s, idx) => {
        const x = margin + (idx * (cardWidth + 3));
        doc.setFillColor(s.color[0], s.color[1], s.color[2]);
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(s.label, x + 4, currentY + 5);
        doc.setFontSize(10.5);
        doc.setTextColor(s.textCol[0], s.textCol[1], s.textCol[2]);
        doc.text(s.value, x + 4, currentY + 12);
    });

    currentY += cardHeight + 8;

    const tableRows = billingData.map((item, idx) => [
        (idx + 1).toString(),
        item.studentName || 'Student',
        `${item.className || 'General'}${item.stream ? ` (${item.stream})` : ''}`,
        item.invoiceNumber || '-',
        `KES ${Math.round(item.termFee || 0).toLocaleString()}`,
        `KES ${Math.round(item.paidAmount || 0).toLocaleString()}`,
        `KES ${Math.round(item.balance || 0).toLocaleString()}`,
        item.parentPhone || '-',
        item.status || (item.balance <= 0 ? 'Paid' : 'Unpaid')
    ]);

    // Totals Row
    tableRows.push([
        '',
        'GRAND SUM',
        '',
        '',
        `KES ${Math.round(totalInvoiced).toLocaleString()}`,
        `KES ${Math.round(totalCollected).toLocaleString()}`,
        `KES ${Math.round(totalArrears).toLocaleString()}`,
        '',
        ''
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['#', 'Student Name', 'Class & Stream', 'Invoice #', 'Billed Fee', 'Paid', 'Arrears Balance', 'Parent Contact', 'Status']],
        body: tableRows,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: {
            fillColor: [15, 118, 110], // Teal-700
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
        },
        bodyStyles: {
            fontSize: 7.5,
            textColor: [30, 41, 59]
        },
        columnStyles: {
            0: { cellWidth: 7, halign: 'center' },
            1: { cellWidth: 42, fontStyle: 'bold' },
            2: { cellWidth: 26 },
            3: { cellWidth: 20, fontSize: 7 },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right', fontStyle: 'bold' },
            7: { cellWidth: 24, halign: 'center' },
            8: { halign: 'center' }
        },
        didParseCell: (data) => {
            if (data.row.index === tableRows.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [241, 245, 249];
            }
        }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || currentY + 50;
    renderReportFooter(doc, finalY, true);

    return doc;
};

/**
 * 4. EXCEL EXPORT UTILITY (Teacher Payroll, Prefect Audit, Fee Billing)
 */
export const exportRemedialToExcel = ({
    fileName,
    sheetName = 'Remedial Report',
    data
}: {
    fileName: string;
    sheetName?: string;
    data: any[];
}) => {
    try {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);

        return { success: true };
    } catch (error) {
        console.error('[Excel Export] Failed to generate Excel report:', error);
        return { success: false, error };
    }
};

/**
 * 5. REMEDIAL MASTER TIMETABLE SUITE (Matching Real-World Official Format)
 * Weekday (Mon-Fri) Grid + Saturday (with Duty Roster & Break) + Sunday (with Duty & Break) + Legend
 */

// Helper to extract clean uppercase subject code matching standard aSc Timetable abbreviations (e.g. "Mathematics" -> "MAT", "Chemistry" -> "CHE")
export const getSubjectCode = (subjectName?: string, subjectId?: string): string => {
    if (!subjectName) return '';
    const clean = subjectName.trim().toUpperCase();
    if (clean.includes('MATH')) return 'MAT';
    if (clean.includes('ENG')) return 'ENG';
    if (clean.includes('KISW') || clean.includes('KIS')) return 'KIS';
    if (clean.includes('CHEM') || clean.includes('CHE')) return 'CHE';
    if (clean.includes('BIO')) return 'BIO';
    if (clean.includes('PHYS') || clean.includes('PHY')) return 'PHY';
    if (clean.includes('HIST')) return 'HIST';
    if (clean.includes('GEO')) return 'GEO';
    if (clean.includes('CRE') || clean.includes('RELIG')) return 'CRE';
    if (clean.includes('IRE')) return 'IRE';
    if (clean.includes('AGRI') || clean.includes('AGR')) return 'AGR';
    if (clean.includes('BUSI') || clean.includes('BST')) return 'BST';
    if (clean.includes('COMP') || clean.includes('ICT') || clean.includes('CS')) return 'CS';
    if (clean.includes('HOME') || clean.includes('HS')) return 'HS';
    if (clean.includes('FREN') || clean.includes('FRE')) return 'FRE';
    if (clean.includes('GERM') || clean.includes('GER')) return 'GER';
    if (clean.includes('SOCI') || clean.includes('SST')) return 'SST';
    if (clean.includes('INTEG') || clean.includes('INT SCI') || clean.includes('INT')) return 'INT';
    if (clean.includes('CREAT') || clean.includes('CA') || clean.includes('ART')) return 'CA';
    if (clean.includes('PRE-TECH') || clean.includes('PTS') || clean.includes('TECH')) return 'PTS';
    if (clean.includes('SPORT') || clean.includes('P.E') || clean.includes('PE') || clean.includes('SP')) return 'PE';
    if (clean.includes('SWIM')) return 'SWIM';
    if (clean.length <= 4) return clean;
    return clean.replace(/[^A-Z]/g, '').slice(0, 4) || clean.slice(0, 4);
};

export interface AscSubjectColor {
    bg: string;
    text: string;
    border: string;
    accent: string;
    gradient: string;
}

// Map subjects to authentic aSc Timetable color palette
export const getAscSubjectColor = (subjectName?: string, subjectId?: string): AscSubjectColor => {
    const code = getSubjectCode(subjectName, subjectId).toUpperCase();
    
    // aSc Timetables standard color scheme (matching official school timetables)
    if (code === 'KIS') {
        return { bg: '#00c5ff', text: '#0f172a', border: '#00a8dc', accent: '#008bb6', gradient: 'from-[#38bdf8] to-[#00c5ff]' }; // Cyan / Light Blue
    }
    if (code === 'MAT') {
        return { bg: '#f5d0fe', text: '#3b0764', border: '#e879f9', accent: '#c026d3', gradient: 'from-[#fdf4ff] to-[#f5d0fe]' }; // Soft Lilac / Pastel Pink
    }
    if (code === 'BIO') {
        return { bg: '#16a34a', text: '#ffffff', border: '#15803d', accent: '#14532d', gradient: 'from-[#22c55e] to-[#16a34a]' }; // Bright Grass Green
    }
    if (code === 'ENG') {
        return { bg: '#881337', text: '#ffffff', border: '#701a31', accent: '#4c0519', gradient: 'from-[#9f1239] to-[#881337]' }; // Deep Maroon / Crimson Red
    }
    if (code === 'CHE') {
        return { bg: '#d946ef', text: '#ffffff', border: '#c026d3', accent: '#701a75', gradient: 'from-[#e879f9] to-[#d946ef]' }; // Vivid Magenta / Fuchsia
    }
    if (code === 'PHY') {
        return { bg: '#0284c7', text: '#ffffff', border: '#0369a1', accent: '#0c4a6e', gradient: 'from-[#38bdf8] to-[#0284c7]' }; // Sky / Cerulean Blue
    }
    if (code === 'GEO') {
        return { bg: '#84cc16', text: '#14532d', border: '#65a30d', accent: '#3f6212', gradient: 'from-[#a3e635] to-[#84cc16]' }; // Lime / Yellow-Green
    }
    if (code === 'HIST') {
        return { bg: '#1d4ed8', text: '#ffffff', border: '#1e40af', accent: '#172554', gradient: 'from-[#3b82f6] to-[#1d4ed8]' }; // Royal Blue
    }
    if (code === 'CRE' || code === 'IRE') {
        return { bg: '#ea580c', text: '#ffffff', border: '#c2410c', accent: '#7c2d12', gradient: 'from-[#f97316] to-[#ea580c]' }; // Orange
    }
    if (code === 'AGR') {
        return { bg: '#059669', text: '#ffffff', border: '#047857', accent: '#064e3b', gradient: 'from-[#10b981] to-[#059669]' }; // Emerald / Forest Green
    }
    if (code === 'BST') {
        return { bg: '#7c3aed', text: '#ffffff', border: '#6d28d9', accent: '#4c1d95', gradient: 'from-[#8b5cf6] to-[#7c3aed]' }; // Purple / Violet
    }
    if (code === 'CS') {
        return { bg: '#0d9488', text: '#ffffff', border: '#0f766e', accent: '#134e4a', gradient: 'from-[#14b8a6] to-[#0d9488]' }; // Teal
    }
    if (code === 'HS') {
        return { bg: '#e11d48', text: '#ffffff', border: '#be123c', accent: '#881337', gradient: 'from-[#f43f5e] to-[#e11d48]' }; // Rose
    }
    if (code === 'FRE' || code === 'GER') {
        return { bg: '#6366f1', text: '#ffffff', border: '#4f46e5', accent: '#312e81', gradient: 'from-[#818cf8] to-[#6366f1]' }; // Indigo
    }
    if (code === 'SST') {
        return { bg: '#d97706', text: '#ffffff', border: '#b45309', accent: '#78350f', gradient: 'from-[#f59e0b] to-[#d97706]' }; // Amber
    }
    if (code === 'CA') {
        return { bg: '#ec4899', text: '#ffffff', border: '#db2777', accent: '#831843', gradient: 'from-[#f472b6] to-[#ec4899]' }; // Pink
    }
    if (code === 'PTS') {
        return { bg: '#475569', text: '#ffffff', border: '#334155', accent: '#0f172a', gradient: 'from-[#64748b] to-[#475569]' }; // Slate
    }
    if (code === 'PE') {
        return { bg: '#eab308', text: '#713f12', border: '#ca8a04', accent: '#854d0e', gradient: 'from-[#facc15] to-[#eab308]' }; // Golden Yellow
    }
    if (code === 'SWIM') {
        return { bg: '#06b6d4', text: '#ffffff', border: '#0891b2', accent: '#164e63', gradient: 'from-[#22d3ee] to-[#06b6d4]' }; // Cyan Blue
    }

    // Dynamic deterministic fallback palette for custom school subjects
    const PALETTE: AscSubjectColor[] = [
        { bg: '#00c5ff', text: '#0f172a', border: '#00a8dc', accent: '#008bb6', gradient: 'from-[#38bdf8] to-[#00c5ff]' },
        { bg: '#f5d0fe', text: '#3b0764', border: '#e879f9', accent: '#c026d3', gradient: 'from-[#fdf4ff] to-[#f5d0fe]' },
        { bg: '#16a34a', text: '#ffffff', border: '#15803d', accent: '#14532d', gradient: 'from-[#22c55e] to-[#16a34a]' },
        { bg: '#881337', text: '#ffffff', border: '#701a31', accent: '#4c0519', gradient: 'from-[#9f1239] to-[#881337]' },
        { bg: '#d946ef', text: '#ffffff', border: '#c026d3', accent: '#701a75', gradient: 'from-[#e879f9] to-[#d946ef]' },
        { bg: '#0284c7', text: '#ffffff', border: '#0369a1', accent: '#0c4a6e', gradient: 'from-[#38bdf8] to-[#0284c7]' },
        { bg: '#84cc16', text: '#14532d', border: '#65a30d', accent: '#3f6212', gradient: 'from-[#a3e635] to-[#84cc16]' },
        { bg: '#1d4ed8', text: '#ffffff', border: '#1e40af', accent: '#172554', gradient: 'from-[#3b82f6] to-[#1d4ed8]' },
        { bg: '#ea580c', text: '#ffffff', border: '#c2410c', accent: '#7c2d12', gradient: 'from-[#f97316] to-[#ea580c]' },
        { bg: '#059669', text: '#ffffff', border: '#047857', accent: '#064e3b', gradient: 'from-[#10b981] to-[#059669]' },
        { bg: '#7c3aed', text: '#ffffff', border: '#6d28d9', accent: '#4c1d95', gradient: 'from-[#8b5cf6] to-[#7c3aed]' },
        { bg: '#0d9488', text: '#ffffff', border: '#0f766e', accent: '#134e4a', gradient: 'from-[#14b8a6] to-[#0d9488]' },
        { bg: '#e11d48', text: '#ffffff', border: '#be123c', accent: '#881337', gradient: 'from-[#f43f5e] to-[#e11d48]' },
        { bg: '#6366f1', text: '#ffffff', border: '#4f46e5', accent: '#312e81', gradient: 'from-[#818cf8] to-[#6366f1]' },
        { bg: '#eab308', text: '#713f12', border: '#ca8a04', accent: '#854d0e', gradient: 'from-[#facc15] to-[#eab308]' },
        { bg: '#0891b2', text: '#ffffff', border: '#0e7490', accent: '#164e63', gradient: 'from-[#06b6d4] to-[#0891b2]' },
    ];
    let hash = 0;
    const str = (subjectName || subjectId || 'SUBJ');
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return PALETTE[hash % PALETTE.length];
};

// Helper to derive stable staff code (e.g. teacherCode, code, staffId or formatted numeric index 01, 02...)
export const getTeacherCode = (teacherId?: string, teacherName?: string, users: any[] = []): string => {
    if (!teacherId && !teacherName) return '';
    const teacher = users.find(t => (teacherId && t.id === teacherId) || (teacherName && t.name === teacherName));
    if (teacher?.teacherCode) {
        return String(teacher.teacherCode).trim();
    }
    if (teacher?.code) {
        return String(teacher.code).trim();
    }
    if (teacher?.metadata?.teacherCode) {
        return String(teacher.metadata.teacherCode).trim();
    }
    if (teacher?.metadata?.remedialTeacherCode) {
        return String(teacher.metadata.remedialTeacherCode).trim();
    }
    if (teacher?.staffId) {
        return String(teacher.staffId).replace(/[^0-9A-Z]/gi, '');
    }
    const idx = users.findIndex(t => (teacherId && t.id === teacherId) || (teacherName && t.name === teacherName));
    if (idx !== -1) {
        const num = idx + 1;
        return num < 10 ? `0${num}` : String(num);
    }
    if (teacherName) {
        const parts = teacherName.trim().split(/\s+/);
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return teacherName.slice(0, 3).toUpperCase();
    }
    return '';
};

// Format Class + Stream into compact code (e.g. "Grade 7" + "East" -> "7 E")
export const getClassShortCode = (className?: string, stream?: string): string => {
    const rawClass = (className || '').trim();
    const rawStream = (stream || '').trim();
    const digitMatch = rawClass.match(/\d+/);
    const classPart = digitMatch ? digitMatch[0] : rawClass.slice(0, 3);
    const streamPart = (rawStream && rawStream !== 'All Streams') ? rawStream[0].toUpperCase() : '';
    return streamPart ? `${classPart} ${streamPart}` : classPart;
};

// Check whether an allocation matches a requested stream, taking into account joint classes
export const matchAllocationStream = (allocation: any, targetStream?: string): boolean => {
    if (!targetStream || targetStream === 'All Streams' || targetStream === 'All') return true;
    if (!allocation) return false;
    if (!allocation.stream || allocation.stream === 'All Streams') return true;
    if (allocation.stream.toLowerCase().trim() === targetStream.toLowerCase().trim()) return true;

    const isJoint = !!(allocation.isJoint || allocation.is_joint || (allocation.jointStreams && allocation.jointStreams.length > 0));
    if (isJoint) {
        const jointStreams = Array.isArray(allocation.jointStreams)
            ? allocation.jointStreams
            : (Array.isArray(allocation.joint_streams) ? allocation.joint_streams : []);
        if (jointStreams.some((s: string) => String(s).toLowerCase().trim() === targetStream.toLowerCase().trim())) {
            return true;
        }
        if (allocation.stream && allocation.stream.toLowerCase().includes(targetStream.toLowerCase().trim())) {
            return true;
        }
    }
    return false;
};

// Extract distinct sorted classes and streams
export const getDistinctTimetableClasses = (allocations: any[], courses: any[]) => {
    const classMap = new Map<string, { className: string; stream: string; shortCode: string; sortKey: string }>();

    // Normalize 'All Streams' / 'All' / blank to '' so they all share the same representation
    const normalizeStream = (s: any): string => {
        const raw = (typeof s === 'object' ? s?.name || '' : String(s ?? '')).trim();
        return (raw === 'All Streams' || raw === 'All') ? '' : raw;
    };

    // Course ID / Name lookup to ensure consistent canonical class names
    const courseById = new Map<string, string>();
    courses.forEach(c => {
        const cName = c.name || c.level || 'Class';
        if (c.id) courseById.set(c.id, cName);
    });

    const getCanonicalClassName = (a: any): string => {
        if (a.courseId && courseById.has(a.courseId)) {
            return courseById.get(a.courseId)!;
        }
        if (a.className) {
            const match = courses.find(c => 
                (c.name || '').toLowerCase() === a.className.toLowerCase() ||
                (c.code || '').toLowerCase() === a.className.toLowerCase() ||
                c.id === a.className
            );
            if (match) return match.name || match.level || a.className;
            return a.className;
        }
        return 'Class';
    };

    // Map canonical className -> Set of valid stream names
    const classStreamsMap = new Map<string, Set<string>>();

    // 1. Collect all streams from courses (both c.streams and c.levels)
    courses.forEach(c => {
        const cName = c.name || c.level || 'Class';
        if (!classStreamsMap.has(cName)) {
            classStreamsMap.set(cName, new Set<string>());
        }
        const sSet = classStreamsMap.get(cName)!;

        // Streams from c.streams
        if (Array.isArray(c.streams)) {
            c.streams.forEach((st: any) => {
                const sName = normalizeStream(st);
                if (sName) sSet.add(sName);
            });
        }
        // Streams from c.levels (standard in EduAI)
        if (Array.isArray(c.levels)) {
            c.levels.forEach((lvl: any) => {
                const sName = normalizeStream(lvl?.name || lvl);
                if (sName) sSet.add(sName);
            });
        }
    });

    // 2. Also collect any streams from allocations
    allocations.forEach(a => {
        const cName = getCanonicalClassName(a);
        if (!classStreamsMap.has(cName)) {
            classStreamsMap.set(cName, new Set<string>());
        }
        const sSet = classStreamsMap.get(cName)!;

        const isJoint = !!(a.isJoint || a.is_joint || (a.jointStreams && a.jointStreams.length > 0));
        if (isJoint) {
            const jointStreams = Array.isArray(a.jointStreams) ? a.jointStreams : (Array.isArray(a.joint_streams) ? a.joint_streams : []);
            jointStreams.forEach((st: any) => {
                const sName = normalizeStream(st);
                if (sName) sSet.add(sName);
            });
        } else {
            const sName = normalizeStream(a.stream);
            if (sName) sSet.add(sName);
        }
    });

    // 3. Build classMap: if a class has streams, ONLY include those available streams.
    // If a class has no streams at all, include a single streamless class row.
    classStreamsMap.forEach((streamSet, cName) => {
        if (streamSet.size > 0) {
            const sortedStreams = Array.from(streamSet).sort((a, b) => 
                a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
            );
            sortedStreams.forEach(sName => {
                const key = `${cName}_${sName}`;
                if (!classMap.has(key)) {
                    const code = getClassShortCode(cName, sName);
                    classMap.set(key, { className: cName, stream: sName, shortCode: code, sortKey: key });
                }
            });
        } else {
            const key = `${cName}_`;
            if (!classMap.has(key)) {
                const code = getClassShortCode(cName, '');
                classMap.set(key, { className: cName, stream: '', shortCode: code, sortKey: key });
            }
        }
    });

    return Array.from(classMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true }));
};

export interface MasterTimetableReportParams {
    institution: any;
    allocations: any[];
    courses: any[];
    users: any[];
    rateSetting?: any;
    termName?: string;
    weekName?: string;
    yearName?: string;
    stageName?: string;
    saturdayDutyStaff?: string;
    sundayDutyStaff?: string;
    filtersSummary?: string;
}

/**
 * Generates the Official Remedial Master Timetable PDF matching the requested layout:
 * - Top Header: [SCHOOL NAME] \n [JS WEEK 3 TERM 3 2026 REMEDIAL TT]
 * - Table 1: MONDAY – FRIDAY Grid (Rows: Classes, Cols: Days, Cells: SUBJ CODE + TEACHER CODE)
 * - Table 2: SATURDAY – DUTY [CODES] (Cols: Time Slots with BREAK Column)
 * - Table 3: SUNDAY - DUTY [CODES] (Cols: Time Slots with BREAK Column)
 * - Table 4: Staff Code & Subject Reference Legend
 * - Footer: Sign-off block with DOS, Coordinator, and Headteacher Approval
 */
export const generateRemedialMasterTimetablePdf = async ({
    institution,
    allocations,
    courses,
    users,
    rateSetting,
    termName = 'TERM 3',
    weekName = 'WEEK 3',
    yearName = '2026',
    stageName = 'JS',
    saturdayDutyStaff = '38, 32',
    sundayDutyStaff = '14, 13'
}: MasterTimetableReportParams): Promise<jsPDF> => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;

    const schoolName = String(institution?.name || 'KIPKEINO SCHOOL').toUpperCase();
    const docTitle = `${stageName ? `${stageName} ` : ''}${weekName} ${termName} ${yearName} REMEDIAL TT`.toUpperCase();

    // 1. Header: School Name & Timetable Title
    let currentY = 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(schoolName, pageWidth / 2, currentY, { align: 'center' });
    currentY += 7;

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(docTitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    const distinctClasses = getDistinctTimetableClasses(allocations, courses);

    // ------------------------------------------------------------
    // TABLE 1: WEEKDAY TIMETABLE (MONDAY - FRIDAY)
    // ------------------------------------------------------------
    const weekdayDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
    const weekdayHeaders = ['', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

    const weekdayRows = distinctClasses.map(cls => {
        const row = [cls.shortCode];
        weekdayDays.forEach(day => {
            const matches = allocations.filter(a =>
                a.dayOfWeek === day &&
                (a.className === cls.className || a.courseId === cls.className) &&
                matchAllocationStream(a, cls.stream)
            );
            const cellText = matches.map(a => {
                const sub = getSubjectCode(a.subjectName, a.subjectId);
                const teacher = getTeacherCode(a.teacherId, a.teacherName, users);
                return `${sub} ${teacher}`.trim();
            }).join('\n');
            row.push(cellText);
        });
        return row;
    });

    autoTable(doc, {
        startY: currentY,
        head: [weekdayHeaders],
        body: weekdayRows,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: 2.2,
            textColor: [15, 23, 42],
            lineColor: [51, 65, 85],
            lineWidth: 0.35,
            valign: 'middle'
        },
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 9
        },
        columnStyles: {
            0: { cellWidth: 16, fontStyle: 'bold', halign: 'center', fillColor: [248, 250, 252] },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'center' }
        },
        margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8;

    // ------------------------------------------------------------
    // TABLE 2: SATURDAY TIMETABLE
    // ------------------------------------------------------------
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`SATURDAY – DUTY ${saturdayDutyStaff}`.toUpperCase(), margin, currentY);
    currentY += 4;

    const satSlots = [
        { label: '0800-\n0900', start: '08:00', end: '09:00', isBreak: false },
        { label: '0900:1000', start: '09:00', end: '10:00', isBreak: false },
        { label: '1000-\n1030', start: '10:00', end: '10:30', isBreak: true },
        { label: '1030-\n1130', start: '10:30', end: '11:30', isBreak: false },
        { label: '1130-1230', start: '11:30', end: '12:30', isBreak: false },
        { label: '1230-1330', start: '12:30', end: '13:30', isBreak: false }
    ];

    const satHeaders = ['', ...satSlots.map(s => s.label)];
    const satRows = distinctClasses.map(cls => {
        const row = [cls.shortCode];
        satSlots.forEach(slot => {
            if (slot.isBreak) {
                row.push('BREAK');
                return;
            }
            const matches = allocations.filter(a =>
                a.dayOfWeek === 'Saturday' &&
                (a.className === cls.className || a.courseId === cls.className) &&
                matchAllocationStream(a, cls.stream) &&
                (a.startTime ? a.startTime >= slot.start && a.startTime < slot.end : true)
            );
            const cellText = matches.map(a => {
                const sub = getSubjectCode(a.subjectName, a.subjectId);
                const teacher = getTeacherCode(a.teacherId, a.teacherName, users);
                return `${sub} ${teacher}`.trim();
            }).join('\n');
            row.push(cellText);
        });
        return row;
    });

    autoTable(doc, {
        startY: currentY,
        head: [satHeaders],
        body: satRows,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: 2.2,
            textColor: [15, 23, 42],
            lineColor: [51, 65, 85],
            lineWidth: 0.35,
            valign: 'middle'
        },
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8
        },
        columnStyles: {
            0: { cellWidth: 16, fontStyle: 'bold', halign: 'center', fillColor: [248, 250, 252] },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { cellWidth: 18, halign: 'center', fontStyle: 'bold', fillColor: [254, 243, 199] },
            4: { halign: 'center' },
            5: { halign: 'center' },
            6: { halign: 'center' }
        },
        margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8;

    if (currentY > doc.internal.pageSize.getHeight() - 65) {
        doc.addPage();
        currentY = 16;
    }

    // ------------------------------------------------------------
    // TABLE 3: SUNDAY TIMETABLE
    // ------------------------------------------------------------
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`SUNDAY - DUTY ${sundayDutyStaff}`.toUpperCase(), margin, currentY);
    currentY += 4;

    const sunSlots = [
        { label: '9:30-1100', start: '09:30', end: '11:00', isBreak: false },
        { label: '11:00-11:30', start: '11:00', end: '11:30', isBreak: true },
        { label: '11:30-1:00', start: '11:30', end: '13:00', isBreak: false }
    ];

    const sunHeaders = ['', ...sunSlots.map(s => s.label)];
    const sunRows = distinctClasses.map(cls => {
        const row = [cls.shortCode];
        sunSlots.forEach(slot => {
            if (slot.isBreak) {
                row.push('BREAK');
                return;
            }
            const matches = allocations.filter(a =>
                a.dayOfWeek === 'Sunday' &&
                (a.className === cls.className || a.courseId === cls.className) &&
                matchAllocationStream(a, cls.stream) &&
                (a.startTime ? a.startTime >= slot.start && a.startTime < slot.end : true)
            );
            const cellText = matches.map(a => {
                const sub = getSubjectCode(a.subjectName, a.subjectId);
                const teacher = getTeacherCode(a.teacherId, a.teacherName, users);
                return `${sub} ${teacher}`.trim();
            }).join('\n');
            row.push(cellText);
        });
        return row;
    });

    autoTable(doc, {
        startY: currentY,
        head: [sunHeaders],
        body: sunRows,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: 2.2,
            textColor: [15, 23, 42],
            lineColor: [51, 65, 85],
            lineWidth: 0.35,
            valign: 'middle'
        },
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8.5
        },
        columnStyles: {
            0: { cellWidth: 16, fontStyle: 'bold', halign: 'center', fillColor: [248, 250, 252] },
            1: { cellWidth: 54, halign: 'center' },
            2: { cellWidth: 30, halign: 'center', fontStyle: 'bold', fillColor: [254, 243, 199] },
            3: { cellWidth: 54, halign: 'center' }
        },
        margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8;

    // ------------------------------------------------------------
    // TABLE 4: PROFESSIONAL REFERENCE LEGEND (Staff & Subject Key)
    // ------------------------------------------------------------
    if (currentY > doc.internal.pageSize.getHeight() - 55) {
        doc.addPage();
        currentY = 16;
    }

    const subjectLegendMap = new Map<string, string>();
    const teacherLegendMap = new Map<string, string>();

    allocations.forEach(a => {
        const sCode = getSubjectCode(a.subjectName, a.subjectId);
        if (sCode && a.subjectName) subjectLegendMap.set(sCode, a.subjectName);
        const tCode = getTeacherCode(a.teacherId, a.teacherName, users);
        if (tCode && a.teacherName) teacherLegendMap.set(tCode, a.teacherName);
    });

    const subLegendArr = Array.from(subjectLegendMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const teachLegendArr = Array.from(teacherLegendMap.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));

    const maxLegendRows = Math.max(subLegendArr.length, teachLegendArr.length);
    if (maxLegendRows > 0) {
        const legendRows: string[][] = [];
        for (let i = 0; i < maxLegendRows; i++) {
            const sub = subLegendArr[i];
            const teach = teachLegendArr[i];
            legendRows.push([
                sub ? sub[0] : '',
                sub ? sub[1] : '',
                teach ? teach[0] : '',
                teach ? teach[1] : ''
            ]);
        }

        autoTable(doc, {
            startY: currentY,
            head: [['SUBJECT CODE', 'SUBJECT NAME', 'STAFF CODE', 'TEACHER NAME']],
            body: legendRows,
            theme: 'plain',
            styles: {
                font: 'helvetica',
                fontSize: 7,
                cellPadding: 1.5,
                textColor: [51, 65, 85],
                lineColor: [226, 232, 240],
                lineWidth: 0.2
            },
            headStyles: {
                fillColor: [248, 250, 252],
                textColor: [15, 23, 42],
                fontStyle: 'bold',
                fontSize: 7.5
            },
            columnStyles: {
                0: { cellWidth: 22, fontStyle: 'bold', halign: 'center' },
                1: { cellWidth: 65 },
                2: { cellWidth: 22, fontStyle: 'bold', halign: 'center' },
                3: { cellWidth: 65 }
            },
            margin: { left: margin, right: margin }
        });

        currentY = (doc as any).lastAutoTable?.finalY + 8;
    }

    // ------------------------------------------------------------
    // OFFICIAL SIGN-OFF BLOCK
    // ------------------------------------------------------------
    renderReportFooter(doc, currentY, true);

    return doc;
};

/**
 * Exports the Remedial Master Timetable to Excel (.xlsx) with dedicated sheets for
 * Weekdays, Saturday (with duty roster), Sunday (with duty roster), and Staff/Subject Legend.
 */
export const exportRemedialMasterTimetableToExcel = ({
    fileName = 'Remedial_Master_Timetable',
    allocations,
    courses,
    users,
    termName = 'TERM 3',
    weekName = 'WEEK 3',
    yearName = '2026',
    saturdayDutyStaff = '38, 32',
    sundayDutyStaff = '14, 13'
}: {
    fileName?: string;
    allocations: any[];
    courses: any[];
    users: any[];
    termName?: string;
    weekName?: string;
    yearName?: string;
    saturdayDutyStaff?: string;
    sundayDutyStaff?: string;
}) => {
    try {
        const distinctClasses = getDistinctTimetableClasses(allocations, courses);
        const workbook = XLSX.utils.book_new();

        // Sheet 1: Weekday
        const weekdayDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
        const weekdayData = distinctClasses.map(cls => {
            const rowObj: any = { 'Class / Stream': cls.shortCode, 'Full Class': cls.className + (cls.stream ? ` (${cls.stream})` : '') };
            weekdayDays.forEach(day => {
                const matches = allocations.filter(a =>
                    a.dayOfWeek === day &&
                    (a.className === cls.className || a.courseId === cls.className) &&
                    matchAllocationStream(a, cls.stream)
                );
                rowObj[day.toUpperCase()] = matches.map(a => `${getSubjectCode(a.subjectName, a.subjectId)} ${getTeacherCode(a.teacherId, a.teacherName, users)}`).join(', ') || '-';
            });
            return rowObj;
        });
        const wsWeekday = XLSX.utils.json_to_sheet(weekdayData);
        XLSX.utils.book_append_sheet(workbook, wsWeekday, 'Monday-Friday');

        // Sheet 2: Saturday
        const satSlots = [
            { label: '08:00 - 09:00', start: '08:00', end: '09:00' },
            { label: '09:00 - 10:00', start: '09:00', end: '10:00' },
            { label: '10:00 - 10:30 (BREAK)', isBreak: true },
            { label: '10:30 - 11:30', start: '10:30', end: '11:30' },
            { label: '11:30 - 12:30', start: '11:30', end: '12:30' },
            { label: '12:30 - 13:30', start: '12:30', end: '13:30' }
        ];
        const satData = distinctClasses.map(cls => {
            const rowObj: any = { 'Class / Stream': cls.shortCode, 'Full Class': cls.className + (cls.stream ? ` (${cls.stream})` : '') };
            satSlots.forEach(slot => {
                if (slot.isBreak) {
                    rowObj[slot.label] = 'BREAK';
                    return;
                }
                const matches = allocations.filter(a =>
                    a.dayOfWeek === 'Saturday' &&
                    (a.className === cls.className || a.courseId === cls.className) &&
                    matchAllocationStream(a, cls.stream) &&
                    (a.startTime && slot.start && slot.end ? a.startTime >= slot.start && a.startTime < slot.end : true)
                );
                rowObj[slot.label] = matches.map(a => `${getSubjectCode(a.subjectName, a.subjectId)} ${getTeacherCode(a.teacherId, a.teacherName, users)}`).join(', ') || '-';
            });
            return rowObj;
        });
        const wsSat = XLSX.utils.json_to_sheet(satData);
        XLSX.utils.book_append_sheet(workbook, wsSat, 'Saturday');

        // Sheet 3: Sunday
        const sunSlots = [
            { label: '09:30 - 11:00', start: '09:30', end: '11:00' },
            { label: '11:00 - 11:30 (BREAK)', isBreak: true },
            { label: '11:30 - 13:00', start: '11:30', end: '13:00' }
        ];
        const sunData = distinctClasses.map(cls => {
            const rowObj: any = { 'Class / Stream': cls.shortCode, 'Full Class': cls.className + (cls.stream ? ` (${cls.stream})` : '') };
            sunSlots.forEach(slot => {
                if (slot.isBreak) {
                    rowObj[slot.label] = 'BREAK';
                    return;
                }
                const matches = allocations.filter(a =>
                    a.dayOfWeek === 'Sunday' &&
                    (a.className === cls.className || a.courseId === cls.className) &&
                    matchAllocationStream(a, cls.stream) &&
                    (a.startTime && slot.start && slot.end ? a.startTime >= slot.start && a.startTime < slot.end : true)
                );
                rowObj[slot.label] = matches.map(a => `${getSubjectCode(a.subjectName, a.subjectId)} ${getTeacherCode(a.teacherId, a.teacherName, users)}`).join(', ') || '-';
            });
            return rowObj;
        });
        const wsSun = XLSX.utils.json_to_sheet(sunData);
        XLSX.utils.book_append_sheet(workbook, wsSun, 'Sunday');

        // Sheet 4: Legend
        const subjectLegendMap = new Map<string, string>();
        const teacherLegendMap = new Map<string, string>();
        allocations.forEach(a => {
            const sCode = getSubjectCode(a.subjectName, a.subjectId);
            if (sCode && a.subjectName) subjectLegendMap.set(sCode, a.subjectName);
            const tCode = getTeacherCode(a.teacherId, a.teacherName, users);
            if (tCode && a.teacherName) teacherLegendMap.set(tCode, a.teacherName);
        });
        const legendData: any[] = [];
        teacherLegendMap.forEach((name, code) => {
            legendData.push({ 'Type': 'Teacher Code', 'Code': code, 'Description / Name': name });
        });
        subjectLegendMap.forEach((name, code) => {
            legendData.push({ 'Type': 'Subject Code', 'Code': code, 'Description / Name': name });
        });
        const wsLegend = XLSX.utils.json_to_sheet(legendData);
        XLSX.utils.book_append_sheet(workbook, wsLegend, 'Staff & Subject Legend');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);

        return { success: true };
    } catch (err) {
        console.error('[Excel Master Timetable] Export failed:', err);
        return { success: false, error: err };
    }
};
