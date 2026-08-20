import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExamOverviewPdfPayload {
    institution: any;
    selectedExam: { id?: string; title: string; term?: string; year?: string | number; type?: string };
    selectedYearGroup: string;
    selectedStream: string;
    totalCandidates: number;
    performanceSummary: { testedCount: number; meanScore: number; meanGrade: string; meanPoints: number };
    performanceDelta: { formatted: string; prevTitle: string; isPositive: boolean };
    top10Students: Array<{ rank: number; student: any; totalMarks: number; meanScore: number; grade: string }>;
    bottom10Students: Array<{ rank: number; student: any; totalMarks: number; meanScore: number; grade: string }>;
    streamChampions: Array<{ rank: number; stream: string; admNo: string; studentName: string; meanScore: number; grade: string }>;
    mostImproved: Array<{ rank?: number; admNo: string; name: string; stream: string; prevMarks: number; meanMarks: number; percentDiff: string }>;
    mostDropping: Array<{ rank?: number; admNo: string; name: string; stream: string; prevMarks: number; meanMarks: number; percentDiff: string }>;
    subjectRankings: Array<{ rank: number; subject: any; entry: number; meanScoreFormatted: string; grade: string }>;
    classPreviousExamsComparison: {
        examSeries: Array<{ id: string; title: string }>;
        rows: Array<{ stream: string; scores: Record<string, number> }>;
        averages: Record<string, number>;
    };
    overallGradesDistributionData: {
        total: number;
        rows: Array<{ grade: string; count: number; percent: number }>;
    };
    gradesDistributionPerClassData: {
        expectedGrades: string[];
        rows: Array<{ className: string; counts: Record<string, number>; entry: number; meanMarks: number; grade: string }>;
        totalRow?: any;
        percentRow?: any;
    };
    gradesDistributionVsPreviousExamsData: {
        expectedGrades: string[];
        examSeries: Array<{ id: string; title: string }>;
        rows: Array<{ grade: string; counts: Record<string, number> }>;
    };
    subjectPerformancePerClassData: {
        subjects: Array<{ name: string; code: string }>;
        classRows: Array<{ className: string; subjectScores: Record<string, { meanMarks: number; grade: string }> }>;
        mGradeSummary: Record<string, { meanMarks: number; grade: string }>;
    };
    gradesDistributionPerSubjectData: {
        expectedGrades: string[];
        subjectsData: Array<{ name: string; code: string; counts: Record<string, number> }>;
    };
    subjectPerformanceComparisonVsPreviousData: {
        examSeries: Array<{ id: string; title: string }>;
        rows: Array<{ name: string; code: string; scores: Record<string, number> }>;
    };
    improvementDistribution: {
        total: number;
        slices: Array<{ label: string; count: number; percent: number; color?: string }>;
    };
    dropDistribution: {
        total: number;
        slices: Array<{ label: string; count: number; percent: number; color?: string }>;
    };
}

