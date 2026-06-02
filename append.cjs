const fs = require('fs');
const content = `
export const generateStudentIdCardPdf = async (student: any, institution: any, logoImgData?: string, photoImgData?: string): Promise<string> => {
    const doc = new jsPDF('l', 'mm', [85.6, 54]);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(30, 64, 175); // Dark blue header
    doc.rect(0, 0, pageWidth, 12, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(institution.name || 'INSTITUTION', pageWidth / 2, 8, { align: 'center' });

    // Photo area
    doc.setDrawColor(200, 200, 200);
    doc.rect(5, 15, 25, 30);
    if (photoImgData) {
        try {
            doc.addImage(photoImgData, 'JPEG', 5, 15, 25, 30);
        } catch(e) {}
    } else {
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text('PHOTO', 17.5, 31, { align: 'center' });
    }

    // Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text((student.name || '').toUpperCase(), 35, 22);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Admission Number:', 35, 28);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(student.staffId || student.admissionNumber || (student.id ? student.id.substring(0,8) : ''), 35, 33);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Category / Role:', 35, 39);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text((student.role || 'Student').toUpperCase(), 35, 43);

    // Footer barcode area
    doc.setFillColor(243, 244, 246);
    doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Official Digital Identification. If found, please return to the institution.', pageWidth / 2, pageHeight - 2.5, { align: 'center' });

    return doc.output('datauristring');
};
`;

fs.appendFileSync('src/services/pdfService.ts', '\n' + content);
console.log('Appended to pdfService.ts');
