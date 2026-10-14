import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DSInvoice, DSPayment, DSStudent, DSSettings, DSLesson, DSInstructor, DSVehicle } from '../types';
import { apiService } from '../services/apiService';
import { generateStampDataUri } from './stampGenerator';

// Internal utility to load images safely for PDF insertion
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
            console.warn("PDF Generator: Failed to load asset image. Proceeding without it.", safeUrl.slice(0, 100));
            resolve(null);
        };
    });
};

export const generateDSPDF = async (
    type: 'invoice' | 'receipt' | 'quote',
    data: DSInvoice | DSPayment | any,
    student: DSStudent | any,
    settings: DSSettings | null,
    institution: any,
    invoicesList?: DSInvoice[],
    issuingUser?: string
) => {
    const doc = new jsPDF() as any;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Fetch system-wide default company settings to support global letterhead fallback
    const companyDetails = await apiService.fetchCompanySettings().catch(() => null);

    // Letterhead banner image URL (if institution configured a full header banner)
    const headerBannerUrl = institution?.letterheadConfig?.headerImageUrl || 
                            institution?.letterheadUrl || 
                            companyDetails?.letterheadConfig?.headerImageUrl ||
                            null;

    // Dedicated School Logo URL
    const logoUrl = institution?.logoUrl || 
                    institution?.logo_url || 
                    institution?.logo || 
                    (institution?.letterheadConfig as any)?.logoUrl || 
                    (settings as any)?.logoUrl || 
                    (settings as any)?.logo || 
                    companyDetails?.logoUrl || 
                    (companyDetails as any)?.logo_url ||
                    null;

    // Footer Support cascade: Institution -> System Default
    const footerUrl = institution?.letterheadConfig?.footerImageUrl || institution?.footerImageUrl || companyDetails?.letterheadConfig?.footerImageUrl || (companyDetails as any)?.footerImageUrl;
    const footerText = institution?.letterheadConfig?.footerText || companyDetails?.letterheadConfig?.footerText || '';

    const instName = institution?.name && !institution.name.toLowerCase().includes('law firm') ? institution.name : (settings?.schoolName || 'Driving School');

    // Dedicated Stamp cascade: Uploaded custom stamp image or authentic auto-generated rubber dater stamp
    const stampUrl = institution?.letterheadConfig?.stampImageUrl || 
                     institution?.stampImageUrl || 
                     institution?.stamp_image_url || 
                     (settings as any)?.stampImageUrl || 
                     companyDetails?.letterheadConfig?.stampImageUrl || 
                     null;

    const dateToStamp = (type === 'receipt' 
        ? ((data as DSPayment)?.paymentDate || (data as DSPayment)?.date || (data as DSPayment)?.createdAt) 
        : (type === 'invoice' 
            ? ((data as DSInvoice)?.dueDate || (data as DSInvoice)?.createdAt) 
            : ((data as any)?.date || (data as any)?.validUntil || (data as any)?.createdAt))) || new Date();

    const resolveStampImage = async (): Promise<HTMLImageElement | null> => {
        if (stampUrl) {
            const loaded = await loadImage(stampUrl);
            if (loaded) return loaded;
        }
        if (institution?.letterheadConfig?.showStamp !== false) {
            try {
                const stampDept = type === 'receipt' 
                    ? 'FINANCE & CASHIER' 
                    : (type === 'invoice' ? 'ACCOUNTS DEPARTMENT' : 'ADMISSIONS & BILLING');
                const stampConfig = institution?.letterheadConfig?.stampConfig || {
                    mode: 'system_generated',
                    department: stampDept,
                    institutionName: instName,
                    addressLine: institution?.address || institution?.location || 'P.O. BOX 1341 - 00100, NAIROBI',
                    contactPhone: institution?.phoneNumber || institution?.email || 'TEL: 0700000000',
                    shape: 'circle',
                    inkColor: '#0047AB',
                    daterColor: '#DC2626',
                    showStars: true,
                    showDate: true,
                    rotationAngle: -4
                };
                const stampDataUri = await generateStampDataUri(stampConfig as any, dateToStamp, institution);
                if (stampDataUri) {
                    return await loadImage(stampDataUri);
                }
            } catch (stampErr) {
                console.warn('[dsPdfGenerator] Failed generating stamp:', stampErr);
            }
        }
        return null;
    };

    const [headerImg, logoImg, footerImg, stampImg] = await Promise.all([
        loadImage(headerBannerUrl),
        loadImage(logoUrl),
        loadImage(footerUrl),
        resolveStampImage()
    ]);

    let currentY = 25;
    const instName = institution?.name && !institution.name.toLowerCase().includes('law firm') ? institution.name : (settings?.schoolName || 'Driving School');

    if (headerImg) {
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (headerImg.height * imgWidth) / headerImg.width;
        const maxHeight = 45;

        if (imgHeight > maxHeight) {
            const finalHeight = maxHeight;
            const finalWidth = (headerImg.width * finalHeight) / headerImg.height;
            const xPos = (pageWidth - finalWidth) / 2;
            doc.addImage(headerImg, 'JPEG', xPos, 12, finalWidth, finalHeight);
            currentY = finalHeight + 22;
        } else {
            doc.addImage(headerImg, 'JPEG', margin, 12, imgWidth, imgHeight);
            currentY = imgHeight + 22;
        }
    } else if (logoImg) {
        // TOP LOGO DISPLAY: Place logo at top-left with school details right beside it
        const maxLogoW = 32;
        const maxLogoH = 26;
        let lw = maxLogoW;
        let lh = maxLogoH;
        if (logoImg.width && logoImg.height) {
            const ratio = logoImg.width / logoImg.height;
            if (ratio >= 1) {
                lw = Math.min(36, logoImg.width);
                lh = lw / ratio;
                if (lh > maxLogoH) {
                    lh = maxLogoH;
                    lw = lh * ratio;
                }
            } else {
                lh = maxLogoH;
                lw = lh * ratio;
            }
        }
        doc.addImage(logoImg, 'PNG', margin, 14, lw, lh);

        const textX = margin + lw + 8;
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(instName, textX, 22);

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100);
        if (institution?.address) {
            doc.text(institution.address, textX, 28);
        }
        const contacts = [
            institution?.phone ? `Tel: ${institution.phone}` : null,
            institution?.email ? `Email: ${institution.email}` : null
        ].filter(Boolean).join(' | ');
        if (contacts) {
            doc.text(contacts, textX, 33);
        }
        currentY = Math.max(38, 14 + lh + 10);
    } else {
        // Fallback Header
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text(instName, margin, currentY);

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100);
        doc.text(institution?.address || 'Driving School & Training Academy', margin, currentY + 7);
        doc.text([institution?.phone, institution?.email].filter(Boolean).join(' | '), margin, currentY + 12);
        currentY += 24;
    }

    // Resolve Issuing User Name
    const issuingUserName = issuingUser || 
        (data as any)?.receivedBy || 
        (data as any)?.issuedBy || 
        (data as any)?.recordedBy || 
        (data as any)?.auditedBy || 
        (data as any)?.created_by || 
        (data as any)?.userName || 
        (data as any)?.metadata?.receivedBy || 
        (data as any)?.metadata?.issuedBy || 
        (data as any)?.metadata?.userName || 
        'Accounts Officer';

    // Lookup associated invoice if type is receipt
    let associatedInvoice: DSInvoice | null = null;
    if (type === 'receipt') {
        const pay = data as DSPayment;
        if (invoicesList && invoicesList.length > 0) {
            associatedInvoice = invoicesList.find(inv => inv.id === pay.invoiceId) || 
                                invoicesList.find(inv => inv.studentId === pay.studentId || (student && inv.studentId === student.id)) || 
                                null;
        }
        if (!associatedInvoice && institution?.id) {
            const fetched = await apiService.fetchModuleRecords<DSInvoice>('ds_invoices', institution.id).catch(() => []);
            if (Array.isArray(fetched) && fetched.length > 0) {
                associatedInvoice = fetched.find(inv => inv.id === pay.invoiceId) || 
                                    fetched.find(inv => inv.studentId === pay.studentId || (student && inv.studentId === student.id)) || 
                                    null;
            }
        }
    }

    // Document Type & Number
    doc.setFontSize(26);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    const title = type === 'invoice' ? 'INVOICE' : (type === 'quote' ? 'QUOTATION' : 'OFFICIAL RECEIPT');
    const number = type === 'invoice' 
        ? (data as DSInvoice).invoiceNumber 
        : (type === 'quote' 
            ? ((data as any).quoteNumber || (data as any).quotationNumber || (data as any).id || 'DS-QUOTE') 
            : (data as DSPayment).receiptNumber);
    doc.text(title, pageWidth - margin, currentY + 4, { align: 'right' });

    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(`#${number}`, pageWidth - margin, currentY + 13, { align: 'right' });

    // Bill To / Paid By / Prospective Client — anchored relative to title block
    const billBlockY = currentY + 24;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont(undefined, 'bold');
    const clientHeader = type === 'invoice' 
        ? 'BILL TO:' 
        : (type === 'quote' ? 'PROSPECTIVE CLIENT:' : 'PAID BY (STUDENT):');
    doc.text(clientHeader, margin, billBlockY);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(student.fullName || (data as any).clientName || 'Valued Client', margin, billBlockY + 7);
    doc.setFontSize(9);
    doc.setTextColor(100);
    let detailY = billBlockY + 13;
    if (student.admissionNumber) {
        doc.text(`Adm: ${student.admissionNumber}`, margin, detailY);
        detailY += 4.5;
    }
    if (student.enrollmentDate) {
        doc.text(`Enrolled: ${new Date(student.enrollmentDate).toLocaleDateString()}`, margin, detailY);
        detailY += 4.5;
    }
    doc.text(student.phone || (data as any).phone || 'N/A', margin, detailY);
    if (student.email || (data as any).email) {
        doc.text(student.email || (data as any).email, margin, detailY + 4.5);
    }

    // Right-aligned Metadata (Date, Issued By, Ref)
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont(undefined, 'bold');
    doc.text('DATE:', pageWidth - margin - 50, billBlockY);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(new Date().toLocaleDateString(), pageWidth - margin, billBlockY, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont(undefined, 'bold');
    doc.text('ISSUED BY:', pageWidth - margin - 50, billBlockY + 7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(issuingUserName, pageWidth - margin, billBlockY + 7, { align: 'right' });

    if (type === 'receipt') {
        const pay = data as DSPayment;
        if (pay.transactionReference) {
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.setFont(undefined, 'bold');
            doc.text('REF NO:', pageWidth - margin - 50, billBlockY + 14);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(30, 41, 59);
            doc.text(pay.transactionReference, pageWidth - margin, billBlockY + 14, { align: 'right' });
        }
    } else if (type === 'quote') {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont(undefined, 'bold');
        doc.text('VALID UNTIL:', pageWidth - margin - 50, billBlockY + 14);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(30, 41, 59);
        const validDate = new Date();
        validDate.setDate(validDate.getDate() + 30);
        doc.text(validDate.toLocaleDateString(), pageWidth - margin, billBlockY + 14, { align: 'right' });
    }

    // Table
    let tableHead: string[] = [];
    let tableData: any[][] = [];

    if (type === 'invoice') {
        const inv = data as DSInvoice;
        tableHead = ['Description', 'Amount (KES)', 'Paid (KES)', 'Balance (KES)'];
        const itemsList = Array.isArray(inv.items) ? inv.items : (typeof inv.items === 'string' ? JSON.parse(inv.items) : []);
        tableData = itemsList.map((item: any) => [
            item.name,
            Number(item.amount || 0).toLocaleString(),
            Number(item.paidAmount || 0).toLocaleString(),
            Math.max(0, Number(item.amount || 0) - Number(item.paidAmount || 0)).toLocaleString()
        ]);
        if (inv.notes) {
            tableData.push(['Notes', inv.notes, '', '']);
        }
    } else if (type === 'quote') {
        tableHead = ['#', 'Fee Item Description', 'Category', 'Amount (KES)'];
        let quoteItems = Array.isArray((data as any).items) 
            ? (data as any).items 
            : (typeof (data as any).items === 'string' ? JSON.parse((data as any).items) : []);
        const catName = student.licenseTypeInterested || (data as any).categoryName || 'Standard Course';
        const totalFee = Number((data as any).totalAmount || (data as any).quotedAmount || (data as any).amount || 14500);
        if (quoteItems.length === 0) {
            const pdl = Math.min(1450, Math.floor(totalFee * 0.1));
            const testFee = Math.min(2500, Math.floor(totalFee * 0.15));
            const tuition = totalFee - pdl - testFee;
            quoteItems = [
                { name: 'Standard Tuition & Instruction Fee', amount: tuition },
                { name: 'NTSA PDL (Provisional Driving License) Processing', amount: pdl },
                { name: 'Practical & Theory Test Booking Fee', amount: testFee }
            ];
        }
        tableData = quoteItems.map((item: any, idx: number) => [
            idx + 1,
            item.name || item.description || 'Instruction Item',
            catName,
            Number(item.amount || 0).toLocaleString()
        ]);
    } else {
        const pay = data as DSPayment;
        tableHead = ['Payment Information', 'Details'];
        tableData = [
            ['Payment Method', pay.paymentMethod || 'Cash'],
            ['Transaction Reference', pay.transactionReference || 'N/A'],
            ['Payment Date', new Date(pay.paymentDate || Date.now()).toLocaleString()],
            ['Amount Paid (This Receipt)', `KES ${Number(pay.amount || 0).toLocaleString()}.00`],
            ['Issued / Received By', issuingUserName]
        ];
    }

    autoTable(doc, {
        startY: currentY + 68,
        head: [tableHead],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9.5, cellPadding: 4.5 },
        margin: { left: margin, right: margin }
    });

    let renderYAfterTable = (doc as any).lastAutoTable.finalY || 150;

    // Render Votes Breakdown with Updated Balances per Vote for Receipts
    let rawItems: any[] = [];
    if (associatedInvoice) {
        rawItems = Array.isArray(associatedInvoice.items) 
            ? associatedInvoice.items 
            : (typeof associatedInvoice.items === 'string' ? JSON.parse(associatedInvoice.items) : []);
    }
    if (rawItems.length === 0 && settings?.feeStructures && settings.feeStructures.length > 0) {
        const studentCourse = (student.licenseTypeInterested || student.courseType || (student as any).licenseCategory || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchedFS = settings.feeStructures.find(fs => {
            const norm = (fs.className || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return norm === studentCourse || norm.includes(studentCourse) || studentCourse.includes(norm);
        }) || settings.feeStructures[0];

        if (matchedFS && matchedFS.items) {
            rawItems = Array.isArray(matchedFS.items) ? matchedFS.items : (typeof matchedFS.items === 'string' ? JSON.parse(matchedFS.items) : []);
        }
    }

    if (type === 'receipt' && rawItems.length > 0) {
        const totalCumulativePaid = associatedInvoice 
            ? Number(associatedInvoice.paidAmount || (data as DSPayment).amount || 0)
            : Number((data as DSPayment).amount || 0);

        let remainingToDistribute = totalCumulativePaid;
        const sortedItems = [...rawItems].sort((a: any, b: any) => (Number(a.priority) || 99) - (Number(b.priority) || 99));

        const votesWithBalances = sortedItems.map((item: any) => {
            const allocated = Number(item.amount || 0);
            const paid = Math.min(remainingToDistribute, allocated);
            remainingToDistribute = Math.max(0, remainingToDistribute - paid);
            const balance = Math.max(0, allocated - paid);
            return {
                name: item.name || 'Fee Item',
                allocated,
                paid,
                balance
            };
        });

        renderYAfterTable += 10;
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.setFont(undefined, 'bold');
        doc.text("VOTES BREAKDOWN (FEE ALLOCATION & BALANCES)", margin, renderYAfterTable);

        const votesTableData = votesWithBalances.map(v => [
            v.name,
            `KES ${v.allocated.toLocaleString()}`,
            `KES ${v.paid.toLocaleString()}`,
            `KES ${v.balance.toLocaleString()}`
        ]);

        const totalAlloc = votesWithBalances.reduce((sum, v) => sum + v.allocated, 0);
        const totalPaid = votesWithBalances.reduce((sum, v) => sum + v.paid, 0);
        const totalBal = votesWithBalances.reduce((sum, v) => sum + v.balance, 0);

        autoTable(doc, {
            startY: renderYAfterTable + 4,
            head: [['Vote Head / Item', 'Allocated', 'Paid to Date', 'Balance Remaining']],
            body: votesTableData,
            foot: [['TOTAL', `KES ${totalAlloc.toLocaleString()}`, `KES ${totalPaid.toLocaleString()}`, `KES ${totalBal.toLocaleString()}`]],
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
            footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 4 },
            margin: { left: margin, right: margin }
        });

        renderYAfterTable = (doc as any).lastAutoTable.finalY || renderYAfterTable + 30;
    }

    // Totals
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    const totalLabel = type === 'invoice' 
        ? 'INVOICE TOTAL:' 
        : (type === 'quote' ? 'TOTAL ESTIMATED FEES:' : 'AMOUNT RECEIVED (THIS RECEIPT):');
    const totalValue = type === 'invoice' 
        ? (data as DSInvoice).totalAmount 
        : (type === 'quote' 
            ? ((data as any).totalAmount || (data as any).quotedAmount || (data as any).amount || 14500) 
            : (data as DSPayment).amount);

    doc.text(totalLabel, pageWidth - margin - 90, renderYAfterTable + 18);
    doc.setFontSize(15);
    doc.setFont(undefined, 'bold');
    doc.text(`KES ${Number(totalValue || 0).toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 18, { align: 'right' });

    if (type === 'invoice') {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont(undefined, 'normal');
        doc.text('AMOUNT PAID:', pageWidth - margin - 90, renderYAfterTable + 28);
        doc.setTextColor(30, 41, 59);
        doc.text(`KES ${Number((data as DSInvoice).paidAmount || 0).toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 28, { align: 'right' });

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('BALANCE DUE:', pageWidth - margin - 90, renderYAfterTable + 38);
        doc.setTextColor(220, 38, 38);
        doc.text(`KES ${Number((data as DSInvoice).balance || 0).toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 38, { align: 'right' });
    } else if (type === 'receipt' && associatedInvoice) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont(undefined, 'normal');
        doc.text('TOTAL INVOICE ALLOCATED:', pageWidth - margin - 90, renderYAfterTable + 28);
        doc.setTextColor(30, 41, 59);
        doc.text(`KES ${Number(associatedInvoice.totalAmount || 0).toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 28, { align: 'right' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('CUMULATIVE PAID TO DATE:', pageWidth - margin - 90, renderYAfterTable + 36);
        doc.setTextColor(30, 41, 59);
        doc.text(`KES ${Number(associatedInvoice.paidAmount || 0).toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 36, { align: 'right' });

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('OUTSTANDING BALANCE:', pageWidth - margin - 90, renderYAfterTable + 46);
        doc.setTextColor(220, 38, 38);
        doc.text(`KES ${Number(associatedInvoice.balance || 0).toLocaleString()}.00`, pageWidth - margin, renderYAfterTable + 46, { align: 'right' });
    }

    // Official Verification / Sign-off block
    const pageHeight = doc.internal.pageSize.getHeight();
    let signY = renderYAfterTable + (type === 'receipt' && associatedInvoice ? 56 : 46);
    if (signY + 28 > pageHeight - 20) {
        doc.addPage();
        signY = 25;
    }
    const verifTitle = type === 'receipt' 
        ? "OFFICIAL RECEIPT VERIFICATION" 
        : (type === 'invoice' ? "OFFICIAL INVOICE VERIFICATION" : "OFFICIAL QUOTATION VERIFICATION");
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(verifTitle, margin, signY);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100);
    doc.text(`Issued By: ${issuingUserName}`, margin, signY + 6);
    doc.text(`Print Date: ${new Date().toLocaleString()}`, margin, signY + 11);
    const ackText = type === 'receipt' 
        ? "Acknowledgement: Payment received in full validity." 
        : (type === 'invoice' 
            ? "Payment Terms: Complete settlement via official Paybill/Bank details." 
            : "Validity Notice: Quotation valid for 30 calendar days from issue date.");
    doc.text(ackText, margin, signY + 16);

    doc.setDrawColor(203, 213, 225);
    doc.line(pageWidth - margin - 65, signY + 12, pageWidth - margin, signY + 12);
    doc.text("Authorized Signature & Stamp", pageWidth - margin - 65, signY + 17);

    // Embed Official Stamp overlay over signature line
    if (stampImg) {
        try {
            const stampSize = 34; // 34mm realistic rubber stamp
            const stampAspect = stampImg.height > 0 ? stampImg.width / stampImg.height : 1;
            const stampW = stampAspect >= 1 ? stampSize : stampSize * stampAspect;
            const stampH = stampAspect >= 1 ? stampSize / stampAspect : stampSize;
            const stampDrawX = pageWidth - margin - 58;
            const stampDrawY = signY - stampH + 11;
            let format = 'PNG';
            if (stampImg.src?.startsWith('data:image/jpeg') || stampImg.src?.startsWith('data:image/jpg')) {
                format = 'JPEG';
            }
            doc.addImage(stampImg, format, stampDrawX, stampDrawY, stampW, stampH);
        } catch (imgErr) {
            console.warn('[dsPdfGenerator] Could not embed stamp image:', imgErr);
        }
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

        const copyrightText = footerText || `Thank you for choosing ${instName}!`;
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
    invoicesList?: DSInvoice[],
    issuingUser?: string,
    settings?: DSSettings | null
): Promise<string> => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 175]
    }) as any;

    const margin = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 8;

    const centerText = (text: string, y: number) => {
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // Load logo if available
    const companyDetails = await apiService.fetchCompanySettings().catch(() => null);
    const logoUrl = institution?.logoUrl || 
                    institution?.logo_url || 
                    institution?.logo || 
                    (institution?.letterheadConfig as any)?.logoUrl || 
                    (settings as any)?.logoUrl || 
                    companyDetails?.logoUrl || 
                    null;
    const logoImg = await loadImage(logoUrl);

    if (logoImg) {
        const maxW = 20;
        const maxH = 16;
        let lw = maxW;
        let lh = maxH;
        if (logoImg.width && logoImg.height) {
            const ratio = logoImg.width / logoImg.height;
            if (ratio >= 1) {
                lw = maxW;
                lh = lw / ratio;
            } else {
                lh = maxH;
                lw = lh * ratio;
            }
        }
        const lx = (pageWidth - lw) / 2;
        doc.addImage(logoImg, 'PNG', lx, yPos, lw, lh);
        yPos += lh + 3;
    }

    const instName = institution?.name && !institution.name.toLowerCase().includes('law firm') ? institution.name : (settings?.schoolName || 'Driving School');

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    centerText(instName, yPos);
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
    yPos += 5;

    let associatedInvoice: DSInvoice | null = null;
    if (invoicesList && invoicesList.length > 0) {
        associatedInvoice = invoicesList.find(inv => inv.id === payment.invoiceId) || 
                            invoicesList.find(inv => inv.studentId === payment.studentId || (student && inv.studentId === student.id)) || 
                            null;
    }
    if (!associatedInvoice && institution?.id) {
        const fetched = await apiService.fetchModuleRecords<DSInvoice>('ds_invoices', institution.id).catch(() => []);
        if (Array.isArray(fetched) && fetched.length > 0) {
            associatedInvoice = fetched.find(inv => inv.id === payment.invoiceId) || 
                                fetched.find(inv => inv.studentId === payment.studentId || (student && inv.studentId === student.id)) || 
                                null;
        }
    }

    const issuingUserName = issuingUser || 
        payment.receivedBy || 
        (payment as any).issuedBy || 
        (payment as any).recordedBy || 
        (payment as any).auditedBy || 
        'Accounts Officer';

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    if (isReprint) {
        centerText("*** REPRINT ***", yPos);
        yPos += 5;
    }
    centerText("OFFICIAL PAYMENT RECEIPT", yPos);
    yPos += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(payment.paymentDate || Date.now())?.toLocaleString()}`, margin, yPos);
    yPos += 4;
    doc.text(`Receipt #: ${payment.receiptNumber}`, margin, yPos);
    yPos += 4;
    doc.text(`Student: ${student.fullName}`, margin, yPos);
    if (student.admissionNumber) {
        yPos += 4;
        doc.text(`Adm: ${student.admissionNumber}`, margin, yPos);
    }
    yPos += 4;
    doc.text(`Issued By: ${issuingUserName}`, margin, yPos);
    yPos += 5;

    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'bold');
    doc.text("Description", margin, yPos);
    doc.text("Amount", pageWidth - margin, yPos, { align: 'right' });
    yPos += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.text(payment.paymentMethod || 'Payment', margin, yPos);
    doc.text(`Kes ${Number(payment.amount || 0).toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 7;

    // Votes Breakdown & Updated Balances
    let rawItems: any[] = [];
    if (associatedInvoice) {
        rawItems = Array.isArray(associatedInvoice.items) 
            ? associatedInvoice.items 
            : (typeof associatedInvoice.items === 'string' ? JSON.parse(associatedInvoice.items) : []);
    }
    if (rawItems.length === 0 && settings?.feeStructures && settings.feeStructures.length > 0) {
        const studentCourse = (student.licenseTypeInterested || student.courseType || (student as any).licenseCategory || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchedFS = settings.feeStructures.find(fs => {
            const norm = (fs.className || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return norm === studentCourse || norm.includes(studentCourse) || studentCourse.includes(norm);
        }) || settings.feeStructures[0];

        if (matchedFS && matchedFS.items) {
            rawItems = Array.isArray(matchedFS.items) ? matchedFS.items : (typeof matchedFS.items === 'string' ? JSON.parse(matchedFS.items) : []);
        }
    }

    if (rawItems.length > 0) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text("--- Votes Breakdown & Balances ---", margin, yPos);
        yPos += 4;

        const totalCumulativePaid = associatedInvoice 
            ? Number(associatedInvoice.paidAmount || payment.amount || 0)
            : Number(payment.amount || 0);

        let rem = totalCumulativePaid;
        const sorted = [...rawItems].sort((a: any, b: any) => (Number(a.priority) || 99) - (Number(b.priority) || 99));

        sorted.forEach((it: any) => {
            const allocated = Number(it.amount || 0);
            const paid = Math.min(rem, allocated);
            rem = Math.max(0, rem - paid);
            const bal = Math.max(0, allocated - paid);

            doc.setFont('helvetica', 'bold');
            doc.text(`${it.name || 'Fee Item'}`, margin, yPos);
            doc.text(`Alloc: Kes ${allocated.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
            yPos += 3.5;
            doc.setFont('helvetica', 'normal');
            doc.text(`Paid: Kes ${paid.toLocaleString()} | Bal: Kes ${bal.toLocaleString()}`, margin + 2, yPos);
            yPos += 4;
        });
        yPos += 2;
    }

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("TOTAL PAID (NOW):", margin, yPos);
    doc.text(`Kes ${Number(payment.amount || 0).toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;

    if (associatedInvoice) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("Total Invoiced:", margin, yPos);
        doc.text(`Kes ${Number(associatedInvoice.totalAmount || 0).toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 4;

        doc.text("Total Paid to Date:", margin, yPos);
        doc.text(`Kes ${Number(associatedInvoice.paidAmount || 0).toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 4;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("OUTSTANDING BAL:", margin, yPos);
        doc.text(`Kes ${Number(associatedInvoice.balance || 0).toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 7;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    centerText("Thank you for your payment!", yPos);
    yPos += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    centerText("[ OFFICIAL STAMP & VERIFIED ]", yPos);
    yPos += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    centerText(`Served / Issued By: ${issuingUserName}`, yPos);
    yPos += 4;
    centerText(`Powered by ${instName}`, yPos);

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