export const generateExamOverviewPdf = async (data: ExamOverviewPdfPayload) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);
    const totalPages = 6;

    const institutionName = String(data.institution?.name || 'ACADEMIC MANAGEMENT SYSTEM').toUpperCase();
    const examTitle = String(data.selectedExam?.title || 'ACADEMIC EXAM OVERVIEW');
    const selectedYearGroup = String(data.selectedYearGroup || 'Cohort');
    const selectedStream = String(data.selectedStream || 'all');
    const cohortStr = `${selectedYearGroup} (${selectedStream === 'all' ? 'All Streams' : `${selectedStream} Stream`})`;

    const drawRunningHeader = (d: jsPDF, pageNum: number) => {
        if (pageNum === 1) return;
        d.setFont('helvetica', 'bold');
        d.setFontSize(8.5);
        d.setTextColor(30, 41, 59);
        d.text(`${institutionName} — ${examTitle.toUpperCase()}`, margin, 10);
        d.setFont('helvetica', 'normal');
        d.setFontSize(8);
        d.setTextColor(100, 116, 139);
        d.text(`Class: ${cohortStr}`, pageWidth - margin, 10, { align: 'right' });
        d.setDrawColor(203, 213, 225);
        d.setLineWidth(0.3);
        d.line(margin, 12, pageWidth - margin, 12);
    };

    const drawRunningFooter = (d: jsPDF, pageNum: number) => {
        d.setDrawColor(203, 213, 225);
        d.setLineWidth(0.3);
        d.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

        d.setFont('helvetica', 'bold');
        d.setFontSize(7.5);
        d.setTextColor(100, 116, 139);
        d.text('EDUAI ACADEMIC MANAGEMENT SYSTEM • CONFIDENTIAL', margin, pageHeight - 7);

        d.setFont('helvetica', 'normal');
        d.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, pageHeight - 7, { align: 'center' });

        d.setFont('helvetica', 'bold');
        d.setTextColor(15, 23, 42);
        d.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    };

    // =========================================================================
    // PAGE 1: EXECUTIVE PERFORMANCE SUMMARY & TOP 10 STUDENTS
    // =========================================================================
    drawRunningHeader(doc, 1);

    // Letterhead
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(institutionName, margin, 18);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('OFFICIAL ACADEMIC EXAM OVERVIEW & PERFORMANCE ANALYSIS REPORT', margin, 23);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Class: ${cohortStr}  |  Exam: ${examTitle}`, margin, 28);
    doc.text(`Term: ${data.selectedExam?.term || 'TERM 1'} ${data.selectedExam?.year || '2026'}  |  Total Candidates: ${data.totalCandidates || 0}`, margin, 32.5);

    // Confidential Badge
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(pageWidth - margin - 35, 14, 35, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('CONFIDENTIAL', pageWidth - margin - 17.5, 18.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, 26, { align: 'right' });

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(margin, 36, pageWidth - margin, 36);

    // Section 1 Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('1. PERFORMANCE SUMMARY', margin, 42);

    // 4 KPI Summary Cards
    const cardW = (contentWidth - 9) / 4;
    const cardY = 45;
    const cardH = 22;

    const perfSum = data.performanceSummary || { testedCount: 0, meanScore: 0, meanGrade: 'N/A', meanPoints: 0 };
    const perfDelta = data.performanceDelta || { formatted: '+0.0%', prevTitle: 'Previous Exam', isPositive: true };

    const cards = [
        { title: 'STUDENTS ENROLLED', val: `${perfSum.testedCount ?? 0}`, sub: 'Active Sitting', color: [15, 23, 42] },
        { title: 'MEAN SCORE', val: `${(perfSum.meanScore ?? 0).toFixed(1)}% (${perfSum.meanGrade || 'N/A'})`, sub: 'Average Score', color: [79, 70, 229] },
        { title: 'MEAN POINTS', val: `${(perfSum.meanPoints ?? 0).toFixed(2)} pts`, sub: 'Grade Points', color: [15, 23, 42] },
        { title: 'PERF. INCREASE', val: `${perfDelta.formatted || '+0.0%'}`, sub: `Vs ${perfDelta.prevTitle || 'Previous'}`, color: perfDelta.isPositive ? [16, 185, 129] : [225, 29, 72] }
    ];

    cards.forEach((c, idx) => {
        const cX = margin + idx * (cardW + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(cX, cardY, cardW, cardH, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(c.title, cX + cardW / 2, cardY + 5, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(c.color[0], c.color[1], c.color[2]);
        doc.text(c.val, cX + cardW / 2, cardY + 13, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(c.sub, cX + cardW / 2, cardY + 18.5, { align: 'center' });
    });

    // Section 2: Top 10 Overall Students Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('2. TOP 10 OVERALL STUDENTS (COHORT MERIT LIST)', margin, 74);

    const top10Rows = (data.top10Students || []).map(st => [
        st.rank ?? '-',
        st.student?.admissionNo || st.student?.id || (st as any).admNo || '-',
        String(st.student?.name || (st as any).name || (st as any).studentName || '-').toUpperCase(),
        st.student?.studentClass || selectedYearGroup,
        st.totalMarks > 0 ? st.totalMarks : '-',
        `${(st.meanScore ?? 0).toFixed(1)}%`,
        st.grade || '-'
    ]);

    autoTable(doc, {
        startY: 77,
        margin: { left: margin, right: margin },
        head: [['Rank', 'Adm No', 'Student Name', 'Class / Stream', 'Total Marks', 'Mean Score', 'Grade']],
        body: top10Rows.length > 0 ? top10Rows : [['1', '-', 'NO RECORDS', selectedYearGroup, '-', '0.0%', '-']],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7.5, halign: 'left' },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
            1: { cellWidth: 22 },
            3: { cellWidth: 28 },
            4: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
            5: { halign: 'center', cellWidth: 22, fontStyle: 'bold', textColor: [79, 70, 229] },
            6: { halign: 'center', cellWidth: 16, fontStyle: 'bold' }
        }
    });

    drawRunningFooter(doc, 1);

    // =========================================================================
    // PAGE 2: VARIANCE & STUDENT MOVEMENT ANALYTICS
    // =========================================================================
    doc.addPage();
    drawRunningHeader(doc, 2);

    let currY = 17;

    // Section 3: Bottom 10 Overall Students
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('3. BOTTOM 10 OVERALL STUDENTS (TARGET SUPPORT GROUP)', margin, currY);

    const bottom10Rows = (data.bottom10Students || []).map(st => [
        st.rank ?? '-',
        st.student?.admissionNo || st.student?.id || (st as any).admNo || '-',
        String(st.student?.name || (st as any).name || (st as any).studentName || '-').toUpperCase(),
        st.student?.studentClass || selectedYearGroup,
        st.totalMarks > 0 ? st.totalMarks : '-',
        `${(st.meanScore ?? 0).toFixed(1)}%`,
        st.grade || '-'
    ]);

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: margin, right: margin },
        head: [['Rank', 'Adm No', 'Student Name', 'Class / Stream', 'Total Marks', 'Mean Score', 'Grade']],
        body: bottom10Rows.length > 0 ? bottom10Rows : [['-', '-', 'NO RECORDS', selectedYearGroup, '-', '0.0%', '-']],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { cellWidth: 20 },
            3: { cellWidth: 24 },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
            6: { halign: 'center', cellWidth: 14, fontStyle: 'bold' }
        }
    });

    currY = (doc as any).lastAutoTable.finalY + 6;

    // Section 4: Top Student Per Class Stream
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('4. TOP STUDENT PER CLASS STREAM', margin, currY);

    const champRows = (data.streamChampions || []).map(c => [
        c.rank ?? 1,
        c.stream || selectedYearGroup,
        c.admNo || '-',
        String(c.studentName || (c as any).name || '-').toUpperCase(),
        `${c.meanScore ?? 0}%`,
        c.grade || '-'
    ]);

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: margin, right: margin },
        head: [['Rank', 'Class / Stream', 'Adm No', 'Student Name', 'Mean Score', 'Grade']],
        body: champRows.length > 0 ? champRows : [['1', selectedYearGroup, '-', 'NO RECORDS', '0.0%', '-']],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { cellWidth: 28, fontStyle: 'bold' },
            2: { cellWidth: 22 },
            4: { halign: 'center', cellWidth: 22, fontStyle: 'bold', textColor: [79, 70, 229] },
            5: { halign: 'center', cellWidth: 16, fontStyle: 'bold' }
        }
    });

    currY = (doc as any).lastAutoTable.finalY + 6;

    // Section 5: Most Improved Students
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(6, 95, 70);
    doc.text('5. MOST IMPROVED STUDENTS', margin, currY);

    const improvedRows = (data.mostImproved || []).slice(0, 6).map((st, idx) => [
        st.rank || idx + 1,
        st.admNo || '-',
        String(st.name || (st as any).studentName || '-').toUpperCase(),
        st.stream || selectedYearGroup,
        st.prevMarks ?? 0,
        st.meanMarks ?? 0,
        `+${st.percentDiff || '0'}%`
    ]);

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: margin, right: margin },
        head: [['#', 'Adm No', 'Student Name', 'Class / Stream', 'Prior Marks', 'Current Marks', 'Deviation']],
        body: improvedRows.length > 0 ? improvedRows : [['-', '-', 'NO RECORDS', selectedYearGroup, '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [6, 95, 70], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 22 },
            3: { cellWidth: 26 },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
            6: { halign: 'center', cellWidth: 20, fontStyle: 'bold', textColor: [6, 95, 70] }
        }
    });

    currY = (doc as any).lastAutoTable.finalY + 6;

    // Section 6: Most Dropping Students
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(159, 18, 57);
    doc.text('6. MOST DROPPING STUDENTS (REMEDIAL CANDIDATES)', margin, currY);

    const dropRows = (data.mostDropping || []).slice(0, 6).map((st, idx) => [
        st.rank || idx + 1,
        st.admNo || '-',
        String(st.name || (st as any).studentName || '-').toUpperCase(),
        st.stream || selectedYearGroup,
        st.prevMarks ?? 0,
        st.meanMarks ?? 0,
        `${st.percentDiff || '0'}%`
    ]);

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: margin, right: margin },
        head: [['#', 'Adm No', 'Student Name', 'Class / Stream', 'Prior Marks', 'Current Marks', 'Deviation']],
        body: dropRows.length > 0 ? dropRows : [['-', '-', 'NO RECORDS', selectedYearGroup, '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [159, 18, 57], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 22 },
            3: { cellWidth: 26 },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
            6: { halign: 'center', cellWidth: 20, fontStyle: 'bold', textColor: [159, 18, 57] }
        }
    });

    drawRunningFooter(doc, 2);

    // =========================================================================
    // PAGE 3: SUBJECT RANKINGS, STREAM COMPARISON & OVERALL GRADE DIST.
    // =========================================================================
    doc.addPage();
    drawRunningHeader(doc, 3);
    currY = 17;

    // Section 7: Subject Performance Ranking
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('7. SUBJECT PERFORMANCE RANKING', margin, currY);

    const subjRankRows = (data.subjectRankings || []).map(sr => [
        sr.rank ?? '-',
        String(sr.subject?.name || (sr.subject as any)?.title || (sr as any).name || '-').toUpperCase(),
        sr.subject?.code || (sr as any).code || '-',
        sr.entry ?? 0,
        sr.meanScoreFormatted || '0.0%',
        sr.grade || '-'
    ]);

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: margin, right: margin },
        head: [['Rank', 'Subject Name', 'Code', 'Entry', 'Mean Marks', 'Grade']],
        body: subjRankRows.length > 0 ? subjRankRows : [['1', 'NO SUBJECTS ALLOCATED', '-', '0', '0.0%', '-']],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 14 },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 24, fontStyle: 'bold', textColor: [79, 70, 229] },
            5: { halign: 'center', cellWidth: 18, fontStyle: 'bold' }
        }
    });

    currY = (doc as any).lastAutoTable.finalY + 7;

    // Section 8: Class Performance Comparison with Previous Exams
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('8. CLASS PERFORMANCE COMPARISON WITH PREVIOUS EXAMS', margin, currY);

    const s8Series = data.classPreviousExamsComparison?.examSeries || [];
    const s8Headers = ['Class / Stream', ...s8Series.map(s => s.title)];
    const s8Rows = (data.classPreviousExamsComparison?.rows || []).map(r => [
        String(r.stream || selectedYearGroup).toUpperCase(),
        ...s8Series.map(s => (r.scores?.[s.id] || 0).toFixed(4))
    ]);

    const s8AvgRow = [
        'AVERAGE',
        ...s8Series.map(s => (data.classPreviousExamsComparison?.averages?.[s.id] || 0).toFixed(4))
    ];

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: margin, right: margin },
        head: [s8Headers],
        body: s8Rows.length > 0 ? [...s8Rows, s8AvgRow] : [[selectedYearGroup, '—'], ['AVERAGE', '—']],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
        styles: { fontSize: 7, cellPadding: 1.8, textColor: [30, 41, 59], halign: 'center' },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 }
        },
        didParseCell: (hookData) => {
            if (hookData.section === 'body' && hookData.row.index === s8Rows.length) {
                hookData.cell.styles.fontStyle = 'bold';
                hookData.cell.styles.fillColor = [241, 245, 249];
                if (hookData.column.index > 0) hookData.cell.styles.textColor = [79, 70, 229];
            }
        }
    });

    currY = (doc as any).lastAutoTable.finalY + 7;

    // Section 9: Overall Grades Distribution
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`9. OVERALL GRADES DISTRIBUTION (TOTAL ENROLLED: ${data.overallGradesDistributionData?.total || 0})`, margin, currY);

    const s9Rows = (data.overallGradesDistributionData?.rows || []).map(r => [
        r.grade,
        r.count,
        `${r.percent}%`
    ]);

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: margin, right: margin },
        head: [['Grade', 'Frequency (Count)', 'Share (%)']],
        body: s9Rows,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59], halign: 'center' },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 30 },
            1: { fontStyle: 'bold', cellWidth: 45 },
            2: { fontStyle: 'bold', cellWidth: 45, textColor: [79, 70, 229] }
        }
    });

    drawRunningFooter(doc, 3);

    // =========================================================================
    // PAGE 4: COHORT GRADES DISTRIBUTION & HISTORICAL COMPARISON
    // =========================================================================
    doc.addPage();
    drawRunningHeader(doc, 4);
    currY = 17;

    // Section 10: Overall Cohort Grades Distribution
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('10. OVERALL COHORT GRADES DISTRIBUTION', margin, currY);

    const expGrades = data.gradesDistributionPerClassData?.expectedGrades || ['EE', 'ME', 'AE', 'BE'];
    const s10Headers = ['Class', ...expGrades, 'Entry', 'Mean Marks', 'Grade'];

    const s10Rows = (data.gradesDistributionPerClassData?.rows || []).map(r => [
        String(r.className || selectedYearGroup).toUpperCase(),
        ...expGrades.map(g => r.counts?.[g] ?? 0),
        r.entry ?? 0,
        (r.meanMarks ?? 0).toFixed(2),
        r.grade || '-'
    ]);

    const s10TotalRow = data.gradesDistributionPerClassData?.totalRow ? [
        'TOTAL',
        ...expGrades.map(g => data.gradesDistributionPerClassData.totalRow.counts?.[g] ?? 0),
        data.gradesDistributionPerClassData.totalRow.entry ?? 0,
        data.gradesDistributionPerClassData.totalRow.meanMarks?.toFixed(2) || '0.00',
        data.gradesDistributionPerClassData.totalRow.grade || '-'
    ] : null;

    const s10PercentRow = data.gradesDistributionPerClassData?.percentRow ? [
        'PERCENTAGE',
        ...expGrades.map(g => data.gradesDistributionPerClassData.percentRow.counts?.[g] ?? '0%'),
        '', '', ''
    ] : null;

    const fullS10Body = [...s10Rows];
    if (s10TotalRow) fullS10Body.push(s10TotalRow);
    if (s10PercentRow) fullS10Body.push(s10PercentRow);

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: margin, right: margin },
        head: [s10Headers],
        body: fullS10Body.length > 0 ? fullS10Body : [[selectedYearGroup, ...expGrades.map(() => 0), 0, '0.00', '-']],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59], halign: 'center' },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', cellWidth: 26 }
        },
        didParseCell: (hookData) => {
            if (hookData.section === 'body') {
                if (hookData.row.index >= s10Rows.length) {
                    hookData.cell.styles.fontStyle = 'bold';
                    hookData.cell.styles.fillColor = [241, 245, 249];
                }
            }
        }
    });

    currY = (doc as any).lastAutoTable.finalY + 8;

    // Section 11: Grades Distribution Comparison With Previous Exams
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('11. GRADES DISTRIBUTION COMPARISON WITH OTHER PREVIOUS EXAMS', margin, currY);

    const s11Series = data.gradesDistributionVsPreviousExamsData?.examSeries || [];
    const s11Headers = ['Grade', ...s11Series.map(s => s.title)];
    const s11Rows = (data.gradesDistributionVsPreviousExamsData?.rows || []).map(r => [
        r.grade,
        ...s11Series.map(s => r.counts?.[s.id] ?? 0)
    ]);

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: margin, right: margin },
        head: [s11Headers],
        body: s11Rows,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59], halign: 'center' },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 24 }
        }
    });

    drawRunningFooter(doc, 4);

    // =========================================================================
    // PAGE 5: MULTI-STREAM SUBJECT PERFORMANCE & SUBJECT BREAKDOWNS
    // =========================================================================
    doc.addPage();
    drawRunningHeader(doc, 5);
    currY = 17;

    // Section 12: Subject Performance Per Class
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('12. SUBJECT PERFORMANCE PER CLASS', margin, currY);

    const s12Subjects = data.subjectPerformancePerClassData?.subjects || [];
    const s12Headers = ['Class', ...s12Subjects.map(s => s.code)];

    const s12Rows = (data.subjectPerformancePerClassData?.classRows || []).map(cr => [
        String(cr.className || selectedYearGroup).toUpperCase(),
        ...s12Subjects.map(s => {
            const res = cr.subjectScores?.[s.code];
            return res ? `${(res.meanMarks ?? 0).toFixed(2)} ${res.grade || ''}` : '—';
        })
    ]);

    const s12MGradeRow = [
        'M.GRADE',
        ...s12Subjects.map(s => {
            const res = data.subjectPerformancePerClassData?.mGradeSummary?.[s.code];
            return res ? `${(res.meanMarks ?? 0).toFixed(2)} ${res.grade || ''}` : '—';
        })
    ];

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: margin, right: margin },
        head: [s12Headers],
        body: s12Rows.length > 0 ? [...s12Rows, s12MGradeRow] : [[selectedYearGroup, ...s12Subjects.map(() => '—')]],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
        styles: { fontSize: 6.5, cellPadding: 1.5, textColor: [30, 41, 59], halign: 'center' },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', cellWidth: 26 }
        },
        didParseCell: (hookData) => {
            if (hookData.section === 'body' && hookData.row.index === s12Rows.length) {
                hookData.cell.styles.fontStyle = 'bold';
                hookData.cell.styles.fillColor = [241, 245, 249];
                if (hookData.column.index > 0) hookData.cell.styles.textColor = [79, 70, 229];
            }
        }
    });

    currY = (doc as any).lastAutoTable.finalY + 6;

    // Section 13: Grades Distribution Per Subject
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('13. GRADES DISTRIBUTION PER SUBJECT', margin, currY);

    const s13ExpectedGrades = data.gradesDistributionPerSubjectData?.expectedGrades || ['EE', 'ME', 'AE', 'BE'];
    const s13Headers = ['Subject Name', 'Code', ...s13ExpectedGrades];
    const s13Rows = (data.gradesDistributionPerSubjectData?.subjectsData || []).map(sd => [
        String(sd.name || '-').toUpperCase(),
        sd.code || '-',
        ...s13ExpectedGrades.map(g => sd.counts?.[g] ?? 0)
    ]);

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: margin, right: margin },
        head: [s13Headers],
        body: s13Rows.length > 0 ? s13Rows : [['NO SUBJECTS ALLOCATED', '-', ...s13ExpectedGrades.map(() => 0)]],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
        styles: { fontSize: 6.5, cellPadding: 1.5, textColor: [30, 41, 59], halign: 'center' },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 },
            1: { fontStyle: 'bold', cellWidth: 16 }
        }
    });

    currY = (doc as any).lastAutoTable.finalY + 6;

    // Section 14: Subject Performance Comparison With Previous Exams
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('14. SUBJECT PERFORMANCE COMPARISON WITH OTHER PREVIOUS EXAMS', margin, currY);

    const s14Series = data.subjectPerformanceComparisonVsPreviousData?.examSeries || [];
    const s14Headers = ['Subject Name', 'Code', ...s14Series.map(s => s.title)];
    const s14Rows = (data.subjectPerformanceComparisonVsPreviousData?.rows || []).map(r => [
        String(r.name || '-').toUpperCase(),
        r.code || '-',
        ...s14Series.map(s => {
            const val = r.scores?.[s.id] || 0;
            return val > 0 ? val.toFixed(4) : '—';
        })
    ]);

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: margin, right: margin },
        head: [s14Headers],
        body: s14Rows.length > 0 ? s14Rows : [['NO SUBJECTS ALLOCATED', '-', ...s14Series.map(() => '—')]],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
        styles: { fontSize: 6.5, cellPadding: 1.5, textColor: [30, 41, 59], halign: 'center' },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 },
            1: { fontStyle: 'bold', cellWidth: 16 }
        }
    });

    drawRunningFooter(doc, 5);

    // =========================================================================
    // PAGE 6: MOVEMENT PER GRADE & OFFICIAL ENDORSEMENTS
    // =========================================================================
    doc.addPage();
    drawRunningHeader(doc, 6);
    currY = 17;

    // Section 15 & 16: Improvement & Drop Breakdown
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(6, 95, 70);
    doc.text(`15. IMPROVEMENT PER GRADE (TOTAL: ${data.improvementDistribution?.total || 0})`, margin, currY);

    const impRows = (data.improvementDistribution?.slices || []).map(sl => [
        sl.label || '-',
        sl.count ?? 0,
        `${sl.percent ?? 0}%`
    ]);

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: margin, right: pageWidth / 2 + 3 },
        head: [['Grade Category', 'Count', 'Share']],
        body: impRows,
        theme: 'grid',
        headStyles: { fillColor: [6, 95, 70], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59], halign: 'center' },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' }
        }
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(159, 18, 57);
    doc.text(`16. DROP PER GRADE (TOTAL: ${data.dropDistribution?.total || 0})`, pageWidth / 2 + 3, currY);

    const dropTableRows = (data.dropDistribution?.slices || []).map(sl => [
        sl.label || '-',
        sl.count ?? 0,
        `${sl.percent ?? 0}%`
    ]);

    autoTable(doc, {
        startY: currY + 2.5,
        margin: { left: pageWidth / 2 + 3, right: margin },
        head: [['Grade Category', 'Count', 'Share']],
        body: dropTableRows,
        theme: 'grid',
        headStyles: { fillColor: [159, 18, 57], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59], halign: 'center' },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' }
        }
    });

    const maxMovementY = Math.max(
        (doc as any).lastAutoTable?.finalY || 100,
        100
    );

    // Official Endorsement Section
    const endY = maxMovementY + 12;

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(margin, endY, pageWidth - margin, endY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('OFFICIAL INSTITUTIONAL ENDORSEMENTS & AUTHENTICATION', margin, endY + 6);

    const sigCardW = (contentWidth - 8) / 3;
    const sigCardH = 45;
    const sigCardY = endY + 9;

    // Card 1: Class Teacher
    const c1X = margin;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(c1X, sigCardY, sigCardW, sigCardH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('CLASS TEACHER', c1X + 4, sigCardY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Cohort Supervisor', c1X + 4, sigCardY + 11.5);
    doc.setDrawColor(203, 213, 225);
    doc.line(c1X + 4, sigCardY + 28, c1X + sigCardW - 4, sigCardY + 28);
    doc.text('Signature: ________________', c1X + 4, sigCardY + 34);
    doc.text('Date: ___/___/2026', c1X + 4, sigCardY + 39.5);

    // Card 2: Dean of Studies
    const c2X = margin + sigCardW + 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(c2X, sigCardY, sigCardW, sigCardH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('DEAN OF STUDIES / HOD', c2X + 4, sigCardY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Academic Operations', c2X + 4, sigCardY + 11.5);
    doc.setDrawColor(203, 213, 225);
    doc.line(c2X + 4, sigCardY + 28, c2X + sigCardW - 4, sigCardY + 28);
    doc.text('Signature: ________________', c2X + 4, sigCardY + 34);
    doc.text('Date: ___/___/2026', c2X + 4, sigCardY + 39.5);

    // Card 3: Principal / Headteacher
    const c3X = margin + (sigCardW * 2) + 8;
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(c3X, sigCardY, sigCardW, sigCardH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(67, 56, 202);
    doc.text('PRINCIPAL / HEADTEACHER', c3X + 4, sigCardY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(99, 102, 241);
    doc.text('Official Seal & Approval', c3X + 4, sigCardY + 11.5);

    // Stamp box
    doc.setDrawColor(165, 180, 252);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.roundedRect(c3X + 4, sigCardY + 14, sigCardW - 8, 15, 1.5, 1.5, 'D');
    doc.setLineDashPattern([], 0);
    doc.setFontSize(6.5);
    doc.setTextColor(129, 140, 248);
    doc.text('[ OFFICIAL STAMP HERE ]', c3X + sigCardW / 2, sigCardY + 22.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Signature: ________________', c3X + 4, sigCardY + 34);
    doc.text('Date: ___/___/2026', c3X + 4, sigCardY + 39.5);

    drawRunningFooter(doc, 6);

    // Save File
    const sanitizedTitle = String(data.selectedExam?.title || 'Exam_Overview')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedClass = String(data.selectedYearGroup || 'Class')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedClass}_${sanitizedTitle}_Academic_Overview_Report.pdf`;

    doc.save(fileName);
};
