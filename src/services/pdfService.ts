
import type { Requisition, Supplier, Invoice, Receipt, MpesaTransaction, Institution, CompanyDetails, EmailConfig, TimetableEntry, Subject, User, Role, Room, LetterheadConfig, RoomConflict, Course, CourseLevel, Internship, Department, LessonStructure, LecturerContract, Building, AcademicLevel, Semester, ExamTimetableEntry, TimetableSettings, StockTransaction, InventoryItem, LeaveOutRequest, LeaveOutWithDetails, LibraryTransaction, LibraryFine, CarWashAccount, CarWashJournalEntry, CarWashJournalLine, CarWashExpense, CarWashPayroll, CarWashJob, CarWashPackage, CarWashFeedback, CarWashCustomer, CarWashAddOn, PMTenant, PMLandlord, PMPayment, PMLease, PMUnit, PMProperty, PMInvoice, PMNoticeLetter, PMExpenseVoucher, PMInspection, PMDepositRefund, RetailSale, RetailStore, RetailInventoryItem, RetailCommissionLedger, CoopFarmer, CoopRider, HISPharmacyInventory, HISPharmacyBatch, PharmacyStaff, PharmacySale, PharmacySaleItem, PharmacySettings, CarListing, CarInvoice, CarPayment, Assessment, AssessmentMark, Visitor, HISPatient, PayrollRecord, Expense, MontessoriAssessmentRecord } from '../types';

import { timeToMinutes, minutesToTime, generatePeriodLabels, generateDisplaySlots } from '../utils/timeUtils';

import { generatePastelColor, generatePastelColorRgb } from '../utils/colorUtils';
import { getInitials } from '../utils/stringUtils';
import { formatRoleDisplayName, isEduInstitution } from '../utils/roleUtils';
import { generateStampDataUri } from '../utils/stampGenerator';


// Use a safer way to access the global jsPDF object which might be on window or just global
const getJsPdf = () => {
    if (typeof window !== 'undefined' && (window as any).jspdf) {
        return (window as any).jspdf;
    }
    // @ts-ignore
    if (typeof jspdf !== 'undefined') return jspdf;
    return null;
};

// Internal in-memory image cache for fast zero-latency re-use across PDF generations
const pdfImageCache = new Map<string, HTMLImageElement>();

// Internal utility to load images safely with caching & generous timeout for reliable PDF generation
const loadImage = (url: string | null | undefined, timeoutMs: number = 7000): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
        let safeUrl = (url || '').trim();
        if (!safeUrl) return resolve(null);

        // Normalize malformed SVG data URIs (e.g. data:image/svg+xml;utf8,... -> charset=utf-8)
        if (safeUrl.startsWith('data:image/svg+xml;utf8,')) {
            safeUrl = safeUrl.replace('data:image/svg+xml;utf8,', 'data:image/svg+xml;charset=utf-8,');
        }

        if (pdfImageCache.has(safeUrl)) {
            return resolve(pdfImageCache.get(safeUrl)!);
        }
        let settled = false;
        const img = new Image();

        // Never set crossOrigin on data: or blob: URIs as browser treats them as invalid cross-origin requests
        const isDataOrBlob = safeUrl.startsWith('data:') || safeUrl.startsWith('blob:');
        if (!isDataOrBlob) {
            img.crossOrigin = "Anonymous";
        }

        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                console.warn("PDF Service: Image load timed out after", timeoutMs, "ms:", safeUrl.slice(0, 100));
                resolve(null);
            }
        }, timeoutMs);

        img.onload = () => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                try {
                    pdfImageCache.set(safeUrl, img);
                } catch (e) {}
                resolve(img);
            }
        };
        img.onerror = () => {
            // Attempt fallback without anonymous CORS if CORS failed on remote server
            if (!settled) {
                // If it was an SVG data URI with percent-encoding, attempt base64 conversion fallback
                if (safeUrl.startsWith('data:image/svg+xml') && !safeUrl.includes(';base64,')) {
                    try {
                        const rawSvg = decodeURIComponent(safeUrl.split(',')[1] || '');
                        const base64Fallback = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(rawSvg)))}`;
                        const svgImg = new Image();
                        svgImg.onload = () => {
                            if (!settled) {
                                settled = true;
                                clearTimeout(timer);
                                try { pdfImageCache.set(safeUrl, svgImg); } catch (e) {}
                                resolve(svgImg);
                            }
                        };
                        svgImg.onerror = () => {
                            if (!settled) {
                                settled = true;
                                clearTimeout(timer);
                                console.warn("PDF Service: Failed to load asset image. Proceeding without it.", safeUrl.slice(0, 100));
                                resolve(null);
                            }
                        };
                        svgImg.src = base64Fallback;
                        return;
                    } catch (_) {}
                }

                if (!isDataOrBlob) {
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => {
                        if (!settled) {
                            settled = true;
                            clearTimeout(timer);
                            try {
                                pdfImageCache.set(safeUrl, fallbackImg);
                            } catch (e) {}
                            resolve(fallbackImg);
                        }
                    };
                    fallbackImg.onerror = () => {
                        if (!settled) {
                            settled = true;
                            clearTimeout(timer);
                            console.warn("PDF Service: Failed to load asset image. Proceeding without it.", safeUrl.slice(0, 100));
                            resolve(null);
                        }
                    };
                    fallbackImg.src = safeUrl;
                } else {
                    settled = true;
                    clearTimeout(timer);
                    console.warn("PDF Service: Failed to load asset image. Proceeding without it.", safeUrl.slice(0, 100));
                    resolve(null);
                }
            }
        };
        img.src = safeUrl;
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

const setupPdfFooter = (doc: any, footerImg: HTMLImageElement | null, footerText?: string) => {
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

        const copyrightText = footerText || "EduAi Automation - Secure Document";
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
    logoImg: HTMLImageElement | null,
    headerImg: HTMLImageElement | null = null
) => {
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    if (headerImg) {
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (headerImg.height * imgWidth) / headerImg.width;
        const maxHeight = 40;
        let finalHeight = imgHeight;
        let finalWidth = imgWidth;
        if (imgHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = (headerImg.width * finalHeight) / headerImg.height;
        }
        const xPos = (pageWidth - finalWidth) / 2;

        let format = 'JPEG';
        if (headerImg.src) {
            const srcLower = headerImg.src.toLowerCase();
            if (srcLower.includes('png') || srcLower.startsWith('data:image/png')) format = 'PNG';
            else if (srcLower.includes('webp') || srcLower.startsWith('data:image/webp')) format = 'WEBP';
        }

        try {
            doc.addImage(headerImg, format, xPos, 15, finalWidth, finalHeight);
        } catch (e) {
            try {
                doc.addImage(headerImg, 'PNG', xPos, 15, finalWidth, finalHeight);
            } catch (e2) {
                console.warn("[pdfService] Failed to draw headerImg on PDF:", e2);
            }
        }

        const lineY = 15 + finalHeight + 5;
        doc.setDrawColor(180, 180, 180);
        doc.line(margin, lineY, pageWidth - margin, lineY);

        // Draw Document Title if provided
        if (title && title.trim()) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.setTextColor(0, 0, 0);
            doc.text(title, margin, lineY + 15);
            return lineY + 25;
        }

        return lineY + 4;
    }

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

    // Draw Document Title if provided
    if (title && title.trim()) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(0, 0, 0);
        doc.text(title, margin, margin + 40);
        return margin + 50;
    }

    return margin + 25;
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
    logoUrl: string | null,
    isPlatformInvoice?: boolean
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    // Load branding configurations
    const letterConfig = isPlatformInvoice 
        ? companyDetails?.letterheadConfig 
        : (institution?.letterheadConfig || companyDetails?.letterheadConfig);
    const headerImgUrl = letterConfig?.headerImageUrl || institution?.letterheadConfig?.headerImageUrl || institution?.headerImageUrl || (institution as any)?.header_image_url || (institution as any)?.letterheadImageUrl || companyDetails?.letterheadConfig?.headerImageUrl || companyDetails?.headerImageUrl || (companyDetails as any)?.header_image_url || null;
    const footerImgUrl = letterConfig?.footerImageUrl || institution?.letterheadConfig?.footerImageUrl || institution?.footerImageUrl || (institution as any)?.footer_image_url || companyDetails?.letterheadConfig?.footerImageUrl || companyDetails?.footerImageUrl || (companyDetails as any)?.footer_image_url || null;
    const stampImgUrl = letterConfig?.stampImageUrl || (institution as any)?.stampUrl || (institution as any)?.stamp_url || companyDetails?.letterheadConfig?.stampImageUrl || companyDetails?.stampUrl || null;
    const footerText = letterConfig?.footerText || institution?.letterheadConfig?.footerText || companyDetails?.letterheadConfig?.footerText || '';
    const logoImgUrl = isPlatformInvoice ? companyDetails?.logoUrl : (logoUrl || institution?.logoUrl || (institution as any)?.logo_url || companyDetails?.logoUrl || null);

    const headerImg = headerImgUrl ? await loadImage(headerImgUrl) : null;
    const footerImg = footerImgUrl ? await loadImage(footerImgUrl) : null;
    
    // Dynamic Kenyan Stamp generation matching physical rubber dater stamp
    let stampImg: HTMLImageElement | null = null;
    if (letterConfig?.showStamp !== false && letterConfig?.stampConfig?.mode !== 'none') {
        const dateToStamp = (invoice as any)?.issueDate || new Date();
        const stampDataUri = await generateStampDataUri(letterConfig?.stampConfig, dateToStamp, institution);
        if (stampDataUri) {
            stampImg = await loadImage(stampDataUri);
        }
    } else if (stampImgUrl) {
        stampImg = await loadImage(stampImgUrl);
    }
    const logoImg = logoImgUrl ? await loadImage(logoImgUrl) : null;

    // Create Page Header with Letterhead Cascade
    const tableStartY = createPdfWithLetterhead(
        doc, 
        'SALES INVOICE', 
        companyDetails, 
        isPlatformInvoice ? {
            name: companyDetails.name,
            email: companyDetails.email,
            phoneNumber: companyDetails.phone,
            address: companyDetails.address
        } as Institution : (institution || {
            name: companyDetails.name,
            email: companyDetails.email,
            phoneNumber: companyDetails.phone,
            address: companyDetails.address
        } as Institution), 
        logoImg, 
        headerImg
    );
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Dynamically shift table starting position to accommodate metadata block card
    const finalTableStartY = tableStartY + 38;

    // Parse brand primary theme color for styled headers
    const themeColorHex = companyDetails?.themeColor || '#4f46e5';
    const hexToRgb = (hex: string): [number, number, number] => {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(char => char + char).join('');
        }
        const num = parseInt(cleanHex, 16);
        return [
            (num >> 16) & 255,
            (num >> 8) & 255,
            num & 255
        ];
    };
    const primaryColor = hexToRgb(themeColorHex);

    // Draw clean modern Metadata block card container
    doc.setFillColor(248, 250, 252); // Slate-50 background
    doc.setDrawColor(226, 232, 240); // Slate-200 border
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, tableStartY - 5, pageWidth - (margin * 2), 34, 2, 2, 'FD');

    // Column 1 Content: Invoice details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text('INVOICE DETAILS', margin + 6, tableStartY + 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(`Invoice Reference :  ${invoice?.invoiceNumber || 'N/A'}`, margin + 6, tableStartY + 7);
    doc.text(`Issue Date        :  ${invoice?.issueDate ? new Date(invoice.issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}`, margin + 6, tableStartY + 13);
    doc.text(`Due Date          :  ${invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}`, margin + 6, tableStartY + 19);

    // Column 2 Content: Payer / Bill to details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    
    const student = (invoice as any).student;
    if (student) {
        doc.text('BILL TO (STUDENT)', pageWidth / 2 + 6, tableStartY + 1);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(`Student Name :  ${student.name || 'N/A'}`, pageWidth / 2 + 6, tableStartY + 7);
        doc.text(`Adm Number   :  ${resolveStudentAdmissionNo(student)}`, pageWidth / 2 + 6, tableStartY + 13);
        doc.text(`Class / Grade:  ${student.className || 'N/A'}`, pageWidth / 2 + 6, tableStartY + 19);
    } else {
        doc.text('BILL TO (CLIENT)', pageWidth / 2 + 6, tableStartY + 1);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const billToClient = invoice?.clientName || (invoice as any)?.client?.clientName || (invoice as any)?.customerName || 'Corporate Client';
        const billToContact = invoice?.clientEmail || (invoice as any)?.client?.email || (invoice as any)?.clientContactPerson || 'N/A';
        const billToPhone = invoice?.clientPhone || (invoice as any)?.client?.phone || 'N/A';
        const billToAddress = invoice?.clientAddress || (invoice as any)?.client?.address || '';
        doc.text(`Organization :  ${billToClient}`, pageWidth / 2 + 6, tableStartY + 7);
        doc.text(`Representative: ${billToContact}`, pageWidth / 2 + 6, tableStartY + 13);
        doc.text(`Contact Phone :  ${billToPhone}${billToAddress ? ` | ${billToAddress}` : ''}`, pageWidth / 2 + 6, tableStartY + 19);
    }

    const docCurrency = invoice?.currency || 'KES';

    // Main line items table
    const head = [['#', 'DESCRIPTION / BILLABLE ITEM', 'QTY', `UNIT PRICE (${docCurrency})`, `TOTAL AMOUNT (${docCurrency})`]];
    const rawItems: any[] = Array.isArray(invoice?.items) 
        ? invoice.items 
        : (typeof (invoice as any)?.items === 'string' 
            ? (() => { try { return JSON.parse((invoice as any).items); } catch { return []; } })() 
            : []);

    const body = rawItems.map((item: any, index: number) => {
        const qty = Number(item.quantity) || 1;
        const amt = Number(item.amount);
        let unitPrice = Number(item.unitPrice ?? item.unit_price ?? item.rate ?? item.price);
        if (isNaN(unitPrice) || unitPrice <= 0) {
            unitPrice = (!isNaN(amt) && qty > 0) ? (amt / qty) : 0;
        }
        const finalAmt = (!isNaN(amt) && amt > 0) ? amt : (qty * unitPrice);

        const formattedUnitPrice = `${docCurrency} ${unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formattedTotalAmount = `${docCurrency} ${finalAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        return [
            index + 1,
            item.description || item.name || 'Billable Item',
            qty,
            formattedUnitPrice,
            formattedTotalAmount
        ];
    });

    doc.autoTable({
        head: head,
        body: body,
        startY: finalTableStartY,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 }, minCellHeight: 5.5 },
        styles: { fontSize: 7.5, cellPadding: { top: 1.6, bottom: 1.6, left: 3, right: 3 }, valign: 'middle', minCellHeight: 5 },
        columnStyles: {
            0: { cellWidth: 14, halign: 'center', fontSize: 7.5 },
            1: { fontStyle: 'bold', fontSize: 8 },
            2: { halign: 'center', cellWidth: 14, fontSize: 7.5 },
            3: { halign: 'right', fontSize: 7.5 },
            4: { halign: 'right', fontStyle: 'bold', fontSize: 8 }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || (finalTableStartY + 25);

    // Financial totals summary section
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.3);
    doc.line(margin, finalY + 5, pageWidth - margin, finalY + 5);

    const invCurrency = invoice?.currency || 'KES';
    const subtotalAmount = Number(invoice?.subtotal !== undefined 
        ? invoice.subtotal 
        : (rawItems.length > 0 
            ? rawItems.reduce((sum: number, it: any) => {
                const qty = Number(it.quantity) || 1;
                const amt = Number(it.amount);
                let unitPrice = Number(it.unitPrice ?? it.unit_price ?? it.rate ?? it.price);
                if (isNaN(unitPrice) || unitPrice <= 0) {
                    unitPrice = (!isNaN(amt) && qty > 0) ? (amt / qty) : 0;
                }
                const lineAmt = (!isNaN(amt) && amt > 0) ? amt : (qty * unitPrice);
                return sum + lineAmt;
            }, 0)
            : Number(invoice?.totalAmount || 0))) || 0;

    const taxRateVal = invoice?.taxRate !== undefined ? Number(invoice.taxRate) : 0;
    const taxAmountVal = Number(invoice?.taxAmount !== undefined 
        ? invoice.taxAmount 
        : Math.round((subtotalAmount * taxRateVal) / 100)) || 0;
    const totalAmountVal = Number(invoice?.totalAmount !== undefined 
        ? invoice.totalAmount 
        : (subtotalAmount + taxAmountVal)) || 0;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('SUBTOTAL:', pageWidth - margin - 75, finalY + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${invCurrency} ${subtotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, finalY + 12, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`VAT / TAX (${taxRateVal}%):`, pageWidth - margin - 75, finalY + 17);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${invCurrency} ${taxAmountVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, finalY + 17, { align: 'right' });

    // Net total paid amount container box
    const totalBoxY = finalY + 21;
    doc.setFillColor(239, 246, 255); // Indigo-50
    doc.roundedRect(pageWidth - margin - 80, totalBoxY, 80, 11, 1, 1, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(79, 70, 229); // Indigo-600 (Primary accent)
    doc.text('TOTAL PAYABLE AMOUNT:', pageWidth - margin - 75, totalBoxY + 7);
    doc.text(`${invCurrency} ${totalAmountVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, totalBoxY + 7, { align: 'right' });

    // Payment details / instructions
    const instructionsY = totalBoxY + 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('PAYMENT INSTRUCTIONS', margin, instructionsY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const instructionsText = companyDetails?.paymentInstructions || 
        `Please complete settlement of this invoice using the official system Paybill:\nPaybill Number: ${companyDetails?.mpesaConfig?.paybillNumber || 'N/A'}  |  Account Name: [Institution Code / Invoice Number]`;
    const splitInstructions = doc.splitTextToSize(instructionsText, pageWidth - (margin * 2));
    doc.text(splitInstructions, margin, instructionsY + 6);

    // Stamp / Authorized Signature
    const sigBaseY = pageHeight - 55;
    if (stampImg) {
        const stampWidth = 26;
        const stampHeight = (stampImg.height * stampWidth) / stampImg.width;
        doc.addImage(stampImg, 'PNG', pageWidth - margin - 45, sigBaseY - 14, stampWidth, stampHeight);
    }
    
    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.setLineWidth(0.4);
    doc.line(pageWidth - margin - 50, sigBaseY + 6, pageWidth - margin, sigBaseY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signature & Stamp', pageWidth - margin - 50, sigBaseY + 10);

    // Process footers on all pages
    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

const renderReceiptPageOnDoc = (
    doc: any,
    receipt: Receipt,
    transaction: MpesaTransaction | null | undefined,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoImg: any,
    headerImg: any,
    footerImg: any,
    stampImg: any,
    footerText: string,
    invoiceBalance?: number,
    accountantName?: string,
    studentInfo?: {
        name?: string;
        admNo?: string;
        studentClass?: string;
    },
    isReprint: boolean = false
) => {
    // Create Page Header with Letterhead Cascade
    const tableStartY = createPdfWithLetterhead(doc, 'PAYMENT RECEIPT', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // If reprint, render a stylish diagonal watermark in the background across the receipt
    if (isReprint) {
        try {
            (doc as any).saveGraphicsState?.();
            if (typeof (doc as any).setGState === 'function') {
                try {
                    const gState = new (doc as any).GState({ opacity: 0.08 });
                    (doc as any).setGState(gState);
                } catch (_) {}
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(60);
            doc.setTextColor(225, 29, 72); // Rose-600 with low opacity
            doc.text('COPY', pageWidth / 2, (pageHeight / 2) + 10, {
                align: 'center',
                angle: 40
            });
            (doc as any).restoreGraphicsState?.();
        } catch (_) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(54);
            doc.setTextColor(245, 225, 230); // Very light fallback pastel rose
            doc.text('COPY', pageWidth / 2, (pageHeight / 2) + 10, {
                align: 'center',
                angle: 40
            });
        }
    }

    // Dynamically shift table starting position to accommodate metadata block card
    const finalTableStartY = tableStartY + 38;

    // Parse brand primary theme color for styled headers
    const themeColorHex = companyDetails?.themeColor || '#4f46e5';
    const hexToRgb = (hex: string): [number, number, number] => {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(char => char + char).join('');
        }
        const num = parseInt(cleanHex, 16);
        return [
            (num >> 16) & 255,
            (num >> 8) & 255,
            num & 255
        ];
    };
    const primaryColor = hexToRgb(themeColorHex);

    // Draw clean modern Metadata block card container
    doc.setFillColor(248, 250, 252); // Slate-50 background
    doc.setDrawColor(226, 232, 240); // Slate-200 border
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, tableStartY - 5, pageWidth - (margin * 2), 34, 2, 2, 'FD');

    // Column 1 Content: Receipt details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text('RECEIPT INFORMATION', margin + 6, tableStartY + 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(`Receipt Reference :  ${receipt?.receiptNumber || 'N/A'}`, margin + 6, tableStartY + 7);
    doc.text(`Payment Date      :  ${receipt?.paymentDate ? new Date(receipt.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}`, margin + 6, tableStartY + 13);
    
    // Payment status badge with colored background and text
    doc.text('Payment Status    :  ', margin + 6, tableStartY + 19);
    const badgeX = margin + 31;
    doc.setFillColor(240, 253, 250); // Teal-50
    doc.roundedRect(badgeX, tableStartY + 16, 24, 4.5, 0.8, 0.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(13, 148, 136); // Teal-600
    doc.text(isReprint ? 'OFFICIAL REPRINT' : 'PAID / SECURED', badgeX + 1.5, tableStartY + 19.5);

    // Column 2 Content: Student / Payer / Transaction details
    const resolvedStudentName = studentInfo?.name || (receipt as any)?.studentName || (receipt as any)?.student_name || (receipt as any)?.payerName;
    const resolvedAdmNo = studentInfo?.admNo || (receipt as any)?.admissionNumber || (receipt as any)?.admission_number || (receipt as any)?.admNo || (receipt as any)?.studentAdmissionNumber;
    const resolvedClass = studentInfo?.studentClass || (receipt as any)?.studentClass || (receipt as any)?.grade;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(resolvedStudentName || resolvedAdmNo ? 'STUDENT & PAYMENT DETAILS' : 'BILL TO / TRANSACTION INFO', pageWidth / 2 + 6, tableStartY + 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    if (resolvedStudentName || resolvedAdmNo) {
        doc.text(`Student Name      :  ${resolvedStudentName || 'N/A'}`, pageWidth / 2 + 6, tableStartY + 7);
        doc.text(`Adm / Reg No      :  ${resolvedAdmNo || 'N/A'}${resolvedClass ? `  (${resolvedClass})` : ''}`, pageWidth / 2 + 6, tableStartY + 13);
        const paymentMethodText = `${receipt?.paymentMethod || 'M-PESA'} (${transaction?.transactionId || receipt?.relatedTransactionId || 'N/A'})`;
        doc.text(`Method / Ref       :  ${paymentMethodText}`, pageWidth / 2 + 6, tableStartY + 19);
    } else {
        doc.text(`Payer / Client    :  ${transaction?.payerName || institution?.name || 'Walk-in / Client'}`, pageWidth / 2 + 6, tableStartY + 7);
        const paymentMethodText = `${receipt?.paymentMethod || 'M-PESA'} (${transaction?.transactionId || receipt?.relatedTransactionId || 'N/A'})`;
        doc.text(`Method / Channel     :  ${paymentMethodText}`, pageWidth / 2 + 6, tableStartY + 13);
    }

    // Extract itemized votehead breakdown if available
    let rawItems: any[] = [];
    const possibleItems = (receipt as any).allocations || (receipt as any).voteheadsBreakdown || (receipt as any).voteHeadBreakdown || (receipt as any).items || (receipt as any).voteheads;
    if (typeof possibleItems === 'string') {
        try { rawItems = JSON.parse(possibleItems); } catch (e) {}
    } else if (Array.isArray(possibleItems)) {
        rawItems = possibleItems;
    }

    // Main line items table with itemized votehead distribution
    const head = [['#', 'VOTEHEAD / ALLOCATED FEE ITEM', 'REFERENCE / INVOICE', 'AMOUNT APPORTIONED (KES)']];
    let body: any[] = [];
    if (rawItems && rawItems.length > 0) {
        body = rawItems.map((item: any, idx: number) => {
            const itemDesc = item.description || item.name || item.voteheadName || `Votehead ${idx + 1}`;
            const itemRef = item.invoiceNumber ? `Invoice #${item.invoiceNumber}` : (transaction?.transactionId || receipt?.relatedTransactionId || 'Direct Payment');
            const itemAmt = Number(item.amount || item.allocatedAmount || 0);
            return [
                idx + 1,
                itemDesc,
                itemRef,
                `KES ${itemAmt.toLocaleString()}.00`
            ];
        });
    } else {
        body = [
            [
                1,
                receipt?.paidFor || 'Academic Tuition & School Fees',
                transaction?.transactionId || receipt?.relatedTransactionId || 'N/A',
                `KES ${(receipt?.amountPaid || 0).toLocaleString()}.00`
            ]
        ];
    }

    doc.autoTable({
        head: head,
        body: body,
        startY: finalTableStartY,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: { top: 2.2, bottom: 2.2, left: 3.5, right: 3.5 } },
        styles: { fontSize: 8, cellPadding: { top: 1.8, bottom: 1.8, left: 3.5, right: 3.5 }, valign: 'top' },
        columnStyles: {
            0: { cellWidth: 14, halign: 'center' },
            1: { fontStyle: 'bold' },
            3: { halign: 'right', fontStyle: 'bold' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || (finalTableStartY + 25);

    // Financial totals summary section
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.3);
    doc.line(margin, finalY + 4, pageWidth - margin, finalY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('SUBTOTAL:', pageWidth - margin - 75, finalY + 10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`KES ${(receipt?.amountPaid || 0).toLocaleString()}.00`, pageWidth - margin, finalY + 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('VAT / TAX (0%):', pageWidth - margin - 75, finalY + 15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('KES 0.00', pageWidth - margin, finalY + 15, { align: 'right' });

    // Net total paid amount container box
    const totalBoxY = finalY + 18;
    doc.setFillColor(240, 253, 250); // Teal-50
    doc.roundedRect(pageWidth - margin - 80, totalBoxY, 80, 10, 1, 1, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(13, 148, 136); // Teal-600
    doc.text('TOTAL AMOUNT PAID:', pageWidth - margin - 75, totalBoxY + 6.5);
    doc.text(`KES ${(receipt?.amountPaid || 0).toLocaleString()}.00`, pageWidth - margin, totalBoxY + 6.5, { align: 'right' });

    // Render Outstanding Balance if present
    if (invoiceBalance !== undefined) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text('OUTSTANDING BALANCE:', pageWidth - margin - 75, totalBoxY + 15);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // Red-600
        doc.text(`KES ${invoiceBalance.toLocaleString()}.00`, pageWidth - margin, totalBoxY + 15, { align: 'right' });
    }

    // Professional Stamp & Authorized Signature section (Bottom Left)
    const sigBaseY = pageHeight - 55;
    
    // Draw fine stamp if available
    if (stampImg) {
        const stampWidth = 26;
        const stampHeight = (stampImg.height * stampWidth) / stampImg.width;
        // Draw centered on the line Y
        doc.addImage(stampImg, 'PNG', margin + 12, sigBaseY - 14, stampWidth, stampHeight);
    }
    
    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.setLineWidth(0.4);
    doc.line(margin, sigBaseY + 6, margin + 50, sigBaseY + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    if (accountantName) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(accountantName.toUpperCase(), margin, sigBaseY + 4);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Prepared / Verified By', margin, sigBaseY + 10);
    } else {
        doc.text('Authorized Signature & Stamp', margin, sigBaseY + 10);
    }

    // Process footers on all pages
    setupPdfFooter(doc, footerImg, footerText);
};

export const generateReceiptPdfDataUri = async (
    receipt: Receipt,
    transaction: MpesaTransaction,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    invoiceBalance?: number,
    accountantName?: string,
    studentInfo?: {
        name?: string;
        admNo?: string;
        studentClass?: string;
    },
    isReprint: boolean = false
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    // Load branding configurations
    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    
    // Dynamic Kenyan Stamp generation matching physical rubber dater stamp
    let stampImg: HTMLImageElement | null = null;
    if (letterConfig?.showStamp !== false && letterConfig?.stampConfig?.mode !== 'none') {
        const dateToStamp = receipt?.paymentDate || transaction?.timestamp || new Date();
        const stampDataUri = await generateStampDataUri(letterConfig?.stampConfig, dateToStamp, institution);
        if (stampDataUri) {
            stampImg = await loadImage(stampDataUri);
        }
    } else if (letterConfig?.stampImageUrl) {
        stampImg = await loadImage(letterConfig.stampImageUrl);
    }

    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    renderReceiptPageOnDoc(
        doc,
        receipt,
        transaction,
        institution,
        companyDetails,
        logoImg,
        headerImg,
        footerImg,
        stampImg,
        footerText,
        invoiceBalance,
        accountantName,
        studentInfo,
        isReprint
    );

    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
};

export const generateCombinedReceiptsPdfDataUri = async (
    receiptEntries: Array<{
        receipt: Receipt;
        transaction?: MpesaTransaction | null;
        invoiceBalance?: number;
        studentInfo?: {
            name?: string;
            admNo?: string;
            studentClass?: string;
        };
    }>,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    accountantName?: string,
    isReprint: boolean = true,
    onProgress?: (current: number, total: number) => void
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    // Load branding configurations once for the entire batch
    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const defaultStampImg = letterConfig?.stampImageUrl ? await loadImage(letterConfig.stampImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    const total = receiptEntries.length;
    const stampImageCache = new Map<string, HTMLImageElement | null>();

    for (let i = 0; i < total; i++) {
        if (i > 0) {
            doc.addPage();
        }
        const entry = receiptEntries[i];
        
        // Resolve dynamic stamp image for this receipt's payment date
        let currentStampImg = defaultStampImg;
        if (letterConfig?.showStamp !== false && letterConfig?.stampConfig?.mode !== 'none') {
            const dateKey = String(entry.receipt?.paymentDate || entry.transaction?.timestamp || 'today');
            if (stampImageCache.has(dateKey)) {
                currentStampImg = stampImageCache.get(dateKey) || null;
            } else {
                const dateToStamp = entry.receipt?.paymentDate || entry.transaction?.timestamp || new Date();
                const stampDataUri = await generateStampDataUri(letterConfig?.stampConfig, dateToStamp, institution);
                if (stampDataUri) {
                    const loaded = await loadImage(stampDataUri);
                    stampImageCache.set(dateKey, loaded);
                    currentStampImg = loaded;
                } else {
                    stampImageCache.set(dateKey, null);
                }
            }
        }

        renderReceiptPageOnDoc(
            doc,
            entry.receipt,
            entry.transaction,
            institution,
            companyDetails,
            logoImg,
            headerImg,
            footerImg,
            currentStampImg,
            footerText,
            entry.invoiceBalance,
            accountantName,
            entry.studentInfo,
            isReprint
        );

        // Add document bookmark / outline for each student's receipt in PDF viewer
        try {
            if ((doc as any).outline && typeof (doc as any).outline.add === 'function') {
                const sName = entry.studentInfo?.name || (entry.receipt as any)?.studentName || 'Student';
                const sAdm = entry.studentInfo?.admNo || (entry.receipt as any)?.admissionNumber || '';
                const rNum = entry.receipt?.receiptNumber || `Receipt ${i + 1}`;
                const label = `${sName}${sAdm ? ` (${sAdm})` : ''} - #${rNum}`;
                (doc as any).outline.add(null, label, { pageNumber: i + 1 });
            }
        } catch (_) {}

        if (onProgress) {
            onProgress(i + 1, total);
        }

        // Cooperatively yield event loop every 4 pages so the browser UI stays responsive
        if (i > 0 && i % 4 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
};

export const downloadCombinedReceiptsPdf = async (
    receiptEntries: Array<{
        receipt: Receipt;
        transaction?: MpesaTransaction | null;
        invoiceBalance?: number;
        studentInfo?: {
            name?: string;
            admNo?: string;
            studentClass?: string;
        };
    }>,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    accountantName?: string,
    filename: string = 'Combined-Receipts.pdf',
    isReprint: boolean = true,
    onProgress?: (current: number, total: number) => void
) => {
    const blobUrl = await generateCombinedReceiptsPdfDataUri(
        receiptEntries,
        institution,
        companyDetails,
        logoUrl,
        accountantName,
        isReprint,
        onProgress
    );
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.click();
    setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
    }, 60000);
};

export const generateCarInvoicePdfDataUri = async (
    invoice: CarInvoice,
    listing: CarListing,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    const tableStartY = createPdfWithLetterhead(doc, 'SALES INVOICE', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Invoice Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('INVOICE #:', pageWidth - margin - 40, tableStartY - 25);
    doc.text('ISSUE DATE:', pageWidth - margin - 40, tableStartY - 20);

    doc.setFont('helvetica', 'normal');
    doc.text(invoice.invoiceNumber, pageWidth - margin, tableStartY - 25, { align: 'right' });
    doc.text(new Date(invoice.createdAt || Date.now()).toLocaleDateString(), pageWidth - margin, tableStartY - 20, { align: 'right' });

    const head = [['#', 'VEHICLE DESCRIPTION', 'REGISTRATION', 'TOTAL PRICE (KES)']];
    const body = [
        [
            1,
            `${listing.year} ${listing.make} ${listing.model}`,
            invoice.registrationNumber || listing.registrationNumber || 'N/A',
            invoice.totalAmount?.toLocaleString()
        ]
    ];

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: tableStartY,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        didDrawPage: (data: any) => {
            const finalY = data.cursor.y;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL PAYABLE:', pageWidth - margin - 85, finalY + 15);
            doc.text(`KES ${invoice.totalAmount?.toLocaleString()}`, pageWidth - margin, finalY + 15, { align: 'right' });
            
            doc.setFontSize(10);
            doc.text('CLIENT DETAILS:', margin, finalY + 15);
            doc.setFont('helvetica', 'normal');
            doc.text(invoice.clientName, margin, finalY + 22);
            doc.text(invoice.clientPhone || '', margin, finalY + 27);
            doc.text(invoice.clientEmail || '', margin, finalY + 32);
        }
    });

    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const generateCarReceiptPdfDataUri = async (
    payment: CarPayment,
    invoice: CarInvoice,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    const tableStartY = createPdfWithLetterhead(doc, 'SALES RECEIPT', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('RECEIPT #:', pageWidth - margin - 40, tableStartY - 25);
    doc.text('PAYMENT DATE:', pageWidth - margin - 40, tableStartY - 20);

    doc.setFont('helvetica', 'normal');
    doc.text(payment.receiptNumber, pageWidth - margin, tableStartY - 25, { align: 'right' });
    doc.text(new Date(payment.paymentDate).toLocaleDateString(), pageWidth - margin, tableStartY - 20, { align: 'right' });

    const body = [
        ['Client Name', invoice.clientName],
        ['Invoice Ref', invoice.invoiceNumber],
        ['Payment Method', payment.paymentMethod],
        ['Transaction ID', payment.transactionReference],
        ['Amount Paid', `KES ${payment.amount?.toLocaleString()}`],
        ['Remaining Balance', `KES ${invoice.balanceAmount?.toLocaleString()}`],
    ];

    (doc as any).autoTable({
        body: body,
        startY: tableStartY,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AMOUNT PAID:', margin, finalY + 20);
    doc.text(`KES ${payment.amount?.toLocaleString()}`, pageWidth - margin, finalY + 20, { align: 'right' });

    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const generateCarSaleAgreementPdfDataUri = async (
    invoice: CarInvoice,
    listing: CarListing,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    const tableStartY = createPdfWithLetterhead(doc, 'VEHICLE SALE & INSTALLMENT AGREEMENT', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('1. PARTIES TO THE AGREEMENT', margin, tableStartY + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`SELLER: ${institution.name}`, margin, tableStartY + 18);
    doc.text(`BUYER: ${invoice.clientName}`, margin, tableStartY + 24);
    doc.text(`Phone: ${invoice.clientPhone}`, margin, tableStartY + 30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('2. VEHICLE DESCRIPTION', margin, tableStartY + 45);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Make/Model: ${listing.year} ${listing.make} ${listing.model}`, margin, tableStartY + 53);
    doc.text(`Registration: ${listing.registrationNumber}`, margin, tableStartY + 59);
    doc.text(`Chassis No: ${(listing as any).chassisNumber || 'N/A'}`, margin, tableStartY + 65);
    doc.text(`Engine No: ${(listing as any).engineNumber || 'N/A'}`, margin, tableStartY + 71);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('3. FINANCIAL TERMS', margin, tableStartY + 86);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Sale Price: KES ${invoice.totalAmount?.toLocaleString()}`, margin, tableStartY + 94);
    
    if (invoice.isInstallment) {
        doc.text(`Payment Mode: Installment Plan`, margin, tableStartY + 100);
        doc.text(`Frequency: ${invoice.installmentFrequency}`, margin, tableStartY + 106);
        doc.text(`Total Installments: ${invoice.totalInstallments}`, margin, tableStartY + 112);
        doc.text(`Amount per Installment: KES ${invoice.installmentAmount?.toLocaleString()}`, margin, tableStartY + 118);
        doc.text(`Commencement Date: ${invoice.startDate}`, margin, tableStartY + 124);
    } else {
        doc.text(`Payment Mode: Full Payment`, margin, tableStartY + 100);
        doc.text(`Due Date: ${invoice.dueDate}`, margin, tableStartY + 106);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('4. DECLARATION', margin, tableStartY + 140);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const declaration = "The Buyer agrees to purchase the vehicle described above under the terms and conditions set forth in this agreement. Ownership shall remain with the Seller until the total amount is paid in full. In case of default on any installment, the Seller reserves the right to repossess the vehicle.";
    const splitText = doc.splitTextToSize(declaration, pageWidth - (margin * 2));
    doc.text(splitText, margin, tableStartY + 148);

    doc.setFont('helvetica', 'bold');
    doc.text('SELLER SIGNATURE: _______________________', margin, tableStartY + 180);
    doc.text('BUYER SIGNATURE: _______________________', margin, tableStartY + 195);
    doc.text('DATE: _______________________', margin, tableStartY + 210);

    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const generateCarClientStatementPdfDataUri = async (
    clientName: string,
    invoices: CarInvoice[],
    payments: CarPayment[],
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    const tableStartY = createPdfWithLetterhead(doc, 'CLIENT STATEMENT OF ACCOUNT', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`CLIENT: ${clientName}`, margin, tableStartY + 10);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin, tableStartY + 10, { align: 'right' });

    const head = [['DATE', 'REFERENCE', 'DESCRIPTION', 'DEBIT (KES)', 'CREDIT (KES)', 'BALANCE (KES)']];
    const body: any[] = [];
    let runningBalance = 0;

    // Combine invoices and payments, sort by date
    const transactions = [
        ...invoices.map(inv => ({ 
            date: inv.createdAt || '', 
            ref: inv.invoiceNumber, 
            desc: inv.registrationNumber ? `Vehicle Invoice (${inv.registrationNumber})` : 'Vehicle Invoice', 
            amount: inv.totalAmount, 
            type: 'debit' 
        })),
        ...payments.map(pay => ({ date: pay.paymentDate, ref: pay.receiptNumber, desc: `Payment - ${pay.paymentMethod}`, amount: pay.amount, type: 'credit' }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    transactions.forEach(t => {
        if (t.type === 'debit') runningBalance += t.amount;
        else runningBalance -= t.amount;

        body.push([
            new Date(t.date).toLocaleDateString(),
            t.ref,
            t.desc,
            t.type === 'debit' ? t.amount?.toLocaleString() : '',
            t.type === 'credit' ? t.amount?.toLocaleString() : '',
            runningBalance?.toLocaleString()
        ]);
    });

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: tableStartY + 20,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('OUTSTANDING BALANCE:', margin, finalY + 15);
    doc.text(`KES ${runningBalance?.toLocaleString()}`, pageWidth - margin, finalY + 15, { align: 'right' });

    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const generateCarShowroomInventoryPdf = async (
    listings: CarListing[],
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    const tableStartY = createPdfWithLetterhead(doc, 'SHOWROOM INVENTORY LEDGER', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`TOTAL VEHICLES: ${listings.length}`, margin, tableStartY + 10);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin, tableStartY + 10, { align: 'right' });

    const head = [['MAKE & MODEL', 'YEAR', 'REGISTRATION', 'MILEAGE', 'FUEL / TRANS', 'PRICE (KES)', 'STATUS']];
    const body: any[] = [];
    let totalValue = 0;

    listings.forEach(listing => {
        totalValue += listing.price || 0;
        body.push([
            `${listing.make} ${listing.model}`,
            listing.year.toString(),
            listing.registrationNumber || 'N/A',
            `${(listing.mileage || 0)?.toLocaleString()} KM`,
            `${listing.fuelType} / ${listing.transmission}`,
            (listing.price || 0)?.toLocaleString(),
            (listing.status || 'active').toUpperCase()
        ]);
    });

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: tableStartY + 20,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL SHOWROOM VALUE:', margin, finalY + 15);
    doc.text(`KES ${totalValue?.toLocaleString()}`, pageWidth - margin, finalY + 15, { align: 'right' });

    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const generateCarSalesSummaryPdf = async (
    invoices: CarInvoice[],
    payments: CarPayment[],
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    const tableStartY = createPdfWithLetterhead(doc, 'SHOWROOM SALES & REVENUE SUMMARY', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    let totalInvoiced = 0;
    let totalReceived = 0;
    let totalOutstanding = 0;

    invoices.forEach(inv => {
        if (inv.status !== 'cancelled') {
            totalInvoiced += inv.totalAmount || 0;
            totalReceived += inv.paidAmount || 0;
            totalOutstanding += inv.balanceAmount || 0;
        }
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`TOTAL INVOICES: ${invoices.length}`, margin, tableStartY + 10);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin, tableStartY + 10, { align: 'right' });

    // Summary boxes layout
    doc.setFillColor(248, 250, 252); // light slate background
    doc.rect(margin, tableStartY + 15, pageWidth - (margin * 2), 22, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL INVOICED SALES', margin + 10, tableStartY + 23);
    doc.text('TOTAL PAYMENTS RECEIVED', pageWidth / 2, tableStartY + 23, { align: 'center' });
    doc.text('TOTAL OUTSTANDING BALANCE', pageWidth - margin - 10, tableStartY + 23, { align: 'right' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`KES ${totalInvoiced?.toLocaleString()}`, margin + 10, tableStartY + 31);
    doc.text(`KES ${totalReceived?.toLocaleString()}`, pageWidth / 2, tableStartY + 31, { align: 'center' });
    doc.text(`KES ${totalOutstanding?.toLocaleString()}`, pageWidth - margin - 10, tableStartY + 31, { align: 'right' });

    const head = [['DATE', 'INVOICE #', 'CLIENT NAME', 'VEHICLE REG', 'TOTAL (KES)', 'PAID (KES)', 'BALANCE (KES)', 'STATUS']];
    const body: any[] = [];

    invoices.forEach(inv => {
        body.push([
            inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A',
            inv.invoiceNumber,
            inv.clientName,
            inv.registrationNumber || 'N/A',
            (inv.totalAmount || 0)?.toLocaleString(),
            (inv.paidAmount || 0)?.toLocaleString(),
            (inv.balanceAmount || 0)?.toLocaleString(),
            (inv.status || 'pending').toUpperCase().replace('_', ' ')
        ]);
    });

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: tableStartY + 45,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
    });

    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const downloadInvoicePdf = async (
    invoice: Invoice,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    isPlatformInvoice?: boolean
) => {
    const dataUri = await generateInvoicePdfDataUri(invoice, institution, companyDetails, logoUrl, isPlatformInvoice);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
    link.click();
};

export const generateQuotePdfDataUri = async (
    quote: Invoice,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    isPlatformInvoice?: boolean
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    // Load branding configurations
    const letterConfig = isPlatformInvoice 
        ? companyDetails?.letterheadConfig 
        : (institution?.letterheadConfig || companyDetails?.letterheadConfig);
    const headerImgUrl = letterConfig?.headerImageUrl || institution?.letterheadConfig?.headerImageUrl || institution?.headerImageUrl || (institution as any)?.header_image_url || (institution as any)?.letterheadImageUrl || companyDetails?.letterheadConfig?.headerImageUrl || companyDetails?.headerImageUrl || (companyDetails as any)?.header_image_url || null;
    const footerImgUrl = letterConfig?.footerImageUrl || institution?.letterheadConfig?.footerImageUrl || institution?.footerImageUrl || (institution as any)?.footer_image_url || companyDetails?.letterheadConfig?.footerImageUrl || companyDetails?.footerImageUrl || (companyDetails as any)?.footer_image_url || null;
    const stampImgUrl = letterConfig?.stampImageUrl || (institution as any)?.stampUrl || (institution as any)?.stamp_url || companyDetails?.letterheadConfig?.stampImageUrl || companyDetails?.stampUrl || null;
    const footerText = letterConfig?.footerText || institution?.letterheadConfig?.footerText || companyDetails?.letterheadConfig?.footerText || '';
    const logoImgUrl = isPlatformInvoice ? companyDetails?.logoUrl : (logoUrl || institution?.logoUrl || (institution as any)?.logo_url || companyDetails?.logoUrl || null);

    const headerImg = headerImgUrl ? await loadImage(headerImgUrl) : null;
    const footerImg = footerImgUrl ? await loadImage(footerImgUrl) : null;
    
    // Dynamic Kenyan Stamp generation matching physical rubber dater stamp
    let stampImg: HTMLImageElement | null = null;
    if (letterConfig?.showStamp !== false && letterConfig?.stampConfig?.mode !== 'none') {
        const dateToStamp = (quote as any)?.issueDate || new Date();
        const stampDataUri = await generateStampDataUri(letterConfig?.stampConfig, dateToStamp, institution);
        if (stampDataUri) {
            stampImg = await loadImage(stampDataUri);
        }
    } else if (stampImgUrl) {
        stampImg = await loadImage(stampImgUrl);
    }
    const logoImg = logoImgUrl ? await loadImage(logoImgUrl) : null;

    // Create Page Header with Letterhead Cascade
    const tableStartY = createPdfWithLetterhead(
        doc, 
        'QUOTATION', 
        companyDetails, 
        isPlatformInvoice ? {
            name: companyDetails.name,
            email: companyDetails.email,
            phoneNumber: companyDetails.phone,
            address: companyDetails.address
        } as Institution : (institution || {
            name: companyDetails.name,
            email: companyDetails.email,
            phoneNumber: companyDetails.phone,
            address: companyDetails.address
        } as Institution), 
        logoImg, 
        headerImg
    );
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Dynamically shift table starting position to accommodate metadata block card
    const finalTableStartY = tableStartY + 38;

    // Parse brand primary theme color for styled headers
    const themeColorHex = companyDetails?.themeColor || '#4f46e5';
    const hexToRgb = (hex: string): [number, number, number] => {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(char => char + char).join('');
        }
        const num = parseInt(cleanHex, 16);
        return [
            (num >> 16) & 255,
            (num >> 8) & 255,
            num & 255
        ];
    };
    const primaryColor = hexToRgb(themeColorHex);

    // Draw clean modern Metadata block card container
    doc.setFillColor(248, 250, 252); // Slate-50 background
    doc.setDrawColor(226, 232, 240); // Slate-200 border
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, tableStartY - 5, pageWidth - (margin * 2), 34, 2, 2, 'FD');

    // Column 1 Content: Quotation details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text('QUOTATION DETAILS', margin + 6, tableStartY + 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(`Quotation Reference:  ${quote?.invoiceNumber || 'N/A'}`, margin + 6, tableStartY + 7);
    const issueDateVal = quote?.issueDate || (quote as any)?.issue_date || (quote as any)?.createdAt;
    doc.text(`Issue Date          :  ${issueDateVal ? new Date(issueDateVal).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}`, margin + 6, tableStartY + 13);
    
    const dueDateVal = quote?.dueDate || (quote as any)?.due_date;
    const validUntil = dueDateVal ? new Date(dueDateVal) : (issueDateVal ? new Date(issueDateVal) : new Date());
    if (!dueDateVal && issueDateVal) validUntil.setDate(validUntil.getDate() + 30);
    doc.text(`Valid Until         :  ${validUntil.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, margin + 6, tableStartY + 19);

    // Column 2 Content: Payer / Bill to details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('PREPARED FOR', pageWidth / 2 + 6, tableStartY + 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    const quoteClient = quote?.clientName || (quote as any)?.client?.clientName || (quote as any)?.customerName || 'Corporate Client';
    const quoteContact = quote?.clientEmail || (quote as any)?.client?.email || (quote as any)?.clientContactPerson || 'N/A';
    const quotePhone = quote?.clientPhone || (quote as any)?.client?.phone || 'N/A';
    const quoteAddress = quote?.clientAddress || (quote as any)?.client?.address || '';
    doc.text(`Organization :  ${quoteClient}`, pageWidth / 2 + 6, tableStartY + 7);
    doc.text(`Representative: ${quoteContact}`, pageWidth / 2 + 6, tableStartY + 13);
    doc.text(`Contact Phone :  ${quotePhone}${quoteAddress ? ` | ${quoteAddress}` : ''}`, pageWidth / 2 + 6, tableStartY + 19);

    const quoteCurrency = quote?.currency || 'KES';

    // Main line items table
    const head = [['#', 'DESCRIPTION / ESTIMATED ITEM', 'QTY', `UNIT PRICE (${quoteCurrency})`, `TOTAL AMOUNT (${quoteCurrency})`]];
    const rawItems: any[] = Array.isArray(quote?.items) 
        ? quote.items 
        : (typeof (quote as any)?.items === 'string' 
            ? (() => { try { return JSON.parse((quote as any).items); } catch { return []; } })() 
            : []);

    const body = rawItems.map((item: any, index: number) => {
        const qty = Number(item.quantity) || 1;
        const amt = Number(item.amount);
        let unitPrice = Number(item.unitPrice ?? item.unit_price ?? item.rate ?? item.price);
        if (isNaN(unitPrice) || unitPrice <= 0) {
            unitPrice = (!isNaN(amt) && qty > 0) ? (amt / qty) : 0;
        }
        const finalAmt = (!isNaN(amt) && amt > 0) ? amt : (qty * unitPrice);

        const formattedUnitPrice = `${quoteCurrency} ${unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formattedTotalAmount = `${quoteCurrency} ${finalAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        return [
            index + 1,
            item.description || item.name || 'Estimated Item',
            qty,
            formattedUnitPrice,
            formattedTotalAmount
        ];
    });

    doc.autoTable({
        head: head,
        body: body,
        startY: finalTableStartY,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 }, minCellHeight: 5.5 },
        styles: { fontSize: 7.5, cellPadding: { top: 1.6, bottom: 1.6, left: 3, right: 3 }, valign: 'middle', minCellHeight: 5 },
        columnStyles: {
            0: { cellWidth: 14, halign: 'center', fontSize: 7.5 },
            1: { fontStyle: 'bold', fontSize: 8 },
            2: { halign: 'center', cellWidth: 14, fontSize: 7.5 },
            3: { halign: 'right', fontSize: 7.5 },
            4: { halign: 'right', fontStyle: 'bold', fontSize: 8 }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || (finalTableStartY + 25);

    // Financial totals summary section
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.3);
    doc.line(margin, finalY + 5, pageWidth - margin, finalY + 5);

    const subtotal = (quote as any)?.subtotal !== undefined 
        ? Number((quote as any).subtotal) 
        : rawItems.reduce((sum: number, it: any) => {
            const qty = Number(it.quantity) || 1;
            const amt = Number(it.amount);
            let unitPrice = Number(it.unitPrice ?? it.unit_price ?? it.rate ?? it.price);
            if (isNaN(unitPrice) || unitPrice <= 0) {
                unitPrice = (!isNaN(amt) && qty > 0) ? (amt / qty) : 0;
            }
            const lineAmt = (!isNaN(amt) && amt > 0) ? amt : (qty * unitPrice);
            return sum + lineAmt;
        }, 0);
    const taxRate = (quote as any)?.taxRate !== undefined ? Number((quote as any).taxRate) : Number((quote as any)?.tax_rate || 0);
    const taxAmount = (quote as any)?.taxAmount !== undefined 
        ? Number((quote as any).taxAmount) 
        : Math.round((subtotal * taxRate) / 100);
    const finalTotal = (quote as any)?.totalAmount !== undefined && (quote as any)?.taxRate !== undefined 
        ? Number((quote as any).totalAmount) 
        : (subtotal + taxAmount);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('SUBTOTAL ESTIMATE:', pageWidth - margin - 75, finalY + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${quoteCurrency} ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, finalY + 12, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`ESTIMATED TAX / VAT (${taxRate}%):`, pageWidth - margin - 75, finalY + 17);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${quoteCurrency} ${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, finalY + 17, { align: 'right' });

    // Net total paid amount container box
    const totalBoxY = finalY + 21;
    doc.setFillColor(239, 246, 255); // Indigo-50
    doc.roundedRect(pageWidth - margin - 80, totalBoxY, 80, 11, 1, 1, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(79, 70, 229); // Indigo-600 (Primary accent)
    doc.text('TOTAL ESTIMATED AMOUNT:', pageWidth - margin - 75, totalBoxY + 7);
    doc.text(`${quoteCurrency} ${finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, totalBoxY + 7, { align: 'right' });

    // Stamp / Authorized Signature
    const sigBaseY = pageHeight - 55;
    if (stampImg) {
        const stampWidth = 26;
        const stampHeight = (stampImg.height * stampWidth) / stampImg.width;
        doc.addImage(stampImg, 'PNG', pageWidth - margin - 45, sigBaseY - 14, stampWidth, stampHeight);
    }
    
    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.setLineWidth(0.4);
    doc.line(pageWidth - margin - 50, sigBaseY + 6, pageWidth - margin, sigBaseY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signature & Stamp', pageWidth - margin - 50, sigBaseY + 10);

    // Process footers on all pages
    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const downloadQuotePdf = async (
    quote: Invoice,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    isPlatformInvoice?: boolean
) => {
    const dataUri = await generateQuotePdfDataUri(quote, institution, companyDetails, logoUrl, isPlatformInvoice);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `Quotation-${quote.invoiceNumber}.pdf`;
    link.click();
};

export const generateDSQuotationPdfDataUri = async (
    lead: any,
    targetCategory: any,
    baseFeeAmount: number,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    items?: Array<{ name: string; amount: number; priority?: number }>
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    // Concurrently load logo and stamp
    let stampImg: HTMLImageElement | null = null;
    try {
        const stampUrl = institution?.letterheadConfig?.stampImageUrl || (institution as any)?.stampImageUrl || (institution as any)?.stamp_image_url;
        if (stampUrl) {
            stampImg = await loadImage(stampUrl);
        }
        if (!stampImg && institution?.letterheadConfig?.showStamp !== false) {
            const dateToStamp = new Date();
            const resolvedStampConfig = institution?.letterheadConfig?.stampConfig || {
                department: 'ADMISSIONS & BILLING',
                showStars: true,
                shape: 'circle',
                mode: 'auto',
                rotationAngle: -4,
                inkColor: '#0047AB',
                daterColor: '#DC2626'
            } as any;
            const stampDataUri = await generateStampDataUri(resolvedStampConfig, dateToStamp, institution);
            if (stampDataUri) {
                stampImg = await loadImage(stampDataUri);
            }
        }
    } catch (stampErr) {
        console.warn('[pdfService] Failed to generate stamp for DS quotation:', stampErr);
    }

    const logoImg = await loadImage(logoUrl);
    const tableStartY = createPdfWithLetterhead(doc, 'FEE STRUCTURE QUOTATION', companyDetails, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('QUOTATION REF:', pageWidth - margin - 40, margin + 55);
    doc.text('DATE ISSUED:', pageWidth - margin - 40, margin + 60);
    doc.text('VALID UNTIL:', pageWidth - margin - 40, margin + 65);

    doc.setFont('helvetica', 'normal');
    doc.text(lead.id?.toUpperCase() || 'DS-QUOTE', pageWidth - margin, margin + 55, { align: 'right' });
    doc.text(new Date().toLocaleDateString(), pageWidth - margin, margin + 60, { align: 'right' });
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    doc.text(validUntil.toLocaleDateString(), pageWidth - margin, margin + 65, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PREPARED FOR:', margin, margin + 55);
    doc.setFont('helvetica', 'normal');
    doc.text(lead.fullName || 'Walk-in Client', margin, margin + 60);
    doc.text(lead.phone || '', margin, margin + 65);
    if (lead.email) doc.text(lead.email, margin, margin + 70);

    const head = [['#', 'FEE ITEM / VOTE HEAD', 'CATEGORY', 'AMOUNT (KES)']];
    const catName = targetCategory ? `${targetCategory.name} (${targetCategory.code})` : (lead.licenseTypeInterested || 'Class B');
    
    // Resolve itemized vote heads from items argument or lead.items
    let quoteItems: Array<{ name: string; amount: number }> = [];
    if (Array.isArray(items) && items.length > 0) {
        quoteItems = items;
    } else if (Array.isArray(lead.items) && lead.items.length > 0) {
        quoteItems = lead.items;
    } else {
        // Fallback split if no custom fee structure / vote heads provided
        const pdlFee = Math.min(1450, Math.floor(baseFeeAmount * 0.1));
        const testFee = Math.min(2500, Math.floor(baseFeeAmount * 0.15));
        const tuitionFee = Math.max(0, baseFeeAmount - pdlFee - testFee);
        quoteItems = [
            { name: 'Standard Tuition & Instruction Fee', amount: tuitionFee },
            { name: 'NTSA PDL (Provisional Driving License) Processing', amount: pdlFee },
            { name: 'Practical & Theory Test Booking Fee', amount: testFee }
        ];
    }

    const body = quoteItems.map((item, idx) => [
        idx + 1,
        item.name,
        catName,
        Number(item.amount || 0).toLocaleString()
    ]);

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: tableStartY + 10,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
    });

    const finalY = ((doc as any).lastAutoTable?.finalY || (tableStartY + 50)) + 12;
    const computedTotal = quoteItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
    const displayTotal = baseFeeAmount > 0 ? baseFeeAmount : computedTotal;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('TOTAL ESTIMATED FEES:', pageWidth - margin - 65, finalY);
    doc.text(`KES ${displayTotal?.toLocaleString()}`, pageWidth - margin, finalY, { align: 'right' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Note: Fees are subject to official NTSA compliance policies and registration rules. Valid for 30 days.', margin, finalY + 10);

    // Official Verification / Stamp block
    const signY = finalY + 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('OFFICIAL QUOTATION VERIFICATION', margin, signY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Issued By: Admissions & Accounts Officer`, margin, signY + 5.5);
    doc.text(`Print Date: ${new Date().toLocaleString()}`, margin, signY + 10.5);
    doc.text('Acknowledgement: Quotation valid for 30 calendar days from issue date.', margin, signY + 15.5);

    doc.setDrawColor(203, 213, 225);
    doc.line(pageWidth - margin - 60, signY + 12, pageWidth - margin, signY + 12);
    doc.setFontSize(7.5);
    doc.text('Authorized Signature & Stamp', pageWidth - margin - 60, signY + 17);

    // Embed Stamp Image
    if (stampImg) {
        try {
            const stampSize = 32;
            const stampAspect = stampImg.height > 0 ? stampImg.width / stampImg.height : 1;
            const stampW = stampAspect >= 1 ? stampSize : stampSize * stampAspect;
            const stampH = stampAspect >= 1 ? stampSize / stampAspect : stampSize;
            const stampDrawX = pageWidth - margin - 52;
            const stampDrawY = signY - stampH + 11;
            let format = 'PNG';
            if (stampImg.src?.startsWith('data:image/jpeg') || stampImg.src?.startsWith('data:image/jpg')) format = 'JPEG';
            doc.addImage(stampImg, format, stampDrawX, stampDrawY, stampW, stampH);
        } catch (imgErr) {
            console.warn('[pdfService] Could not embed stamp image in quotation:', imgErr);
        }
    }

    return doc.output('datauristring');
};

export const generateRetailReceiptPdf = async (
    saleData: any,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    isReprint: boolean = false,
    isEducation: boolean = false
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");

    // 80mm Thermal Receipt (width: 80mm, dynamic height)
    // We estimate height based on items
    const baseHeight = isEducation ? 170 : 150;
    const itemHeight = 10;
    const itemsCount = saleData.items?.length || 0;
    const estimatedHeight = baseHeight + (itemsCount * itemHeight);

    // Create jsPDF instance with custom dimensions for thermal printer
    const doc = new lib.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, estimatedHeight]
    });

    const logoImg = await loadImage(logoUrl);
    const margin = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 10;

    // Center alignment helper
    const centerText = (text: string, y: number) => {
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // 1. Header (Logo & Clinic/Store Name)
    if (logoImg) {
        const logoWidth = 20;
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        doc.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, yPos, logoWidth, logoHeight);
        yPos += logoHeight + 5;
    }

    doc.setFontSize(isEducation ? 11 : 14);
    doc.setFont('helvetica', 'bold');
    centerText(institution.name || 'Learning Institution', yPos);
    yPos += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (institution.phoneNumber) {
        centerText(`Tel: ${institution.phoneNumber}`, yPos);
        yPos += 4;
    }
    if (institution.email) {
        centerText(`Email: ${institution.email}`, yPos);
        yPos += 4;
    }

    yPos += 2;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0); // reset
    yPos += 6;

    // 2. Receipt Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    if (isReprint) {
        centerText("*** REPRINT ***", yPos);
        yPos += 6;
    }
    centerText(isEducation ? "STOCK ISSUANCE NOTE" : "SALES RECEIPT", yPos);
    yPos += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(saleData.createdAt || new Date())?.toLocaleString()}`, margin, yPos);
    yPos += 4;
    doc.text(`${isEducation ? 'Issue Note #' : 'Receipt #'}: ${saleData.id?.substring(0, 8).toUpperCase() || 'N/A'}`, margin, yPos);
    yPos += 4;
    doc.text(`${isEducation ? 'Storekeeper' : 'Cashier'}: ${saleData.agentId ? 'Agent ' + saleData.agentId.substring(0, 4) : 'Main Store'}`, margin, yPos);
    yPos += 4;

    if (saleData.customerName) {
        doc.text(`${isEducation ? 'Recipient' : 'Customer'}: ${saleData.customerName}`, margin, yPos);
        yPos += 4;
    }

    yPos += 2;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 6;

    // 3. Items Header
    doc.setFont('helvetica', 'bold');
    doc.text("Item", margin, yPos);
    if (isEducation) {
        doc.text("Qty Issued", pageWidth - margin, yPos, { align: 'right' });
    } else {
        doc.text("Qty", 45, yPos, { align: 'right' });
        doc.text("Total", pageWidth - margin, yPos, { align: 'right' });
    }
    yPos += 4;

    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // 4. Items List
    doc.setFont('helvetica', 'normal');
    let totalItems = 0;
    (saleData.items || []).forEach((item: any) => {
        const itemName = item.name.length > 20 ? item.name.substring(0, 18) + '...' : item.name;
        doc.text(itemName, margin, yPos);

        if (isEducation) {
            doc.text(`${item.quantity}`, pageWidth - margin, yPos, { align: 'right' });
        } else {
            doc.text(`${item.quantity} x ${item.unitPrice}`, 45, yPos, { align: 'right' });
            const lineTotal = item.quantity * item.unitPrice;
            doc.text(lineTotal?.toLocaleString(), pageWidth - margin, yPos, { align: 'right' });
        }

        yPos += 5;
        totalItems += item.quantity;
    });

    yPos += 2;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 6;

    // 5. Totals & Summaries
    if (isEducation) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("TOTAL ITEMS ISSUED:", margin, yPos);
        doc.text(totalItems.toString(), pageWidth - margin, yPos, { align: 'right' });
        yPos += 10;

        // Dotted Signature Line
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("Recipient Signature:", margin, yPos);
        yPos += 8;
        doc.setLineDashPattern([1, 1], 0);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        doc.setLineDashPattern([], 0);
        yPos += 8;
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("TOTAL DUE:", 30, yPos);
        doc.text(`Kes ${saleData.totalAmount?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 6;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("Payment Method:", 30, yPos);
        doc.text(saleData.paymentMethod?.toUpperCase() || 'CASH', pageWidth - margin, yPos, { align: 'right' });
        yPos += 6;

        doc.text("Items Count:", 30, yPos);
        doc.text(totalItems.toString(), pageWidth - margin, yPos, { align: 'right' });
        yPos += 8;
    }

    // 6. Footer
    doc.setFont('helvetica', 'italic');
    centerText(isEducation ? "Issued for Academic Use Only" : "Thank you for your business!", yPos);
doc.setFontSize(6);
    centerText("Powered by Eduai Automation", yPos);

    return doc.output('bloburl');
};

export const downloadReceiptPdf = async (
    receipt: Receipt,
    transaction: MpesaTransaction,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    invoiceBalance?: number,
    accountantName?: string,
    studentInfo?: {
        name?: string;
        admNo?: string;
        studentClass?: string;
    }
) => {
    const dataUri = await generateReceiptPdfDataUri(receipt, transaction, institution, companyDetails, logoUrl, invoiceBalance, accountantName, studentInfo);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `Receipt-${receipt.receiptNumber || 'Official'}.pdf`;
    link.click();
};

export const generateFinanceEposThermalReceiptPdfDataUri = async (
    receipt: Receipt,
    student: User | null | undefined,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    extraMeta?: { 
        studentClass?: string; 
        invoiceDetails?: any; 
        isReprint?: boolean; 
        previousBalance?: number; 
        remainingBalance?: number;
        admNo?: string;
        studentAdmNo?: string;
        admissionNumber?: string;
        studentName?: string;
        accountantName?: string;
        servedBy?: string;
        parentPortalUrl?: string;
        portalUrl?: string;
    }
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");

    // Standard 80mm EPOS Thermal Spool format
    const baseHeight = 205;
    const itemsCount = ((receipt as any).items || []).length || 1;
    const estimatedHeight = Math.max(185, baseHeight + (itemsCount * 8));

    const doc = new lib.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, estimatedHeight]
    });

    const logoImg = await loadImage(logoUrl);
    const margin = 4;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 8;

    const centerText = (text: string, y: number) => {
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // 1. Institution Branding & Header
    if (logoImg) {
        const logoWidth = 18;
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        doc.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, yPos, logoWidth, logoHeight);
        yPos += logoHeight + 4;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    centerText(institution?.name || 'INSTITUTION RECEIPT', yPos);
    yPos += 4;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    if (institution?.location) {
        const locStr = typeof institution.location === 'string' ? institution.location : 'Finance & Accounting Division';
        centerText(locStr.substring(0, 38), yPos);
        yPos += 3.5;
    }
    const instPhone = institution?.phoneNumber || (institution as any)?.phone;
    if (instPhone) {
        centerText(`Tel: ${instPhone}`, yPos);
        yPos += 3.5;
    }
    if (institution?.email) {
        centerText(institution.email, yPos);
        yPos += 3.5;
    }

    // Line divider
    yPos += 1;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 5;

    // 2. Receipt Badge
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    if (extraMeta?.isReprint) {
        centerText("*** COPY ***", yPos);
        yPos += 4;
    }
    centerText("EPOS OFFICIAL FEE RECEIPT", yPos);
    yPos += 5;

    // 3. Key Transaction Details
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    
    const recNo = receipt.receiptNumber || receipt.id || 'REC-000';
    doc.text(`Receipt No: ${recNo}`, margin, yPos);
    yPos += 3.8;

    const formattedDate = receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleString('en-GB') : new Date().toLocaleString('en-GB');
    doc.text(`Date: ${formattedDate}`, margin, yPos);
    yPos += 3.8;

    const payerName = (receipt as any).payerName || (receipt as any).studentName;
    const resolvedStudentName = extraMeta?.studentName || student?.name || (receipt as any).studentName || (receipt as any).student_name || payerName;
    const resolvedAdm = extraMeta?.studentAdmNo || 
                        extraMeta?.admNo || 
                        extraMeta?.admissionNumber || 
                        student?.admissionNumber || 
                        (student as any)?.admission_number || 
                        (student as any)?.admNo || 
                        (student as any)?.adm_no || 
                        (student as any)?.staffId || 
                        (student as any)?.staff_id || 
                        (student as any)?.customStudentId || 
                        (student as any)?.registrationNumber || 
                        (student as any)?.metadata?.admissionNumber || 
                        (student as any)?.metadata?.admission_number || 
                        (student as any)?.metadata?.admNo || 
                        (student as any)?.metadata?.staffId || 
                        (receipt as any)?.admissionNumber || 
                        (receipt as any)?.admission_number || 
                        (receipt as any)?.admNo || 
                        (receipt as any)?.studentAdmissionNumber || 
                        (receipt as any)?.metadata?.admissionNumber || 
                        'N/A';

    if (student || resolvedStudentName) {
        doc.text(`Student: ${resolvedStudentName || 'N/A'}`, margin, yPos);
        yPos += 3.8;

        doc.text(`Adm No: ${resolvedAdm}`, margin, yPos);
        yPos += 3.8;

        const resolvedClass = extraMeta?.studentClass || (student ? (student as any).studentClass || (student as any).grade : '') || (receipt as any).studentClass || (receipt as any).grade;
        if (resolvedClass) {
            doc.text(`Class: ${resolvedClass}`, margin, yPos);
            yPos += 3.8;
        }
    } else if (payerName || receipt.paidFor) {
        doc.text(`Payer: ${payerName || 'Walk-in / Client'}`, margin, yPos);
        yPos += 3.8;
    }

    doc.text(`Payment Mode: ${receipt.paymentMethod || 'Cash'}`, margin, yPos);
    yPos += 3.8;

    if (receipt.relatedTransactionId) {
        doc.text(`Ref/Txn ID: ${receipt.relatedTransactionId}`, margin, yPos);
        yPos += 3.8;
    }

    const resolvedAccountant = extraMeta?.accountantName || 
                               extraMeta?.servedBy || 
                               (receipt as any).accountantName || 
                               (receipt as any).accountant || 
                               (receipt as any).issuedBy || 
                               (receipt as any).servedBy || 
                               (receipt as any).cashier || 
                               (receipt as any).cashierName || 
                               (receipt as any).createdByName || 
                               (receipt as any).metadata?.issuedBy || 
                               (receipt as any).metadata?.accountantName || 
                               (receipt as any).metadata?.servedBy || 
                               '';
    if (resolvedAccountant) {
        doc.text(`Accountant: ${resolvedAccountant}`, margin, yPos);
        yPos += 3.8;
    }

    // Line divider
    yPos += 1;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 5;

    // 4. Line Items Table Header
    doc.setFont('helvetica', 'bold');
    doc.text("Description", margin, yPos);
    doc.text("Amount (KES)", pageWidth - margin, yPos, { align: 'right' });
    yPos += 4;

    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // Line Items Content
    doc.setFont('helvetica', 'normal');
    let rawItems = (receipt as any).items || (receipt as any).allocations || (receipt as any).voteheadsBreakdown || (receipt as any).voteHeadBreakdown;
    if (typeof rawItems === 'string') {
        try { rawItems = JSON.parse(rawItems); } catch(e) {}
    }
    const items = Array.isArray(rawItems) && rawItems.length > 0 
        ? rawItems 
        : [{ name: receipt.paidFor || 'Academic Tuition & School Fees', amount: receipt.amountPaid }];

    for (const item of items) {
        const itemTitle = (item.name || item.description || 'Fee Payment').substring(0, 24);
        const itemAmount = (item.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });
        doc.text(itemTitle, margin, yPos);
        doc.text(itemAmount, pageWidth - margin, yPos, { align: 'right' });
        yPos += 4.5;
    }

    // Line divider
    yPos += 2;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 5;

    // Totals Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("TOTAL AMOUNT PAID:", margin, yPos);
    doc.text(`KES ${(receipt.amountPaid || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;

    if (extraMeta?.previousBalance !== undefined) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text("Previous Balance:", margin, yPos);
        doc.text(`KES ${extraMeta.previousBalance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 4;
    }

    if (extraMeta?.remainingBalance !== undefined) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text("Outstanding Balance:", margin, yPos);
        doc.text(`KES ${extraMeta.remainingBalance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 5;
    }

    // Footer barcode & thank you text
    yPos += 3;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 5;

    if (resolvedAccountant) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        centerText(`Issued by: ${resolvedAccountant}`, yPos);
        yPos += 4.2;
    }

    // QR Code for Parents Portal Access
    const portalOrigin = typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')
        ? window.location.origin
        : ((institution as any)?.portalUrl || (institution as any)?.website || 'https://portal.eduai.co.ke');

    const parentPortalUrl = extraMeta?.parentPortalUrl || 
                            extraMeta?.portalUrl || 
                            `${portalOrigin}/?view=parent-ledger&adm=${encodeURIComponent(resolvedAdm !== 'N/A' ? resolvedAdm : '')}&inst=${encodeURIComponent(institution?.id || '')}`;

    try {
        if (typeof window !== 'undefined' && (window as any).QRCode) {
            const QRCodeLib = (window as any).QRCode;
            const qrDataUri: string = await new Promise((resolve, reject) => {
                QRCodeLib.toDataURL(parentPortalUrl, { margin: 1, width: 140, errorCorrectionLevel: 'M' }, (err: any, url: string) => {
                    if (err) reject(err);
                    else resolve(url);
                });
            });

            if (qrDataUri) {
                const qrImg = await loadImage(qrDataUri);
                if (qrImg) {
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    centerText("PARENTS PORTAL ACCESS", yPos);
                    yPos += 3.5;

                    doc.setFontSize(5.8);
                    doc.setFont('helvetica', 'normal');
                    centerText("Scan to view fee statements & live balance", yPos);
                    yPos += 2.5;

                    const qrSize = 22;
                    const qrX = (pageWidth - qrSize) / 2;
                    doc.addImage(qrImg, 'PNG', qrX, yPos, qrSize, qrSize);
                    yPos += qrSize + 3;
                }
            }
        }
    } catch (err) {
        console.warn("Could not render QR code for parent portal:", err);
    }

    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    centerText("Thank you for your payment!", yPos);
    yPos += 4;

    doc.setFont('helvetica', 'normal');
    centerText("Valid EPOS Electronic Receipt", yPos);
    yPos += 4;

    centerText(`*${recNo}*`, yPos);

    return doc.output('datauristring');
};

export const downloadFinanceEposThermalReceiptPdf = async (
    receipt: Receipt,
    student: User | null | undefined,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    extraMeta?: { 
        studentClass?: string; 
        invoiceDetails?: any; 
        isReprint?: boolean; 
        previousBalance?: number; 
        remainingBalance?: number;
        admNo?: string;
        studentAdmNo?: string;
        admissionNumber?: string;
        studentName?: string;
        accountantName?: string;
        servedBy?: string;
        parentPortalUrl?: string;
        portalUrl?: string;
    }
) => {
    const dataUri = await generateFinanceEposThermalReceiptPdfDataUri(receipt, student, institution, companyDetails, logoUrl, extraMeta);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `EPOS-Receipt-${receipt.receiptNumber || receipt.id}.pdf`;
    link.click();
};

export const generateUserListPdf = async (
    users: User[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null,
    departments: Department[],
    courses: Course[],
    institution: Institution
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
            formatRoleDisplayName(u.role, institution),
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

export const generateVisitorHistoryPdf = async (
    visitors: Visitor[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null,
    users: User[],
    institution: Institution
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

    const head = [['Name', 'Contact Info', 'Purpose', 'Host / Destination', 'Assets (Plate)', 'Date / Time In', 'Checkout Time']];
    const body = (visitors || []).map(v => {
        const host = (users || []).find(u => u.id === v.hostId);
        const hostName = v.hostName ? `${v.hostName} (Reception)` : (host ? host.name : 'N/A');
        const assets = v.vehiclePlate ? `${v.vehiclePlate} (${v.vehicleModel || ''})` : 'Pedestrian';
        return [
            v.name || v.fullName || 'Unknown',
            `${v.phoneNumber || ''}${v.idNumber ? ` (ID: ${v.idNumber})` : ''}`,
            v.purpose || 'General',
            hostName,
            assets,
            `${v.visitDate || ''} ${v.timeIn || ''}`,
            v.timeOut || 'Active'
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
        doc.text(`Authenticated on: ${new Date((contract as any).acceptanceTimestamp || Date.now())?.toLocaleString()}`, margin, yPos);
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
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 12;

    // Summary Statistics Cards (Row layout)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    let xPos = margin;
    const cardWidth = (pageWidth - (margin * 2)) / 4;

    (summaryStats || []).forEach(s => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(s.label.toUpperCase(), xPos, yPos);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(45, 55, 72);
        doc.text(String(s.value), xPos, yPos + 7);
        xPos += cardWidth;
    });

    yPos += 20;

    // Faculty Workload Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text("Faculty Workload Summary", margin, yPos);
    yPos += 5;

    const workloadHead = [['Faculty Member', 'Allocated Units', 'Rooms', 'Cnt', 'Periods', 'Hrs/Wk']];
    const workloadBody = (lecturerWorkload || []).map(lec => [
        lec.name,
        lec.subjectNames || 'None',
        lec.roomNames || 'N/A',
        lec.subjectCount,
        lec.totalPeriods,
        lec.totalHours.toFixed(1)
    ]);

    const grandTotalHours = (lecturerWorkload || []).reduce((sum, lec) => sum + lec.totalHours, 0);
    const grandTotalPeriods = (lecturerWorkload || []).reduce((sum, lec) => sum + lec.totalPeriods, 0);

    doc.autoTable({
        startY: yPos,
        head: workloadHead,
        body: workloadBody,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30 },
            3: { cellWidth: 10, halign: 'center' },
            4: { cellWidth: 15, halign: 'center' },
            5: { cellWidth: 15, halign: 'center' }
        },
        foot: [[
            { content: 'GRAND TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: String(grandTotalPeriods), styles: { halign: 'center', fontStyle: 'bold' } },
            { content: `${grandTotalHours.toFixed(1)} Hrs`, styles: { halign: 'center', fontStyle: 'bold' } }
        ]],
        footStyles: { fillColor: [240, 240, 240], textColor: 0 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Subject Allocation Status
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Subject Allocation Audit", margin, yPos);
    yPos += 5;

    const subjectHead = [['Code', 'Subject Name', 'Department', 'Status']];
    const subjectBody = (subjectAllocationStatus || []).map(s => [
        s.code,
        s.name,
        s.departmentName,
        s.allocatedPeriods > 0 ? 'ALLOCATED' : 'PENDING'
    ]);

    doc.autoTable({
        startY: yPos,
        head: subjectHead,
        body: subjectBody,
        theme: 'striped',
        headStyles: { fillColor: [74, 85, 104], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7 },
        columnStyles: {
            3: { fontStyle: 'bold', textColor: [0, 100, 0] } // Default green for status
        },
        didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 3) {
                if (data.cell.raw === 'PENDING') {
                    data.cell.styles.textColor = [200, 0, 0];
                }
            }
        }
    });

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
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, yPos);
    yPos += 10;

    const head = [['Room / Facility', 'Capacity', 'Utilization %', 'Occupancy Attribution']];
    const body = (data || []).map(d => {
        const attribution = Object.entries(d.usageBreakdown || {})
            .map(([cls, hrs]) => `${cls}: ${Number(hrs).toFixed(1)}h`)
            .join(', ');

        return [
            d.room.name, 
            d.room.capacity, 
            `${d.utilizationPercentage.toFixed(1)}%`,
            attribution || 'No active sessions'
        ];
    });

    doc.autoTable({ 
        startY: yPos, 
        head, 
        body, 
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8 },
        columnStyles: {
            3: { cellWidth: 80 } // Give more space for attribution strings
        }
    });

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
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("Room Allocation Advisory Report", margin, yPos);
    yPos += 12;

    // Summary Section
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 25, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text("REPORT SUMMARY", margin + 5, yPos + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Concurrent Room Capacity: ${totalRooms}`, margin + 5, yPos + 16);
    doc.text(`Detected Conflicting Time Slots: ${conflicts.length}`, margin + 80, yPos + 16);
    yPos += 35;

    if (conflicts.length > 0) {
        const head = [['Day', 'Time Slot', 'Lessons', 'Capacity', 'Shortfall']];
        const body = conflicts.map(c => [
            c.day,
            `${c.startTime} - ${c.endTime}`,
            c.concurrentLessons.toString(),
            totalRooms.toString(),
            { content: c.roomShortfall.toString(), styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }
        ]);

        (doc as any).autoTable({
            startY: yPos,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 3 },
            margin: { left: margin }
        });
    } else {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        doc.text("No room allocation conflicts were detected in the current timetable configuration.", margin, yPos);
    }

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
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Student Timetable: ${student.name}`, margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${course.name} - ${level.name} (${student.staffId || 'No ID'})`, margin, yPos);
    yPos += 12;

    const days = timetableSettings?.operatingDays || [];
    const head = [['Day', 'Time', 'Subject', 'Lecturer', 'Room']];

    // Day order for sorting
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedEntries = [...entries].sort((a, b) => {
        const d1 = dayOrder.indexOf(a.day);
        const d2 = dayOrder.indexOf(b.day);
        if (d1 !== d2) return d1 - d2;
        return a.startTime.localeCompare(b.startTime);
    });

    const body = sortedEntries.map(e => {
        const s = getSubjectById(e.subjectId);
        const l = getLecturerById(e.lecturerId);
        const r = getRoomById(e.roomId);
        return [
            e.day,
            `${e.startTime} - ${e.endTime}`,
            s?.name || s?.code || 'N/A',
            l?.name || 'N/A',
            r?.name || 'N/A'
        ];
    });

    (doc as any).autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: margin }
    });

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
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("Industrial Attachment / Internship Report", margin, yPos);
    yPos += 12;

    // Student & Internship Details Table
    const detailsHead = [['Attribute', 'Details']];
    const detailsBody = [
        ['Student Name', student.name],
        ['Registration Number', student.staffId || 'N/A'],
        ['Course of Study', courseName],
        ['Company/Organization', internship.industryName],
        ['Position', (internship as any).position || 'Student Intern'],
        ['Duration', `${new Date(internship.startDate).toLocaleDateString()} to ${new Date(internship.endDate).toLocaleDateString()}`],
        ['Supervisor', (internship as any).supervisorName || 'N/A']
    ];

    (doc as any).autoTable({
        startY: yPos,
        head: detailsHead,
        body: detailsBody,
        theme: 'grid',
        headStyles: { fillColor: [74, 85, 104], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: margin },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Report Content
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Internship Summary & Activities", margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitReport = doc.splitTextToSize(report || "No activity report provided.", pageWidth - (margin * 2));
    doc.text(splitReport, margin, yPos);

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
                if (preview && doc.internal.getNumberOfPages() >= 2) break;

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

                            const isBreak = slot.isBreak;
                            const breakText = (slot.label || 'BREAK').split('').join('\n');

                            const entries = (generatedTimetable || []).filter(e =>
                                e.day === day &&
                                (String(e.courseLevelId) === String(level.id) || String((e as any).courseLevelId) === String(level.id) || String((e as any).course_level_id) === String(level.id)) &&
                                timeToMinutes(e.startTime) === slotStartMinutes
                            );

                            if (isBreak) {
                                // Calculate break colSpan to ensure display consistency
                                const slotEndMinutes = timeToMinutes(slot.end);
                                const breakObj = timetableSettings.breaks.find(b => b.status !== 'inactive' && b.startTime === slot.start);
                                let colSpan = 1;
                                if (breakObj) {
                                  const breakEndMinutes = timeToMinutes(breakObj.endTime);
                                  if (breakEndMinutes > slotEndMinutes) {
                                      for (let k = i + 1; k < displaySlots.length; k++) {
                                          if (timeToMinutes(displaySlots[k].start) < breakEndMinutes) {
                                              colSpan++;
                                          } else {
                                              break;
                                          }
                                      }
                                  }
                                }
                                
                                row.push({ 
                                  content: breakText, 
                                  colSpan, 
                                  styles: { halign: 'center', valign: 'middle', fontSize: 9, fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [150, 150, 150], cellPadding: 1 } 
                                });
                                for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                                i += colSpan - 1;
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
                                    const lecturerInitials = l ? l.name.split(' ').map((n: string) => n[0]).join('') : '';
                                    return [
                                        s?.shortName || s?.code || 'N/A',
                                        lecturerInitials ? `${lecturerInitials} • ${r?.name || ''}` : r?.name || ''
                                    ].filter(Boolean).join('\n');
                                }).join('\n---\n');

                                const slotEndMinutes = timeToMinutes(displaySlots[i].end);
                                const maxEntryEndMinutes = Math.max(...entries.map(e => timeToMinutes(e.endTime)));

                                // Calculate colSpan based on how many periods this lesson actually covers
                                let colSpan = 1;
                                if (maxEntryEndMinutes > slotEndMinutes) {
                                    for (let k = i + 1; k < displaySlots.length; k++) {
                                        if (timeToMinutes(displaySlots[k].start) < maxEntryEndMinutes) {
                                            colSpan++;
                                        } else {
                                            break;
                                        }
                                    }
                                }
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
            }
        } else {
            // --- VERTICAL LAYOUT ---

            // Proceed with Main Timetable Blocks
            for (const course of (courses || [])) {
                if (!course) continue;
                for (const level of (course.levels || [])) {
                    if (!level) continue;
                    if (preview && pageCount >= 1) break;

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
                    const classEntries = (generatedTimetable || []).filter(e => (String(e.courseLevelId) === String(level.id) || String((e as any).course_level_id) === String(level.id)));
                    const classLecturerWorkload = new Map<string, { periods: number, subjects: Set<string> }>();

                    classEntries.forEach(e => {
                        const lStat = classLecturerWorkload.get(e.lecturerId) || { periods: 0, subjects: new Set() };
                        lStat.periods += 1;
                        lStat.subjects.add(e.subjectId);
                        classLecturerWorkload.set(e.lecturerId, lStat);
                    });

                    const workloadBody = Array.from(classLecturerWorkload.entries()).map(([id, stats]) => {
                        const l = getLecturerById(id);
                        const subjNames = Array.from(stats.subjects).map(sid => {
                            const s = getSubjectById(sid);
                            // Find metadata for this subject in this level to get dedicated room
                            const subjMeta = (level.subjectMetadata || []).find(m => m.subjectId === sid);
                            const roomId = subjMeta?.dedicatedRoomId;
                            const r = roomId ? getRoomById(roomId) : undefined;
                            const roomText = r ? ` (${r.name})` : '';
                            return (s?.shortName || s?.code || 'Unknown') + roomText;
                        }).join(', ');
                        return [l?.name || 'Unknown', subjNames, stats.periods];
                    }).sort((a, b) => String(a[0]).localeCompare(String(b[0])));

                    (doc as any).autoTable({
                        startY: yPos,
                        head: [['Staff Name', 'Subjects Taught', 'Periods']],
                        body: workloadBody,
                        theme: 'striped',
                        headStyles: { fillColor: [45, 55, 72] },
                        styles: { fontSize: 7, cellPadding: 1.5 },
                        margin: { left: margin, right: margin, bottom: 25 }
                    });

                    yPos = (doc as any).lastAutoTable.finalY + 10;

                    // Check space before starting timetable (Relaxed check to allow fitting on same page)
                    if (yPos > doc.internal.pageSize.getHeight() - 20) {
                        doc.addPage();
                        yPos = setupPdfHeader(doc, headerImg);
                    }

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

                            const isBreak = slot.isBreak;
                            const breakText = (slot.label || 'BREAK').split('').join('\n');
                            const entries = (generatedTimetable || []).filter(e =>
                                e.day === day &&
                                (String(e.courseLevelId) === String(level.id) || String((e as any).courseLevelId) === String(level.id) || String((e as any).course_level_id) === String(level.id)) &&
                                timeToMinutes(e.startTime) === slotStartMinutes
                            );

                            if (isBreak) {
                                // Calculate break colSpan
                                const slotEndMinutes = timeToMinutes(slot.end);
                                const breakObj = timetableSettings.breaks.find(b => b.status !== 'inactive' && b.startTime === slot.start);
                                let colSpan = 1;
                                if (breakObj) {
                                  const breakEndMinutes = timeToMinutes(breakObj.endTime);
                                  if (breakEndMinutes > slotEndMinutes) {
                                      for (let k = i + 1; k < displaySlots.length; k++) {
                                          if (timeToMinutes(displaySlots[k].start) < breakEndMinutes) {
                                              colSpan++;
                                          } else {
                                              break;
                                          }
                                      }
                                  }
                                }

                                if (dIndex === 0) {
                                    row.push({
                                        content: breakText,
                                        colSpan: colSpan,
                                        rowSpan: days.length,
                                        styles: {
                                            halign: 'center',
                                            valign: 'middle',
                                            fontSize: 8,
                                            fillColor: [240, 240, 240],
                                            fontStyle: 'bold',
                                            textColor: [100, 100, 100],
                                            cellPadding: 1
                                        }
                                    });
                                }
                                for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                                i += colSpan - 1;
                            } else if (entries.length > 0) {
                                const isBlock = entries.length > 1;
                                const firstEntry = entries[0];
                                const text = entries.map(e => {
                                    const s = getSubjectById(e.subjectId);
                                    // Room info hidden for list layout as requested
                                    return s?.shortName || s?.code || 'N/A';
                                }).join('\n---\n');

                                const slotEndMinutes = timeToMinutes(periodHeaders[i].endTime); 
                                const maxEntryEndMinutes = Math.max(...entries.map(e => timeToMinutes(e.endTime)));

                                // Calculate colSpan based on how many periods this lesson actually covers
                                let colSpan = 1;
                                if (maxEntryEndMinutes > slotEndMinutes) {
                                    for (let k = i + 1; k < periodHeaders.length; k++) {
                                        if (timeToMinutes(periodHeaders[k].startTime) < maxEntryEndMinutes) {
                                            colSpan++;
                                        } else {
                                            break;
                                        }
                                    }
                                }
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
                            fontSize: 7,
                            cellPadding: 1.5,
                            lineWidth: 0.1,
                            overflow: 'linebreak',
                            valign: 'middle',
                            halign: 'center'
                        },
                        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                        columnStyles: {
                            0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 20, halign: 'left' }
                        },
                        pageBreak: 'avoid',
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
                    if (preview && pageCount >= 1) {
                        setupPdfFooter(doc, footerImg);
                        return doc.output('blob');
                    }
                }
                if (preview && pageCount >= 1) break;
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
    doc.text(`Generated: ${new Date()?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
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
        ['1. Class Teacher', req.classTeacherName, 'AUTHORIZED', req.createdAt ? new Date(req.createdAt)?.toLocaleString() : '---'],
        ['2. Boarding Master', req.boardingMasterName || '---', req.boardingMasterName ? 'CHECKED OUT' : 'PENDING', req.houseCheckedOutAt ? new Date(req.houseCheckedOutAt)?.toLocaleString() : '---'],
        ['3. Security Gate', req.securityName || '---', req.securityName ? 'EXIT GRANTED' : 'PENDING', req.gateCheckedOutAt ? new Date(req.gateCheckedOutAt)?.toLocaleString() : '---'],
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
            if (preview && doc.internal.getNumberOfPages() >= 2) break;

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

                        if (slot.isBreak) {
                            const breakText = (slot.label || 'BREAK').split('').join('\n');
                            const slotEndMinutes = timeToMinutes(slot.end);
                            const breakObj = timetableSettings.breaks.find(b => b.status !== 'inactive' && b.startTime === slot.start);
                            let colSpan = 1;
                            if (breakObj) {
                                const breakEndMinutes = timeToMinutes(breakObj.endTime);
                                if (breakEndMinutes > slotEndMinutes) {
                                    for (let k = i + 1; k < displaySlots.length; k++) {
                                        if (timeToMinutes(displaySlots[k].start) < breakEndMinutes) {
                                            colSpan++;
                                        } else {
                                            break;
                                        }
                                    }
                                }
                            }

                            row.push({
                                content: breakText, colSpan,
                                styles: { halign: 'center', valign: 'middle', fontSize: 9, fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [150, 150, 150], cellPadding: 1 }
                            });
                            for (let k = 0; k < colSpan; k++) rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                            i += colSpan - 1;
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

export const generateLecturerTimetablePdf = async (
    generatedTimetable: TimetableEntry[],
    lecturers: User[],
    title: string,
    subtitle: string,
    letterheadConfig: LetterheadConfig,
    footerImageUrl: string | null,
    logoUrl: string | null,
    academicYearName: string,
    semesterName: string,
    timetableSettings: TimetableSettings,
    getSubjectById: (id: string) => Subject | undefined,
    getRoomById: (id: string) => Room | undefined,
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

        const days = timetableSettings?.operatingDays || [];
        const periodHeaders = generatePeriodLabels(timetableSettings, true);
        const displaySlots = generateDisplaySlots(timetableSettings, true);
        let pageCount = 0;

        for (const lecturer of lecturers) {
            if (preview && pageCount >= 1) break;

            if (pageCount > 0) {
                doc.addPage();
                yPos = setupPdfHeader(doc, headerImg);
            }
            pageCount++;

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`${lecturer.name} - Timetable`, margin, yPos);
            yPos += 7;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${academicYearName} ${semesterName ? `- ${semesterName}` : ''}`, margin, yPos);
            yPos += 10;

            const lecturerEntries = (generatedTimetable || []).filter(e => e.lecturerId === lecturer.id);
            const workloadStats = {
                periods: lecturerEntries.length,
                hours: lecturerEntries.reduce((acc, e) => acc + (timeToMinutes(e.endTime) - timeToMinutes(e.startTime)) / 60, 0),
                subjects: new Set(lecturerEntries.map(e => e.subjectId)).size
            };

            const workloadBody = [
                ['Total Periods', workloadStats.periods.toString()],
                ['Total Hours', workloadStats.hours.toFixed(1)],
                ['Distinct Subjects', workloadStats.subjects.toString()]
            ];

            // Workload Summary - Compact
            (doc as any).autoTable({
                startY: yPos,
                head: [['Metric', 'Value']],
                body: workloadBody,
                theme: 'striped',
                headStyles: { fillColor: [45, 55, 72], fontSize: 7, fontStyle: 'bold' },
                styles: { fontSize: 7, cellPadding: 1 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 20 } },
                margin: { left: margin, right: margin }
            });

            yPos = (doc as any).lastAutoTable.finalY + 5; // Reduced gap

            const tableHead = [['Day', 'Time', 'Subject', 'Class', 'Room']];
            const tableBodyRows: any[] = [];

            // Sort entries for this lecturer: Day (in order of operatingDays), then StartTime
            const dayOrder = (timetableSettings?.operatingDays || []) as string[];
            const sortedEntries = [...lecturerEntries].sort((a, b) => {
                const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
                if (dayDiff !== 0) return dayDiff;
                return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
            });

            sortedEntries.forEach(entry => {
                const subject = getSubjectById(entry.subjectId);
                const room = getRoomById(entry.roomId);

                let className = '';
                const course = courses.find(c => c.levels.some(l => (l.subjectIds || []).includes(entry.subjectId)));
                if (course) {
                    const lvl = course.levels.find(l => (l.subjectIds || []).includes(entry.subjectId));
                    className = `${course.code} ${lvl?.name || ''}`;
                }

                tableBodyRows.push([
                    entry.day,
                    `${entry.startTime} - ${entry.endTime}`,
                    subject?.name || subject?.shortName || subject?.code || 'N/A',
                    className,
                    room?.name || 'N/A'
                ]);
            });

            if (tableBodyRows.length === 0) {
                tableBodyRows.push([{ content: 'No lessons scheduled', colSpan: 5, styles: { halign: 'center', fontStyle: 'italic' } }]);
            }

            (doc as any).autoTable({
                startY: yPos,
                head: tableHead,
                body: tableBodyRows,
                theme: 'striped', // Changed to striped for list layout
                headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 25 },
                    1: { cellWidth: 35 },
                    2: { fontStyle: 'bold' },
                    3: { cellWidth: 40 },
                    4: { cellWidth: 40 }
                },
                margin: { left: margin, right: margin, bottom: 25 },
                pageBreak: 'auto' // Allow list to span pages if long
            });
        }

    } catch (e) {
        console.error("PDF Generation Error", e);
        // Fallback or error page
        const err = e as Error;
        doc.addPage();
        doc.text(`Error: ${err.message}`, margin, 20);
    }
    return doc.output('blob');
};

export const generateCourseProgressPdf = async (
    reportData: any[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
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
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 10;

    reportData.forEach((course) => {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 55, 72);
        doc.text(course.name, margin, yPos);
        yPos += 7;

        course.levels.forEach((level: any) => {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(74, 85, 104);
            doc.text(`${level.name} - Coverage: ${level.overallPercent}%`, margin, yPos);
            yPos += 5;

            const head = [['Subject', 'Code', 'Scheduled', 'Required', 'Coverage (%)']];
            const body = level.subjects.map((s: any) => [
                s.name,
                s.code,
                s.scheduled,
                s.required,
                `${s.percent}%`
            ]);

            doc.autoTable({
                startY: yPos,
                head: head,
                body: body,
                theme: 'striped',
                headStyles: { fillColor: [45, 55, 72], fontSize: 8 },
                styles: { fontSize: 8 },
                margin: { left: margin },
            });

            yPos = (doc as any).lastAutoTable.finalY + 10;
        });

        yPos += 5;
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateEnrollmentCapacityPdf = async (
    analysis: any[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
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
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 12;

    // Executive Summary Card Layout
    const metrics = [
        { label: 'Critical Areas', value: `${analysis.filter(r => r.overcrowdedSessions > 0).length} Rooms` },
        { label: 'Avg. Occupancy', value: `${Math.round(analysis.reduce((sum, r) => sum + r.avgRatio, 0) / (analysis.length || 1))}%` },
        { label: 'Optimized', value: `${analysis.filter(r => r.avgRatio > 50 && r.avgRatio <= 100).length} Rooms` },
        { label: 'Underused', value: `${analysis.filter(r => r.sessionCount > 0 && r.avgRatio < 30).length} Rooms` }
    ];

    let xPos = margin;
    const cardWidth = (pageWidth - (margin * 2)) / 4;
    metrics.forEach(m => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(m.label.toUpperCase(), xPos, yPos);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 55, 72);
        doc.text(m.value, xPos, yPos + 6);
        xPos += cardWidth;
    });

    yPos += 20;

    // Detailed Table
    const head = [['Facility Name', 'Capacity', 'Peak Students', 'Avg Density', 'Risk Status']];
    const body = analysis.map(room => [
        room.roomName,
        room.capacity,
        room.maxEnrollment,
        `${Math.round(room.avgRatio)}%`,
        room.overcrowdedSessions > 0 ? `${room.overcrowdedSessions} Overcrowded` : room.sessionCount === 0 ? 'Not in Use' : 'Optimal'
    ]);

    (doc as any).autoTable({
        startY: yPos,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], fontSize: 8 },
        styles: { fontSize: 8 },
        didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 4) {
                if (data.cell.raw.includes('Overcrowded')) {
                    data.cell.styles.textColor = [200, 0, 0];
                } else if (data.cell.raw === 'Optimal') {
                    data.cell.styles.textColor = [0, 128, 0];
                }
            }
        }
    });

    // Session Breakdowns (Top 5 critical rooms)
    const criticalRooms = analysis.filter(r => r.overcrowdedSessions > 0).slice(0, 5);
    if (criticalRooms.length > 0) {
        doc.addPage();
        yPos = setupPdfHeader(doc, headerImg);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("Critical Overcrowding Insights (Top 5)", margin, yPos);
        yPos += 10;

        criticalRooms.forEach(room => {
            if (yPos > 240) {
                doc.addPage();
                yPos = setupPdfHeader(doc, headerImg);
            }

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Facility: ${room.roomName}`, margin, yPos);
            yPos += 5;

            const subHead = [['Day', 'Time', 'Subject / Class', 'Enrollment', 'Status']];
            const subBody = room.sessionInsights.map((s: any) => [
                s.day,
                s.time,
                `${s.subjectName}\n${s.className}`,
                `${s.enrollment}/${s.capacity}`,
                s.isOvercrowded ? 'CRITICAL' : 'OK'
            ]);

            (doc as any).autoTable({
                startY: yPos,
                head: subHead,
                body: subBody,
                theme: 'striped',
                headStyles: { fillColor: [74, 85, 104], fontSize: 7 },
                styles: { fontSize: 7 },
                columnStyles: { 4: { fontStyle: 'bold' } },
                didParseCell: (data: any) => {
                    if (data.section === 'body' && data.column.index === 4 && String(data.cell.raw) === 'CRITICAL') {
                        data.cell.styles.textColor = [200, 0, 0];
                    }
                }
            });

            yPos = (doc as any).lastAutoTable.finalY + 10;
        });
    }

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateRoomDistanceReportPdf = async (
    stats: any,
    buildingLocations: any[],
    buildingMatrix: any[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
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
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 12;

    // Stats Cards
    const metrics = [
        { label: 'Mapped Rooms', value: `${stats.geocodedCount}` },
        { label: 'Avg. Walk', value: stats.avgDistanceText },
        { label: 'Max Span', value: stats.maxDistanceText }
    ];

    let xPos = margin;
    const cardWidth = (pageWidth - (margin * 2)) / 3;
    metrics.forEach(m => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(m.label.toUpperCase(), xPos, yPos);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 55, 72);
        doc.text(m.value, xPos, yPos + 6);
        xPos += cardWidth;
    });

    yPos += 25;

    // Building matrix Section
    if (buildingLocations.length > 1) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("Inter-Building Distance Matrix", margin, yPos);
        yPos += 8;

        const head = [['From \\ To', ...buildingLocations.map(b => b.name)]];
        const body = buildingMatrix.map(row => [
            row.source.name,
            ...row.distances.map((dist: number, idx: number) => {
                if (row.source.id === buildingLocations[idx].id) return '-';
                const km = dist >= 1000;
                const dText = km ? `${(dist / 1000).toFixed(2)} km` : `${Math.round(dist)} m`;
                return dText;
            })
        ]);

        (doc as any).autoTable({
            startY: yPos,
            head,
            body,
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72], fontSize: 7 },
            styles: { fontSize: 7 },
            margin: { left: margin }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Footnote
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text("* Distances are calculated using Haversine formula (air distance). Estimated walking times assume 84m/min.", margin, doc.internal.pageSize.getHeight() - 40);

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateRoomProximityReportPdf = async (
    baseRoomName: string,
    neighbors: any[],
    title: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
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

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Reference Facility: ${baseRoomName}`, margin, yPos);
    yPos += 15;

    // Table
    const head = [['Nearest Room', 'Building', 'Distance', 'Est. Walk Time']];
    const body = neighbors.map(n => [
        n.name,
        n.buildingName,
        n.distanceText,
        n.timeText
    ]);

    (doc as any).autoTable({
        startY: yPos,
        head,
        body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], fontSize: 9 },
        styles: { fontSize: 8 },
        margin: { left: margin }
    });

    // Footnote
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text("* Results represent the closest 10 facilities by air distance.", margin, finalY);

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateMemberLibraryHistoryPdf = async (
    member: User,
    transactions: LibraryTransaction[],
    fines: LibraryFine[],
    getBookTitle: (id: string) => string,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [logoImg, footerImg] = await Promise.all([
        loadImage(logoUrl),
        loadImage(footerImageUrl)
    ]);

    const tableStartY = createPdfWithLetterhead(doc, 'LIBRARY MEMBER STATEMENT', companyDetails, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Member Information Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('MEMBER DETAILS', margin, tableStartY - 15);
    doc.line(margin, tableStartY - 12, pageWidth - margin, tableStartY - 12);

    const memberIdDisplay = (member as any).admissionNumber || member.admissionNumber || (member as any).admission_number || (member as any).admNo || member.staffId || (member as any).userId || (member as any).studentId || 'N/A';
    
    const gradeLevel = (
        (member as any).gradeLevel || 
        (member as any).grade || 
        (member as any).classLevel || 
        (member as any).className ||
        (member as any).metadata?.gradeLevel || 
        (member as any).metadata?.grade || 
        (member as any).metadata?.class || 
        (member as any).metadata?.className ||
        (member as any).studentClass || 
        ''
    ).toString().trim();

    const stream = (
        (member as any).stream || 
        (member as any).streamName || 
        (member as any).metadata?.stream || 
        (member as any).section || 
        (member as any).metadata?.section || 
        ''
    ).toString().trim();

    let rawClassDisplay = ((member as any).classDisplay || (member as any).classStr || '').toString().trim();
    if (rawClassDisplay.toLowerCase() === 'general' || rawClassDisplay === '—' || rawClassDisplay === '-') {
        rawClassDisplay = '';
    }

    let memberClassDisplay = '';
    if (gradeLevel && stream) {
        if (gradeLevel.toLowerCase().includes(stream.toLowerCase())) {
            memberClassDisplay = gradeLevel;
        } else {
            memberClassDisplay = `${gradeLevel} ${stream}`;
        }
    } else if (rawClassDisplay) {
        if (gradeLevel && !rawClassDisplay.toLowerCase().includes(gradeLevel.toLowerCase())) {
            memberClassDisplay = `${gradeLevel} ${rawClassDisplay}`;
        } else {
            memberClassDisplay = rawClassDisplay;
        }
    } else {
        memberClassDisplay = gradeLevel || stream || 'N/A';
    }

    // Guard for member.role
    const roleText = (Array.isArray(member.roles) && member.roles.length > 0)
        ? member.roles.map(r => formatRoleDisplayName(r as Role, institution)).join(', ').toUpperCase()
        : (member.role ? formatRoleDisplayName(member.role, institution).toUpperCase() : 'STUDENT');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // Left Column
    doc.setFont('helvetica', 'bold');
    doc.text('Member Name:', margin, tableStartY - 6);
    doc.setFont('helvetica', 'normal');
    doc.text(member.name || 'Unknown', margin + 28, tableStartY - 6);

    doc.setFont('helvetica', 'bold');
    doc.text('ID / Adm No:', margin, tableStartY);
    doc.setFont('helvetica', 'normal');
    doc.text(String(memberIdDisplay), margin + 28, tableStartY);

    doc.setFont('helvetica', 'bold');
    doc.text('Student Grade:', margin, tableStartY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(String(memberClassDisplay), margin + 28, tableStartY + 6);

    // Right Column
    const rightColX = pageWidth / 2 + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Role / Type:', rightColX, tableStartY - 6);
    doc.setFont('helvetica', 'normal');
    doc.text(roleText, rightColX + 26, tableStartY - 6);

    doc.setFont('helvetica', 'bold');
    doc.text('Date Issued:', rightColX, tableStartY);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), rightColX + 26, tableStartY);

    doc.setFont('helvetica', 'bold');
    doc.text('Contact:', rightColX, tableStartY + 6);
    doc.setFont('helvetica', 'normal');
    const contactInfo = institution.phoneNumber || institution.email || 'N/A';
    doc.text(contactInfo, rightColX + 26, tableStartY + 6);

    // Transactions Table
    let tableY = tableStartY + 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('BOOK CIRCULATION & BORROWING STATEMENT', margin, tableY - 5);

    const transactionBody = transactions.map(t => {
        const isOverdue = t.status === 'issued' && new Date(t.dueDate) < new Date();
        const statusText = t.status === 'returned'
            ? 'RETURNED'
            : (isOverdue || t.status === 'overdue' ? 'OVERDUE (UNRETURNED)' : 'UNRETURNED (IN USE)');

        return [
            t.issueDate ? new Date(t.issueDate).toLocaleDateString() : 'N/A',
            getBookTitle(t.bookId),
            t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A',
            t.returnDate ? new Date(t.returnDate).toLocaleDateString() : '—',
            statusText
        ];
    });

    const autoTable = (doc as any).autoTable;
    if (autoTable) {
        autoTable.call(doc, {
            startY: tableY,
            head: [['Date Issued', 'Book Title', 'Due Date', 'Return Date', 'Book Status']],
            body: transactionBody.length > 0 ? transactionBody : [['No borrowing records found', '', '', '', '']],
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72], textColor: 255 },
            styles: { fontSize: 8 }
        });

        tableY = ((doc as any).lastAutoTable?.finalY || tableY) + 20;
    } else {
        tableY += 20;
    }

    // Financial Ledger Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FINANCIAL LEDGER (FINES)', margin, tableY - 5);

    const finesBody = fines.map(f => {
        const amount = Number(f.amount || 0);
        const paidAmount = Number(f.paidAmount || 0);
        return [
            f.description || 'Fine',
            amount?.toLocaleString(),
            paidAmount?.toLocaleString(),
            (amount - paidAmount)?.toLocaleString(),
            (f.status || 'pending').toUpperCase()
        ];
    });

    if (autoTable) {
        autoTable.call(doc, {
            startY: tableY,
            head: [['Description', 'Fine Amount', 'Paid', 'Balance', 'Status']],
            body: finesBody.length > 0 ? finesBody : [['No fines recorded', '', '', '', '']],
            theme: 'grid',
            headStyles: { fillColor: [220, 38, 38], textColor: 255 },
            styles: { fontSize: 8 }
        });
        tableY = (doc as any).lastAutoTable?.finalY || tableY;
    }

    const totalDue = fines.reduce((acc, f) => acc + (Number(f.amount || 0) - Number(f.paidAmount || 0)), 0);
    const finalY = (doc as any).lastAutoTable?.finalY || (tableY + 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    const valText = `KES ${totalDue.toLocaleString()}`;
    const valWidth = doc.getTextWidth(valText);
    const labelText = 'TOTAL OUTSTANDING FINES: ';
    
    doc.setTextColor(0, 0, 0); // Reset color
    doc.text(labelText, pageWidth - margin - valWidth - 4, finalY + 10, { align: 'right' });
    
    if (totalDue > 0) {
        doc.setTextColor(200, 0, 0);
    } else {
        doc.setTextColor(0, 128, 0);
    }
    doc.text(valText, pageWidth - margin, finalY + 10, { align: 'right' });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates a PDF sheet of QR codes for all provided members.
 */
export const generateMemberQrCodesPdf = async (
    members: User[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<Blob> => {
    const institutionName = institution.name || 'Institution';
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    const QRCodeLib = (window as any).QRCode;
    if (!QRCodeLib) throw new Error("QRCode library not available on window.");

    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const cols = 3;
    const rows = 5;
    const padding = 10;
    const cellWidth = (pageWidth - (margin * 2)) / cols;
    const cellHeight = (pageHeight - (margin * 2) - 40) / rows; // Adjust for header/footer

    let currentMemberIdx = 0;
    let pageNum = 0;

    while (currentMemberIdx < members.length) {
        if (pageNum > 0) doc.addPage();
        pageNum++;

        let yPos = setupPdfHeader(doc, headerImg);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${institutionName} - Member QR Access Cards`, margin, yPos);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${pageNum} | Total Members: ${members.length}`, margin, yPos + 5);
        yPos += 15;

        for (let r = 0; r < rows && currentMemberIdx < members.length; r++) {
            for (let c = 0; c < cols && currentMemberIdx < members.length; c++) {
                const member = members[currentMemberIdx];
                const x = margin + (c * cellWidth);
                const y = yPos + (r * cellHeight);

                // Draw Card Border
                doc.setDrawColor(230);
                doc.rect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);

                try {
                    const qrData = JSON.stringify({
                        type: 'member',
                        id: member.id,
                        staffId: member.staffId,
                        name: member.name,
                        role: member.role
                    });

                    // Generate QR Code as Data URL
                    const qrUrl = await new Promise<string>((resolve, reject) => {
                        QRCodeLib.toDataURL(qrData, { margin: 1, width: 256 }, (err: any, url: string) => {
                            if (err) reject(err);
                            else resolve(url);
                        });
                    });

                    // Add QR Code Image
                    doc.addImage(qrUrl, 'PNG', x + (cellWidth / 2) - 15, y + 5, 30, 30);

                    // Add Member Info
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text(member.name, x + (cellWidth / 2), y + 42, { align: 'center', maxWidth: cellWidth - 10 });
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.setFont('courier', 'normal');
                    doc.text(member.staffId || 'ID: Pending', x + (cellWidth / 2), y + 47, { align: 'center' });
                    doc.setFont('helvetica', 'normal');
                    doc.text(formatRoleDisplayName(member.role, institution).toUpperCase(), x + (cellWidth / 2), y + 52, { align: 'center' });

                } catch (err) {
                    console.error("QR Error for member:", member.name, err);
                }

                currentMemberIdx++;
            }
        }

        setupPdfFooter(doc, footerImg);
    }

    return doc.output('blob');
};

export const generateCarWashTrialBalancePdf = async (
    accounts: CarWashAccount[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
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
    doc.text("TRIAL BALANCE", margin, yPos);
    yPos += 10;

    const head = [['Account Code', 'Account Name', 'Type', 'Balance (KES)']];
    const body = (accounts || []).map(acc => [
        acc.accountCode,
        acc.name,
        acc.type,
        (acc.balance || 0)?.toLocaleString()
    ]);

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 9 },
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateCarWashCashbookPdf = async (
    entries: CarWashJournalEntry[],
    lines: CarWashJournalLine[],
    accounts: CarWashAccount[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
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
    doc.text("GENERAL JOURNAL / CASHBOOK", margin, yPos);
    yPos += 10;

    const head = [['Date', 'Reference / Description', 'Account', 'Debit', 'Credit']];
    const body: any[] = [];

    (entries || []).sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()).forEach(entry => {
        const entryLines = (lines || []).filter(l => l.entryId === entry.id);
        entryLines.forEach((line, idx) => {
            const acc = accounts.find(a => a.id === line.accountId);
            body.push([
                idx === 0 ? new Date(entry.entryDate).toLocaleDateString() : '',
                idx === 0 ? `${entry.entryNumber}\n${entry.description}` : '',
                acc ? acc.name : 'Unknown Account',
                line.debit > 0 ? line.debit?.toLocaleString() : '',
                line.credit > 0 ? line.credit?.toLocaleString() : ''
            ]);
        });
    });

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 50 },
            3: { halign: 'right' },
            4: { halign: 'right' }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateCarWashExpensesPdf = async (
    expenses: CarWashExpense[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
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
    doc.text("OPERATING EXPENSES REPORT", margin, yPos);
    yPos += 10;

    const head = [['Date', 'Category', 'Description', 'Method', 'Amount (KES)']];
    const body = (expenses || []).sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()).map(exp => [
        new Date(exp.expenseDate).toLocaleDateString(),
        exp.category.toUpperCase(),
        exp.description,
        exp.paymentMethod.replace('_', ' ').toUpperCase(),
        (exp.amount || 0)?.toLocaleString()
    ]);

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: { 4: { halign: 'right' } }
    });

    const total = (expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL EXPENSES: KES ${total?.toLocaleString()}`, doc.internal.pageSize.getWidth() - margin, finalY, { align: 'right' });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateCarWashPayrollPdf = async (
    payroll: CarWashPayroll[],
    attendants: User[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({ orientation: 'landscape' });
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("STAFF PAYROLL HISTORY", margin, yPos);
    yPos += 10;

    const head = [['Period', 'Staff Member', 'Base Salary', 'Commission', 'Advances/Deductions', 'Total Paid (KES)', 'Status']];
    const body = (payroll || []).sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()).map(pr => {
        const staff = attendants.find(a => a.id === pr.staffId);
        return [
            `${new Date(pr.periodStart).toLocaleDateString()} - ${new Date(pr.periodEnd).toLocaleDateString()}`,
            staff?.name || 'Unknown',
            (pr.baseSalary || 0)?.toLocaleString(),
            (pr.commissionEarned || 0)?.toLocaleString(),
            ((pr.advancesTaken || 0) + (pr.deductions || 0))?.toLocaleString(),
            (pr.totalPay || 0)?.toLocaleString(),
            pr.status.toUpperCase()
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateCarWashOperationalSummaryPdf = async (
    jobs: CarWashJob[],
    packages: CarWashPackage[],
    users: User[],
    customers: CarWashCustomer[],
    feedbacks: CarWashFeedback[],
    addOns: CarWashAddOn[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    reportsTab: 'all' | 'revenue' | 'staff' | 'customers' | 'services' | 'feedback' | 'trends' = 'all',
    startDate?: string,
    endDate?: string
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
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');

    let title = "OPERATIONAL SUMMARY REPORT";
    if (reportsTab !== 'all') {
        title = `${reportsTab.toUpperCase()} REPORT`;
    }

    doc.text(title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let periodLabel = 'All Time';
    if (startDate && endDate) {
        periodLabel = `${new Date(startDate + 'T00:00:00').toLocaleDateString()} – ${new Date(endDate + 'T00:00:00').toLocaleDateString()}`;
    } else if (startDate) {
        periodLabel = `From ${new Date(startDate + 'T00:00:00').toLocaleDateString()}`;
    } else if (endDate) {
        periodLabel = `Up to ${new Date(endDate + 'T00:00:00').toLocaleDateString()}`;
    }

    doc.text(`Report Period: ${periodLabel}   |   Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 10;

    let sectionNum = 1;

    // 1. REVENUE OVERVIEW
    if (reportsTab === 'all' || reportsTab === 'revenue') {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sectionNum++}. Revenue Overview`, margin, yPos);
        yPos += 6;

        const completedJobs = jobs.filter(j => j.status === 'completed');
        const totalRev = completedJobs.reduce((s, j) => s + (j.amountPaid || 0), 0);

        const revBody = [
            ['Total Completed Washes', completedJobs.length.toString()],
            ['Gross Revenue (KES)', totalRev?.toLocaleString()],
            ['Average Ticket Size (KES)', (totalRev / (completedJobs.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })]
        ];

        doc.autoTable({
            startY: yPos,
            body: revBody,
            theme: 'plain',
            styles: { fontSize: 10 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // 2. STAFF PERFORMANCE
    if (reportsTab === 'all' || reportsTab === 'staff') {
        if (reportsTab === 'all' && yPos > 240) { doc.addPage(); yPos = setupPdfHeader(doc, headerImg); }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sectionNum++}. Staff Efficiency`, margin, yPos);
        yPos += 6;

        const attendants = users.filter(u => u.role === 'carwash_attendant' || u.role === 'carwash_admin' || u.role === 'carwash_cashier');
        const staffData = attendants.map(att => {
            const attJobs = jobs.filter(j => j.attendantId === att.id && j.status === 'completed');
            const rev = attJobs.reduce((s, j) => s + (j.amountPaid || 0), 0);
            const attFeedbacks = feedbacks.filter(f => attJobs.some(j => j.id === f.jobId));
            const rating = attFeedbacks.length ? (attFeedbacks.reduce((s, f) => s + f.rating, 0) / attFeedbacks.length).toFixed(1) : '—';
            return [att.name, attJobs.length.toString(), rev?.toLocaleString(), rating];
        });

        doc.autoTable({
            startY: yPos,
            head: [['Staff Member', 'Washes', 'Revenue (KES)', 'Avg Rating']],
            body: staffData.length > 0 ? staffData : [['No staff data', '', '', '']],
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72] },
            styles: { fontSize: 9 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // CUSTOMER INSIGHTS
    if (reportsTab === 'all' || reportsTab === 'customers') {
        if (reportsTab === 'all' && yPos > 240) { doc.addPage(); yPos = setupPdfHeader(doc, headerImg); }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sectionNum++}. Customer Insights`, margin, yPos);
        yPos += 6;

        const customerData = customers.map(c => {
            const cj = jobs.filter(j => j.customerId === c.id && j.status === 'completed');
            const totalSpent = cj.reduce((s, j) => s + (j.amountPaid || 0), 0);
            return [c.name, cj.length.toString(), totalSpent?.toLocaleString(), c.loyaltyStamps.toString()];
        }).sort((a, b) => Number(b[2].replace(/,/g, '')) - Number(a[2].replace(/,/g, ''))).slice(0, 15);

        doc.autoTable({
            startY: yPos,
            head: [['Customer Name', 'Washes', 'Total Spent (KES)', 'Loyalty Points']],
            body: customerData.length > 0 ? customerData : [['No customers found', '', '', '']],
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72] },
            styles: { fontSize: 9 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // 3. SERVICE MIX
    if (reportsTab === 'all' || reportsTab === 'services') {
        if (reportsTab === 'all' && yPos > 240) { doc.addPage(); yPos = setupPdfHeader(doc, headerImg); }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sectionNum++}. Service Mix Performance`, margin, yPos);
        yPos += 6;

        const serviceData = packages.map(pkg => {
            const pkgJobs = jobs.filter(j => j.packageId === pkg.id && j.status === 'completed');
            const rev = pkgJobs.reduce((s, j) => s + (j.amountPaid || 0), 0);
            return [pkg.name, pkgJobs.length.toString(), rev?.toLocaleString()];
        }).sort((a, b) => Number(b[2].replace(/,/g, '')) - Number(a[2].replace(/,/g, '')));

        doc.autoTable({
            startY: yPos,
            head: [['Package Name', 'Bookings', 'Total Revenue (KES)']],
            body: serviceData.length > 0 ? serviceData : [['No packages found', '', '']],
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72] },
            styles: { fontSize: 9 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // 4. CUSTOMER SATISFACTION
    if (reportsTab === 'all' || reportsTab === 'feedback') {
        if (reportsTab === 'all' && yPos > 240) { doc.addPage(); yPos = setupPdfHeader(doc, headerImg); }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sectionNum++}. Customer Sentiment`, margin, yPos);
        yPos += 6;

        const avgRating = feedbacks.length ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : '—';
        const sentimentBody = [
            ['Overall CSAT Score', `${avgRating} / 5.0`],
            ['Total Reviews Received', feedbacks.length.toString()],
            ['Positive Reviews (4-5★)', feedbacks.filter(f => f.rating >= 4).length.toString()],
            ['Critical Reviews (1-2★)', feedbacks.filter(f => f.rating <= 2).length.toString()]
        ];

        doc.autoTable({
            startY: yPos,
            body: sentimentBody,
            theme: 'plain',
            styles: { fontSize: 10 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } }
        });
    }

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateCarWashBillsAndPaymentsPdf = async (
    jobs: CarWashJob[],
    customers: CarWashCustomer[],
    packages: CarWashPackage[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    startDate?: string,
    endDate?: string
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error('jsPDF library not available.');
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLS & PAYMENTS REPORT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let periodLabel = 'All Time';
    if (startDate && endDate) {
        periodLabel = `${new Date(startDate + 'T00:00:00').toLocaleDateString()} \u2013 ${new Date(endDate + 'T00:00:00').toLocaleDateString()}`;
    } else if (startDate) {
        periodLabel = `From ${new Date(startDate + 'T00:00:00').toLocaleDateString()}`;
    } else if (endDate) {
        periodLabel = `Up to ${new Date(endDate + 'T00:00:00').toLocaleDateString()}`;
    }
    doc.text(`Report Period: ${periodLabel}   |   Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 12;

    const completed = jobs.filter(j => j.status === 'completed');
    const totalBilled = completed.reduce((s, j) => s + (j.amountCharged || 0), 0);
    const totalPaid = completed.reduce((s, j) => s + (j.amountPaid || 0), 0);
    const totalBalance = totalBilled - totalPaid;
    const cashJobs = completed.filter(j => j.paymentMethod === 'cash');
    const mpesaJobs = completed.filter(j => j.paymentMethod === 'mpesa');
    const cardJobs = completed.filter(j => j.paymentMethod === 'card');
    const creditJobs = completed.filter(j => j.paymentMethod === 'credit');

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Summary', margin, yPos);
    yPos += 6;

    doc.autoTable({
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
            ['Total Jobs (Period)', jobs.length.toString()],
            ['Completed Jobs', completed.length.toString()],
            ['Total Billed (KES)', totalBilled?.toLocaleString()],
            ['Total Collected (KES)', totalPaid?.toLocaleString()],
            ['Outstanding Balance (KES)', totalBalance?.toLocaleString()],
            ['Cash', `${cashJobs.length} jobs \u2014 KES ${cashJobs.reduce((s, j) => s + (j.amountPaid || 0), 0)?.toLocaleString()}`],
            ['M-Pesa', `${mpesaJobs.length} jobs \u2014 KES ${mpesaJobs.reduce((s, j) => s + (j.amountPaid || 0), 0)?.toLocaleString()}`],
            ['Card', `${cardJobs.length} jobs \u2014 KES ${cardJobs.reduce((s, j) => s + (j.amountPaid || 0), 0)?.toLocaleString()}`],
            ['Credit / Unpaid', `${creditJobs.length} jobs \u2014 KES ${creditJobs.reduce((s, j) => s + (j.amountPaid || 0), 0)?.toLocaleString()}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 14;

    if (yPos > 230) { doc.addPage(); yPos = setupPdfHeader(doc, headerImg); }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Itemised Transactions', margin, yPos);
    yPos += 6;

    const jobRows = jobs.map(j => {
        const customer = customers.find(c => c.id === j.customerId);
        const pkg = packages.find(p => p.id === j.packageId);
        return [
            j.createdAt ? new Date(j.createdAt).toLocaleDateString() : '—',
            customer?.name || '—',
            customer?.phoneNumber || '—',
            pkg?.name || '\u2014',
            j.status || '\u2014',
            `KES ${(j.amountCharged || 0)?.toLocaleString()}`,
            `KES ${(j.amountPaid || 0)?.toLocaleString()}`,
            j.paymentMethod ? j.paymentMethod.toUpperCase() : '\u2014',
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: [['Date', 'Customer', 'Phone', 'Package', 'Status', 'Billed', 'Paid', 'Method']],
        body: jobRows,
        theme: 'striped',
        headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 30 },
            2: { cellWidth: 22 },
            3: { cellWidth: 26 },
            4: { cellWidth: 18 },
            5: { cellWidth: 18 },
            6: { cellWidth: 18 },
            7: { cellWidth: 18 },
        },
        didDrawPage: () => { yPos = setupPdfHeader(doc, headerImg); }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};
export const generateBoardingReportPdf = async (
    data: any[],
    title: string,
    reportType: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null,
    institution: Institution
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF({ orientation: 'landscape' });
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
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date()?.toLocaleString()}`, margin, yPos);
    yPos += 12;

    let head: string[][] = [];
    let body: any[][] = [];

    if (reportType === 'Occupancy') {
        head = [['House', 'Gender', 'Capacity', 'Occupied', 'Available', 'Rate %']];
        body = data.map(i => [
            i.name,
            i.gender,
            i.capacity,
            i.occupiedBeds,
            i.availableBeds,
            `${i.occupancyRate}%`
        ]);
    } else if (reportType === 'Allocations') {
        head = [['Student', 'House', 'Room', 'Bed', 'Term', 'Year', 'Date']];
        body = data.map(i => [
            i.studentName || 'N/A',
            i.houseName || 'N/A',
            i.roomNumber || 'N/A',
            i.bedNumber || 'N/A',
            i.term,
            i.academicYear,
            i.allocationDate
        ]);
    } else if (reportType === 'Maintenance') {
        head = [['Issue', 'Location', 'Priority', 'Status', 'Reported By', 'Date']];
        body = data.map(i => [
            i.issueDescription,
            `${i.houseName || 'Common'} - ${i.roomNumber || 'N/A'}`,
            i.priority,
            i.status,
            i.reportedByName,
            i.reportedDate
        ]);
    } else if (reportType === 'Check-ins' || reportType === 'Check-outs') {
        head = [['Student', 'House', 'Room', 'Bed', 'Date', 'Time', 'By']];
        body = data.map(i => [
            i.studentName || 'N/A',
            i.houseName || 'N/A',
            i.roomNumber || 'N/A',
            i.bedNumber || 'N/A',
            reportType === 'Check-ins' ? i.checkInDate : i.checkOutDate,
            reportType === 'Check-ins' ? i.checkInTime || '-' : i.checkOutTime || '-',
            reportType === 'Check-ins' ? i.checkedInByName || '-' : i.checkedOutByName || '-'
        ]);
    } else {
        // Fallback or generic table
        if (data.length > 0) {
            const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
            head = [keys.map(k => k.replace(/([A-Z])/g, ' $1').toUpperCase())];
            body = data.map(i => keys.map(k => String(i[k])));
        }
    }

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
        didDrawPage: () => setupPdfFooter(doc, footerImg)
    });

    return doc.output('bloburl');
};

export const generateTenantStatementPdf = async (
    tenant: PMTenant,
    payments: PMPayment[],
    invoices: PMInvoice[],
    leases: PMLease[],
    units: PMUnit[],
    startDate: string,
    endDate: string,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const headerImg = await loadImage(letterheadConfig?.headerImageUrl || null);
    
    // Header & Branding
    let yPos = createPdfWithLetterhead(doc, 'TENANT STATEMENT', {} as any, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Tenant Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TENANT:', margin, margin + 55);
    doc.text('PERIOD:', pageWidth - margin - 60, margin + 55);

    doc.setFont('helvetica', 'normal');
    doc.text(tenant.name, margin + 20, margin + 55);
    doc.text(`${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, pageWidth - margin, margin + 55, { align: 'right' });

    const head = [['Date', 'Description', 'Ref #', 'Debit (Due)', 'Credit (Paid)', 'Balance']];
    let allTx: any[] = [];
    let openingBal = 0;

    // Precautionary deduplication
    const uniqueInvoices = Array.from(new Map(invoices.map(inv => [inv.id, inv])).values());
    const uniquePayments = Array.from(new Map(payments.map(p => [p.id, p])).values());

    const tenantLeases = leases.filter(l => l.tenantId === tenant.id);
    const leaseIds = tenantLeases.map(l => l.id);

    // Debits: Invoices matching tenant's leases (exclude Cancelled and Draft)
    uniqueInvoices
        .filter(inv => leaseIds.includes(inv.leaseId) && inv.status !== 'Cancelled' && inv.status !== 'Draft')
        .forEach(inv => {
            allTx.push({
                date: inv.issueDate,
                description: inv.description,
                type: 'debit',
                amount: inv.amount,
                ref: inv.invoiceNumber
            });
        });

    // Credits: Payments matching tenant's leases (Completed status only)
    uniquePayments
        .filter(p => leaseIds.includes(p.leaseId) && p.status === 'Completed')
        .forEach(p => {
            allTx.push({
                date: p.paymentDate,
                description: `Payment - ${p.paymentType} (${p.paymentMethod})`,
                type: 'credit',
                amount: p.amount,
                ref: p.receiptNumber || p.id.split('_')[1]
            });
        });

    allTx.sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'debit' ? -1 : 1));

    const filtered = allTx.filter(t => {
        if (t.date < startDate) {
            openingBal += (t.type === 'debit' ? t.amount : -t.amount);
            return false;
        }
        return t.date <= endDate;
    });

    let runningBal = openingBal;
    const body = [
        [new Date(startDate).toLocaleDateString(), 'Opening Balance Brought Forward', '---', '---', '---', openingBal?.toLocaleString()],
        ...filtered.map(t => {
            runningBal += (t.type === 'debit' ? t.amount : -t.amount);
            return [
                new Date(t.date).toLocaleDateString(),
                t.description,
                t.ref,
                t.type === 'debit' ? t.amount?.toLocaleString() : '---',
                t.type === 'credit' ? t.amount?.toLocaleString() : '---',
                runningBal?.toLocaleString()
            ];
        })
    ];

    doc.autoTable({
        head,
        body,
        startY: yPos,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 8 },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CLOSING BALANCE:', pageWidth - margin - 80, finalY);
    doc.text(`KES ${runningBal?.toLocaleString()}`, pageWidth - margin, finalY, { align: 'right' });

    return doc.output('datauristring');
};

export const generateLandlordStatementPdf = async (
    landlord: PMLandlord,
    payments: PMPayment[],
    leases: PMLease[],
    units: PMUnit[],
    properties: PMProperty[],
    startDate: string,
    endDate: string,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    expenses?: PMExpenseVoucher[]
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const headerImg = await loadImage(letterheadConfig?.headerImageUrl || null);
    
    let yPos = createPdfWithLetterhead(doc, 'LANDLORD STATEMENT', {} as any, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('LANDLORD:', margin, margin + 55);
    doc.text('PERIOD:', pageWidth - margin - 60, margin + 55);

    doc.setFont('helvetica', 'normal');
    doc.text(landlord.name, margin + 25, margin + 55);
    doc.text(`${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, pageWidth - margin, margin + 55, { align: 'right' });

    const landlordProperties = properties.filter(p => p.landlordId === landlord.id);
    const propertyIds = landlordProperties.map(p => p.id);
    const landlordUnits = units.filter(u => propertyIds.includes(u.propertyId));
    const unitIds = landlordUnits.map(u => u.id);
    const landlordLeases = leases.filter(l => unitIds.includes(l.unitId));

    // Precautionary deduplication
    const uniquePayments = Array.from(new Map(payments.map(p => [p.id, p])).values());

    const landlordPayments = uniquePayments.filter(p => {
        return landlordLeases.some(l => l.id === p.leaseId) && p.status === 'Completed' && p.paymentDate >= startDate && p.paymentDate <= endDate;
    }).sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));

    // Expenses
    const landlordExpenses = (expenses || []).filter(e => {
        return propertyIds.includes(e.propertyId) && 
            (e.status === 'Approved' || e.status === 'Paid') && 
            e.paymentDate >= startDate && 
            e.paymentDate <= endDate;
    });

    const paymentItems = landlordPayments.map(p => {
        const lease = leases.find(l => l.id === p.leaseId);
        const unit = units.find(u => u.id === lease?.unitId);
        const property = properties.find(prop => prop.id === unit?.propertyId);
        const comm = p.commissionAmount || 0;
        return {
            date: p.paymentDate,
            details: `${unit?.unitNumber || ''} - ${property?.name || ''}`,
            ref: p.reference || p.id.split('_')[1] || p.id,
            gross: p.amount,
            comm: comm,
            net: p.amount - comm
        };
    });

    const expenseItems = landlordExpenses.map(e => {
        const prop = properties.find(p => p.id === e.propertyId);
        const unit = e.unitId ? units.find(u => u.id === e.unitId) : null;
        return {
            date: e.paymentDate,
            details: `${prop?.name || ''}${unit ? ` (Unit ${unit.unitNumber})` : ''} - [Expense: ${e.category}]`,
            ref: e.voucherNumber,
            gross: 0,
            comm: 0,
            net: -e.amount
        };
    });

    const ledgerItems = [...paymentItems, ...expenseItems].sort((a, b) => a.date.localeCompare(b.date));

    const head = [['Date', 'Unit / Property', 'Ref #', 'Gross Collected', 'Mgt Fee', 'Net Payout']];
    const body = ledgerItems.map(item => [
        new Date(item.date).toLocaleDateString(),
        item.details,
        item.ref,
        item.gross > 0 ? item.gross.toLocaleString() : '—',
        item.comm > 0 ? item.comm.toLocaleString() : '—',
        item.net.toLocaleString()
    ]);

    doc.autoTable({
        head,
        body,
        startY: yPos,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 8 },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const totalGross = landlordPayments.reduce((s, p) => s + p.amount, 0);
    const totalComm = landlordPayments.reduce((s, p) => s + (p.commissionAmount || 0), 0);
    const totalExpenses = landlordExpenses.reduce((s, e) => s + e.amount, 0);
    const netPayoutDue = totalGross - totalComm - totalExpenses;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY OF COLLECTIONS & EXPENSES', margin, finalY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Gross Collected:', margin, finalY + 8);
    doc.text(`KES ${totalGross?.toLocaleString()}`, margin + 60, finalY + 8);
    
    doc.text('Total Management Fees:', margin, finalY + 14);
    doc.text(`KES ${totalComm?.toLocaleString()}`, margin + 60, finalY + 14);

    doc.text('Total Property Expenses:', margin, finalY + 20);
    doc.text(`KES ${totalExpenses?.toLocaleString()}`, margin + 60, finalY + 20);
    
    doc.setFont('helvetica', 'bold');
    doc.text('NET PAYOUT DUE:', margin, finalY + 28);
    doc.text(`KES ${netPayoutDue?.toLocaleString()}`, margin + 60, finalY + 28);

    return doc.output('datauristring');
};

export const generateLpoPdf = async (
    requisition: Requisition,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    supplier?: Supplier
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    
    // Header & Letterhead
    const tableStartY = createPdfWithLetterhead(doc, 'PURCHASE ORDER', companyDetails, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // LPO Header Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('LPO #:', pageWidth - margin - 50, margin + 55);
    doc.text('DATE:', pageWidth - margin - 50, margin + 60);
    doc.text('REQUISITION ID:', pageWidth - margin - 50, margin + 65);

    doc.setFont('helvetica', 'normal');
    doc.text(requisition.lpoNumber || 'DRAFT', pageWidth - margin, margin + 55, { align: 'right' });
    doc.text(new Date().toLocaleDateString(), pageWidth - margin, margin + 60, { align: 'right' });
    doc.text(requisition.id.substring(0, 8).toUpperCase(), pageWidth - margin, margin + 65, { align: 'right' });

    // Supplier Section
    let nextY = margin + 80;
    if (supplier) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('SUPPLIER:', margin, nextY);
        doc.setFont('helvetica', 'normal');
        doc.text(supplier.name, margin, nextY + 5);
        if (supplier.email) doc.text(`Email: ${supplier.email}`, margin, nextY + 10);
        if (supplier.phone) doc.text(`Phone: ${supplier.phone}`, margin, nextY + 15);
        nextY += 25;
    }

    // Items Table
    const items = requisition.items || [];
    const head = [['#', 'DESCRIPTION', 'QTY', 'UNIT COST', 'TOTAL']];
    const body = items.map((item: any, index: number) => [
        index + 1,
        item.name || 'Unknown Item',
        `${item.quantity || 0} ${item.unit || 'pcs'}`,
        (item.unitCost || 0)?.toLocaleString(),
        ((item.quantity || 0) * (item.unitCost || 0))?.toLocaleString()
    ]);

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: nextY,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 9 },
        columnStyles: {
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right' }
        }
    });

    const finalY = ((doc as any).lastAutoTable?.finalY || nextY) + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL ORDER VALUE:', pageWidth - margin - 100, finalY);
    doc.text(`KES ${requisition.totalEstimatedCost?.toLocaleString()}`, pageWidth - margin, finalY, { align: 'right' });

    // Footer / Authorization
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const authY = finalY + 30;
    doc.line(margin, authY, margin + 60, authY);
    doc.text('Authorized Signature', margin, authY + 5);
    
    doc.line(pageWidth - margin - 60, authY, pageWidth - margin, authY);
    doc.text('Supplier Acceptance', pageWidth - margin, authY + 5, { align: 'right' });

    return doc.output('datauristring');
};

export const generateParentInKindLpoPdf = async (
    proposal: any,
    student: any,
    institution: Institution,
    companyDetails?: CompanyDetails,
    logoUrl?: string | null,
    letterheadUrl?: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    // Resolve branding configurations (letterhead banner, stamp, footer)
    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const resolvedLetterheadUrl = letterheadUrl 
        || letterConfig?.headerImageUrl 
        || (institution as any)?.letterheadUrl 
        || (institution as any)?.letterhead_url 
        || companyDetails?.letterheadConfig?.headerImageUrl 
        || null;

    const logoImg = await loadImage(logoUrl || institution?.logoUrl || null);
    const headerImg = await loadImage(resolvedLetterheadUrl);
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const stampImg = letterConfig?.stampImageUrl ? await loadImage(letterConfig.stampImageUrl) : null;
    const footerText = letterConfig?.footerText || `${institution?.name || 'School'} • Official In-Kind Procurement LPO`;

    const activeCompanyDetails = companyDetails || {
        applicationTitle: institution?.name || 'School Management System',
        institutionTagline: institution?.address || '',
        contactPhone: institution?.phone || '',
        contactEmail: institution?.email || '',
        institutionAddress: institution?.address || ''
    } as any;

    // Header & Letterhead (Pass empty title so createPdfWithLetterhead draws branding without overlapping title)
    const headerBottomY = createPdfWithLetterhead(
        doc,
        '',
        activeCompanyDetails,
        institution,
        logoImg,
        headerImg
    );
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Parse / format delivery due date safely to avoid overflow
    let dueDate = 'Within Agreed Term';
    if (proposal.expectedDeliveryDate) {
        const parsedDate = new Date(proposal.expectedDeliveryDate);
        if (!isNaN(parsedDate.getTime())) {
            dueDate = parsedDate.toLocaleDateString('en-GB');
        } else if (typeof proposal.expectedDeliveryDate === 'string' && proposal.expectedDeliveryDate.trim().length > 0) {
            const raw = proposal.expectedDeliveryDate.trim();
            dueDate = raw.length > 20 ? `${raw.slice(0, 18)}...` : raw;
        }
    }

    // Dynamic start Y below letterhead divider line
    const startMetaY = headerBottomY + 2;

    // LEFT: Document Title & Badges (Cleanly separated from right metadata)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('PARENT IN-KIND PURCHASE ORDER', margin, startMetaY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('OFFICIAL IN-KIND COMMODITY & FEE OFFSET CONTRACT', margin, startMetaY + 9);

    // Status Pill
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(margin, startMetaY + 12, 60, 5.5, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(5, 150, 105);
    doc.text('● VERIFIED & COMMITTED IN-KIND LPO', margin + 3, startMetaY + 15.8);

    // RIGHT: Dedicated Metadata Box
    const metaBoxWidth = 84;
    const metaX = pageWidth - margin - metaBoxWidth;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(metaX, startMetaY, metaBoxWidth, 22, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('LPO NUMBER:', metaX + 4, startMetaY + 4.8);
    doc.text('ISSUE DATE:', metaX + 4, startMetaY + 9.5);
    doc.text('DELIVERY DUE:', metaX + 4, startMetaY + 14.2);
    doc.text('SETTLEMENT:', metaX + 4, startMetaY + 18.9);

    doc.setFont('helvetica', 'normal');
    const lpoNum = proposal.lpoNumber || proposal.lpo_number || `LPO-PIK-${String(proposal.id || '').slice(-6).toUpperCase()}`;
    doc.setTextColor(15, 23, 42);
    doc.text(lpoNum, pageWidth - margin - 4, startMetaY + 4.8, { align: 'right' });
    const issueDate = proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    doc.text(issueDate, pageWidth - margin - 4, startMetaY + 9.5, { align: 'right' });
    doc.text(dueDate, pageWidth - margin - 4, startMetaY + 14.2, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Fee Offset (In-Kind)', pageWidth - margin - 4, startMetaY + 18.9, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // Parent & Student Details
    let nextY = startMetaY + 26;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PARENT / SUPPLIER (PARTY A):', margin, nextY);
    doc.text('STUDENT BENEFICIARY (PARTY B):', pageWidth / 2 + 5, nextY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const parentName = proposal.parentName || student?.metadata?.parentName || student?.parentName || 'Parent / Guardian';
    const parentPhone = proposal.parentPhone || student?.metadata?.parentPhone || student?.parentPhone || '—';
    doc.text(`Name: ${parentName}`, margin, nextY + 5);
    doc.text(`Phone: ${parentPhone}`, margin, nextY + 10);
    doc.text(`Contract: School Fee In-Kind Agreement`, margin, nextY + 15);
    if (proposal.notes) {
        doc.text(`Notes: ${String(proposal.notes).slice(0, 45)}`, margin, nextY + 20);
    }

    const studentAdm = proposal.admissionNumber || proposal.admission_number || student?.admissionNumber || student?.admission_number || student?.admissionNo || student?.metadata?.admissionNumber || student?.metadata?.admissionNo || student?.metadata?.admission_number || (student as any)?.admNo || 'N/A';
    const classLevel = proposal.studentClass || proposal.student_class || student?.studentClass || student?.metadata?.gradeLevel || 'Enrolled';

    doc.text(`Student Name: ${student?.name || proposal.studentName || 'Student'}`, pageWidth / 2 + 5, nextY + 5);
    doc.text(`Admission No: ${studentAdm}`, pageWidth / 2 + 5, nextY + 10);
    doc.text(`Class/Grade: ${classLevel}`, pageWidth / 2 + 5, nextY + 15);
    doc.text(`Target Offset: ${proposal.targetVotehead || 'Outstanding Fees'}`, pageWidth / 2 + 5, nextY + 20);

    nextY += 28;

    // Items Table
    const head = [['#', 'COMMODITY / SERVICE DESCRIPTION', 'ORDERED QTY', 'AGREED RATE', 'TOTAL CREDIT VALUE']];
    const body = [
        [
            '1',
            proposal.itemName || 'Commodity Goods',
            `${proposal.quantity} ${proposal.unit || 'Bags'}`,
            `KES ${Number(proposal.unitValue || 0).toLocaleString()}`,
            `KES ${Number(proposal.totalValue || 0).toLocaleString()}`
        ]
    ];

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: nextY,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8.5 },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // Total Amount Box
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AGREED FEE CREDIT VALUE:', pageWidth - margin - 90, finalY);
    doc.text(`KES ${Number(proposal.totalValue || 0).toLocaleString()}`, pageWidth - margin, finalY, { align: 'right' });

    // Terms and Conditions Box
    const termsY = finalY + 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL TERMS OF PAYMENT IN KIND:', margin, termsY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const terms = [
        '1. Goods delivered must meet the school\'s quality, freshness, and dryness requirements (e.g., Grade 1 dry grains, quality firewood).',
        '2. Physical inspection, weighing, and verification is conducted directly upon delivery at the school before acceptance.',
        '3. An Official School Fee Receipt will be issued to the parent immediately upon physical delivery to reduce student fee balance.',
        '4. The agreed unit rate is guaranteed and fixed against market price fluctuations until the specified delivery deadline.',
        '5. This order serves as an authorized school purchasing agreement between the Bursar and the parent.'
    ];

    let tY = termsY + 4.5;
    terms.forEach(t => {
        doc.text(t, margin, tY);
        tY += 4;
    });

    // Signature Block
    const authY = tY + 12;
    doc.setFontSize(8);
    doc.line(margin, authY, margin + 65, authY);
    doc.text('Authorized by: Bursar / Head of Institution', margin, authY + 4);
    doc.text('Signature & Official Stamp: ___________________', margin, authY + 8);

    doc.line(pageWidth - margin - 65, authY, pageWidth - margin, authY);
    doc.text('Committed & Accepted by: Parent / Supplier', pageWidth - margin - 65, authY + 4);
    doc.text('Parent Signature: ___________________', pageWidth - margin - 65, authY + 8);

    // Official School Stamp if available
    if (stampImg) {
        const stampWidth = 28;
        const stampHeight = (stampImg.height * stampWidth) / stampImg.width;
        doc.addImage(stampImg, 'PNG', margin + 35, authY - 14, stampWidth, stampHeight);
    }

    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const generateRetailSalesStatementPdf = async (
    type: 'general' | 'store' | 'agent' | 'student' | 'teacher',
    target: RetailStore | User | null,
    sales: RetailSale[],
    startDate: string,
    endDate: string,
    institution: Institution,
    letterheadConfig?: LetterheadConfig,
    logoUrl?: string | null
) => {
    const jspdf = getJsPdf();
    if (!jspdf) throw new Error("jsPDF not found");
    const doc = new jspdf.jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    const headerImg = await loadImage(letterheadConfig?.headerImageUrl || logoUrl);
    setupPdfHeader(doc, headerImg);

    let nextY = 60;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const title = type === 'general' 
        ? 'General Sales Statement' 
        : type === 'store' 
        ? `Sales Statement: ${target?.name}` 
        : type === 'student'
        ? `Student Issuance Statement: ${target?.name}`
        : type === 'teacher'
        ? `Teacher Issuance Statement: ${target?.name}`
        : `Agent Sales Statement: ${target?.name}`;
    doc.text(title.toUpperCase(), margin, nextY);
    
    nextY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Period: ${startDate} to ${endDate}`, margin, nextY);
    doc.text(`Generated on: ${new Date()?.toLocaleString()}`, pageWidth - margin, nextY, { align: 'right' });

    nextY += 15;
    const head = [['Date', 'Description', 'Store', 'Payment', 'Amount (KES)']];
    
    let body = [];
    if (sales.length > 0) {
        body = sales.map(s => [
            new Date(s.createdAt).toLocaleDateString(),
            `Sale - ${s.customerName || 'Walk-in Customer'}`,
            institution.name,
            s.paymentMethod,
            s.totalAmount?.toLocaleString()
        ]);
    } else {
        body = [['-', 'No transactions found for the selected period', '-', '-', '0.00']];
    }

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: nextY,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8 },
        columnStyles: {
            4: { halign: 'right' }
        }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || nextY + 20;
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);

    nextY = finalY + 15;
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, nextY, pageWidth - (margin * 2), 20, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 72);
    doc.text('TOTAL REVENUE:', margin + 10, nextY + 13);
    doc.text(`KES ${totalRevenue?.toLocaleString()}`, pageWidth - margin - 10, nextY + 13, { align: 'right' });

    return doc.output('datauristring');
};

export const generateRetailInventoryReportPdf = async (
    inventory: RetailInventoryItem[],
    stores: RetailStore[],
    institution: Institution,
    letterheadConfig?: LetterheadConfig,
    logoUrl?: string | null
) => {
    const jspdf = getJsPdf();
    if (!jspdf) throw new Error("jsPDF not found");
    const doc = new jspdf.jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    const headerImg = await loadImage(letterheadConfig?.headerImageUrl || logoUrl);
    setupPdfHeader(doc, headerImg);

    let nextY = 60;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INVENTORY VALUATION REPORT', margin, nextY);
    
    nextY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date()?.toLocaleString()}`, margin, nextY);

    const totalCost = inventory.reduce((acc, i) => acc + ((i.costPrice || 0) * (i.quantity || 0)), 0);
    const totalSrp = inventory.reduce((acc, i) => acc + ((i.srpPrice || 0) * (i.quantity || 0)), 0);

    nextY += 15;
    // Summary Cards
    doc.setFillColor(79, 70, 229);
    doc.rect(margin, nextY, 60, 25, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255);
    doc.text('TOTAL COST BASIS', margin + 5, nextY + 10);
    doc.setFontSize(12);
    doc.text(`KES ${totalCost?.toLocaleString()}`, margin + 5, nextY + 18);

    doc.setFillColor(16, 185, 129);
    doc.rect(margin + 65, nextY, 60, 25, 'F');
    doc.setFontSize(8);
    doc.text('TOTAL RETAIL VALUE', margin + 70, nextY + 10);
    doc.setFontSize(12);
    doc.text(`KES ${totalSrp?.toLocaleString()}`, margin + 70, nextY + 18);

    doc.setFillColor(245, 158, 11);
    doc.rect(margin + 130, nextY, pageWidth - margin - (margin + 130), 25, 'F');
    doc.setFontSize(8);
    doc.text('LOW STOCK ITEMS', margin + 135, nextY + 10);
    const lowStockCount = inventory.filter(i => (i.quantity || 0) <= (i.reorderLevel || 5)).length;
    doc.setFontSize(12);
    doc.text(`${lowStockCount} ALERT(S)`, margin + 135, nextY + 18);

    nextY += 35;
    const head = [['Item / SKU', 'Category', 'Quantity', 'Unit Cost', 'Unit SRP', 'Total SRP Val']];
    const body = inventory.map(item => [
        `${item.name}\n${item.sku}`,
        item.category,
        `${item.quantity} ${item.unit}`,
        (item.costPrice || 0)?.toLocaleString(),
        (item.srpPrice || 0)?.toLocaleString(),
        ((item.srpPrice || 0) * (item.quantity || 0))?.toLocaleString()
    ]);

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: nextY,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 7 },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' }
        }
    });

    return doc.output('datauristring');
};

export const generatePMInvoicePdfDataUri = async (
    invoice: PMInvoice,
    tenant: PMTenant,
    unit: PMUnit,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    landlord?: PMLandlord,
    letterheadUrl?: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const headerImg = await loadImage(letterheadUrl || null);
    const tableStartY = createPdfWithLetterhead(doc, 'RENT INVOICE', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Dynamically place metadata below header/title start position
    let yPos = tableStartY + 5;

    // Tenant info (Left side)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('BILL TO:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(tenant.name, margin, yPos + 5);
    doc.text(`Unit: ${unit.unitNumber}`, margin, yPos + 10);
    doc.text(`Phone: ${tenant.phoneNumber}`, margin, yPos + 15);

    // Invoice Meta (Right side)
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE #:', pageWidth - margin - 50, yPos);
    doc.text('DATE:', pageWidth - margin - 50, yPos + 5);
    doc.text('DUE DATE:', pageWidth - margin - 50, yPos + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.invoiceNumber, pageWidth - margin, yPos, { align: 'right' });
    doc.text(new Date(invoice.issueDate).toLocaleDateString(), pageWidth - margin, yPos + 5, { align: 'right' });
    doc.text(new Date(invoice.dueDate).toLocaleDateString(), pageWidth - margin, yPos + 10, { align: 'right' });

    const head = [['#', 'DESCRIPTION', 'AMOUNT (KES)']];
    const body = [
        ['1', invoice.description, invoice.amount?.toLocaleString()]
    ];

    doc.autoTable({
        head: head,
        body: body,
        startY: yPos + 25,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const rentAmount = invoice.amount || 0;
    const openingBalance = invoice.openingBalance || 0;
    const totalDue = rentAmount + openingBalance;

    // Budget space: 15pt more space if there is an opening balance
    const neededSpace = (landlord ? 60 : 30) + (openingBalance > 0 ? 15 : 0);
    let contentY = finalY;

    if (finalY + neededSpace > pageHeight - margin) {
        doc.addPage();
        contentY = margin + 10;
    }

    let currentY = contentY + 15;

    if (openingBalance > 0) {
        // Draw Rent Row
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Rent Amount:', margin, currentY);
        doc.text(`KES ${rentAmount.toLocaleString()}`, pageWidth - margin, currentY, { align: 'right' });
        
        // Draw Arrears Row
        currentY += 7;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // Red color for arrears
        doc.text('Arrears (Balance B/F):', margin, currentY);
        doc.text(`KES ${openingBalance.toLocaleString()}`, pageWidth - margin, currentY, { align: 'right' });
        
        // Draw Total Row
        currentY += 8;
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('TOTAL AMOUNT DUE:', margin, currentY);
        doc.text(`KES ${totalDue.toLocaleString()}`, pageWidth - margin, currentY, { align: 'right' });
        
        // Offset contentY so landlord details are positioned correctly below
        contentY = currentY - 15;
    } else {
        // Just draw Total Row
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('TOTAL AMOUNT DUE:', margin, currentY);
        doc.text(`KES ${totalDue.toLocaleString()}`, pageWidth - margin, currentY, { align: 'right' });
    }

    if (landlord) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('PAYMENT INSTRUCTIONS:', margin, contentY + 35);
        doc.setFont('helvetica', 'normal');
        const method = landlord.preferredPaymentMethod || 'Not Specified';
        doc.text(`Preferred Payment Method: ${method}`, margin, contentY + 42);
        if (landlord.bankDetails) {
            const lines = doc.splitTextToSize(`Details: ${landlord.bankDetails}`, pageWidth - (margin * 2));
            doc.text(lines, margin, contentY + 49);
        }
    }

    return doc.output('datauristring');
};

export const generatePMReceiptPdfDataUri = async (
    payment: PMPayment,
    tenant: PMTenant,
    unit: PMUnit,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    letterheadUrl?: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const headerImg = await loadImage(letterheadUrl || null);
    const tableStartY = createPdfWithLetterhead(doc, 'PAYMENT RECEIPT', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Dynamically place metadata below header/title start position
    let yPos = tableStartY + 5;

    // Receipt Meta (Left side)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RECEIPT FOR:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(tenant.name, margin, yPos + 5);
    doc.text(`Unit: ${unit.unitNumber}`, margin, yPos + 10);

    // Receipt details (Right side)
    doc.setFont('helvetica', 'bold');
    doc.text('RECEIPT NO:', pageWidth - margin - 40, yPos);
    doc.text('DATE:', pageWidth - margin - 40, yPos + 5);
    doc.text('STATUS:', pageWidth - margin - 40, yPos + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(payment.receiptNumber || 'N/A', pageWidth - margin, yPos, { align: 'right' });
    doc.text(new Date(payment.paymentDate).toLocaleDateString(), pageWidth - margin, yPos + 5, { align: 'right' });
    doc.text(payment.status.toUpperCase(), pageWidth - margin, yPos + 10, { align: 'right' });

    const body = [
        ['Receipt Number', payment.receiptNumber || 'N/A'],
        ['Payment Method', payment.paymentMethod],
        ['Payment Type', payment.paymentType],
        ['Reference ID', payment.reference || payment.id.substring(0, 8).toUpperCase()],
        ['Month/Year', payment.periodMonth && payment.periodYear ? `${payment.periodMonth}/${payment.periodYear}` : 'N/A'],
    ];

    doc.autoTable({
        body: body,
        startY: yPos + 20,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { halign: 'right' } },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // We need about 45pt space for Amount Received + Thank You note
    let contentY = finalY;
    if (finalY + 45 > pageHeight - margin) {
        doc.addPage();
        contentY = margin + 10;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AMOUNT RECEIVED:', margin, contentY + 20);
    doc.text(`KES ${payment.amount?.toLocaleString()}`, pageWidth - margin, contentY + 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing us!', pageWidth / 2, contentY + 40, { align: 'center' });

    return doc.output('datauristring');
};

export const generateConsolidatedPMReceiptPdfDataUri = async (
    payments: PMPayment[],
    tenant: PMTenant,
    unit: PMUnit,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    letterheadUrl?: string | null
): Promise<string> => {
    if (!payments || payments.length === 0) throw new Error("No payments provided for receipt.");
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const headerImg = await loadImage(letterheadUrl || null);
    const tableStartY = createPdfWithLetterhead(doc, 'PAYMENT RECEIPT', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Dynamically place metadata below header/title start position
    let yPos = tableStartY + 5;

    // Use details from the first payment row for general fields
    const primaryPayment = payments[0];
    const receiptNumber = primaryPayment.receiptNumber || 'N/A';
    const paymentDateStr = new Date(primaryPayment.paymentDate).toLocaleDateString();
    const paymentMethod = primaryPayment.paymentMethod;
    const paymentStatus = primaryPayment.status.toUpperCase();

    // Calculate total amount
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Receipt Meta (Left side)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RECEIPT FOR:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(tenant.name, margin, yPos + 5);
    doc.text(`Unit: ${unit.unitNumber}`, margin, yPos + 10);

    // Receipt details (Right side)
    doc.setFont('helvetica', 'bold');
    doc.text('RECEIPT NO:', pageWidth - margin - 45, yPos);
    doc.text('DATE:', pageWidth - margin - 45, yPos + 5);
    doc.text('METHOD:', pageWidth - margin - 45, yPos + 10);
    doc.text('STATUS:', pageWidth - margin - 45, yPos + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(receiptNumber, pageWidth - margin, yPos, { align: 'right' });
    doc.text(paymentDateStr, pageWidth - margin, yPos + 5, { align: 'right' });
    doc.text(paymentMethod, pageWidth - margin, yPos + 10, { align: 'right' });
    doc.text(paymentStatus, pageWidth - margin, yPos + 15, { align: 'right' });

    // Table Headers
    const headers = [['Payment Type', 'Period', 'Reference ID', 'Amount']];

    // Table Body
    const body = payments.map(p => [
        p.paymentType,
        p.periodMonth && p.periodYear ? `${p.periodMonth}/${p.periodYear}` : 'N/A',
        p.reference || p.receiptNumber || 'N/A',
        `KES ${(p.amount || 0).toLocaleString()}`
    ]);

    doc.autoTable({
        head: headers,
        body: body,
        startY: yPos + 25,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229], textStyle: { fontStyle: 'bold' } }, // Indigo color header
        columnStyles: { 3: { halign: 'right' } }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let contentY = finalY;
    if (finalY + 45 > pageHeight - margin) {
        doc.addPage();
        contentY = margin + 10;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT RECEIVED:', margin, contentY + 20);
    doc.text(`KES ${totalAmount.toLocaleString()}`, pageWidth - margin, contentY + 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing us!', pageWidth / 2, contentY + 40, { align: 'center' });

    return doc.output('datauristring');
};

export const convertNumberToWords = (amount: number): string => {
    const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teenDigits = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const doubleDigits = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const placeValues = ["", "Thousand", "Million", "Billion"];

    if (amount === 0) return "Zero Shillings Only";

    // Split major and cents
    const parts = amount.toFixed(2).split('.');
    const majorPart = parseInt(parts[0], 10);
    const minorPart = parseInt(parts[1], 10);

    const getChunkWords = (num: number): string => {
        let chunkStr = "";
        const hundreds = Math.floor(num / 100);
        const tensAndOnes = num % 100;

        if (hundreds > 0) {
            chunkStr += singleDigits[hundreds] + " Hundred ";
        }

        if (tensAndOnes > 0) {
            if (tensAndOnes < 10) {
                chunkStr += singleDigits[tensAndOnes];
            } else if (tensAndOnes < 20) {
                chunkStr += teenDigits[tensAndOnes - 10];
            } else {
                const tens = Math.floor(tensAndOnes / 10);
                const ones = tensAndOnes % 10;
                chunkStr += doubleDigits[tens] + (ones > 0 ? "-" + singleDigits[ones] : "");
            }
        }
        return chunkStr.trim();
    };

    let words = "";
    let tempNum = majorPart;
    let placeIdx = 0;

    if (tempNum === 0) {
        words = "Zero";
    } else {
        while (tempNum > 0) {
            const chunk = tempNum % 1000;
            if (chunk > 0) {
                const chunkWords = getChunkWords(chunk);
                words = chunkWords + " " + placeValues[placeIdx] + " " + words;
            }
            tempNum = Math.floor(tempNum / 1000);
            placeIdx++;
        }
    }

    words = words.trim() + " Shillings";

    if (minorPart > 0) {
        const minorWords = getChunkWords(minorPart);
        words += " and " + minorWords + " Cents";
    }

    return words + " Only";
};

export const generatePMExpenseVoucherPdf = async (
    voucher: PMExpenseVoucher,
    property: PMProperty,
    unit: PMUnit | null,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    letterheadUrl?: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const headerImg = await loadImage(letterheadUrl || null);
    const tableStartY = createPdfWithLetterhead(doc, 'PAYMENT VOUCHER', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let yPos = tableStartY + 5;

    // Voucher Number & Date details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Voucher No: ${voucher.voucherNumber}`, margin, yPos);
    doc.text(`Date: ${new Date(voucher.paymentDate).toLocaleDateString()}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Property: ${property.name}${unit ? ` - Unit ${unit.unitNumber}` : ''}`, margin, yPos);
    doc.text(`Status: ${voucher.status.toUpperCase()}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 12;

    // Payee Box
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 22, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.text('PAYEE / VENDOR DETAILS:', margin + 4, yPos + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${voucher.payeeName}`, margin + 4, yPos + 12);
    if (voucher.payeePhone) {
        doc.text(`Phone: ${voucher.payeePhone}`, margin + 4, yPos + 17);
    }
    
    // Payment Mode Info
    doc.text(`Method: ${voucher.paymentMethod}`, pageWidth - margin - 50, yPos + 12);
    if (voucher.reference) {
        doc.text(`Ref: ${voucher.reference}`, pageWidth - margin - 50, yPos + 17);
    }

    yPos += 30;

    // Table Header
    doc.setFillColor(37, 99, 235); // Blue corporate header
    doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('EXPENSE CATEGORY & PARTICULARS', margin + 4, yPos + 5.5);
    doc.text('AMOUNT', pageWidth - margin - 4, yPos + 5.5, { align: 'right' });

    yPos += 8;

    // Table Body
    doc.setTextColor(30, 41, 59); // dark text
    doc.setFont('helvetica', 'normal');
    doc.setLineWidth(0.1);
    doc.line(margin, yPos, margin, yPos + 22);
    doc.line(pageWidth - margin, yPos, pageWidth - margin, yPos + 22);
    
    doc.setFont('helvetica', 'bold');
    doc.text(voucher.category, margin + 4, yPos + 6);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(voucher.description || 'No description provided.', pageWidth - (margin * 2) - 30);
    doc.text(descLines, margin + 4, yPos + 12);

    doc.setFont('helvetica', 'bold');
    doc.text(`KES ${voucher.amount.toLocaleString()}`, pageWidth - margin - 4, yPos + 6, { align: 'right' });

    yPos += 22;
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // Total box
    yPos += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT PAID:', margin, yPos + 4);
    doc.text(`KES ${voucher.amount.toLocaleString()}`, pageWidth - margin, yPos + 4, { align: 'right' });

    // Amount in words
    yPos += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const amountInWords = convertNumberToWords(voucher.amount);
    const amountWordsLines = doc.splitTextToSize(`Amount in Words: ${amountInWords}`, pageWidth - (margin * 2));
    doc.text(amountWordsLines, margin, yPos);

    yPos += (amountWordsLines.length * 4.5);

    // Signature Block at the bottom
    let sigY = pageHeight - margin - 20;
    if (yPos + 50 > sigY) {
        doc.addPage();
        sigY = pageHeight - margin - 20;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(150, 150, 150);
    
    // Lines for signatures
    const sigWidth = 38;
    const sigSpacing = 10;
    
    // Prepared by
    doc.line(margin, sigY, margin + sigWidth, sigY);
    doc.text('PREPARED BY / CASHIER', margin + 2, sigY + 4);
    
    // Checked by
    let currentX = margin + sigWidth + sigSpacing;
    doc.line(currentX, sigY, currentX + sigWidth, sigY);
    doc.text('CHECKED BY / ACCT', currentX + 2, sigY + 4);
    
    // Approved by
    currentX = currentX + sigWidth + sigSpacing;
    doc.line(currentX, sigY, currentX + sigWidth, sigY);
    doc.text(`APPROVED BY / ADMIN${voucher.approvedBy ? ` (${voucher.approvedBy})` : ''}`, currentX + 2, sigY + 4);
    
    // Received by (Payee)
    currentX = currentX + sigWidth + sigSpacing;
    doc.line(currentX, sigY, currentX + sigWidth, sigY);
    doc.text('RECEIVED BY / PAYEE', currentX + 2, sigY + 4);

    return doc.output('datauristring');
};

export const generateExpenseVoucherPdf = async (
    expense: Expense,
    voteHeadName: string,
    bankAccountDetails: string,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    letterheadUrl?: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const headerImg = await loadImage(letterheadUrl || null);
    const tableStartY = createPdfWithLetterhead(doc, 'PAYMENT VOUCHER', companyDetails, institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let yPos = tableStartY + 5;

    // Voucher Number & Date details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Voucher No: ${expense.referenceNumber || expense.id}`, margin, yPos);
    doc.text(`Date: ${new Date(expense.date).toLocaleDateString()}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Source Account: ${bankAccountDetails || 'N/A'}`, margin, yPos);
    doc.text(`Status: ${(expense.status || 'paid').toUpperCase()}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 12;

    // Payee Box
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 22, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.text('PAYEE / RECIPIENT DETAILS:', margin + 4, yPos + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${expense.payeeName || 'N/A'}`, margin + 4, yPos + 12);
    doc.text(`Method: ${expense.paymentMethod || 'Cash'}`, pageWidth - margin - 60, yPos + 12);
    
    // Checked if cheque or transaction reference is present
    if (expense.referenceNumber && expense.referenceNumber.startsWith('PV-')) {
        // Prefix of voucher number, don't show as reference
    } else if (expense.referenceNumber) {
        doc.text(`Ref: ${expense.referenceNumber}`, pageWidth - margin - 60, yPos + 17);
    }

    yPos += 30;

    // Table Header
    doc.setFillColor(31, 41, 55); // Dark grey corporate header
    doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('VOTEHEAD & PARTICULARS OF EXPENDITURE', margin + 4, yPos + 5.5);
    doc.text('AMOUNT', pageWidth - margin - 4, yPos + 5.5, { align: 'right' });

    yPos += 8;

    // Table Body
    doc.setTextColor(30, 41, 59); // Dark text
    doc.setFont('helvetica', 'normal');
    doc.setLineWidth(0.1);
    doc.line(margin, yPos, margin, yPos + 22);
    doc.line(pageWidth - margin, yPos, pageWidth - margin, yPos + 22);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Votehead charged: ${voteHeadName || 'General / Unspecified'}`, margin + 4, yPos + 6);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(expense.description || 'No description provided.', pageWidth - (margin * 2) - 30);
    doc.text(descLines, margin + 4, yPos + 12);

    doc.setFont('helvetica', 'bold');
    doc.text(`KES ${expense.amount.toLocaleString()}`, pageWidth - margin - 4, yPos + 6, { align: 'right' });

    yPos += 22;
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // Total box
    yPos += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT:', margin, yPos + 4);
    doc.text(`KES ${expense.amount.toLocaleString()}`, pageWidth - margin, yPos + 4, { align: 'right' });

    // Amount in words
    yPos += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const amountInWords = convertNumberToWords(expense.amount);
    const amountWordsLines = doc.splitTextToSize(`Amount in Words: ${amountInWords}`, pageWidth - (margin * 2));
    doc.text(amountWordsLines, margin, yPos);

    yPos += (amountWordsLines.length * 4.5);

    // Signature Block at the bottom
    let sigY = pageHeight - margin - 20;
    if (yPos + 50 > sigY) {
        doc.addPage();
        sigY = pageHeight - margin - 20;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(150, 150, 150);
    
    // Lines for signatures
    const sigWidth = 38;
    const sigSpacing = 10;
    
    // Prepared by
    doc.line(margin, sigY, margin + sigWidth, sigY);
    doc.text(`PREPARED BY: ${expense.recordedBy || 'Accountant'}`, margin + 2, sigY + 4);
    
    // Checked by
    let currentX = margin + sigWidth + sigSpacing;
    doc.line(currentX, sigY, currentX + sigWidth, sigY);
    doc.text('CHECKED BY / ACCT', currentX + 2, sigY + 4);
    
    // Approved by
    currentX = currentX + sigWidth + sigSpacing;
    doc.line(currentX, sigY, currentX + sigWidth, sigY);
    doc.text(`APPROVED BY: ${expense.approvedBy || 'Admin'}`, currentX + 2, sigY + 4);
    
    // Received by (Payee)
    currentX = currentX + sigWidth + sigSpacing;
    if (expense.signatureData || (expense as any).signature_data) {
        try {
            doc.addImage(expense.signatureData || (expense as any).signature_data, 'PNG', currentX + 2, sigY - 12, sigWidth - 4, 11);
        } catch (imgErr) {
            console.error("Failed to add signature image to PDF:", imgErr);
        }
    }
    doc.line(currentX, sigY, currentX + sigWidth, sigY);
    doc.text('RECEIVED BY: PAYEE SIGN', currentX + 2, sigY + 4);

    return doc.output('datauristring');
};

export const downloadExpenseVoucherPdf = async (
    expense: Expense,
    voteHeadName: string,
    bankAccountDetails: string,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    letterheadUrl?: string | null
): Promise<void> => {
    const dataUri = await generateExpenseVoucherPdf(
        expense,
        voteHeadName,
        bankAccountDetails,
        institution,
        companyDetails,
        logoUrl,
        letterheadUrl
    );
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `Voucher-${expense.referenceNumber || expense.id}.pdf`;
    document.body.appendChild(link);
    link.click();
};


export const generateBankAdvicePdf = async (
    params: {
        period: string;
        chequeNumber: string;
        paymentDate: string;
        sourceBankAccount: any;
        staffDetails: {
            staffName: string;
            bankName: string;
            bankBranch: string;
            accountNumber: string;
            netPay: number;
        }[];
        institution: Institution;
        companyDetails: CompanyDetails;
        logoUrl: string | null;
        letterheadUrl?: string | null;
    }
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(params.logoUrl);
    const headerImg = await loadImage(params.letterheadUrl || null);
    const tableStartY = createPdfWithLetterhead(doc, 'SALARY DISBURSEMENT ADVICE', params.companyDetails, params.institution, logoImg, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let yPos = tableStartY + 5;

    // Date & Bank Manager Address
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(params.paymentDate).toLocaleDateString()}`, pageWidth - margin, yPos, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('TO:', margin, yPos);
    yPos += 5;
    doc.text('THE BRANCH MANAGER,', margin, yPos);
    yPos += 5;
    doc.text((params.sourceBankAccount?.bankName || 'THE BANK').toUpperCase(), margin, yPos);
    if (params.sourceBankAccount?.branchName) {
        yPos += 5;
        doc.text(`${params.sourceBankAccount.branchName.toUpperCase()} BRANCH`, margin, yPos);
    }
    
    yPos += 12;
    
    // Subject line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const subject = `RE: SALARY DISBURSEMENT ADVICE FOR THE MONTH OF ${params.period.toUpperCase()}`;
    doc.text(subject, margin, yPos);
    doc.line(margin, yPos + 1.5, margin + doc.getTextWidth(subject), yPos + 1.5);
    
    yPos += 10;
    
    // Body paragraph
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const totalAmount = params.staffDetails.reduce((sum, item) => sum + (item.netPay || 0), 0);
    
    const bodyText = `We hereby authorize you to debit our account number ${params.sourceBankAccount?.accountNumber || '___________'} (${params.sourceBankAccount?.accountName || '___________'}) and disburse salaries for the month of ${params.period} amounting to KES ${totalAmount.toLocaleString()} (Kenya Shillings ${convertNumberToWords(totalAmount)}) to the individual employee bank accounts listed in the schedule below. Enclosed is our Cheque No: ${params.chequeNumber || '___________'} drawn on the same account for the total sum.`;
    
    const splitBody = doc.splitTextToSize(bodyText, pageWidth - (margin * 2));
    doc.text(splitBody, margin, yPos);
    
    // Table Y start based on split body length
    yPos += (splitBody.length * 5) + 6;
    
    // Table Headers
    const headers = ['S/No', 'Employee Name', 'Bank Name', 'Branch', 'Account Number', 'Net Amount'];
    const colWidths = [12, 50, 35, 30, 35, 20]; // total = 182
    
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    let currentX = margin;
    headers.forEach((h, idx) => {
        const align = idx === 5 ? 'right' : 'left';
        const offset = idx === 5 ? colWidths[idx] - 2 : 2;
        doc.text(h, currentX + offset, yPos + 5, { align });
        currentX += colWidths[idx];
    });
    
    yPos += 7;
    
    // Table Rows
    doc.setFont('helvetica', 'normal');
    params.staffDetails.forEach((row, i) => {
        // Page break check
        if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = 20;
            // Draw table headers again
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, yPos, pageWidth - (margin * 2), 7, 'F');
            doc.setFont('helvetica', 'bold');
            currentX = margin;
            headers.forEach((h, idx) => {
                const align = idx === 5 ? 'right' : 'left';
                const offset = idx === 5 ? colWidths[idx] - 2 : 2;
                doc.text(h, currentX + offset, yPos + 5, { align });
                currentX += colWidths[idx];
            });
            yPos += 7;
            doc.setFont('helvetica', 'normal');
        }
        
        let rowX = margin;
        // Alternating fill color
        if (i % 2 === 1) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, yPos, pageWidth - (margin * 2), 7, 'F');
        }
        
        doc.text(String(i + 1), rowX + 2, yPos + 5);
        rowX += colWidths[0];
        doc.text(row.staffName, rowX + 2, yPos + 5);
        rowX += colWidths[1];
        doc.text(row.bankName, rowX + 2, yPos + 5);
        rowX += colWidths[2];
        doc.text(row.bankBranch, rowX + 2, yPos + 5);
        rowX += colWidths[3];
        doc.text(row.accountNumber, rowX + 2, yPos + 5);
        rowX += colWidths[4];
        doc.text(Number(row.netPay || 0).toLocaleString(), rowX + colWidths[5] - 2, yPos + 5, { align: 'right' });
        
        yPos += 7;
    });
    
    // Totals Row
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL SALARY PAYMENTS', margin + 2, yPos + 6);
    doc.text(`KES ${totalAmount.toLocaleString()}`, pageWidth - margin - 2, yPos + 6, { align: 'right' });
    
    yPos += 15;
    
    // Signatures
    if (yPos > pageHeight - 35) {
        doc.addPage();
        yPos = 25;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text(`For ${params.institution.name.toUpperCase()}`, margin, yPos);
    
    yPos += 15;
    
    // Two authorized signatory signature lines side by side
    const sigWidth = 70;
    const sigSpacing = 20;
    
    let sigX = margin;
    doc.line(sigX, yPos, sigX + sigWidth, yPos);
    doc.text('AUTHORIZED SIGNATORY 1', sigX, yPos + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Designation: School Head / Principal', sigX, yPos + 8);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    sigX = sigX + sigWidth + sigSpacing;
    doc.line(sigX, yPos, sigX + sigWidth, yPos);
    doc.text('AUTHORIZED SIGNATORY 2', sigX, yPos + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Designation: Board Treasurer / Director', sigX, yPos + 8);
    
    return doc.output('datauristring');
};

export const downloadBankAdvicePdf = async (
    params: any
): Promise<void> => {
    const dataUri = await generateBankAdvicePdf(params);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `Bank-Advice-${params.period.replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


export const generatePMNoticeLetterPdf = async (
    notice: PMNoticeLetter,
    tenant: PMTenant,
    unit: PMUnit,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    letterheadUrl?: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const headerImg = await loadImage(letterheadUrl || null);
    const tableStartY = createPdfWithLetterhead(
        doc,
        notice.noticeType.toUpperCase() + ' NOTICE',
        companyDetails,
        institution,
        logoImg,
        headerImg
    );
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    let yPos = tableStartY + 5;

    // Recipient & Date details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(notice.issueDate).toLocaleDateString()}`, margin, yPos);

    yPos += 12;
    doc.setFont('helvetica', 'bold');
    doc.text('TO:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(tenant.name, margin, yPos + 5);
    doc.text(`Unit Number: ${unit.unitNumber}`, margin, yPos + 10);
    doc.text(`Phone: ${tenant.phoneNumber}`, margin, yPos + 15);

    yPos += 28;
    // Subject Line
    doc.setFont('helvetica', 'bold');
    doc.text(`RE: ${notice.subject.toUpperCase()}`, margin, yPos);

    // Draw horizontal line under subject
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);

    yPos += 10;
    // Body Text with auto-wrapping
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(notice.messageBody, 180);
    doc.text(splitText, margin, yPos);

    yPos += splitText.length * 5 + 15;

    // Dates compliance
    doc.setFont('helvetica', 'bold');
    doc.text(`Effective Notice Date: ${new Date(notice.effectiveDate).toLocaleDateString()}`, margin, yPos);

    yPos += 15;

    // Signature block
    doc.setFont('helvetica', 'bold');
    doc.text('Signed By:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(institution.name, margin, yPos + 5);
    doc.text('Property Management Office', margin, yPos + 10);

    return doc.output('datauristring');
};

export const generateOphthalPrescriptionPdf = async (
    od: any,
    os: any,
    patientName: string,
    institution: any,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = margin;

    // 1. Header & Logo
    if (logoImg) {
        const logoWidth = 25;
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        doc.addImage(logoImg, 'PNG', margin, yPos, logoWidth, logoHeight);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(institution.name || 'Clinical Unit', pageWidth - margin, yPos + 5, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Email: ${institution.email || 'N/A'}`, pageWidth - margin, yPos + 11, { align: 'right' });
    doc.text(`Phone: ${institution.phoneNumber || 'N/A'}`, pageWidth - margin, yPos + 15, { align: 'right' });

    yPos += 35;
    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    // 2. Title & Date
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(0);
    doc.text("OPTICAL PRESCRIPTION", margin, yPos);
    
    doc.setFontSize(9);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin, yPos, { align: 'right' });

    // 3. Patient Info
    yPos += 15;
    doc.setFontSize(10);
    doc.text("PATIENT NAME:", margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(patientName.toUpperCase(), margin + 30, yPos);

    // 4. Refraction Matrix
    yPos += 15;
    const head = [['EYE', 'SPHERE (SPH)', 'CYLINDER (CYL)', 'AXIS', 'ADD', 'V/A']];
    const body = [
        ['Right (OD)', od.sphere || 'Plano', od.cylinder || '-', od.axis || '-', od.add || '-', od.va || '6/6'],
        ['Left (OS)', os.sphere || 'Plano', os.cylinder || '-', os.axis || '-', os.add || '-', os.va || '6/6']
    ];

    doc.autoTable({
        head: head,
        body: body,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255, halign: 'center' },
        styles: { halign: 'center', fontSize: 10, cellPadding: 8 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // 5. Notes & Signature
    doc.setFont('helvetica', 'bold');
    doc.text("RECOMMENDATIONS:", margin, yPos);
    doc.setFont('helvetica', 'normal');
    const notes = [
        "• Anti-Reflective Coating (ARC) recommended for night driving.",
        "• Blue-Cut Filter recommended for prolonged computer use.",
        "• Photochromic lenses suggested for outdoor UV protection.",
        "• Re-examination recommended in 12 months."
    ];
    notes.forEach((note, i) => {
        doc.text(note, margin, yPos + 10 + (i * 7));
    });

    yPos += 60;
    doc.line(pageWidth - margin - 60, yPos, pageWidth - margin, yPos);
    doc.setFontSize(8);
    doc.text("Attending Optometrist / Ophthalmologist", pageWidth - margin, yPos + 5, { align: 'right' });
    doc.text("Official Medical Registry Stamp", pageWidth - margin, yPos + 10, { align: 'right' });

    return doc.output('datauristring');
};



export const generateCoopSettlementSchedulePdf = async (
    data: any[],
    monthName: string,
    year: number,
    totalNet: number,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF('l', 'mm', 'a4'); // Landscape
    const logoImg = await loadImage(logoUrl);
    const tableStartY = createPdfWithLetterhead(doc, `SETTLEMENT SCHEDULE: ${monthName.toUpperCase()} ${year}`, {} as any, institution, logoImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    const head = [['FARMER NAME', 'PHONE', 'TOTAL QTY', 'GROSS PAYOUT', 'ADVANCES', 'DEDUCTIONS', 'NET PAYOUT']];
    const body = data.map(item => [
        item.name,
        item.phone,
        item.totalQty?.toLocaleString(),
        item.gross?.toLocaleString(),
        item.advances?.toLocaleString(),
        item.deductions?.toLocaleString(),
        item.net?.toLocaleString()
    ]);

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: tableStartY + 10,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 8 },
        columnStyles: { 
            2: { halign: 'center' }, 
            3: { halign: 'right' }, 
            4: { halign: 'right' }, 
            5: { halign: 'right' },
            6: { halign: 'right', fontStyle: 'bold' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || tableStartY + 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL NET SETTLEMENT: KES ${totalNet?.toLocaleString()}`, pageWidth - margin, finalY + 15, { align: 'right' });

    return doc.output('datauristring');
};

export const generateInventoryRegistryPdfDataUri = async (
    inventory: InventoryItem[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
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
    doc.text("INVENTORY REGISTRY", margin, yPos);
    yPos += 10;

    const head = [['Name', 'Category', 'Unit', 'Qty', 'Reorder Level', 'Value']];
    const body = (inventory || []).map(item => [
        item.name,
        item.category || 'N/A',
        item.unit || 'unit',
        item.quantity,
        item.reorderLevel || 0,
        (item.quantity * (item.price || 0))?.toLocaleString()
    ]);

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateIssuanceReportPdfDataUri = async (
    transactions: StockTransaction[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
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
    doc.text("INVENTORY ISSUANCE REPORT", margin, yPos);
    yPos += 10;

    const head = [['Recipient', 'ID', 'Class', 'Item', 'Qty', 'Signature', 'Date']];
    const body = (transactions || []).map(t => [
        t.recipientOrSupplier || 'N/A',
        (t as any).recipientDisplayId || (t.recipientId ? t.recipientId.substring(0, 8) : 'N/A'),
        (t as any).recipientClass || 'N/A',
        t.itemName,
        t.quantity,
        '', // Placeholder for signature image
        t.date ? new Date(t.date).toLocaleDateString() : 'N/A'
    ]);

    doc.autoTable({
        startY: yPos,
        head,
        body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 7, cellPadding: 2, minCellHeight: 12 },
        columnStyles: {
            5: { cellWidth: 20 } // Signature column width
        },
        didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 5) {
                const txn = transactions[data.row.index];
                if (txn.signature) {
                    try {
                        const imgSize = 8;
                        const x = data.cell.x + (data.cell.width - imgSize) / 2;
                        const y = data.cell.y + (data.cell.height - imgSize) / 2;
                        doc.addImage(txn.signature, 'PNG', x, y, imgSize, imgSize);
                    } catch (e) {
                        console.error('Error adding signature to PDF:', e);
                    }
                }
            }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateInventoryStatementPdfDataUri = async (
    transactions: StockTransaction[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
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
    doc.text("INVENTORY TRANSACTION STATEMENT", margin, yPos);
    yPos += 10;

    const head = [['Date', 'Item', 'Type', 'Qty', 'Recipient/Supplier']];
    const body = (transactions || []).map(t => [
        t.date ? new Date(t.date).toLocaleDateString() : 'N/A',
        t.itemName,
        t.type,
        t.quantity,
        t.recipientOrSupplier || 'N/A'
    ]);

    doc.autoTable({
        startY: yPos,
        head,
        body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateInventoryAnalyticsPdfDataUri = async (
    inventory: InventoryItem[],
    issuanceHistory: StockTransaction[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
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
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("INVENTORY ANALYTICS & INSIGHTS", margin, yPos);
    yPos += 15;

    // 1. Executive Summary Cards
    const totalValuation = inventory.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0);
    const criticalSkus = inventory.filter(i => i.quantity <= (i.reorderLevel || 0)).length;
    const optimizationLevel = ((inventory.filter(i => i.quantity > (i.reorderLevel || 0)).length / Math.max(1, inventory.length)) * 100).toFixed(0);

    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.roundedRect(margin, yPos, 55, 25, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("TOTAL VALUATION", margin + 5, yPos + 8);
    doc.setFontSize(12);
    doc.text(`KES ${totalValuation?.toLocaleString()}`, margin + 5, yPos + 18);

    doc.setFillColor(245, 158, 11); // Amber-500
    doc.roundedRect(margin + 60, yPos, 55, 25, 3, 3, 'F');
    doc.setFontSize(8);
    doc.text("CRITICAL SKUS", margin + 65, yPos + 8);
    doc.setFontSize(12);
    doc.text(`${criticalSkus} items`, margin + 65, yPos + 18);

    doc.setFillColor(16, 185, 129); // Emerald-500
    doc.roundedRect(margin + 120, yPos, 55, 25, 3, 3, 'F');
    doc.setFontSize(8);
    doc.text("OPTIMIZATION", margin + 125, yPos + 8);
    doc.setFontSize(12);
    doc.text(`${optimizationLevel}%`, margin + 125, yPos + 18);

    yPos += 40;

    // 2. AI Insights Section
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 3, 3, 'FD');
    doc.setTextColor(79, 70, 229);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("AI INTELLIGENCE INSIGHT", margin + 5, yPos + 8);
    
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    const insightText = criticalSkus > 3 
        ? "Current low stock levels in key categories may disrupt operations within 14 days. Recommend prioritizing restock for items below reorder thresholds." 
        : "Inventory levels are currently optimized. Focus on reconciling high-frequency issuance items to maintain accuracy.";
    const splitInsight = doc.splitTextToSize(insightText, pageWidth - (margin * 2) - 15);
    doc.text(splitInsight, margin + 5, yPos + 15);

    yPos += 40;

    // 3. Category Valuation Details
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("CATEGORY VALUATION DISTRIBUTION", margin, yPos);
    yPos += 8;

    const categoryData = Object.entries(inventory.reduce((acc, i) => {
        acc[i.category] = (acc[i.category] || 0) + (i.quantity * (i.price || 0));
        return acc;
    }, {} as Record<string, number>)).sort((a,b) => b[1]-a[1]).slice(0, 10);

    const catHead = [['Category', 'Valuation (KES)', 'Contribution (%)']];
    const catBody = categoryData.map(([cat, val]) => [
        cat.toUpperCase(),
        val?.toLocaleString(),
        ((val / Math.max(1, totalValuation)) * 100).toFixed(1) + '%'
    ]);

    doc.autoTable({
        startY: yPos,
        head: catHead,
        body: catBody,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // 4. Issuance Velocity (Top items)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("TOP ISSUED ITEMS (30-DAY VELOCITY)", margin, yPos);
    yPos += 8;

    const issuanceData = Object.entries(issuanceHistory.reduce((acc, txn) => {
        acc[txn.itemName] = (acc[txn.itemName] || 0) + txn.quantity;
        return acc;
    }, {} as Record<string, number>)).sort((a,b) => b[1]-a[1]).slice(0, 5);

    const issueHead = [['Item Name', 'Quantity Issued', 'Relative Velocity']];
    const maxQty = Math.max(1, ...issuanceData.map(d => d[1]));
    
    const issueBody = issuanceData.map(([item, qty]) => [
        item.toUpperCase(),
        qty?.toLocaleString(),
        '|'.repeat(Math.round((qty/maxQty) * 20)) // Simple text-based bar
    ]);

    doc.autoTable({
        startY: yPos,
        head: issueHead,
        body: issueBody,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right' }, 2: { textColor: [79, 70, 229], fontStyle: 'bold' } }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateInventorySummaryPdfDataUri = async (
    inventory: InventoryItem[],
    issuanceHistory: StockTransaction[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
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
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("INVENTORY EXECUTIVE SUMMARY", margin, yPos);
    yPos += 15;

    // 1. Executive Summary Cards
    const healthyItems = inventory.filter(i => i.quantity > (i.reorderLevel || 0)).length;
    const criticalItems = inventory.filter(i => i.quantity <= (i.reorderLevel || 0)).length;
    const totalTransactions = issuanceHistory.length;

    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.roundedRect(margin, yPos, 55, 25, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("STOCK HEALTH", margin + 5, yPos + 8);
    doc.setFontSize(14);
    doc.text(`${healthyItems}/${inventory.length}`, margin + 5, yPos + 18);

    doc.setFillColor(225, 29, 72); // Rose-600
    doc.roundedRect(margin + 60, yPos, 55, 25, 3, 3, 'F');
    doc.setFontSize(8);
    doc.text("CRITICAL ALERTS", margin + 65, yPos + 8);
    doc.setFontSize(14);
    doc.text(`${criticalItems} items`, margin + 65, yPos + 18);

    doc.setFillColor(15, 23, 42); // Slate-900
    doc.roundedRect(margin + 120, yPos, 55, 25, 3, 3, 'F');
    doc.setFontSize(8);
    doc.text("TOTAL ISSUANCES", margin + 125, yPos + 8);
    doc.setFontSize(14);
    doc.text(`${totalTransactions}`, margin + 125, yPos + 18);

    yPos += 40;

    // 2. Recent Distributions Table
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("RECENT DISTRIBUTIONS (TOP 10)", margin, yPos);
    yPos += 8;

    const tableHead = [['Recipient', 'Item', 'Qty', 'Date']];
    const tableBody = issuanceHistory.slice(0, 10).map(t => [
        t.recipientOrSupplier?.toUpperCase() || 'N/A',
        t.itemName.toUpperCase(),
        t.quantity.toString(),
        t.date ? new Date(t.date).toLocaleDateString() : 'N/A'
    ]);

    doc.autoTable({
        startY: yPos,
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [71, 85, 105] },
        columnStyles: {
            2: { halign: 'center' },
            3: { halign: 'right' }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates a comprehensive statement for a cooperative farmer.
 */
export const generateFarmerStatementPdf = async (
    farmer: CoopFarmer,
    transactions: any[],
    openingBalance: number,
    totals: { credit: number; debit: number; balance: number; totalQty?: number; deductionsBreakdown?: Record<string, number> },
    startDate: string,
    endDate: string,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
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
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title & Date Range
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("FARMER PRODUCTION STATEMENT", margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Farmer Details Card
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 35, 2, 2, 'FD');
    
    let cardY = yPos + 8;
    doc.setFont('helvetica', 'bold');
    doc.text("FARMER DETAILS", margin + 5, cardY);
    cardY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${farmer.name.toUpperCase()}`, margin + 5, cardY);
    doc.text(`ID/Member No: ${farmer.nationalId || farmer.memberId || 'N/A'}`, pageWidth / 2, cardY);
    cardY += 5;
    doc.text(`Phone: ${farmer.phone || 'N/A'}`, margin + 5, cardY);
    doc.text(`Route/Area: ${farmer.location || 'Main'}`, pageWidth / 2, cardY);
    cardY += 5;
    doc.text(`Status: ${farmer.status?.toUpperCase() || 'ACTIVE'}`, margin + 5, cardY);
    
    yPos += 45;

    // Summary Table
    const summaryHead = [['Opening Bal', 'Total Deliveries (Qty)', 'Gross Earnings', 'Total Deductions', 'Closing Balance']];
    const summaryBody = [[
        openingBalance?.toLocaleString(),
        (totals.totalQty || 0)?.toLocaleString(),
        totals.credit?.toLocaleString(),
        totals.debit?.toLocaleString(),
        totals.balance?.toLocaleString()
    ]];

    doc.autoTable({
        startY: yPos,
        head: summaryHead,
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255, fontSize: 9 },
        styles: { fontSize: 11, halign: 'center' },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Itemized Deductions
    if (totals.deductionsBreakdown && Object.keys(totals.deductionsBreakdown).length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("DEDUCTIONS BREAKDOWN", margin, yPos);
        yPos += 5;

        const dedHead = [['Category', 'Amount (KES)']];
        const dedBody = Object.entries(totals.deductionsBreakdown).map(([cat, amt]) => [cat, amt?.toLocaleString()]);

        doc.autoTable({
            startY: yPos,
            head: dedHead,
            body: dedBody,
            theme: 'grid',
            headStyles: { fillColor: [244, 63, 94] }, // Rose-500
            styles: { fontSize: 9 },
            margin: { left: margin, right: margin + 100 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
        yPos += 5;
    }

    // Transactions Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("TRANSACTION LEDGER", margin, yPos);
    yPos += 6;

    const transHead = [['Date', 'Description', 'Reference', 'Qty/In', 'Amt/Out', 'Balance']];
    const transBody = transactions.map((t: any) => [
        new Date(t.date).toLocaleDateString(),
        t.description || (t.type === 'credit' ? 'Milk Delivery' : 'Cash Advance'),
        t.reference || t.id?.substring(0, 8).toUpperCase() || '-',
        t.type === 'credit' ? (t.quantity || 0)?.toLocaleString() : '-',
        t.type === 'debit' ? t.amount?.toLocaleString() : '-',
        t.balance?.toLocaleString()
    ]);

    doc.autoTable({
        startY: yPos,
        head: transHead,
        body: transBody,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold' }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates a comprehensive statement for a cooperative rider.
 */
export const generateRiderStatementPdf = async (
    rider: CoopRider,
    transactions: any[],
    openingBalance: number,
    totals: { credit: number; debit: number; balance: number; totalQty?: number; deductionsBreakdown?: Record<string, number> },
    startDate: string,
    endDate: string,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
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
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title & Date Range
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("RIDER EARNINGS STATEMENT", margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Rider Details Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 30, 2, 2, 'FD');
    
    let cardY = yPos + 8;
    doc.setFont('helvetica', 'bold');
    doc.text("RIDER DETAILS", margin + 5, cardY);
    cardY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${rider.name.toUpperCase()}`, margin + 5, cardY);
    doc.text(`Phone: ${rider.phone || 'N/A'}`, pageWidth / 2, cardY);
    cardY += 5;
    doc.text(`License No: ${rider.licenseNumber || 'N/A'}`, margin + 5, cardY);
    doc.text(`Vehicle: ${rider.vehiclePlate || rider.vehicleNumber || 'N/A'}`, pageWidth / 2, cardY);
    
    yPos += 40;

    // Summary Table
    const summaryHead = [['Opening Bal', 'Gross Earnings', 'Deductions', 'Net Payable']];
    const summaryBody = [[
        openingBalance?.toLocaleString(),
        totals.credit?.toLocaleString(),
        totals.debit?.toLocaleString(),
        totals.balance?.toLocaleString()
    ]];

    doc.autoTable({
        startY: yPos,
        head: summaryHead,
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 11, halign: 'center' },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Itemized Deductions
    if (totals.deductionsBreakdown && Object.keys(totals.deductionsBreakdown).length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("DEDUCTIONS BREAKDOWN", margin, yPos);
        yPos += 5;

        const dedHead = [['Category', 'Amount (KES)']];
        const dedBody = Object.entries(totals.deductionsBreakdown).map(([cat, amt]) => [cat, amt?.toLocaleString()]);

        doc.autoTable({
            startY: yPos,
            head: dedHead,
            body: dedBody,
            theme: 'grid',
            headStyles: { fillColor: [244, 63, 94] }, // Rose-500
            styles: { fontSize: 9 },
            margin: { left: margin, right: margin + 100 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
        yPos += 5;
    }

    // Transactions Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("EARNINGS LEDGER", margin, yPos);
    yPos += 6;

    const transHead = [['Date', 'Description', 'Credit', 'Debit', 'Balance']];
    const transBody = transactions.map((t: any) => [
        new Date(t.date).toLocaleDateString(),
        t.description || (t.type === 'credit' ? 'Delivery Fee' : 'Payment'),
        t.type === 'credit' ? t.amount?.toLocaleString() : '-',
        t.type === 'debit' ? t.amount?.toLocaleString() : '-',
        t.balance?.toLocaleString()
    ]);

    doc.autoTable({
        startY: yPos,
        head: transHead,
        body: transBody,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] }, // Green-600
        styles: { fontSize: 8 },
        columnStyles: {
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right', fontStyle: 'bold' }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates a Payment Schedule Report for cooperative payouts.
 * Filters by settlement method (MPESA, BANK, CASH).
 */
export const generatePaymentSchedulePdf = async (
    payouts: any[],
    farmers: any[],
    method: 'mpesa' | 'bank' | 'cash' | 'all',
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
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
    const pageWidth = doc.internal.pageSize.getWidth();

    // Filter payouts by method if not 'all'
    const filteredPayouts = payouts.filter(p => {
        const farmer = farmers.find(f => f.id === p.farmerId);
        return method === 'all' || (farmer?.paymentMethod || 'mpesa') === method;
    });

    const methodName = method === 'all' ? 'ALL METHODS' : method.toUpperCase();
    const payoutMonth = payouts[0]?.payoutMonth || 'N/A';

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("PAYMENT SETTLEMENT SCHEDULE", margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const subtitle = `Settlement Method: ${methodName} | Period: ${payoutMonth}`;
    doc.text(subtitle, margin, yPos);
    yPos += 15;

    const head = [['#', 'Farmer Name / ID', 'Phone', 'Account / Phone', 'Method', 'Net Payout']];
    const body = filteredPayouts.map((p, index) => {
        const farmer = farmers.find(f => f.id === p.farmerId);
        return [
            index + 1,
            `${farmer?.name || 'Unknown'} (${farmer?.memberId || 'N/A'})`,
            farmer?.phone || 'N/A',
            farmer?.accountNumber || farmer?.phone || 'N/A',
            (farmer?.paymentMethod || 'mpesa').toUpperCase(),
            `KES ${p.netPayout?.toLocaleString()}`
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' }, // Indigo-600
        styles: { fontSize: 8 },
        columnStyles: {
            5: { halign: 'right', fontStyle: 'bold' }
        }
    });

    const total = filteredPayouts.reduce((sum, p) => sum + p.netPayout, 0);
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL SETTLEMENT: KES ${total?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates an Inventory Report for Pharmacy Medications.
 */
export const generatePharmacyInventoryReportPdf = async (
    items: HISPharmacyInventory[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("NEO-PHARMACEUTICS: INVENTORY STATUS", 14, yPos);
    yPos += 10;

    const head = [['SKU', 'Medication/Item', 'Category', 'Stock Qty', 'Unit Price (KES)', 'Value (KES)']];
    const body = items.map(item => [
        item.sku || 'N/A',
        item.name,
        item.category || 'Medication',
        item.stockQuantity?.toLocaleString(),
        item.unitPrice?.toLocaleString(),
        (item.stockQuantity * item.unitPrice)?.toLocaleString()
    ]);

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo
        styles: { fontSize: 8 },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold' }
        }
    });

    const totalValue = items.reduce((sum, item) => sum + (item.stockQuantity * item.unitPrice), 0);
    yPos = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL INVENTORY VALUATION: KES ${totalValue?.toLocaleString()}`, pageWidth - 14, yPos, { align: 'right' });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates an Expiry Report for Pharmacy Stock Batches.
 */
export const generatePharmacyExpiryReportPdf = async (
    batches: HISPharmacyBatch[],
    inventory: HISPharmacyInventory[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("PHARMACY RISK AUDIT: EXPIRY LEDGER", 14, yPos);
    yPos += 10;

    const head = [['Batch #', 'Item Name', 'Expiry Date', 'Remaining Qty', 'Risk Level']];
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    const body = batches.map(batch => {
        const item = inventory.find(i => i.id === batch.medicationId);
        const expiry = new Date(batch.expiryDate);
        let risk = 'Normal';
        if (expiry <= today) risk = 'EXPIRED';
        else if (expiry <= threeMonthsLater) risk = 'HIGH RISK';

        return [
            batch.batchNumber,
            item?.name || 'Unknown Item',
            new Date(batch.expiryDate).toLocaleDateString(),
            batch.currentQuantity?.toLocaleString(),
            risk
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [244, 63, 94] }, // Rose Red for risk
        styles: { fontSize: 8 },
        columnStyles: {
            4: { fontStyle: 'bold' }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates a Payslip for Pharmacy Staff.
 */
export const generatePharmacyStaffPayslipPdf = async (
    staff: PharmacyStaff,
    month: string,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("OFFICIAL PAYSLIP", 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Earnings Month: ${month}`, 14, yPos);
    yPos += 15;

    // Staff Details Card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, yPos, pageWidth - 28, 40, 3, 3, 'F');
    
    let detailsY = yPos + 10;
    doc.setFont('helvetica', 'bold');
    doc.text("EMPLOYEE INFORMATION", 20, detailsY);
    detailsY += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${staff.fullName || 'N/A'}`, 20, detailsY);
    doc.text(`ID: ${staff.id.substring(0, 8)}`, pageWidth / 2, detailsY);
    detailsY += 6;
    doc.text(`Role: ${staff.role}`, 20, detailsY);
    doc.text(`License: ${staff.licenseNumber}`, pageWidth / 2, detailsY);
    yPos += 50;

    const head = [['Description', 'Earnings', 'Deductions']];
    const body = [
        ['Base Salary', staff.salary?.toLocaleString(), '0.00'],
        ['Statutory Contributions', '-', '0.00'],
        ['NET PAYABLE', { content: staff.salary?.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [240, 249, 255] } }, '-']
    ];

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] }
    });

    yPos = (doc as any).lastAutoTable.finalY + 30;
    doc.text("---------------------------------", 14, yPos);
    doc.text("Employee Signature", 14, yPos + 5);
    
    doc.text("---------------------------------", pageWidth - 70, yPos);
    doc.text("Director Signature", pageWidth - 70, yPos + 5);

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

/**
 * Generates a POS Receipt for Pharmacy Sales.
 */
export const generatePharmacyReceiptPdf = async (
    sale: PharmacySale,
    items: PharmacySaleItem[],
    inventory: HISPharmacyInventory[],
    settings: PharmacySettings | null,
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    
    // Receipt size is typically smaller/narrower
    const doc = new lib.jsPDF({
        unit: 'mm',
        format: [80, 200] // 80mm roll width
    });

    const margin = 5;
    const pageWidth = 80;
    let yPos = 10;

    // Header Branding from Settings
    if (settings?.pharmacyName) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(settings.pharmacyName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
        yPos += 6;
    }

    if (settings?.receiptHeader) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const splitHeader = doc.splitTextToSize(settings.receiptHeader, pageWidth - (margin * 2));
        doc.text(splitHeader, pageWidth / 2, yPos, { align: 'center' });
        yPos += (splitHeader.length * 4) + 2;
    }

    doc.setLineWidth(0.1);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`RECEIPT: ${sale.id.substring(0, 12)}`, margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(sale.createdAt)?.toLocaleString()}`, margin, yPos);
    yPos += 5;
    if (sale.customerName) {
        doc.text(`Patient: ${sale.customerName}`, margin, yPos);
        yPos += 8;
    }

    // Items Table
    doc.setFont('helvetica', 'bold');
    doc.text("ITEM", margin, yPos);
    doc.text("QTY", pageWidth - 35, yPos, { align: 'right' });
    doc.text("AMT", pageWidth - margin, yPos, { align: 'right' });
    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    items.forEach(item => {
        const invItem = inventory.find(i => i.id === item.medicationId);
        const name = invItem?.name || 'Medication';
        const splitName = doc.splitTextToSize(name, 40);
        
        doc.text(splitName, margin, yPos);
        doc.text(item.quantity.toString(), pageWidth - 35, yPos, { align: 'right' });
        doc.text(item.totalPrice?.toLocaleString(), pageWidth - margin, yPos, { align: 'right' });
        
        yPos += (splitName.length * 4) + 1;
    });

    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("TOTAL DUE:", margin, yPos);
    doc.text(`KES ${sale.totalAmount?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment: ${sale.paymentMethod} (${sale.paymentStatus})`, margin, yPos);
    yPos += 10;

    if (settings?.receiptFooter) {
        doc.setFont('helvetica', 'italic');
        const splitFooter = doc.splitTextToSize(settings.receiptFooter, pageWidth - (margin * 2));
        doc.text(splitFooter, pageWidth / 2, yPos, { align: 'center' });
    }

    return doc.output('datauristring');
};

/**
 * Generates a comprehensive Sales Report and Analysis for the Pharmacy.
 */
export const generatePharmacySalesReportPdf = async (
    sales: PharmacySale[],
    saleItems: any[],
    inventory: HISPharmacyInventory[],
    institution: Institution,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("PHARMACY SALES ANALYSIS & REVENUE REPORT", margin, yPos);
    yPos += 12;

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const avgSale = sales.length > 0 ? totalRevenue / sales.length : 0;

    // Executive Summary
    doc.setFillColor(79, 70, 229, 0.05);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 35, 3, 3, 'F');
    
    let summaryY = yPos + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("EXECUTIVE PERFORMANCE SUMMARY", margin + 5, summaryY);
    summaryY += 8;
    
    doc.setFont('helvetica', 'normal');
    const summaryData = [
        [`Total Transactions: ${sales.length}`, `Gross Revenue: KES ${totalRevenue?.toLocaleString()}`],
        [`Average Order Value: KES ${avgSale?.toLocaleString()}`, `Report Period: ${new Date().toLocaleDateString()} (Full History)`]
    ];

    summaryData.forEach(row => {
        doc.text(row[0], margin + 5, summaryY);
        doc.text(row[1], pageWidth / 2, summaryY);
        summaryY += 6;
    });

    yPos += 45;

    // Top Selling Products Analysis
    const productStats = new Map<string, { qty: number, revenue: number }>();
    saleItems.forEach(item => {
        const stats = productStats.get(item.medicationId) || { qty: 0, revenue: 0 };
        stats.qty += Number(item.quantity);
        stats.revenue += Number(item.totalPrice);
        productStats.set(item.medicationId, stats);
    });

    const topSelling = Array.from(productStats.entries())
        .map(([id, stats]) => {
            const medication = inventory.find(i => i.id === id);
            return {
                name: medication?.name || 'Unknown Medication',
                qty: stats.qty,
                revenue: stats.revenue
            };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("TOP 10 MEDICATIONS BY REVENUE", margin, yPos);
    yPos += 8;

    doc.autoTable({
        startY: yPos,
        head: [['Medication', 'Units Sold', 'Total Revenue (KES)', '% of Total']],
        body: topSelling.map(p => [
            p.name,
            p.qty?.toLocaleString(),
            p.revenue?.toLocaleString(),
            ((p.revenue / totalRevenue) * 100).toFixed(1) + '%'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Daily Trends (Last 7 Days)
    const dailyData = new Map<string, number>();
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(date => dailyData.set(date, 0));
    sales.forEach(sale => {
        const date = sale.createdAt.split('T')[0];
        if (dailyData.has(date)) {
            dailyData.set(date, dailyData.get(date)! + Number(sale.totalAmount));
        }
    });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("DAILY REVENUE TREND (LAST 7 DAYS)", margin, yPos);
    yPos += 8;

    doc.autoTable({
        startY: yPos,
        head: [['Date', 'Daily Revenue (KES)']],
        body: Array.from(dailyData.entries()).map(([date, rev]) => [
            new Date(date).toDateString(),
            rev?.toLocaleString()
        ]),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }, // Emerald
        styles: { fontSize: 8 }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};
/**
 * Generates a detailed itemized sales report for the pharmacy.
 */
export const generateDetailedPharmacySalesReportPdf = async (
    sales: PharmacySale[],
    saleItems: PharmacySaleItem[],
    inventory: HISPharmacyInventory[],
    startDate: string,
    endDate: string,
    institution: Institution,
    settings: PharmacySettings,
    footerImageUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(settings.letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("DETAILED PHARMACY SALES REPORT", margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Aggregate items
    const aggregated = new Map<string, { sku: string, name: string, qty: number, total: number }>();
    saleItems.forEach(item => {
        const inv = inventory.find(i => i.id === item.medicationId);
        const key = item.medicationId || 'unknown';
        const existing = aggregated.get(key) || { sku: inv?.sku || 'N/A', name: inv?.name || 'Unknown', qty: 0, total: 0 };
        existing.qty += Number(item.quantity);
        existing.total += Number(item.totalPrice);
        aggregated.set(key, existing);
    });

    const head = [['SKU/Code', 'Item Name', 'Total Quantity', 'Total Amount (KES)']];
    const body = Array.from(aggregated.values())
        .sort((a, b) => b.total - a.total)
        .map(item => [
            item.sku,
            item.name.toUpperCase(),
            item.qty?.toLocaleString(),
            item.total?.toLocaleString()
        ]);

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
        columnStyles: {
            2: { halign: 'center' },
            3: { halign: 'right', fontStyle: 'bold' }
        }
    });

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL REVENUE FOR PERIOD: KES ${totalRevenue?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};


export const generateStudentIdCardPdf = async (
    student: any,
    institution: any,
    companyDetailsOrLogo?: any,
    logoImgDataOrPhoto?: string,
    photoImgDataOrQr?: string,
    qrCodeDataUrl?: string
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");

    // Standard CR80 dimensions in landscape (85.6mm x 54mm)
    const doc = new lib.jsPDF('l', 'mm', [85.6, 54]);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Map parameters based on caller signature
    let logoImgData = '';
    let photoImgData = '';
    let qrCodeUrl = '';

    if (companyDetailsOrLogo && typeof companyDetailsOrLogo === 'object') {
        logoImgData = logoImgDataOrPhoto || '';
        photoImgData = photoImgDataOrQr || '';
        qrCodeUrl = qrCodeDataUrl || '';
    } else {
        logoImgData = companyDetailsOrLogo || '';
        photoImgData = logoImgDataOrPhoto || '';
        qrCodeUrl = photoImgDataOrQr || '';
    }

    // Dynamic QR code generation fallback
    if (!qrCodeUrl && typeof window !== 'undefined' && (window as any).QRCode) {
        const admissionNo = student.staffId || student.admissionNumber || student.admission_number || student.id || '';
        if (admissionNo) {
            try {
                qrCodeUrl = await (window as any).QRCode.toDataURL(admissionNo, { margin: 1, width: 150 });
            } catch (e) {
                console.warn("Dynamic QR generation failed", e);
            }
        }
    }

    // Load logo and passport images asynchronously if they are URLs
    const logoImg = logoImgData ? await loadImage(logoImgData) : null;
    const photoImg = photoImgData ? await loadImage(photoImgData) : null;

    // Subtle background
    doc.setFillColor(250, 250, 250);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header bar (Premium Blue theme)
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageWidth, 12, 'F');

    // Accent line (Gold/Amber)
    doc.setFillColor(245, 158, 11);
    doc.rect(0, 12, pageWidth, 1.5, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text((institution.name || 'INSTITUTION').toUpperCase(), pageWidth / 2, 6, { align: 'center' });
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL IDENTIFICATION CARD', pageWidth / 2, 9, { align: 'center' });

    // Logo image on the left of header
    if (logoImg) {
        try {
            doc.addImage(logoImg, 'PNG', 3, 2, 8, 8);
        } catch (e) {
            console.warn("Header logo rendering failed", e);
        }
    }

    // Passport Photo Area
    const photoWidth = 20;
    const photoHeight = 25;
    const photoX = 6;
    const photoY = 17;
    
    // Draw photo border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(photoX, photoY, photoWidth, photoHeight);

    const drawFallbackPhotoLocal = (x: number, y: number, w: number, h: number) => {
        doc.setFillColor(243, 244, 246);
        doc.rect(x, y, w, h, 'F');
        doc.setFillColor(209, 213, 219);
        doc.ellipse(x + (w / 2), y + 9, 3, 3, 'F');
        doc.ellipse(x + (w / 2), y + 21, 6, 4, 'F');
    };

    if (photoImg) {
        try {
            doc.addImage(photoImg, 'JPEG', photoX, photoY, photoWidth, photoHeight);
        } catch (e) {
            console.warn("Student photo rendering failed", e);
            drawFallbackPhotoLocal(photoX, photoY, photoWidth, photoHeight);
        }
    } else {
        drawFallbackPhotoLocal(photoX, photoY, photoWidth, photoHeight);
    }

    // Student Details Area
    const detailsX = 30;
    let detailY = 22;

    const qrSize = 15;
    const qrX = pageWidth - qrSize - 6; // 64.6 mm
    const maxNameWidth = qrX - detailsX - 2; // ~32.6 mm

    const nameText = (student.name || 'Unknown Student').toUpperCase();
    let currentFontSize = 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(currentFontSize);
    let nameLines = doc.splitTextToSize(nameText, maxNameWidth);

    // Shrink font size if name is too long and takes more than 2 lines
    if (nameLines.length > 2) {
        currentFontSize = 6.5;
        doc.setFontSize(currentFontSize);
        nameLines = doc.splitTextToSize(nameText, maxNameWidth);
    }
    // If it's still more than 2 lines, truncate it to 2 lines with ellipsis
    if (nameLines.length > 2) {
        nameLines = nameLines.slice(0, 2);
        if (nameLines[1] && nameLines[1].length > 3) {
            nameLines[1] = nameLines[1].substring(0, nameLines[1].length - 3) + '...';
        }
    }

    doc.setTextColor(17, 24, 39); // Gray 900
    nameLines.forEach((line: string, index: number) => {
        doc.text(line, detailsX, detailY + (index * 3));
    });
    
    detailY += (nameLines.length * 3) + 1.5;

    doc.setTextColor(107, 114, 128); // Gray 500
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text('ADMISSION / STUDENT ID', detailsX, detailY);

    detailY += 3.5;
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    const admissionNo = student.admissionNumber || student.admission_number || student.staffId || student.id.substring(0, 8);
    doc.text(admissionNo, detailsX, detailY, { maxWidth: maxNameWidth });

    detailY += 4.5;
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text('ACADEMIC PROGRAM / CLASS', detailsX, detailY);

    detailY += 3.5;
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    
    const courseCode = student.metadata?.courseCode || 'N/A';
    doc.text(courseCode, detailsX, detailY, { maxWidth: maxNameWidth });

    // QR Code for Attendance (on the right)
    const qrY = 17;

    doc.setDrawColor(229, 231, 235); // Gray 200
    doc.setLineWidth(0.2);
    doc.rect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2); // border

    if (qrCodeUrl) {
        try {
            doc.addImage(qrCodeUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        } catch (e) {
            console.warn("QR code rendering failed", e);
        }
    } else {
        doc.setFillColor(243, 244, 246);
        doc.rect(qrX, qrY, qrSize, qrSize, 'F');
        doc.setFontSize(4);
        doc.setTextColor(156, 163, 175);
        doc.text('QR CODE', qrX + (qrSize / 2), qrY + (qrSize / 2), { align: 'center' });
    }

    // Label under QR Code
    doc.setFontSize(4.5);
    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'bold');
    doc.text('SCAN FOR ATTENDANCE', qrX + (qrSize / 2), qrY + qrSize + 2.5, { align: 'center' });

    // Signature placeholder
    const sigX = qrX - 4;
    const sigY = pageHeight - 11;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.15);
    doc.line(sigX, sigY, sigX + 20, sigY);
    doc.setFontSize(4);
    doc.setTextColor(107, 114, 128);
    doc.text('AUTHORIZED SIGNATURE', sigX + 10, sigY + 2.5, { align: 'center' });

    // Footer Warning
    doc.setFillColor(243, 244, 246);
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
    doc.setFontSize(4.5);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text('Notice: This card is institutional property. If found, please return to the administration office.', pageWidth / 2, pageHeight - 2, { align: 'center' });

    return doc.output('datauristring');
};

export const generateEventReportPdf = async (
    event: any,
    eventMatchingPins: any[],
    users: any[],
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    // Load branding configurations
    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImage(letterConfig.headerImageUrl) : null;
    const footerImg = letterConfig?.footerImageUrl ? await loadImage(letterConfig.footerImageUrl) : null;
    const footerText = letterConfig?.footerText || '';
    const logoImg = await loadImage(logoUrl);

    // Create Page Header with Letterhead Cascade
    const tableStartY = createPdfWithLetterhead(
        doc,
        'EVENT ATTENDANCE & FEEDBACK REPORT',
        companyDetails,
        institution,
        logoImg,
        headerImg
    );
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Calculate RSVP / turnout stats
    const totalInvited = eventMatchingPins.length;
    const checkedInCount = eventMatchingPins.filter(p => p.status === 'used').length;
    const acceptedCount = eventMatchingPins.filter(p => p.status === 'accepted').length;
    const declinedCount = eventMatchingPins.filter(p => p.status === 'rejected').length;
    const pendingCount = eventMatchingPins.filter(p => p.status === 'pending').length;

    const totalAttendingResponses = checkedInCount + acceptedCount;
    let totalAccompanyingGuests = 0;
    eventMatchingPins.forEach(p => {
        if (p.status === 'accepted' || p.status === 'used') {
            if (p.guests) {
                try {
                    const parsed = JSON.parse(p.guests);
                    if (Array.isArray(parsed)) {
                        totalAccompanyingGuests += parsed.length;
                    }
                } catch {
                    if (p.guests.trim()) {
                        totalAccompanyingGuests += 1;
                    }
                }
            }
        }
    });

    const totalExpectedTurnout = totalAttendingResponses + totalAccompanyingGuests;
    const turnoutRate = totalInvited > 0 ? Math.round((totalAttendingResponses / totalInvited) * 100) : 0;
    const totalVehicles = eventMatchingPins.filter(p => p.vehicleRegistration || p.vehicle_registration).length;

    // Calculate feedback/ratings
    const feedbackPins = eventMatchingPins.filter(p => p.rating !== undefined && p.rating !== null);
    const totalFeedbackCount = feedbackPins.length;
    const totalStars = feedbackPins.reduce((acc, p) => acc + Number(p.rating), 0);
    const avgRating = totalFeedbackCount > 0 ? (totalStars / totalFeedbackCount).toFixed(1) : '0.0';

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    feedbackPins.forEach(p => {
        const r = Number(p.rating);
        if (r >= 1 && r <= 5) {
            distribution[r as 1|2|3|4|5]++;
        }
    });

    // Theme primary color
    const themeColorHex = companyDetails?.themeColor || '#4f46e5';
    const hexToRgb = (hex: string): [number, number, number] => {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(char => char + char).join('');
        }
        const num = parseInt(cleanHex, 16);
        return [
            (num >> 16) & 255,
            (num >> 8) & 255,
            num & 255
        ];
    };
    const primaryColor = hexToRgb(themeColorHex);

    let startY = tableStartY;

    // ── SECTION 1: EVENT DETAILS ──
    doc.setFillColor(248, 250, 252); // Slate-50 background
    doc.setDrawColor(226, 232, 240); // Slate-200 border
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, startY, pageWidth - (margin * 2), 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('1. EVENT DETAILS', margin + 6, startY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Event Title     :  ${event.title || 'N/A'}`, margin + 6, startY + 12);
    doc.text(`Scheduled Date  :  ${event.eventDate || event.event_date || 'N/A'}${event.eventTime ? ' at ' + event.eventTime : ''}`, margin + 6, startY + 18);
    doc.text(`Venue / Location:  ${event.venue || 'N/A'}`, margin + 6, startY + 24);
    doc.text(`Target Audience :  ${event.target || 'N/A'}`, margin + 6, startY + 30);

    startY += 40;

    // ── SECTION 2: ATTENDANCE & RSVP METRICS ──
    doc.setFillColor(248, 250, 252); // Slate-50 background
    doc.setDrawColor(226, 232, 240); // Slate-200 border
    doc.roundedRect(margin, startY, pageWidth - (margin * 2), 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('2. ATTENDANCE & RSVP SUMMARY', margin + 6, startY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Invited (Passes)  :  ${totalInvited}`, margin + 6, startY + 13);
    doc.text(`Turnout (Check-in Rate) :  ${turnoutRate}% (${checkedInCount} checked-in)`, margin + 6, startY + 19);
    doc.text(`Total Expected Turnout  :  ${totalExpectedTurnout} (accompanying guests: ${totalAccompanyingGuests})`, margin + 6, startY + 25);
    
    // Column 2
    doc.text(`RSVP Accepted :  ${acceptedCount}`, pageWidth / 2 + 10, startY + 13);
    doc.text(`RSVP Declined :  ${declinedCount}`, pageWidth / 2 + 10, startY + 19);
    doc.text(`Vehicles Reg  :  ${totalVehicles}`, pageWidth / 2 + 10, startY + 25);

    startY += 40;

    // ── SECTION 3: RATINGS & FEEDBACK METRICS ──
    doc.setFillColor(248, 250, 252); // Slate-50 background
    doc.setDrawColor(226, 232, 240); // Slate-200 border
    doc.roundedRect(margin, startY, pageWidth - (margin * 2), 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('3. FEEDBACK & RATING METRICS', margin + 6, startY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Average Star Rating :  ${avgRating} / 5.0`, margin + 6, startY + 13);
    doc.text(`Total Reviews       :  ${totalFeedbackCount} responses`, margin + 6, startY + 19);

    // Distribution
    const distText = `5★: ${distribution[5]} | 4★: ${distribution[4]} | 3★: ${distribution[3]} | 2★: ${distribution[2]} | 1★: ${distribution[1]}`;
    doc.text(`Star Distribution   :  ${distText}`, margin + 6, startY + 25);

    startY += 44;

    // ── SECTION 4: CHECKED-IN ATTENDEES LIST ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('4. CONFIRMED CHECKED-IN & ATTENDING GUESTS', margin, startY);

    startY += 4;

    const checkedInPins = eventMatchingPins.filter(p => p.status === 'used' || p.status === 'accepted');
    const attendanceHead = [['#', 'ATTENDEE / PARENT', 'CONTACT PHONE', 'VEHICLE REG', 'ACCOMPANYING GUESTS']];
    const attendanceBody = checkedInPins.map((p, idx) => {
        const u = users.find(user => user.id === p.userId);
        let guestList = 'None';
        if (p.guests) {
            try {
                const parsed = JSON.parse(p.guests);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    guestList = parsed.join(', ');
                }
            } catch {
                if (p.guests.trim()) guestList = p.guests;
            }
        }
        return [
            idx + 1,
            u?.name || 'Parent / Guardian',
            u?.phoneNumber || u?.phone_number || 'N/A',
            p.vehicleRegistration || p.vehicle_registration || 'None',
            guestList
        ];
    });

    doc.autoTable({
        head: attendanceHead,
        body: attendanceBody,
        startY: startY,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4 },
        columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 40, fontStyle: 'bold' },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { fontStyle: 'normal' }
        }
    });

    let nextY = (doc as any).lastAutoTable.finalY + 15;

    // ── SECTION 5: DETAILED FEEDBACK REVIEWS ──
    if (nextY + 30 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        nextY = margin + 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('5. ATTENDEE FEEDBACK & REVIEWS LIST', margin, nextY);

    nextY += 4;

    const feedbackHead = [['#', 'ATTENDEE / PARENT', 'PHONE', 'RATING', 'FEEDBACK COMMENTS / SUGGESTIONS']];
    const feedbackBody = feedbackPins.map((p, idx) => {
        const u = users.find(user => user.id === p.userId);
        return [
            idx + 1,
            u?.name || 'Parent / Guardian',
            u?.phoneNumber || u?.phone_number || 'N/A',
            `${p.rating} Stars`,
            p.feedback ? `"${p.feedback}"` : 'Left rating without comment.'
        ];
    });

    doc.autoTable({
        head: feedbackHead,
        body: feedbackBody,
        startY: nextY,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4 },
        columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 40, fontStyle: 'bold' },
            2: { cellWidth: 30 },
            3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
            4: { fontStyle: 'italic' }
        }
    });

    // Process footers on all pages
    setupPdfFooter(doc, footerImg, footerText);

    return doc.output('datauristring');
};

export const generateBursaryKitPdf = async (
    student: User,
    institution: Institution,
    invoices: Invoice[],
    receipts: Receipt[],
    assessments: Assessment[],
    assessmentMarks: AssessmentMark[],
    subjects: Subject[],
    letterheadConfig: LetterheadConfig | undefined,
    logoUrl: string | null,
    footerImageUrl: string | null,
    courseName: string,
    levelName: string
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg, stampImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl),
        loadImage(letterheadConfig?.stampImageUrl)
    ]);

    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // PAGE 1: Checklist & Letter of Registration Status
    let yPos = setupPdfHeader(doc, headerImg);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("NG-CDF BURSARY APPLICATION SUPPORT KIT", margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("PART A: REGISTRATION STATUS CERTIFICATE", margin, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 8;

    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Date: ${dateStr}`, margin, yPos);
    yPos += 10;

    doc.text("TO WHOM IT MAY CONCERN,", margin, yPos);
    yPos += 8;

    const bodyText = `This is to certify that ${student.name} (Admission Number: ${student.admissionNumber || student.admission_number || 'PENDING'}) is a registered student at ${institution.name}.

The student is currently enrolled in:
  • Course / Program: ${courseName || 'N/A'}
  • Current Level / Year: ${levelName || 'N/A'}
  • Status: Active / In-Good-Standing

We confirm that this student has been vetted by our administration and is recommended to receive financial assistance through the National Government Constituencies Development Fund (NG-CDF) Bursary Program.`;

    const splitBody = doc.splitTextToSize(bodyText, pageWidth - (margin * 2));
    doc.text(splitBody, margin, yPos);
    yPos += splitBody.length * 5 + 10;

    if (stampImg) {
        doc.addImage(stampImg, 'PNG', margin + 5, yPos - 5, 30, 30);
    }
    yPos += 20;
    doc.line(margin, yPos, margin + 60, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("Academic Registrar", margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(institution.name, margin, yPos + 4);

    // PAGE 2: Official Fee Statement
    doc.addPage();
    let yPosPage2 = setupPdfHeader(doc, headerImg);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("PART B: OFFICIAL FEE STATEMENT", margin, yPosPage2);
    yPosPage2 += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Student Name: ${student.name}`, margin, yPosPage2);
    doc.text(`Adm Number  : ${student.admissionNumber || student.admission_number || 'N/A'}`, pageWidth - margin - 70, yPosPage2);
    yPosPage2 += 10;

    const ledger: Array<{ date: string; ref: string; desc: string; debit: number; credit: number }> = [];
    let totalInvoiced = 0;
    let totalPaid = 0;

    invoices.forEach(inv => {
        ledger.push({
            date: inv.issueDate ? inv.issueDate.split('T')[0] : '—',
            ref: inv.invoiceNumber || 'INV',
            desc: inv.className || 'Academic Fees Billed',
            debit: inv.totalAmount || 0,
            credit: 0
        });
        totalInvoiced += inv.totalAmount || 0;
    });

    receipts.forEach(rcpt => {
        ledger.push({
            date: rcpt.paymentDate || '—',
            ref: rcpt.receiptNumber || 'RCPT',
            desc: rcpt.paidFor || 'Fee Payment',
            debit: 0,
            credit: rcpt.amountPaid || 0
        });
        totalPaid += rcpt.amountPaid || 0;
    });

    ledger.sort((a, b) => a.date.localeCompare(b.date));

    const tableHead = [['Date', 'Reference', 'Description', 'Debit (KES)', 'Credit (KES)', 'Balance (KES)']];
    let balance = 0;
    const tableBody = ledger.map(item => {
        balance += (item.debit - item.credit);
        return [
            item.date,
            item.ref,
            item.desc,
            item.debit > 0 ? `KES ${item.debit.toLocaleString()}.00` : '—',
            item.credit > 0 ? `KES ${item.credit.toLocaleString()}.00` : '—',
            `KES ${balance.toLocaleString()}.00`
        ];
    });

    (doc as any).autoTable({
        startY: yPosPage2,
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 8 },
        margin: { left: margin }
    });

    const finalY2 = (doc as any).lastAutoTable.finalY || (yPosPage2 + 25);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Total Billed: KES ${totalInvoiced.toLocaleString()}.00`, margin, finalY2 + 10);
    doc.text(`Total Paid  : KES ${totalPaid.toLocaleString()}.00`, margin, finalY2 + 15);
    doc.setTextColor(180, 0, 0);
    doc.text(`Outstanding Balance: KES ${(totalInvoiced - totalPaid).toLocaleString()}.00`, margin, finalY2 + 20);
    doc.setTextColor(0, 0, 0);

    // PAGE 3: Academic Progress / Report Card
    doc.addPage();
    let yPosPage3 = setupPdfHeader(doc, headerImg);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("PART C: ACADEMIC PROGRESS REPORT CARD", margin, yPosPage3);
    yPosPage3 += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Student Name: ${student.name}`, margin, yPosPage3);
    yPosPage3 += 10;

    const studentMarks = assessmentMarks.filter(m => m.studentId === student.id);
    const marksBody = studentMarks.map((m, idx) => {
        const assess = assessments.find(a => a.id === m.assessmentId);
        const subj = assess ? subjects.find(s => s.id === assess.subjectId) : null;
        
        // Calculate standard grade from percentage if rubric grade isn't present
        let displayGrade = m.rubricGrade || '—';
        if (!m.rubricGrade && m.marks !== null && assess?.maxMarks) {
            const pct = (m.marks / assess.maxMarks) * 100;
            if (pct >= 80) displayGrade = 'A';
            else if (pct >= 70) displayGrade = 'B';
            else if (pct >= 60) displayGrade = 'C';
            else if (pct >= 50) displayGrade = 'D';
            else displayGrade = 'E';
        }

        return [
            idx + 1,
            subj?.name || subj?.code || 'Unknown Module',
            assess?.title || 'Continuous Assessment',
            `${m.marks ?? '—'} / ${assess?.maxMarks || 100}`,
            displayGrade,
            m.comments || 'Satisfactory'
        ];
    });

    const marksHead = [['#', 'Module / Subject', 'Assessment Title', 'Score', 'Grade', 'Remarks']];

    if (marksBody.length === 0) {
        doc.text("No continuous assessment or exam marks recorded for this academic period.", margin, yPosPage3);
    } else {
        (doc as any).autoTable({
            startY: yPosPage3,
            head: marksHead,
            body: marksBody,
            theme: 'striped',
            headStyles: { fillColor: [45, 55, 72] },
            styles: { fontSize: 8 },
            margin: { left: margin }
        });
    }

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const generateTransferLetterPdf = async (
    patient: HISPatient,
    vitals: any[],
    receivingFacility: string,
    reasonForTransfer: string,
    nurseNotes: string,
    institution: Institution,
    logoUrl: string | null,
    nurseName: string
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = margin;

    // 1. Header & Logo
    if (logoImg) {
        const logoWidth = 25;
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        doc.addImage(logoImg, 'PNG', margin, yPos, logoWidth, logoHeight);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(institution.name || 'EduPulse Wellness Unit', pageWidth - margin, yPos + 5, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Email: ${institution.email || 'N/A'}`, pageWidth - margin, yPos + 11, { align: 'right' });
    doc.text(`Phone: ${institution.phoneNumber || 'N/A'}`, pageWidth - margin, yPos + 15, { align: 'right' });

    yPos += 35;
    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    // 2. Title & Date
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38); // Urgent red for emergencies
    doc.text("EMERGENCY MEDICAL TRANSFER LETTER", margin, yPos);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin, yPos - 5, { align: 'right' });
    doc.text(`TIME: ${new Date().toLocaleTimeString()}`, pageWidth - margin, yPos, { align: 'right' });

    // 3. Recipient
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("TO:", margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`Emergency Dept. / Receiving Officer`, margin + 15, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text("FACILITY:", margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(receivingFacility.toUpperCase(), margin + 20, yPos);

    // 4. Patient Information Table
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("1. PATIENT DEMOGRAPHICS & CRITICAL HISTORY", margin, yPos);
    yPos += 5;
    
    const infoHead = [['Field', 'Detail', 'Field', 'Detail']];
    const infoBody = [
        ['Full Name', patient.fullName.toUpperCase(), 'Date of Birth', patient.dob || 'Not Set'],
        ['Gender', patient.gender || 'Not Set', 'Blood Group', patient.bloodGroup || 'Unknown'],
        ['SHA Number', patient.shaNumber || 'Not Registered', 'Insurance Provider', patient.insuranceProvider || 'N/A'],
        ['Emergency Kin', patient.emergencyContactName || 'N/A', 'Kin Contact', patient.emergencyContactPhone || 'N/A'],
    ];

    doc.autoTable({
        head: infoHead,
        body: infoBody,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255, halign: 'left' },
        styles: { fontSize: 9, cellPadding: 6 },
        columnStyles: { 
            0: { fontStyle: 'bold', fillColor: [245, 245, 245], width: 35 }, 
            2: { fontStyle: 'bold', fillColor: [245, 245, 245], width: 35 } 
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    // 5. Medical History Lists
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("2. KNOWN MEDICAL CONDITIONS & ALLERGIES", margin, yPos);
    yPos += 5;

    const medHistoryHead = [['Allergies (Severe / Known)', 'Chronic Medical Conditions']];
    
    const allergyList = patient.allergies && patient.allergies.length > 0 
        ? patient.allergies.map(a => `• ${a.toUpperCase()}`).join('\n') 
        : '• NO KNOWN ALLERGIES';
        
    const chronicList = patient.chronicConditions && patient.chronicConditions.length > 0 
        ? patient.chronicConditions.map(c => `• ${c.toUpperCase()}`).join('\n') 
        : '• NO CHRONIC CONDITIONS REGISTERED';

    doc.autoTable({
        head: medHistoryHead,
        body: [[allergyList, chronicList]],
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 8, valign: 'top' }
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    // 6. Vital Signs Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("3. LATEST VITAL SIGNS RECORDED", margin, yPos);
    yPos += 5;

    const vitalsHead = [['Vital Parameter', 'Value', 'Status / Remarks']];
    const vitalsBody = vitals && vitals.length > 0 
        ? vitals.map(v => [v.label, `${v.value} ${v.unit || ''}`, v.trend || 'Normal'])
        : [['No vital statistics registered prior to dispatch', '-', '-']];

    doc.autoTable({
        head: vitalsHead,
        body: vitalsBody,
        startY: yPos,
        theme: 'striped',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 9, cellPadding: 5 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    // 7. Referral Transfer Notes & Status
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("4. DISPATCH REFERRAL NOTES & OBSERVATIONS", margin, yPos);
    
    yPos += 5;
    const splitNotes = doc.splitTextToSize(`Reason for Transfer:\n${reasonForTransfer || 'N/A'}\n\nClinical Observations:\n${nurseNotes || 'None recorded'}`, pageWidth - (margin * 2) - 10);
    
    doc.autoTable({
        body: [[splitNotes]],
        startY: yPos,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 10 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 25;
    
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        yPos = margin + 30;
    }

    doc.setDrawColor(200);
    doc.line(margin, yPos, margin + 70, yPos);
    doc.line(pageWidth - margin - 70, yPos, pageWidth - margin, yPos);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("PREPARED BY (SCHOOL NURSE / OFFICER):", margin, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(nurseName.toUpperCase(), margin, yPos + 10);
    doc.text("Wellness Department / Sickbay", margin, yPos + 14);

    doc.setFont('helvetica', 'bold');
    doc.text("RECEIVING MEDICAL OFFICER SIGN-OFF:", pageWidth - margin, yPos + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text("Signature: __________________________", pageWidth - margin, yPos + 10, { align: 'right' });
    doc.text("Time of Arrival: ____________________", pageWidth - margin, yPos + 14, { align: 'right' });

    return doc.output('datauristring');
};

export const generateStudentVotersCardsPdf = async (
    election: any,
    voters: any[],
    institution: any,
    logoUrl?: string
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");

    // Standard CR80 dimensions in landscape (85.6mm x 54mm)
    const doc = new lib.jsPDF('l', 'mm', [85.6, 54]);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const logoImg = logoUrl ? await loadImage(logoUrl) : null;

    for (let i = 0; i < voters.length; i++) {
        const voter = voters[i];
        if (i > 0) {
            doc.addPage([85.6, 54], 'l');
        }

        // Background card fill
        doc.setFillColor(253, 254, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Header panel: Dark indigo/violet color theme (Admin/EduVote design accent)
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, pageWidth, 12, 'F');

        // Thin Gold accent line
        doc.setFillColor(245, 158, 11);
        doc.rect(0, 12, pageWidth, 1.2, 'F');

        // Header text elements
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text((institution.name || 'INSTITUTION').toUpperCase(), pageWidth / 2, 5.5, { align: 'center' });
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.text('OFFICIAL STUDENT COUNCIL VOTER PASS', pageWidth / 2, 9, { align: 'center' });

        if (logoImg) {
            try {
                doc.addImage(logoImg, 'PNG', 3, 2, 8, 8);
            } catch (_) {}
        }

        // Details Panel on the left side
        const leftMargin = 6;
        let detailY = 19;

        // Election title (smaller accent print)
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        const elecTitle = (election.title || 'General Election').toUpperCase();
        doc.text(`ELECTION: ${elecTitle}`, leftMargin, detailY);

        detailY += 4.5;

        // Voter's Full Name
        doc.setTextColor(17, 24, 39); // Gray 900
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        const nameText = (voter.name || 'Unknown Student').toUpperCase();
        doc.text(nameText, leftMargin, detailY);

        detailY += 4.5;

        // Admission Number
        doc.setTextColor(107, 114, 128); // Gray 500
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.text('VOTER REGISTRATION NO.', leftMargin, detailY);

        detailY += 3;
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        const admissionNo = voter.admissionNumber || voter.admission_number || voter.staffId || voter.id.substring(0, 8);
        doc.text(admissionNo, leftMargin, detailY);

        detailY += 4.5;

        // Voter ID / Email
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.text('PORTAL LOGIN / VOTER EMAIL', leftMargin, detailY);

        detailY += 3;
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        const emailText = voter.email || 'N/A';
        doc.text(emailText, leftMargin, detailY);

        detailY += 4.5;

        // Default password instructions
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.text('PORTAL ACCESS PASSWORD', leftMargin, detailY);

        detailY += 3;
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Your Portal Password (or password123)', leftMargin, detailY);

        // QR Code on the right side
        const qrSize = 25;
        const qrX = pageWidth - qrSize - 6; // 85.6 - 25 - 6 = 54.6 mm
        const qrY = 17;

        // Draw dynamic QR Code
        const voterLoginUrl = `${window.location.origin}/?email=${encodeURIComponent(voter.email || '')}&view=student&tab=eduvote`;
        let qrCodeUrl = '';
        if (typeof window !== 'undefined' && (window as any).QRCode) {
            try {
                qrCodeUrl = await (window as any).QRCode.toDataURL(voterLoginUrl, { margin: 1, width: 150 });
            } catch (e) {
                console.warn("QR generation failed for student voter card", e);
            }
        }

        if (qrCodeUrl) {
            try {
                const qrImg = await loadImage(qrCodeUrl);
                if (qrImg) {
                    doc.addImage(qrImg, 'PNG', qrX, qrY, qrSize, qrSize);
                }
            } catch (_) {
                // Draw fallback border
                doc.setDrawColor(200);
                doc.rect(qrX, qrY, qrSize, qrSize);
            }
        } else {
            // Draw QR box placeholder with text in center
            doc.setDrawColor(220);
            doc.setFillColor(243, 244, 246);
            doc.rect(qrX, qrY, qrSize, qrSize, 'F');
            doc.rect(qrX, qrY, qrSize, qrSize);
            doc.setTextColor(150);
            doc.setFontSize(5);
            doc.setFont('helvetica', 'normal');
            doc.text('SCAN QR', qrX + (qrSize / 2), qrY + (qrSize / 2) - 1, { align: 'center' });
            doc.text('TO VOTE', qrX + (qrSize / 2), qrY + (qrSize / 2) + 2, { align: 'center' });
        }

        // Subtext below the QR Code
        doc.setTextColor(156, 163, 175); // Gray 400
        doc.setFontSize(4.2);
        doc.setFont('helvetica', 'bold');
        doc.text('SCAN TO LOG IN & VOTE', qrX + (qrSize / 2), qrY + qrSize + 2.5, { align: 'center' });

        // Card Footer: Security Banner
        doc.setFillColor(243, 244, 246);
        doc.rect(0, pageHeight - 4.5, pageWidth, 4.5, 'F');
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(4.5);
        doc.setFont('helvetica', 'bold');
        doc.text('DOUBLE-BLIND CRYPTOGRAPHIC SYSTEM  •  1 BALLOT PER CATEGORY', pageWidth / 2, pageHeight - 1.5, { align: 'center' });
    }

    return doc.output('datauristring');
};

export const generateArrearsReportPdf = async (
    arrearsList: Array<{
        tenant: PMTenant | undefined;
        unit: PMUnit | undefined;
        property: PMProperty | null;
        landlord: PMLandlord | null;
        periodArrears: number;
        paidRent: number;
        lease: PMLease;
    }>,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);

    const margin = 14;

    // Setup branding header
    const tableStartY = createPdfWithLetterhead(
        doc,
        'RENT ARREARS REPORT',
        companyDetails,
        institution,
        logoImg
    );

    // Summary Statistics Header
    const totalArrears = arrearsList.reduce((sum, item) => sum + item.periodArrears, 0);
    const totalTenants = arrearsList.filter(item => item.periodArrears > 0).length;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 72);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, margin, tableStartY + 5);
    doc.text(`Total Unpaid Arrears: KES ${totalArrears.toLocaleString()}`, margin, tableStartY + 11);
    doc.text(`Tenants with Balance: ${totalTenants}`, margin, tableStartY + 17);

    // Draw Arrears List Table
    const head = [['Tenant', 'Unit / Property', 'Landlord', 'Monthly Rent', 'Total Paid', 'Rent Arrears']];
    const body = arrearsList.map(item => [
        item.tenant?.name || 'N/A',
        `Unit ${item.unit?.unitNumber || 'N/A'} - ${item.property?.name || 'N/A'}`,
        item.landlord?.name || 'N/A',
        `KES ${item.lease.rentAmount.toLocaleString()}`,
        `KES ${item.paidRent.toLocaleString()}`,
        `KES ${item.periodArrears.toLocaleString()}`
    ]);

    doc.autoTable({
        head,
        body,
        startY: tableStartY + 24,
        theme: 'striped',
        headStyles: { fillColor: [185, 28, 28] }, // Dark Red
        styles: { fontSize: 8 },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold' }
        }
    });

    setupPdfFooter(doc, null, `${institution.name || 'Property ERP'} — Automated Arrears Registry`);

    return doc.output('datauristring');
};

/**
 * Generates an official Payslip for HR staff with full statutory breakdown and employer contributions.
 */
export const generateStaffPayslipPdf = async (
    staff: User,
    record: PayrollRecord,
    institution: Institution,
    letterheadConfig?: any,
    footerImageUrl?: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const pageWidth = doc.internal.pageSize.getWidth();

    let meta = staff.metadata || {};
    if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("OFFICIAL SALARY PAYSLIP", 14, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Payroll Period: ${record.month}`, 14, yPos);
    doc.text(`Disbursement Date: ${record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : new Date().toLocaleDateString()}`, pageWidth - 70, yPos);
    doc.setTextColor(15, 23, 42);
    yPos += 8;

    // Staff Details Card (2-column format)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, yPos, pageWidth - 28, 38, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, yPos, pageWidth - 28, 38, 3, 3, 'S');
    
    let detailsY = yPos + 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("EMPLOYEE & BANKING DETAILS", 20, detailsY);
    detailsY += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const staffIdCode = staff.staffId || (staff as any).staff_id || meta.staffId || meta.nationalId || staff.id.substring(0, 12);
    const idNo = meta.nationalId || (staff as any).nationalId || '-';
    const kraPin = meta.kraPin || (staff as any).kraPin || '-';
    const nssfNo = meta.nssfNo || (staff as any).nssfNo || '-';
    const shifNo = meta.shifNumber || meta.shifNo || (staff as any).shifNumber || '-';
    const bankName = meta.bankName || (staff as any).bankName || 'Equity Bank';
    const bankBranch = meta.bankBranch || (staff as any).bankBranch || 'Main';
    const bankAcc = meta.bankAccountNumber || (staff as any).bankAccountNumber || staff.phoneNumber || '-';
    const desig = meta.designation || staff.role || 'Staff Member';
    const terms = meta.employmentTerms || 'Permanent & Pensionable';

    // Left Column
    doc.text(`Employee Name: ${staff.name || record.staffName || 'N/A'}`, 20, detailsY);
    doc.text(`Staff ID / Ref: ${staffIdCode}`, 20, detailsY + 5);
    doc.text(`Designation / Role: ${desig}`, 20, detailsY + 10);
    doc.text(`Terms: ${terms}`, 20, detailsY + 15);

    // Middle Column
    const col2X = 95;
    doc.text(`National ID: ${idNo}`, col2X, detailsY);
    doc.text(`KRA PIN: ${kraPin}`, col2X, detailsY + 5);
    doc.text(`NSSF No: ${nssfNo}`, col2X, detailsY + 10);
    doc.text(`SHIF No: ${shifNo}`, col2X, detailsY + 15);

    // Right Column
    const col3X = 145;
    doc.text(`Bank: ${bankName}`, col3X, detailsY);
    doc.text(`Branch: ${bankBranch}`, col3X, detailsY + 5);
    doc.text(`Account No: ${bankAcc}`, col3X, detailsY + 10);
    doc.text(`Status: Paid`, col3X, detailsY + 15);

    yPos += 44;

    const basicSalary = record.basicSalary || (record as any).basicPay || 0;
    const allowancesList = Array.isArray(record.allowances) ? record.allowances : [];
    const totalAllowances = allowancesList.reduce((acc: number, a: any) => acc + (Number(a.amount) || 0), 0);
    const grossEarnings = basicSalary + totalAllowances;

    const deductionsList = Array.isArray(record.deductions) ? record.deductions : [];
    const totalDeductions = deductionsList.reduce((acc: number, d: any) => acc + (Number(d.amount) || 0), 0);
    const netSalary = record.netSalary || Math.max(0, grossEarnings - totalDeductions);

    // Primary Earnings & Deductions Table
    const head = [['Description', 'Earnings (KES)', 'Deductions (KES)']];
    const body: any[] = [
        ['Basic Salary', basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '-'],
    ];

    allowancesList.forEach((a: any) => {
        body.push([a.name || 'Allowance', (Number(a.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '-']);
    });

    deductionsList.forEach((d: any) => {
        body.push([d.name || 'Deduction', '-', (Number(d.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })]);
    });

    body.push([
        { content: 'TOTAL GROSS EARNINGS / TOTAL DEDUCTIONS', styles: { fontStyle: 'bold' } },
        { content: `KES ${grossEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } },
        { content: `KES ${totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }
    ]);

    body.push([
        { content: 'NET TAKE-HOME PAYABLE', styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } },
        { content: `KES ${netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colSpan: 2, styles: { fontStyle: 'bold', fontSize: 10, halign: 'right', fillColor: [240, 253, 244], textColor: [22, 101, 52] } }
    ]);

    let primaryRGB = [79, 70, 229]; // default indigo-600
    if (letterheadConfig?.primaryColor) {
        try {
            const hex = letterheadConfig.primaryColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) primaryRGB = [r, g, b];
        } catch (e) {}
    }

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: primaryRGB, fontSize: 8.5, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.2 },
        columnStyles: {
            0: { cellWidth: 90 },
            1: { halign: 'right', cellWidth: 45 },
            2: { halign: 'right', cellWidth: 45 }
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Calculate Employer Contributions
    // 1. NSSF Employer Matching: matches employee NSSF (or calculated Tier 1 + Tier 2)
    const employeeNssfObj = deductionsList.find((d: any) => (d.name || '').toUpperCase().includes('NSSF'));
    const employeeNssf = employeeNssfObj ? Number(employeeNssfObj.amount) : (grossEarnings > 0 ? (Math.min(grossEarnings, 9000) * 0.06 + Math.max(0, Math.min(grossEarnings, 108000) - 9000) * 0.06) : 0);
    const employerNssf = Math.round(employeeNssf);

    // 2. Housing Levy Employer Matching: 1.5% of gross
    const employeeHlObj = deductionsList.find((d: any) => (d.name || '').toUpperCase().includes('HOUSING') || (d.name || '').toUpperCase().includes('AHL'));
    const employeeHl = employeeHlObj ? Number(employeeHlObj.amount) : (grossEarnings * 0.015);
    const employerHousingLevy = Math.round(employeeHl);

    const totalEmployerContributions = employerNssf + employerHousingLevy;
    const totalCostToEmployer = grossEarnings + totalEmployerContributions;

    // Secondary Table: Employer Statutory Contributions
    const employerHead = [['Employer Statutory Contributions (Not Deducted From Employee)', 'Amount (KES)']];
    const employerBody: any[] = [
        ['NSSF Employer Matching (Tier I & Tier II Pension)', `KES ${employerNssf.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Affordable Housing Levy (AHL) Employer Contribution (1.5%)', `KES ${employerHousingLevy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        [
            { content: 'TOTAL EMPLOYER STATUTORY CONTRIBUTIONS', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: `KES ${totalEmployerContributions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249] } }
        ],
        [
            { content: 'TOTAL COST OF EMPLOYMENT TO INSTITUTION (Gross + Employer Contributions)', styles: { fontStyle: 'bold', fillColor: [238, 242, 255] } },
            { content: `KES ${totalCostToEmployer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [238, 242, 255], textColor: [67, 56, 202] } }
        ]
    ];

    doc.autoTable({
        startY: yPos,
        head: employerHead,
        body: employerBody,
        theme: 'plain',
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        columnStyles: {
            0: { cellWidth: 135 },
            1: { halign: 'right', cellWidth: 45 }
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 18;

    // Signatures
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text("-----------------------------------------", 14, yPos);
    doc.text(letterheadConfig?.signerName || "Authorized Bursar / HR Officer", 14, yPos + 4);
    if (letterheadConfig?.signerTitle) {
        doc.text(letterheadConfig.signerTitle, 14, yPos + 8);
    }

    doc.text("-----------------------------------------", pageWidth / 2, yPos);
    doc.text("Employee Signature & Date of Receipt", pageWidth / 2, yPos + 4);

    const footerText = letterheadConfig?.footerMessage || `${institution.name} — Confidential Payroll Document`;
    setupPdfFooter(doc, footerImg, footerText);
    return doc.output('datauristring');
};

/**
 * Generates a consolidated Bulk Payslip PDF containing individual payslips for all provided staff members.
 */
export const generateBulkStaffPayslipsPdf = async (
    items: Array<{ staff: User; record: PayrollRecord }>,
    institution: Institution,
    letterheadConfig?: any,
    footerImageUrl?: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    const pageWidth = doc.internal.pageSize.getWidth();
    let primaryRGB = [79, 70, 229]; // default indigo-600
    if (letterheadConfig?.primaryColor) {
        try {
            const hex = letterheadConfig.primaryColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) primaryRGB = [r, g, b];
        } catch (e) {}
    }

    const footerText = letterheadConfig?.footerMessage || `${institution.name} — Confidential Payroll Document`;

    items.forEach((item, index) => {
        if (index > 0) {
            doc.addPage();
        }

        const { staff, record } = item;
        let yPos = setupPdfHeader(doc, headerImg);

        let meta = staff.metadata || {};
        if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
        }

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("OFFICIAL SALARY PAYSLIP", 14, yPos);
        yPos += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Payroll Period: ${record.month}`, 14, yPos);
        doc.text(`Disbursement Date: ${record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : new Date().toLocaleDateString()}`, pageWidth - 70, yPos);
        doc.setTextColor(15, 23, 42);
        yPos += 8;

        // Staff Details Card (2-column format)
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, yPos, pageWidth - 28, 38, 3, 3, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, yPos, pageWidth - 28, 38, 3, 3, 'S');
        
        let detailsY = yPos + 7;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text("EMPLOYEE & BANKING DETAILS", 20, detailsY);
        detailsY += 6;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const staffIdCode = staff.staffId || (staff as any).staff_id || meta.staffId || meta.nationalId || staff.id.substring(0, 12);
        const idNo = meta.nationalId || (staff as any).nationalId || '-';
        const kraPin = meta.kraPin || (staff as any).kraPin || '-';
        const nssfNo = meta.nssfNo || (staff as any).nssfNo || '-';
        const shifNo = meta.shifNumber || meta.shifNo || (staff as any).shifNumber || '-';
        const bankName = meta.bankName || (staff as any).bankName || 'Equity Bank';
        const bankBranch = meta.bankBranch || (staff as any).bankBranch || 'Main';
        const bankAcc = meta.bankAccountNumber || (staff as any).bankAccountNumber || staff.phoneNumber || '-';
        const desig = meta.designation || staff.role || 'Staff Member';
        const terms = meta.employmentTerms || 'Permanent & Pensionable';

        // Left Column
        doc.text(`Employee Name: ${staff.name || record.staffName || 'N/A'}`, 20, detailsY);
        doc.text(`Staff ID / Ref: ${staffIdCode}`, 20, detailsY + 5);
        doc.text(`Designation / Role: ${desig}`, 20, detailsY + 10);
        doc.text(`Terms: ${terms}`, 20, detailsY + 15);

        // Middle Column
        const col2X = 95;
        doc.text(`National ID: ${idNo}`, col2X, detailsY);
        doc.text(`KRA PIN: ${kraPin}`, col2X, detailsY + 5);
        doc.text(`NSSF No: ${nssfNo}`, col2X, detailsY + 10);
        doc.text(`SHIF No: ${shifNo}`, col2X, detailsY + 15);

        // Right Column
        const col3X = 145;
        doc.text(`Bank: ${bankName}`, col3X, detailsY);
        doc.text(`Branch: ${bankBranch}`, col3X, detailsY + 5);
        doc.text(`Account No: ${bankAcc}`, col3X, detailsY + 10);
        doc.text(`Status: Paid`, col3X, detailsY + 15);

        yPos += 44;

        const basicSalary = record.basicSalary || (record as any).basicPay || 0;
        const allowancesList = Array.isArray(record.allowances) ? record.allowances : [];
        const totalAllowances = allowancesList.reduce((acc: number, a: any) => acc + (Number(a.amount) || 0), 0);
        const grossEarnings = basicSalary + totalAllowances;

        const deductionsList = Array.isArray(record.deductions) ? record.deductions : [];
        const totalDeductions = deductionsList.reduce((acc: number, d: any) => acc + (Number(d.amount) || 0), 0);
        const netSalary = record.netSalary || Math.max(0, grossEarnings - totalDeductions);

        const head = [['Description', 'Earnings (KES)', 'Deductions (KES)']];
        const body: any[] = [
            ['Basic Salary', basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '-'],
        ];

        allowancesList.forEach((a: any) => {
            body.push([a.name || 'Allowance', (Number(a.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '-']);
        });

        deductionsList.forEach((d: any) => {
            body.push([d.name || 'Deduction', '-', (Number(d.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })]);
        });

        body.push([
            { content: 'TOTAL GROSS EARNINGS / TOTAL DEDUCTIONS', styles: { fontStyle: 'bold' } },
            { content: `KES ${grossEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } },
            { content: `KES ${totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }
        ]);

        body.push([
            { content: 'NET TAKE-HOME PAYABLE', styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } },
            { content: `KES ${netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colSpan: 2, styles: { fontStyle: 'bold', fontSize: 10, halign: 'right', fillColor: [240, 253, 244], textColor: [22, 101, 52] } }
        ]);

        doc.autoTable({
            startY: yPos,
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: primaryRGB, fontSize: 8.5, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2.2 },
            columnStyles: {
                0: { cellWidth: 90 },
                1: { halign: 'right', cellWidth: 45 },
                2: { halign: 'right', cellWidth: 45 }
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;

        // Calculate Employer Contributions
        const employeeNssfObj = deductionsList.find((d: any) => (d.name || '').toUpperCase().includes('NSSF'));
        const employeeNssf = employeeNssfObj ? Number(employeeNssfObj.amount) : (grossEarnings > 0 ? (Math.min(grossEarnings, 9000) * 0.06 + Math.max(0, Math.min(grossEarnings, 108000) - 9000) * 0.06) : 0);
        const employerNssf = Math.round(employeeNssf);

        const employeeHlObj = deductionsList.find((d: any) => (d.name || '').toUpperCase().includes('HOUSING') || (d.name || '').toUpperCase().includes('AHL'));
        const employeeHl = employeeHlObj ? Number(employeeHlObj.amount) : (grossEarnings * 0.015);
        const employerHousingLevy = Math.round(employeeHl);

        const totalEmployerContributions = employerNssf + employerHousingLevy;
        const totalCostToEmployer = grossEarnings + totalEmployerContributions;

        const employerHead = [['Employer Statutory Contributions (Not Deducted From Employee)', 'Amount (KES)']];
        const employerBody: any[] = [
            ['NSSF Employer Matching (Tier I & Tier II Pension)', `KES ${employerNssf.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['Affordable Housing Levy (AHL) Employer Contribution (1.5%)', `KES ${employerHousingLevy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            [
                { content: 'TOTAL EMPLOYER STATUTORY CONTRIBUTIONS', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
                { content: `KES ${totalEmployerContributions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249] } }
            ],
            [
                { content: 'TOTAL COST OF EMPLOYMENT TO INSTITUTION (Gross + Employer Contributions)', styles: { fontStyle: 'bold', fillColor: [238, 242, 255] } },
                { content: `KES ${totalCostToEmployer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [238, 242, 255], textColor: [67, 56, 202] } }
            ]
        ];

        doc.autoTable({
            startY: yPos,
            head: employerHead,
            body: employerBody,
            theme: 'plain',
            headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
            styles: { fontSize: 7.5, cellPadding: 1.8 },
            columnStyles: {
                0: { cellWidth: 135 },
                1: { halign: 'right', cellWidth: 45 }
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 18;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text("-----------------------------------------", 14, yPos);
        doc.text(letterheadConfig?.signerName || "Authorized Bursar / HR Officer", 14, yPos + 4);
        if (letterheadConfig?.signerTitle) {
            doc.text(letterheadConfig.signerTitle, 14, yPos + 8);
        }

        doc.text("-----------------------------------------", pageWidth / 2, yPos);
        doc.text("Employee Signature & Date of Receipt", pageWidth / 2, yPos + 4);

        setupPdfFooter(doc, footerImg, footerText);
    });

    return doc.output('datauristring');
};

/**
 * Generates a Kenyan standard P9 Tax Deduction Certificate PDF.
 */
export const generateStaffP9Pdf = async (
    staff: User,
    records: PayrollRecord[],
    year: string,
    institution: Institution,
    letterheadConfig?: LetterheadConfig,
    footerImageUrl?: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF('l', 'mm', 'a4'); // landscape
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("KENYA REVENUE AUTHORITY — P9 TAX CERTIFICATE", 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tax Year: ${year}`, 14, yPos);
    doc.text(`Employer Name: ${institution.name}`, pageWidth / 2, yPos);
    yPos += 10;

    // Staff Details Card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, yPos, pageWidth - 28, 25, 2, 2, 'F');
    
    let detailsY = yPos + 7;
    doc.setFont('helvetica', 'bold');
    doc.text("EMPLOYEE TAXPAYER DETAILS", 20, detailsY);
    detailsY += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${staff.name || 'N/A'}`, 20, detailsY);
    doc.text(`ID: ${staff.id.substring(0, 8)}`, pageWidth / 3, detailsY);
    doc.text(`Role: ${staff.role || 'Staff Member'}`, (pageWidth / 3) * 2, detailsY);
    yPos += 32;

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const head = [[
        'Month', 'Basic Pay', 'Allowances', 'Gross Pay', 
        'NSSF', 'SHIF', 'Housing Levy', 
        'Taxable Income', 'PAYE Charged', 'Relief', 'Net PAYE'
    ]];

    const body = months.map(mName => {
        const rec = records.find((r: PayrollRecord) => r.month.startsWith(mName));
        if (!rec) {
            return [mName, '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'];
        }

        const basic = rec.basicSalary || rec.basicPay || 0;
        const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
        const allowances = allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
        const gross = basic + allowances;

        const deductionsList = Array.isArray(rec.deductions) ? rec.deductions : [];
        const nssf = deductionsList.find((d: any) => d.name === 'NSSF')?.amount || 0;
        const shif = deductionsList.find((d: any) => d.name === 'SHIF')?.amount || 0;
        const housingLevy = deductionsList.find((d: any) => d.name === 'Housing Levy')?.amount || 0;
        const paye = deductionsList.find((d: any) => d.name === 'PAYE')?.amount || 0;

        const allowableDeductions = nssf + shif + housingLevy;
        const taxableIncome = Math.max(0, gross - allowableDeductions);
        const personalRelief = gross > 0 ? 2400 : 0;
        const grossPaye = paye + personalRelief;

        return [
            mName,
            basic.toLocaleString(),
            allowances.toLocaleString(),
            gross.toLocaleString(),
            nssf.toLocaleString(),
            shif.toLocaleString(),
            housingLevy.toLocaleString(),
            taxableIncome.toLocaleString(),
            grossPaye.toLocaleString(),
            personalRelief.toLocaleString(),
            paye.toLocaleString()
        ];
    });

    let totBasic = 0, totAllowances = 0, totGross = 0, totNssf = 0, totShif = 0, totLevy = 0, totTaxable = 0, totGrossPaye = 0, totRelief = 0, totNetPaye = 0;
    records.forEach((rec: PayrollRecord) => {
        const basic = rec.basicSalary || rec.basicPay || 0;
        const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
        const allowances = allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
        const gross = basic + allowances;

        const deductionsList = Array.isArray(rec.deductions) ? rec.deductions : [];
        const nssf = deductionsList.find((d: any) => d.name === 'NSSF')?.amount || 0;
        const shif = deductionsList.find((d: any) => d.name === 'SHIF')?.amount || 0;
        const housingLevy = deductionsList.find((d: any) => d.name === 'Housing Levy')?.amount || 0;
        const paye = deductionsList.find((d: any) => d.name === 'PAYE')?.amount || 0;

        const allowableDeductions = nssf + shif + housingLevy;
        const taxable = Math.max(0, gross - allowableDeductions);
        const relief = gross > 0 ? 2400 : 0;
        const grossPaye = paye + relief;

        totBasic += basic;
        totAllowances += allowances;
        totGross += gross;
        totNssf += nssf;
        totShif += shif;
        totLevy += housingLevy;
        totTaxable += taxable;
        totGrossPaye += grossPaye;
        totRelief += relief;
        totNetPaye += paye;
    });

    body.push([
        'TOTALS',
        totBasic.toLocaleString(),
        totAllowances.toLocaleString(),
        totGross.toLocaleString(),
        totNssf.toLocaleString(),
        totShif.toLocaleString(),
        totLevy.toLocaleString(),
        totTaxable.toLocaleString(),
        totGrossPaye.toLocaleString(),
        totRelief.toLocaleString(),
        totNetPaye.toLocaleString()
    ]);

    doc.autoTable({
        startY: yPos,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72] },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { fontStyle: 'bold' }
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.text("I certify that this table contains correct details of earnings and deductions relative to the Kenya Revenue Authority.", 14, yPos);
    doc.text("Employer Signature & Stamp: ________________________", 14, yPos + 8);

    setupPdfFooter(doc, footerImg, `${institution.name} — P9 Income Tax Card`);
    return doc.output('datauristring');
};

/**
 * Generates a consolidated multi-page P9 Tax Certificate PDF for all employees.
 */
export const generateBulkStaffP9Pdf = async (
    items: Array<{ staff: User; records: PayrollRecord[] }>,
    year: string,
    institution: Institution,
    letterheadConfig?: LetterheadConfig,
    footerImageUrl?: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF('l', 'mm', 'a4'); // landscape
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    const pageWidth = doc.internal.pageSize.getWidth();
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    items.forEach((item, index) => {
        if (index > 0) {
            doc.addPage('a4', 'l');
        }

        const { staff, records } = item;
        let yPos = setupPdfHeader(doc, headerImg);

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("KENYA REVENUE AUTHORITY — P9 TAX CERTIFICATE", 14, yPos);
        yPos += 7;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tax Year: ${year}`, 14, yPos);
        doc.text(`Employer: ${institution.name}`, pageWidth / 2, yPos);
        yPos += 8;

        let m = staff?.metadata || {};
        if (typeof m === 'string') {
            try { m = JSON.parse(m); } catch (e) { m = {}; }
        }
        const kraPin = m.kraPin || (staff as any)?.kraPin || 'A000000000X';
        const nationalId = m.nationalId || (staff as any)?.nationalId || staff.id.substring(0, 8);

        // Staff Details Card
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, yPos, pageWidth - 28, 20, 2, 2, 'F');

        let detailsY = yPos + 6;
        doc.setFont('helvetica', 'bold');
        doc.text("EMPLOYEE TAXPAYER DETAILS", 20, detailsY);
        detailsY += 7;
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${staff.name || 'N/A'}`, 20, detailsY);
        doc.text(`KRA PIN: ${kraPin}`, pageWidth / 3, detailsY);
        doc.text(`National ID: ${nationalId}`, (pageWidth / 3) * 1.8, detailsY);
        doc.text(`Designation: ${staff.role || 'Staff'}`, (pageWidth / 3) * 2.4, detailsY);
        yPos += 26;

        const head = [[
            'Month', 'Basic Pay', 'Allowances', 'Gross Pay', 
            'NSSF', 'SHIF', 'Housing Levy', 
            'Taxable Income', 'PAYE Charged', 'Relief', 'Net PAYE'
        ]];

        const body = months.map(mName => {
            const rec = records.find((r: PayrollRecord) => r.month.startsWith(mName));
            if (!rec) {
                return [mName, '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'];
            }

            const basic = rec.basicSalary || rec.basicPay || 0;
            const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
            const allowances = allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
            const gross = basic + allowances;

            const deductionsList = Array.isArray(rec.deductions) ? rec.deductions : [];
            const nssf = deductionsList.find((d: any) => d.name === 'NSSF')?.amount || 0;
            const shif = deductionsList.find((d: any) => d.name === 'SHIF')?.amount || 0;
            const housingLevy = deductionsList.find((d: any) => d.name === 'Housing Levy')?.amount || 0;
            const paye = deductionsList.find((d: any) => d.name === 'PAYE')?.amount || 0;

            const allowableDeductions = nssf + shif + housingLevy;
            const taxableIncome = Math.max(0, gross - allowableDeductions);
            const personalRelief = gross > 0 ? 2400 : 0;
            const grossPaye = paye + personalRelief;

            return [
                mName,
                Math.round(basic).toLocaleString(),
                Math.round(allowances).toLocaleString(),
                Math.round(gross).toLocaleString(),
                Math.round(nssf).toLocaleString(),
                Math.round(shif).toLocaleString(),
                Math.round(housingLevy).toLocaleString(),
                Math.round(taxableIncome).toLocaleString(),
                Math.round(grossPaye).toLocaleString(),
                Math.round(personalRelief).toLocaleString(),
                Math.round(paye).toLocaleString()
            ];
        });

        let totBasic = 0, totAllowances = 0, totGross = 0, totNssf = 0, totShif = 0, totLevy = 0, totTaxable = 0, totGrossPaye = 0, totRelief = 0, totNetPaye = 0;
        records.forEach((rec: PayrollRecord) => {
            const basic = rec.basicSalary || rec.basicPay || 0;
            const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
            const allowances = allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
            const gross = basic + allowances;

            const deductionsList = Array.isArray(rec.deductions) ? rec.deductions : [];
            const nssf = deductionsList.find((d: any) => d.name === 'NSSF')?.amount || 0;
            const shif = deductionsList.find((d: any) => d.name === 'SHIF')?.amount || 0;
            const housingLevy = deductionsList.find((d: any) => d.name === 'Housing Levy')?.amount || 0;
            const paye = deductionsList.find((d: any) => d.name === 'PAYE')?.amount || 0;

            const allowableDeductions = nssf + shif + housingLevy;
            const taxable = Math.max(0, gross - allowableDeductions);
            const relief = gross > 0 ? 2400 : 0;
            const grossPaye = paye + relief;

            totBasic += basic;
            totAllowances += allowances;
            totGross += gross;
            totNssf += nssf;
            totShif += shif;
            totLevy += housingLevy;
            totTaxable += taxable;
            totGrossPaye += grossPaye;
            totRelief += relief;
            totNetPaye += paye;
        });

        body.push([
            'TOTALS',
            Math.round(totBasic).toLocaleString(),
            Math.round(totAllowances).toLocaleString(),
            Math.round(totGross).toLocaleString(),
            Math.round(totNssf).toLocaleString(),
            Math.round(totShif).toLocaleString(),
            Math.round(totLevy).toLocaleString(),
            Math.round(totTaxable).toLocaleString(),
            Math.round(totGrossPaye).toLocaleString(),
            Math.round(totRelief).toLocaleString(),
            Math.round(totNetPaye).toLocaleString()
        ]);

        doc.autoTable({
            startY: yPos,
            head,
            body,
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72] },
            styles: { fontSize: 7.5 },
            columnStyles: {
                0: { fontStyle: 'bold' }
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(8);
        doc.text("I certify that this table contains correct details of earnings and deductions relative to the Kenya Revenue Authority.", 14, yPos);
        doc.text("Employer Signature & Stamp: ________________________", 14, yPos + 6);

        setupPdfFooter(doc, footerImg, `${institution.name} — P9 Tax Certificate (${staff.name})`);
    });

    return doc.output('datauristring');
};

/**
 * Downloads consolidated P9 annual summary CSV
 */
export const downloadBulkP9Csv = (
    items: Array<{ staff: User; records: PayrollRecord[] }>,
    year: string,
    institutionName: string = 'Institution'
) => {
    const headers = [
        'Tax Year',
        'Staff Name',
        'KRA PIN',
        'National ID',
        'Designation',
        'Annual Basic Pay (KES)',
        'Annual Allowances (KES)',
        'Annual Gross Pay (KES)',
        'Annual NSSF (KES)',
        'Annual SHIF (KES)',
        'Annual Housing Levy (KES)',
        'Annual Taxable Income (KES)',
        'Annual Gross Tax (KES)',
        'Annual Personal Relief (KES)',
        'Annual Net PAYE (KES)'
    ];

    const rows = items.map(({ staff, records }) => {
        let m = staff?.metadata || {};
        if (typeof m === 'string') {
            try { m = JSON.parse(m); } catch (e) { m = {}; }
        }
        const kraPin = m.kraPin || (staff as any)?.kraPin || 'A000000000X';
        const nationalId = m.nationalId || (staff as any)?.nationalId || staff.id.substring(0, 8);

        let totBasic = 0, totAllowances = 0, totGross = 0, totNssf = 0, totShif = 0, totLevy = 0, totTaxable = 0, totGrossPaye = 0, totRelief = 0, totNetPaye = 0;
        records.forEach(rec => {
            const basic = rec.basicSalary || rec.basicPay || 0;
            const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
            const allowances = allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
            const gross = basic + allowances;
            const deductionsList = Array.isArray(rec.deductions) ? rec.deductions : [];
            const nssf = deductionsList.find((d: any) => d.name === 'NSSF')?.amount || 0;
            const shif = deductionsList.find((d: any) => d.name === 'SHIF')?.amount || 0;
            const housingLevy = deductionsList.find((d: any) => d.name === 'Housing Levy')?.amount || 0;
            const paye = deductionsList.find((d: any) => d.name === 'PAYE')?.amount || 0;

            const allowable = nssf + shif + housingLevy;
            const taxable = Math.max(0, gross - allowable);
            const relief = gross > 0 ? 2400 : 0;
            const grossPaye = paye + relief;

            totBasic += basic;
            totAllowances += allowances;
            totGross += gross;
            totNssf += nssf;
            totShif += shif;
            totLevy += housingLevy;
            totTaxable += taxable;
            totGrossPaye += grossPaye;
            totRelief += relief;
            totNetPaye += paye;
        });

        return [
            year,
            staff.name || 'Staff Member',
            kraPin,
            nationalId,
            staff.role || 'Staff',
            String(Math.round(totBasic)),
            String(Math.round(totAllowances)),
            String(Math.round(totGross)),
            String(Math.round(totNssf)),
            String(Math.round(totShif)),
            String(Math.round(totLevy)),
            String(Math.round(totTaxable)),
            String(Math.round(totGrossPaye)),
            String(Math.round(totRelief)),
            String(Math.round(totNetPaye))
        ];
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${institutionName.replace(/\s+/g, '_')}_Bulk_P9_Tax_Summary_${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

/**
 * Generates a monthly Statutory Deductions compliance report PDF.
 */
export type StatutoryReportType = 'consolidated' | 'nssf' | 'shif' | 'housing_levy' | 'paye';

/**
 * Generates a comprehensive or category-specific Statutory Deductions Report PDF
 * Supports Consolidated, NSSF By-Product, SHIF/SHA, Affordable Housing Levy (AHL), and PAYE.
 */
export const generateBulkStatutoryReportPdf = async (
    month: string,
    records: PayrollRecord[],
    staffList: User[] = [],
    reportType: StatutoryReportType = 'consolidated',
    institution: Institution,
    letterheadConfig?: LetterheadConfig,
    footerImageUrl?: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const [headerImg, footerImg] = await Promise.all([
        loadImage(letterheadConfig?.headerImageUrl),
        loadImage(footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const pageWidth = doc.internal.pageSize.getWidth();

    const titleMap: Record<StatutoryReportType, string> = {
        consolidated: "STATUTORY DEDUCTIONS COMPLIANCE REPORT",
        nssf: "NATIONAL SOCIAL SECURITY FUND (NSSF) STATUTORY RETURN",
        shif: "SOCIAL HEALTH INSURANCE FUND (SHIF/SHA) REMITTANCE",
        housing_levy: "AFFORDABLE HOUSING LEVY (AHL) COMPLIANCE SCHEDULE",
        paye: "KRA PAYE TAX DEDUCTION & REMITTANCE SCHEDULE"
    };

    const colorMap: Record<StatutoryReportType, number[]> = {
        consolidated: [45, 55, 72],
        nssf: [217, 119, 6], // Amber-600
        shif: [13, 148, 136], // Teal-600
        housing_levy: [225, 29, 72], // Rose-600
        paye: [79, 70, 229] // Indigo-600
    };

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(titleMap[reportType] || titleMap.consolidated, 14, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Filing Period: ${month}`, 14, yPos);
    doc.text(`Employer: ${institution.name}`, pageWidth / 2, yPos);
    yPos += 5;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, yPos);
    doc.text(`Active Personnel: ${records.length}`, pageWidth / 2, yPos);
    yPos += 10;

    let head: string[][] = [];
    let body: any[] = [];
    let grandGross = 0, grandNssf = 0, grandShif = 0, grandLevy = 0, grandPaye = 0, grandNet = 0;
    let grandTier1 = 0, grandTier2 = 0;

    const findStaffMeta = (staffId: string) => {
        const s = staffList.find(u => u.id === staffId);
        let m = s?.metadata || {};
        if (typeof m === 'string') {
            try { m = JSON.parse(m); } catch (e) { m = {}; }
        }
        return {
            kraPin: m.kraPin || (s as any)?.kraPin || 'A000000000X',
            nssfNo: m.nssfNo || (s as any)?.nssfNo || 'NSSF-001',
            shifNo: m.shifNumber || m.nhifNo || (s as any)?.shifNumber || 'SHIF-001',
            nationalId: m.nationalId || (s as any)?.nationalId || '00000000',
            name: s?.name || 'Staff Member'
        };
    };

    if (reportType === 'nssf') {
        head = [['Staff Member', 'NSSF No', 'National ID', 'KRA PIN', 'Gross Pay', 'Tier I (EE+ER)', 'Tier II (EE+ER)', 'Total NSSF']];
        body = records.map(rec => {
            const meta = findStaffMeta(rec.staffId);
            const basic = rec.basicSalary || rec.basicPay || 0;
            const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
            const allowances = allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
            const gross = basic + allowances;

            const tier1 = Math.min(gross, 9000) * 0.06 * 2; // EE + ER
            const tier2 = Math.max(0, Math.min(gross, 108000) - 9000) * 0.06 * 2;
            const totalNssf = tier1 + tier2;

            grandGross += gross;
            grandTier1 += tier1;
            grandTier2 += tier2;
            grandNssf += totalNssf;

            return [
                rec.staffName || meta.name,
                meta.nssfNo,
                meta.nationalId,
                meta.kraPin,
                `KES ${gross.toLocaleString()}`,
                `KES ${Math.round(tier1).toLocaleString()}`,
                `KES ${Math.round(tier2).toLocaleString()}`,
                `KES ${Math.round(totalNssf).toLocaleString()}`
            ];
        });

        body.push([
            'GRAND TOTALS',
            '-',
            '-',
            '-',
            `KES ${grandGross.toLocaleString()}`,
            `KES ${Math.round(grandTier1).toLocaleString()}`,
            `KES ${Math.round(grandTier2).toLocaleString()}`,
            `KES ${Math.round(grandNssf).toLocaleString()}`
        ]);
    } else if (reportType === 'shif') {
        head = [['Staff Member', 'SHIF / NHIF No', 'National ID', 'KRA PIN', 'Gross Salary', 'Rate', 'Total SHIF (2.75%)']];
        body = records.map(rec => {
            const meta = findStaffMeta(rec.staffId);
            const basic = rec.basicSalary || rec.basicPay || 0;
            const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
            const allowances = allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
            const gross = basic + allowances;

            const deductionsList = Array.isArray(rec.deductions) ? rec.deductions : [];
            const shif = deductionsList.find((d: any) => d.name === 'SHIF' || d.name?.includes('SHIF'))?.amount || (gross > 0 ? Math.max(300, gross * 0.0275) : 0);

            grandGross += gross;
            grandShif += shif;

            return [
                rec.staffName || meta.name,
                meta.shifNo,
                meta.nationalId,
                meta.kraPin,
                `KES ${gross.toLocaleString()}`,
                '2.75%',
                `KES ${Math.round(shif).toLocaleString()}`
            ];
        });

        body.push([
            'GRAND TOTALS',
            '-',
            '-',
            '-',
            `KES ${grandGross.toLocaleString()}`,
            '2.75%',
            `KES ${Math.round(grandShif).toLocaleString()}`
        ]);
    } else if (reportType === 'housing_levy') {
        head = [['Staff Member', 'KRA PIN', 'National ID', 'Gross Salary', 'Employee (1.5%)', 'Employer (1.5%)', 'Total AHL (3.0%)']];
        body = records.map(rec => {
            const meta = findStaffMeta(rec.staffId);
            const basic = rec.basicSalary || rec.basicPay || 0;
            const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
            const allowances = allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
            const gross = basic + allowances;

            const eeLevy = gross * 0.015;
            const erLevy = gross * 0.015;
            const totalLevy = eeLevy + erLevy;

            grandGross += gross;
            grandLevy += totalLevy;

            return [
                rec.staffName || meta.name,
                meta.kraPin,
                meta.nationalId,
                `KES ${gross.toLocaleString()}`,
                `KES ${Math.round(eeLevy).toLocaleString()}`,
                `KES ${Math.round(erLevy).toLocaleString()}`,
                `KES ${Math.round(totalLevy).toLocaleString()}`
            ];
        });

        body.push([
            'GRAND TOTALS',
            '-',
            '-',
            `KES ${grandGross.toLocaleString()}`,
            `KES ${Math.round(grandLevy / 2).toLocaleString()}`,
            `KES ${Math.round(grandLevy / 2).toLocaleString()}`,
            `KES ${Math.round(grandLevy).toLocaleString()}`
        ]);
    } else if (reportType === 'paye') {
        head = [['Staff Member', 'KRA PIN', 'Gross Salary', 'Statutory Relief', 'Taxable Pay', 'Gross Tax', 'Relief', 'Net PAYE']];
        body = records.map(rec => {
            const meta = findStaffMeta(rec.staffId);
            const basic = rec.basicSalary || rec.basicPay || 0;
            const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
            const allowances = allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
            const gross = basic + allowances;

            const deductionsList = Array.isArray(rec.deductions) ? rec.deductions : [];
            const paye = deductionsList.find((d: any) => d.name === 'PAYE')?.amount || 0;
            const nssf = deductionsList.find((d: any) => d.name === 'NSSF')?.amount || 0;
            const shif = deductionsList.find((d: any) => d.name === 'SHIF')?.amount || 0;
            const housingLevy = deductionsList.find((d: any) => d.name === 'Housing Levy')?.amount || 0;
            const allowable = nssf + shif + housingLevy;
            const taxable = Math.max(0, gross - allowable);

            grandGross += gross;
            grandPaye += paye;

            return [
                rec.staffName || meta.name,
                meta.kraPin,
                `KES ${gross.toLocaleString()}`,
                `KES ${Math.round(allowable).toLocaleString()}`,
                `KES ${Math.round(taxable).toLocaleString()}`,
                `KES ${Math.round(paye + (gross > 0 ? 2400 : 0)).toLocaleString()}`,
                `KES ${gross > 0 ? '2,400' : '0'}`,
                `KES ${Math.round(paye).toLocaleString()}`
            ];
        });

        body.push([
            'GRAND TOTALS',
            '-',
            `KES ${grandGross.toLocaleString()}`,
            '-',
            '-',
            '-',
            '-',
            `KES ${Math.round(grandPaye).toLocaleString()}`
        ]);
    } else {
        // Consolidated
        head = [['Employee', 'Gross Pay', 'NSSF', 'SHIF', 'Housing Levy', 'PAYE', 'Net Pay']];
        body = records.map((rec: PayrollRecord) => {
            const basic = rec.basicSalary || rec.basicPay || 0;
            const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
            const allowances = allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
            const gross = basic + allowances;

            const deductionsList = Array.isArray(rec.deductions) ? rec.deductions : [];
            const nssf = deductionsList.find((d: any) => d.name === 'NSSF')?.amount || 0;
            const shif = deductionsList.find((d: any) => d.name === 'SHIF')?.amount || 0;
            const housingLevy = deductionsList.find((d: any) => d.name === 'Housing Levy')?.amount || 0;
            const paye = deductionsList.find((d: any) => d.name === 'PAYE')?.amount || 0;
            const net = rec.netSalary || rec.netPay || 0;

            grandGross += gross;
            grandNssf += nssf;
            grandShif += shif;
            grandLevy += housingLevy;
            grandPaye += paye;
            grandNet += net;

            return [
                rec.staffName || 'Staff Member',
                `KES ${gross.toLocaleString()}`,
                `KES ${nssf.toLocaleString()}`,
                `KES ${shif.toLocaleString()}`,
                `KES ${housingLevy.toLocaleString()}`,
                `KES ${paye.toLocaleString()}`,
                `KES ${net.toLocaleString()}`
            ];
        });

        body.push([
            'GRAND TOTALS',
            `KES ${grandGross.toLocaleString()}`,
            `KES ${grandNssf.toLocaleString()}`,
            `KES ${grandShif.toLocaleString()}`,
            `KES ${grandLevy.toLocaleString()}`,
            `KES ${grandPaye.toLocaleString()}`,
            `KES ${grandNet.toLocaleString()}`
        ]);
    }

    doc.autoTable({
        startY: yPos,
        head,
        body,
        theme: 'striped',
        headStyles: { fillColor: colorMap[reportType] || [45, 55, 72] },
        styles: { fontSize: 8 },
        columnStyles: {
            [head[0].length - 1]: { halign: 'right', fontStyle: 'bold' }
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;
    doc.setFillColor(240, 253, 250); 
    doc.roundedRect(14, yPos, pageWidth - 28, 28, 2, 2, 'F');

    let complianceY = yPos + 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("STATUTORY REMITTANCE ACCOUNTING & DISBURSEMENT", 20, complianceY);
    complianceY += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`KRA PAYE + Housing Levy Remittance: KES ${(grandPaye + grandLevy).toLocaleString()}`, 20, complianceY);
    doc.text(`NSSF Board Remittance: KES ${grandNssf.toLocaleString()}`, pageWidth / 2, complianceY);
    complianceY += 5;
    doc.text(`Social Health Authority (SHA/SHIF) Remittance: KES ${grandShif.toLocaleString()}`, 20, complianceY);

    setupPdfFooter(doc, footerImg, `${institution.name} — Statutory Remittance Report (${reportType.toUpperCase()})`);
    return doc.output('datauristring');
};

/**
 * Backward compatible alias for generateStatutoryDeductionsPdf
 */
export const generateStatutoryDeductionsPdf = async (
    month: string,
    records: PayrollRecord[],
    institution: Institution,
    letterheadConfig?: LetterheadConfig,
    footerImageUrl?: string | null,
    staffList?: User[],
    reportType: StatutoryReportType = 'consolidated'
): Promise<string> => {
    return generateBulkStatutoryReportPdf(month, records, staffList || [], reportType, institution, letterheadConfig, footerImageUrl);
};

/**
 * Downloads a structured statutory CSV file formatted for direct upload to NSSF, SHIF, or KRA portals.
 */
export const downloadStatutoryCsv = (
    month: string,
    records: PayrollRecord[],
    staffList: User[] = [],
    reportType: StatutoryReportType = 'consolidated',
    institutionName: string = 'Institution'
) => {
    const findStaffMeta = (staffId: string) => {
        const s = staffList.find(u => u.id === staffId);
        let m = s?.metadata || {};
        if (typeof m === 'string') {
            try { m = JSON.parse(m); } catch (e) { m = {}; }
        }
        return {
            kraPin: m.kraPin || (s as any)?.kraPin || 'A000000000X',
            nssfNo: m.nssfNo || (s as any)?.nssfNo || 'NSSF-001',
            shifNo: m.shifNumber || m.nhifNo || (s as any)?.shifNumber || 'SHIF-001',
            nationalId: m.nationalId || (s as any)?.nationalId || '00000000',
            name: s?.name || 'Staff Member'
        };
    };

    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'nssf') {
        headers = ['Payroll Month', 'Staff Name', 'NSSF Number', 'National ID', 'KRA PIN', 'Gross Salary (KES)', 'Tier I (KES)', 'Tier II (KES)', 'Total NSSF (KES)'];
        rows = records.map(rec => {
            const meta = findStaffMeta(rec.staffId);
            const basic = rec.basicSalary || rec.basicPay || 0;
            const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
            const gross = basic + allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
            const tier1 = Math.min(gross, 9000) * 0.06 * 2;
            const tier2 = Math.max(0, Math.min(gross, 108000) - 9000) * 0.06 * 2;
            return [month, rec.staffName || meta.name, meta.nssfNo, meta.nationalId, meta.kraPin, String(gross), String(Math.round(tier1)), String(Math.round(tier2)), String(Math.round(tier1 + tier2))];
        });
    } else if (reportType === 'shif') {
        headers = ['Payroll Month', 'Staff Name', 'SHIF Number', 'National ID', 'KRA PIN', 'Gross Salary (KES)', 'SHIF Deduction (KES)'];
        rows = records.map(rec => {
            const meta = findStaffMeta(rec.staffId);
            const basic = rec.basicSalary || rec.basicPay || 0;
            const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
            const gross = basic + allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
            const deductionsList = Array.isArray(rec.deductions) ? rec.deductions : [];
            const shif = deductionsList.find((d: any) => d.name === 'SHIF' || d.name?.includes('SHIF'))?.amount || Math.max(300, gross * 0.0275);
            return [month, rec.staffName || meta.name, meta.shifNo, meta.nationalId, meta.kraPin, String(gross), String(Math.round(shif))];
        });
    } else if (reportType === 'housing_levy') {
        headers = ['Payroll Month', 'Staff Name', 'KRA PIN', 'National ID', 'Gross Salary (KES)', 'Employee (1.5%)', 'Employer (1.5%)', 'Total AHL (KES)'];
        rows = records.map(rec => {
            const meta = findStaffMeta(rec.staffId);
            const basic = rec.basicSalary || rec.basicPay || 0;
            const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
            const gross = basic + allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
            const eeLevy = gross * 0.015;
            const erLevy = gross * 0.015;
            return [month, rec.staffName || meta.name, meta.kraPin, meta.nationalId, String(gross), String(Math.round(eeLevy)), String(Math.round(erLevy)), String(Math.round(eeLevy + erLevy))];
        });
    } else if (reportType === 'paye') {
        headers = ['Payroll Month', 'Staff Name', 'KRA PIN', 'Gross Salary (KES)', 'Allowable Deductions (KES)', 'Taxable Pay (KES)', 'Gross Tax (KES)', 'Personal Relief (KES)', 'Net PAYE (KES)'];
        rows = records.map(rec => {
            const meta = findStaffMeta(rec.staffId);
            const basic = rec.basicSalary || rec.basicPay || 0;
            const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
            const gross = basic + allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
            const deductionsList = Array.isArray(rec.deductions) ? rec.deductions : [];
            const paye = deductionsList.find((d: any) => d.name === 'PAYE')?.amount || 0;
            const nssf = deductionsList.find((d: any) => d.name === 'NSSF')?.amount || 0;
            const shif = deductionsList.find((d: any) => d.name === 'SHIF')?.amount || 0;
            const housingLevy = deductionsList.find((d: any) => d.name === 'Housing Levy')?.amount || 0;
            const allowable = nssf + shif + housingLevy;
            const taxable = Math.max(0, gross - allowable);
            return [month, rec.staffName || meta.name, meta.kraPin, String(gross), String(Math.round(allowable)), String(Math.round(taxable)), String(Math.round(paye + 2400)), '2400', String(Math.round(paye))];
        });
    } else {
        headers = ['Payroll Month', 'Staff Name', 'National ID', 'KRA PIN', 'Gross Pay (KES)', 'NSSF (KES)', 'SHIF (KES)', 'Housing Levy (KES)', 'PAYE (KES)', 'Net Pay (KES)'];
        rows = records.map(rec => {
            const meta = findStaffMeta(rec.staffId);
            const basic = rec.basicSalary || rec.basicPay || 0;
            const allowancesList = Array.isArray(rec.allowances) ? rec.allowances : [];
            const gross = basic + allowancesList.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
            const deductionsList = Array.isArray(rec.deductions) ? rec.deductions : [];
            const nssf = deductionsList.find((d: any) => d.name === 'NSSF')?.amount || 0;
            const shif = deductionsList.find((d: any) => d.name === 'SHIF')?.amount || 0;
            const housingLevy = deductionsList.find((d: any) => d.name === 'Housing Levy')?.amount || 0;
            const paye = deductionsList.find((d: any) => d.name === 'PAYE')?.amount || 0;
            const net = rec.netSalary || rec.netPay || 0;
            return [month, rec.staffName || meta.name, meta.nationalId, meta.kraPin, String(gross), String(nssf), String(shif), String(housingLevy), String(paye), String(net)];
        });
    }

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${institutionName.replace(/\s+/g, '_')}_Statutory_${reportType.toUpperCase()}_${month.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

export const generatePMInspectionPdf = async (
    inspection: PMInspection,
    tenant: PMTenant,
    unit: PMUnit,
    property: PMProperty,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    letterheadUrl?: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const headerImg = await loadImage(letterheadUrl || null);
    const tableStartY = createPdfWithLetterhead(
        doc,
        'HOUSE INSPECTION FORM',
        companyDetails,
        institution,
        logoImg,
        headerImg
    );
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    let yPos = tableStartY + 5;

    // Header Details: Name, Hse no, Estate, Date
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Name: ${tenant.name}`, margin, yPos);
    doc.text(`Hse no: ${unit.unitNumber}`, pageWidth - margin - 60, yPos);
    
    yPos += 8;
    doc.text(`Estate: ${property.name}`, margin, yPos);
    doc.text(`Date: ${new Date(inspection.inspectionDate).toLocaleDateString()}`, pageWidth - margin - 60, yPos);

    yPos += 5;
    doc.setDrawColor(150, 150, 150);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.line(margin, yPos + 1, pageWidth - margin, yPos + 1);

    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text("The following items is required to be fixed or purchased or cleared before we refund you deposits:", margin, yPos);

    yPos += 10;
    // Columns: ITEMS, AMOUNT, Remarks
    doc.text("ITEMS", margin, yPos);
    doc.text("AMOUNT (KES)", pageWidth / 2, yPos, { align: 'center' });
    doc.text("Remarks", pageWidth - margin, yPos, { align: 'right' });

    yPos += 2;
    doc.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 8;
    doc.setFont('helvetica', 'normal');

    let details = {
        waterMeterNo: '',
        waterBill: 0,
        waterRemarks: '',
        electricityMeterNo: '',
        electricityBill: 0,
        electricityRemarks: '',
        ciuNo: '',
        items: [] as Array<{ description: string; amount: number; remarks: string }>,
        checkedBy: '',
        tenantIdNo: '',
        tenantTel: ''
    };
    try {
        details = JSON.parse(inspection.repairsRequired || '{}');
    } catch (e) {
        details = {
            waterMeterNo: '',
            waterBill: 0,
            waterRemarks: '',
            electricityMeterNo: '',
            electricityBill: 0,
            electricityRemarks: '',
            ciuNo: '',
            items: inspection.repairsRequired ? [{ description: inspection.repairsRequired, amount: inspection.estimatedRepairCost || 0, remarks: '' }] : [],
            checkedBy: '',
            tenantIdNo: '',
            tenantTel: ''
        };
    }

    // Row 1: Water
    doc.text(`1- Water readings (Meter No: ${details.waterMeterNo || 'N/A'})`, margin, yPos);
    doc.text(`${details.waterBill?.toLocaleString() || '0'}`, pageWidth / 2, yPos, { align: 'center' });
    doc.text(`${details.waterRemarks || 'Cleared'}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 8;
    // Row 2: Electricity
    doc.text(`2- Electricity Readings (Meter No: ${details.electricityMeterNo || 'N/A'})`, margin, yPos);
    doc.text(`${details.electricityBill?.toLocaleString() || '0'}`, pageWidth / 2, yPos, { align: 'center' });
    doc.text(`${details.electricityRemarks || 'Cleared'}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 8;
    // Row 3: C.I.U no (for prepaid)
    doc.text(`3- C.I.U no: ${details.ciuNo || 'N/A'} (For pre-paid meters only)`, margin, yPos);
    doc.text('—', pageWidth / 2, yPos, { align: 'center' });
    doc.text('—', pageWidth - margin, yPos, { align: 'right' });

    // Custom items 4, 5, 6...
    details.items.forEach((item, idx) => {
        yPos += 8;
        doc.text(`${idx + 4}- ${item.description}`, margin, yPos);
        doc.text(`${item.amount?.toLocaleString() || '0'}`, pageWidth / 2, yPos, { align: 'center' });
        doc.text(`${item.remarks || '—'}`, pageWidth - margin, yPos, { align: 'right' });
    });

    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text("Total Outstanding Deductions:", margin, yPos);
    doc.text(`KES ${inspection.estimatedRepairCost?.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 15;
    // Signatures
    doc.setFontSize(9);
    doc.text(`Inspected by (Agent): ${inspection.inspectedBy || '_________________'}   Sign: _________________`, margin, yPos);
    
    yPos += 8;
    doc.text(`Checked by: ${details.checkedBy || '_________________'}   Sign: _________________`, margin, yPos);

    yPos += 10;
    doc.text("To be filled by The tenant:", margin, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Confirmed By: ${tenant.name}   Sign: _________________`, margin, yPos);
    
    yPos += 8;
    doc.text(`Id No: ${details.tenantIdNo || '_________________'}   Tel: ${details.tenantTel || tenant.phoneNumber || '_________________'}`, margin, yPos);

    yPos += 12;
    doc.setFont('helvetica', 'bold');
    doc.text("To be filled by official agent after the above named tenant cleared the above items:", margin, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text("Cleared & Confirmed By: _________________   Sign: _________________   Date: _________________", margin, yPos);

    return doc.output('datauristring');
};

export const downloadPMInspectionPdf = async (
    inspection: PMInspection,
    tenant: PMTenant,
    unit: PMUnit,
    property: PMProperty,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    letterheadUrl?: string | null
): Promise<void> => {
    const dataUri = await generatePMInspectionPdf(inspection, tenant, unit, property, institution, companyDetails, logoUrl, letterheadUrl);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `Inspection_${unit.unitNumber}_${new Date(inspection.inspectionDate).toLocaleDateString().replace(/\//g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const generatePMDepositRefundPdf = async (
    refund: PMDepositRefund,
    lease: PMLease,
    tenant: PMTenant,
    unit: PMUnit,
    property: PMProperty,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    letterheadUrl?: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);
    const headerImg = await loadImage(letterheadUrl || null);
    const tableStartY = createPdfWithLetterhead(
        doc,
        'DEPOSIT REFUND STATEMENT',
        companyDetails,
        institution,
        logoImg,
        headerImg
    );
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    let yPos = tableStartY + 5;

    // Header Details: Estate Name & Date
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(property.name.toUpperCase(), margin, yPos);
    doc.text(`Date: ${new Date(refund.statementDate).toLocaleDateString()}`, pageWidth - margin - 45, yPos);

    yPos += 8;
    // Sub-title
    doc.setFontSize(10);
    doc.text(`DEPOSIT REFUND TO ${tenant.name.toUpperCase()} NO ${unit.unitNumber}`, margin, yPos);
    doc.text(`Tel no: ${tenant.phoneNumber || '—'}`, pageWidth - margin - 60, yPos);

    yPos += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 8;
    // Checklist options
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text("Tick one:   [x] Rcpt   [x] Letter   [x] Bills   [x] Notice   [x] Hse Report", margin, yPos);

    yPos += 8;
    // Section Title
    doc.setFont('helvetica', 'bold');
    doc.text("DEPOSIT PAID", margin, yPos);
    yPos += 3;
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // Parse the serialized additional deposits from comments
    let extraDeposits = { electricityDeposit: 0, waterDeposit: 0, aobDeposit: 0, comments: '' };
    if (refund.otherDeductionsComments) {
        try {
            extraDeposits = JSON.parse(refund.otherDeductionsComments);
        } catch (e) {
            extraDeposits.comments = refund.otherDeductionsComments;
        }
    }

    const rentDeposit = refund.originalDeposit;
    const elecDeposit = extraDeposits.electricityDeposit || 0;
    const waterDeposit = extraDeposits.waterDeposit || 0;
    const aobDeposit = extraDeposits.aobDeposit || 0;
    const totalDeposits = rentDeposit + elecDeposit + waterDeposit + aobDeposit;

    yPos += 6;
    doc.setFont('helvetica', 'normal');
    // Rent Deposit row
    doc.text("a) Rent Deposit", margin + 4, yPos);
    doc.text(`KES ${rentDeposit.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;
    doc.text("b) Electricity Deposit", margin + 4, yPos);
    doc.text(`KES ${elecDeposit.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;
    doc.text("c) Water Deposit", margin + 4, yPos);
    doc.text(`KES ${waterDeposit.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;
    doc.text("d) A.O.B Deposit", margin + 4, yPos);
    doc.text(`KES ${aobDeposit.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text("Total Deposits Paid", margin, yPos);
    doc.text(`KES ${totalDeposits.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });

    // Section 2: DEDUCTIONS
    yPos += 12;
    doc.text("DEDUCTIONS & OUTSTANDING DUES", margin, yPos);
    yPos += 3;
    doc.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text("a) Rent Arrears", margin + 4, yPos);
    doc.text(`KES ${refund.rentArrearsDeduction.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
    
    yPos += 6;
    doc.text("b) Utility Arrears", margin + 4, yPos);
    doc.text(`KES ${refund.utilityArrearsDeduction.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 6;
    doc.text("c) Damage / Repair Costs", margin + 4, yPos);
    doc.text(`KES ${refund.damageRepairDeduction.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 6;
    const commentsLabel = extraDeposits.comments ? ` (${extraDeposits.comments})` : '';
    doc.text(`d) Other Deductions${commentsLabel}`, margin + 4, yPos);
    doc.text(`KES ${refund.otherDeductions.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });

    const totalDeductions = refund.rentArrearsDeduction + refund.utilityArrearsDeduction + refund.damageRepairDeduction + refund.otherDeductions;

    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text("Total Deductions", margin, yPos);
    doc.text(`KES ${totalDeductions.toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 10;
    // Net Payout
    doc.setFontSize(11);
    doc.text(`Net payment to the Tenant KES: ${refund.refundAmount.toLocaleString()}`, margin, yPos);

    yPos += 18;
    // Signature block
    doc.setFontSize(9);
    doc.text("Prepared by: __________________________________   Sign: __________________________", margin, yPos);
    yPos += 8;
    doc.text("Checked by: ___________________________________   Sign: __________________________", margin, yPos);
    yPos += 8;
    doc.text("Received By: __________________________________   Sign: __________________________", margin, yPos);
    yPos += 6;
    doc.text(`Id No: ________________________________________   Tel: ${tenant.phoneNumber || '__________________________'}`, margin, yPos);

    yPos += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Note: The tenant occupied on ${new Date(lease.startDate).toLocaleDateString()} and moved out on ${new Date(refund.statementDate).toLocaleDateString()}`, margin, yPos);

    return doc.output('datauristring');
};

export const downloadPMDepositRefundPdf = async (
    refund: PMDepositRefund,
    lease: PMLease,
    tenant: PMTenant,
    unit: PMUnit,
    property: PMProperty,
    institution: Institution,
    companyDetails: CompanyDetails,
    logoUrl: string | null,
    letterheadUrl?: string | null
): Promise<void> => {
    const dataUri = await generatePMDepositRefundPdf(refund, lease, tenant, unit, property, institution, companyDetails, logoUrl, letterheadUrl);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `RefundStatement_${unit.unitNumber}_${new Date(refund.statementDate).toLocaleDateString().replace(/\//g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const generateTeacherAttendanceReportPdf = async (
    data: any[],
    dateRange: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
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
    doc.text("Teacher Attendance Report", margin, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${dateRange}`, margin, yPos);
    yPos += 10;

    // Detailed Stats summary on PDF
    const stats = {
        total: data.length,
        morningOnTime: data.filter(c => c.morningCheckInStatus === 'On Time').length,
        morningLate: data.filter(c => c.morningCheckInStatus === 'Late').length,
        morningAbsent: data.filter(c => c.morningCheckInStatus === 'Absent').length,
        afternoonOnTime: data.filter(c => c.afternoonCheckInStatus === 'On Time').length,
        afternoonLate: data.filter(c => c.afternoonCheckInStatus === 'Late').length,
        afternoonAbsent: data.filter(c => c.afternoonCheckInStatus === 'Absent').length,
    };

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Attendance & Punctuality Summary", margin, yPos);
    yPos += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const totalCheckins = stats.morningOnTime + stats.morningLate + stats.afternoonOnTime + stats.afternoonLate;
    const onTimeTotal = stats.morningOnTime + stats.afternoonOnTime;
    const punctuality = totalCheckins > 0 ? ((onTimeTotal / totalCheckins) * 100).toFixed(1) + "%" : "100%";

    doc.text(`Total Records: ${stats.total}`, margin, yPos);
    doc.text(`Morning - On Time: ${stats.morningOnTime} | Late: ${stats.morningLate} | Absent: ${stats.morningAbsent}`, margin + 50, yPos);
    yPos += 5;
    doc.text(`Punctuality: ${punctuality}`, margin, yPos);
    doc.text(`Afternoon - On Time: ${stats.afternoonOnTime} | Late: ${stats.afternoonLate} | Absent: ${stats.afternoonAbsent}`, margin + 50, yPos);
    yPos += 10;

    const head = [['Date', 'Teacher', 'Morning Check-In', 'Afternoon Check-In']];
    const body = data.map(item => {
        const morningStr = item.morningCheckInTime 
            ? `${item.morningCheckInTime} (${item.morningCheckInStatus})`
            : item.morningOverdue ? 'Overdue (Absent)' : 'Pending';
            
        const afternoonStr = item.afternoonCheckInTime 
            ? `${item.afternoonCheckInTime} (${item.afternoonCheckInStatus})`
            : item.afternoonOverdue ? 'Overdue (Absent)' : 'Pending';

        return [
            item.checkInDate,
            item.teacherName || 'Unknown',
            morningStr,
            afternoonStr
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [45, 55, 72], textColor: 255 },
        styles: { fontSize: 8 },
        didParseCell: (data: any) => {
            if (data.section === 'body') {
                const cellText = data.cell.text[0] || '';
                if (cellText.includes('Late')) {
                    data.cell.styles.textColor = [217, 119, 6]; // orange-600
                } else if (cellText.includes('Absent') || cellText.includes('Overdue')) {
                    data.cell.styles.textColor = [220, 38, 38]; // rose-600
                } else if (cellText.includes('On Time')) {
                    data.cell.styles.textColor = [22, 163, 74]; // green-600
                }
            }
        }
    });

    setupPdfFooter(doc, footerImg);
    return doc.output('datauristring');
};

export const downloadTeacherAttendanceReportPdf = async (
    data: any[],
    dateRange: string,
    letterheadConfig: LetterheadConfig | undefined,
    footerImageUrl: string | null
): Promise<void> => {
    const dataUri = await generateTeacherAttendanceReportPdf(data, dateRange, letterheadConfig, footerImageUrl);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `Teacher_Attendance_Report_${dateRange.replace(/\s+/g, '_').replace(/\//g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const generatePatientHistoryPdf = async (
    patient: HISPatient,
    events: any[],
    vitals: any[],
    prescriptions: any[],
    institution: Institution,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();
    const logoImg = await loadImage(logoUrl);

    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = margin;

    // 1. Header & Logo
    if (logoImg) {
        const logoWidth = 25;
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        doc.addImage(logoImg, 'PNG', margin, yPos, logoWidth, logoHeight);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(institution.name || 'EduPulse Wellness Unit', pageWidth - margin, yPos + 5, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Email: ${institution.email || 'N/A'}`, pageWidth - margin, yPos + 11, { align: 'right' });
    doc.text(`Phone: ${institution.phoneNumber || 'N/A'}`, pageWidth - margin, yPos + 15, { align: 'right' });

    yPos += 35;
    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // 2. Title
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text("PATIENT CLINICAL HISTORY DOSSIER", margin, yPos);
    
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });

    // 3. Patient Information Table
    yPos += 10;
    const isEdu = isEduInstitution(institution);
    const idLabel = isEdu ? 'Admission No' : 'File / OP No';
    const classOrDeptLabel = isEdu ? 'Grade / Stream' : 'Department / Category';
    const idValue = (patient as any).admissionNumber || (patient as any).admission_number || (patient as any).customPatientId || (patient as any).patientNumber || (patient as any).opNumber || '—';
    const deptValue = isEdu
        ? `${(patient as any).gradeLevel || (patient as any).grade_level || '—'} / ${patient.stream || '—'}`
        : `${(patient as any).gradeLevel || (patient as any).grade_level || (patient as any).stream || 'Outpatient'}`;

    const infoHead = [['Field', 'Detail', 'Field', 'Detail']];
    const infoBody = [
        ['Full Name', patient.fullName.toUpperCase(), 'Date of Birth', patient.dob || '—'],
        ['Gender', patient.gender || '—', idLabel, idValue],
        [classOrDeptLabel, deptValue, 'Blood Group', patient.bloodGroup || '—'],
        ['Contact', patient.contact || '—', 'Known Allergies', patient.allergies || 'No known allergies'],
    ];

    doc.autoTable({
        head: infoHead,
        body: infoBody,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: 255 }, // Slate-600
        styles: { fontSize: 8.5, cellPadding: 5 },
        columnStyles: { 
            0: { fontStyle: 'bold', fillColor: [248, 250, 252], width: 35 }, 
            2: { fontStyle: 'bold', fillColor: [248, 250, 252], width: 35 } 
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    // 4. Clinical Timeline / Visits
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("1. CLINICAL CONSULTATIONS & VISITS", margin, yPos);
    yPos += 6;

    if (!events || events.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("No consultation visits recorded.", margin, yPos);
        yPos += 10;
    } else {
        const visitHead = [['Date / Time', 'Diagnosis / Event Details', 'Department', 'Attending Practitioner']];
        const visitBody = events.map(e => [
            `${e.date || ''} ${e.time || ''}`,
            e.event || 'Consultation',
            e.dept || 'OPD / General',
            e.provider || 'Staff'
        ]);

        doc.autoTable({
            head: visitHead,
            body: visitBody,
            startY: yPos,
            theme: 'striped',
            headStyles: { fillColor: [15, 118, 110], textColor: 255 }, // Emerald/Teal
            styles: { fontSize: 8.5, cellPadding: 5 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 12;
    }

    // 5. Vital Statistics History
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("2. DIAGNOSTICS & VITAL STATISTICS RECORD", margin, yPos);
    yPos += 6;

    if (!vitals || vitals.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("No vital statistics logged.", margin, yPos);
        yPos += 10;
    } else {
        const vitalsHead = [['Recorded Date / Time', 'Parameter Label', 'Measurement Value / Unit']];
        const vitalsBody = vitals.map(v => [
            v.recordedAt || v.recorded_at ? new Date(v.recordedAt || v.recorded_at).toLocaleString() : '—',
            v.label || '—',
            `${v.value || ''} ${v.unit || ''}`
        ]);

        doc.autoTable({
            head: vitalsHead,
            body: vitalsBody,
            startY: yPos,
            theme: 'striped',
            headStyles: { fillColor: [190, 24, 74], textColor: 255 }, // Rose-700
            styles: { fontSize: 8.5, cellPadding: 5 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 12;
    }

    // 6. Prescriptions Dossier
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("3. MEDICAL PRESCRIPTIONS ISSUED", margin, yPos);
    yPos += 6;

    if (!prescriptions || prescriptions.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("No prescriptions issued.", margin, yPos);
        yPos += 10;
    } else {
        const rxHead = [['Date / Ref', 'Prescribed Medications', 'Notes / Status', 'Attending Doctor']];
        const rxBody = prescriptions.map(rx => {
            const rxDate = rx.createdAt || rx.created_at ? new Date(rx.createdAt || rx.created_at).toLocaleDateString() : '—';
            const medDetails = (rx.items || []).map((m: any) => 
                `• ${m.drugName} (${m.dosage} - ${m.frequency} for ${m.duration}) [Qty: ${m.quantity}]`
            ).join('\n') || 'No items listed';

            return [
                `${rxDate}\nID: ${rx.id}`,
                medDetails,
                `Notes: ${rx.notes || '—'}\nStatus: ${rx.status || 'pending'}`,
                rx.doctorName || 'Staff Doctor'
            ];
        });

        doc.autoTable({
            head: rxHead,
            body: rxBody,
            startY: yPos,
            theme: 'striped',
            headStyles: { fillColor: [67, 56, 202], textColor: 255 }, // Indigo-700
            styles: { fontSize: 8.5, cellPadding: 5 },
            columnStyles: {
                1: { cellWidth: 70 }
            }
        });
        yPos = (doc as any).lastAutoTable.finalY + 12;
    }

    setupPdfFooter(doc, null, `${institution.name || 'EduPulse'} - Confidential Medical History File`);

    return doc.output('datauristring');
};

export const resolveStudentAdmissionNo = (student: any): string => {
    if (!student) return 'N/A';

    const directAdm = 
        student.admissionNumber ||
        student.admission_number ||
        student.admNo ||
        student.adm_no ||
        student.staffId ||
        student.staff_id ||
        student.metadata?.admissionNumber ||
        student.metadata?.admission_number ||
        student.metadata?.admNo ||
        student.metadata?.staffId ||
        student.metadata?.registrationNumber ||
        student.metadata?.regNo;

    if (directAdm && String(directAdm).trim() !== '' && String(directAdm).trim() !== '—' && String(directAdm).trim().toUpperCase() !== 'N/A') {
        return String(directAdm).trim();
    }

    const cleanId = (student.staffId || student.id || '').replace(/^user_/, '').replace(/^stu_/, '').slice(-6).toUpperCase();
    return cleanId ? `ADM-${cleanId}` : 'N/A';
};

export const generateStudentStatementPdfDataUri = async (
    student: any,
    ledgerEntries: Array<{ date: string; description: string; debit: number; credit: number; balance: number }>,
    summary: { totalInvoiced: number; totalPaid: number; balance: number },
    institution: Institution,
    companyDetails?: CompanyDetails,
    logoUrl?: string | null,
    issuedByOfficerName?: string
): Promise<string> => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();

    const letterConfig = institution?.letterheadConfig || companyDetails?.letterheadConfig;
    const letterheadUrl = letterConfig?.headerImageUrl 
        || (institution as any)?.letterheadUrl 
        || (institution as any)?.letterhead_url 
        || companyDetails?.letterheadConfig?.headerImageUrl 
        || (companyDetails as any)?.letterheadUrl;
    
    const footerUrl = letterConfig?.footerImageUrl 
        || (institution as any)?.footerImageUrl 
        || (institution as any)?.footer_image_url 
        || companyDetails?.letterheadConfig?.footerImageUrl 
        || (companyDetails as any)?.footerImageUrl;

    const headerImg = letterheadUrl ? await loadImage(letterheadUrl) : null;
    const footerImg = footerUrl ? await loadImage(footerUrl) : null;
    const logoImg = await loadImage(logoUrl || institution?.logoUrl || (institution as any)?.logo_url || companyDetails?.logoUrl);

    // Dynamic Kenyan Stamp generation / uploaded stamp loading
    let stampImg: HTMLImageElement | null = null;
    try {
        const stampUrl = letterConfig?.stampImageUrl || (institution as any)?.stampImageUrl || (institution as any)?.stamp_image_url;
        if (stampUrl) {
            stampImg = await loadImage(stampUrl);
        }
        if (!stampImg && letterConfig?.showStamp !== false) {
            const dateToStamp = new Date();
            const resolvedStampConfig = letterConfig?.stampConfig || {
                department: 'FINANCE DEPARTMENT',
                showStars: true,
                shape: 'round',
                mode: 'auto',
                rotationAngle: -6,
                stampColor: '#1d4ed8',
                daterColor: '#dc2626'
            } as any;
            const stampDataUri = await generateStampDataUri(resolvedStampConfig, dateToStamp, institution);
            if (stampDataUri) {
                stampImg = await loadImage(stampDataUri);
            }
        }
    } catch (stampErr) {
        console.warn('[pdfService] Failed to generate stamp for student statement:', stampErr);
    }

    let yPos = createPdfWithLetterhead(
        doc,
        'STUDENT STATEMENT OF ACCOUNT',
        companyDetails || {} as any,
        institution,
        logoImg,
        headerImg
    );

    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Student Information Metadata Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 30, 3, 3, 'FD');

    const admNo = resolveStudentAdmissionNo(student);
    const dateStr = new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
    const studentClass = student?.className || student?.gradeLevel || '—';
    const studentRoute = student?.routeName || student?.assignedRouteName || student?.route;

    const rightMargin = pageWidth - margin - 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('STUDENT FULL NAME', margin + 8, yPos + 7);
    doc.text('ADMISSION NUMBER', margin + 60, yPos + 7);
    doc.text('CLASS / STREAM', margin + 105, yPos + 7);
    doc.text('ACCOUNT STATUS', rightMargin, yPos + 7, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(String(student?.name || 'N/A'), margin + 8, yPos + 14);
    doc.text(String(admNo), margin + 60, yPos + 14);
    const classWithRoute = studentRoute ? `${studentClass} (${studentRoute})` : String(studentClass);
    doc.text(classWithRoute, margin + 105, yPos + 14);

    const balText = summary.balance > 0 ? `KSh ${summary.balance.toLocaleString()} OWING` : summary.balance < 0 ? `KSh ${Math.abs(summary.balance).toLocaleString()} CREDIT` : 'FULLY PAID';
    doc.setTextColor(summary.balance > 0 ? 225 : 16, summary.balance > 0 ? 29 : 185, summary.balance > 0 ? 72 : 129);
    doc.setFontSize(8.5);
    doc.text(balText, rightMargin, yPos + 14, { align: 'right' });

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Reference: STMT-${new Date().getFullYear()}/${admNo}${studentRoute ? ` · Route: ${studentRoute}` : ''}`, margin + 8, yPos + 24);
    doc.text(`Issue Date: ${dateStr}`, rightMargin, yPos + 24, { align: 'right' });

    yPos += 36;

    // 2. Financial Summary Cards Box
    doc.setFillColor(240, 243, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 16, 3, 3, 'FD');

    const colW = (pageWidth - (margin * 2)) / 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL INVOICED (DR)', margin + colW * 0.5, yPos + 5, { align: 'center' });
    doc.text('TOTAL PAYMENTS (CR)', margin + colW * 1.5, yPos + 5, { align: 'center' });
    doc.text('NET BALANCE', margin + colW * 2.5, yPos + 5, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`KSh ${summary.totalInvoiced.toLocaleString()}`, margin + colW * 0.5, yPos + 12, { align: 'center' });
    doc.setTextColor(16, 185, 129);
    doc.text(`KSh ${summary.totalPaid.toLocaleString()}`, margin + colW * 1.5, yPos + 12, { align: 'center' });
    doc.setTextColor(summary.balance > 0 ? 225 : 16, summary.balance > 0 ? 29 : 185, summary.balance > 0 ? 72 : 129);
    doc.text(`KSh ${Math.abs(summary.balance).toLocaleString()} ${summary.balance > 0 ? 'Dr' : 'Cr'}`, margin + colW * 2.5, yPos + 12, { align: 'center' });

    yPos += 22;

    // 3. Itemized AutoTable Ledger
    const tableHead = [['Date', 'Reference', 'Particulars / Description', 'Charges (Dr)', 'Payments (Cr)', 'Running Balance']];
    const tableBody = ledgerEntries.map(e => [
        e.date,
        (e as any).reference || '—',
        e.description,
        e.debit > 0 ? `KSh ${e.debit.toLocaleString()}` : '—',
        e.credit > 0 ? `KSh ${e.credit.toLocaleString()}` : '—',
        `KSh ${Math.abs(e.balance).toLocaleString()} ${e.balance > 0 ? 'Dr' : 'Cr'}`
    ]);

    // Totals row at bottom
    tableBody.push([
        '',
        '',
        'ACCOUNT TOTALS',
        `KSh ${summary.totalInvoiced.toLocaleString()}`,
        `KSh ${summary.totalPaid.toLocaleString()}`,
        `KSh ${Math.abs(summary.balance).toLocaleString()} ${summary.balance > 0 ? 'Dr' : 'Cr'}`
    ]);

    autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 26 },
            2: { cellWidth: 56 },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data: any) => {
            if (data.row.index === tableBody.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [241, 245, 249];
            }
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 12;
    if (finalY > doc.internal.pageSize.getHeight() - 45) {
        doc.addPage();
        finalY = 20;
    }

    // 4. Sign-off & Official Stamp Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('ISSUED BY ACCOUNTS OFFICER', margin, finalY);

    const officerName = issuedByOfficerName ? issuedByOfficerName.toUpperCase() : 'ACCOUNTS OFFICER';
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(officerName, margin, finalY + 6);

    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margin, finalY + 16, margin + 60, finalY + 16);
    doc.setLineDashPattern([], 0);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Signature & Date', margin, finalY + 21);
    doc.text(`Official computer-generated record from ${institution.name} Finance ERP.`, margin, finalY + 28);

    // Stamp section on right side
    const stampX = pageWidth - margin - 50;

    if (stampImg) {
        try {
            const stampSize = 36; // 36mm circular/oval stamp overlay
            const stampAspect = stampImg.height > 0 ? stampImg.width / stampImg.height : 1;
            const stampW = stampAspect >= 1 ? stampSize : stampSize * stampAspect;
            const stampH = stampAspect >= 1 ? stampSize / stampAspect : stampSize;
            const stampDrawX = stampX + (50 - stampW) / 2;
            const stampDrawY = finalY - 3;

            let format = 'PNG';
            if (stampImg.src?.startsWith('data:image/jpeg')) format = 'JPEG';

            doc.addImage(stampImg, format, stampDrawX, stampDrawY, stampW, stampH);
        } catch (imgErr) {
            console.warn('[pdfService] Could not add stamp image to statement PDF:', imgErr);
        }
    } else {
        doc.setFillColor(240, 243, 255);
        doc.setDrawColor(199, 210, 254);
        doc.roundedRect(stampX, finalY, 50, 28, 3, 3, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(79, 70, 229);
        doc.text('OFFICIAL STAMP', stampX + 25, finalY + 10, { align: 'center' });
        doc.setFontSize(7);
        doc.text('Finance Department', stampX + 25, finalY + 16, { align: 'center' });
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('VERIFIED DOCUMENT', stampX + 25, finalY + 22, { align: 'center' });
    }

    setupPdfFooter(doc, footerImg, `${institution.name} · Student Account Statement`);

    return doc.output('datauristring');
};

/**
 * Generates an official Class List / Student Registry PDF.
 */
export const generateClassListPdf = async (
    students: any[],
    institution: Institution,
    companyDetails: CompanyDetails,
    options: {
        gradeFilter?: string;
        streamFilter?: string;
        statusFilter?: string;
        searchTerm?: string;
        title?: string;
    } = {}
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const [headerImg, footerImg] = await Promise.all([
        loadImage(institution?.letterheadConfig?.headerImageUrl || companyDetails?.letterheadConfig?.headerImageUrl),
        loadImage(institution?.footerImageUrl || companyDetails?.footerImageUrl)
    ]);

    let yPos = setupPdfHeader(doc, headerImg);
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Document Title
    const titleText = options.title || "OFFICIAL CLASS LIST / STUDENT REGISTRY";
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(titleText, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Subtitle / Filters summary
    const filterParts: string[] = [];
    if (options.gradeFilter) filterParts.push(`Grade: ${options.gradeFilter}`);
    if (options.streamFilter) filterParts.push(`Stream: ${options.streamFilter}`);
    if (options.statusFilter && options.statusFilter !== 'All') filterParts.push(`Status: ${options.statusFilter}`);
    if (options.searchTerm) filterParts.push(`Search: "${options.searchTerm}"`);

    const filterStr = filterParts.length > 0 ? filterParts.join('  |  ') : 'All Students Registry';

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(filterStr.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Meta bar
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 10, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`TOTAL STUDENTS: ${students.length}`, margin + 5, yPos + 6.5);
    doc.text(`GENERATED ON: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin - 5, yPos + 6.5, { align: 'right' });
    yPos += 14;

    // Table Data preparation
    const tableBody = students.map((s, idx) => {
        const studentName = s.user?.name || s.name || s.studentName || '—';
        const admNo = s.admissionNumber || s.user?.admissionNumber || s.user?.metadata?.admissionNumber || '—';
        const grade = s.metadata?.gradeLevel || s.gradeLevel || s.user?.metadata?.gradeLevel || '—';
        const stream = s.metadata?.stream || s.stream || s.user?.metadata?.stream || '—';
        const gender = s.gender || s.user?.gender || '—';
        
        // Parent info
        const parentName = s.metadata?.parentName || s.metadata?.parents?.[0]?.name || s.parentName || '—';
        const parentPhone = s.metadata?.parentPhone || s.metadata?.parents?.[0]?.phone || s.parentPhone || '—';
        const parentContact = parentPhone && parentPhone !== '—' ? `${parentName} (${parentPhone})` : parentName;

        const status = s.status || 'Enrolled';

        return [
            (idx + 1).toString(),
            admNo,
            studentName,
            gender,
            grade,
            stream,
            parentContact,
            status,
            '' // Empty cell for Roll Call / Signature / Remarks
        ];
    });

    (doc as any).autoTable({
        startY: yPos,
        head: [['#', 'Adm No', 'Student Name', 'Gender', 'Grade/Class', 'Stream', 'Parent Contact', 'Status', 'Signature / Remarks']],
        body: tableBody,
        margin: { left: margin, right: margin, bottom: 25 },
        styles: {
            fontSize: 7.5,
            cellPadding: 3,
            font: 'helvetica'
        },
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 20, fontStyle: 'bold' },
            2: { cellWidth: 36, fontStyle: 'bold' },
            3: { cellWidth: 12, halign: 'center' },
            4: { cellWidth: 20 },
            5: { cellWidth: 18 },
            6: { cellWidth: 36 },
            7: { cellWidth: 14, halign: 'center' },
            8: { cellWidth: 18 }
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 12;
    if (finalY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        finalY = 20;
    }

    // Sign-off Block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('CLASS SUPERVISOR / REGISTRAR SIGN-OFF', margin, finalY);

    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margin, finalY + 14, margin + 60, finalY + 14);
    doc.line(pageWidth - margin - 60, finalY + 14, pageWidth - margin, finalY + 14);
    doc.setLineDashPattern([], 0);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Class Teacher Signature & Date', margin, finalY + 19);
    doc.text('Principal / Registrar Stamp & Date', pageWidth - margin, finalY + 19, { align: 'right' });

    setupPdfFooter(doc, footerImg, `${institution?.name || 'School'} · Official Student Class List`);

    return doc.output('datauristring');
};

export const generatePatientInvoicePdf = async (
    invoice: any,
    institution?: any
): Promise<string> => {
    const jsPdfModule = getJsPdf();
    if (!jsPdfModule) throw new Error("PDF generation library jsPDF is not available.");
    const { jsPDF } = jsPdfModule;
    const doc = new jsPDF('p', 'mm', 'a4');

    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    // Header Title
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text((institution?.name || 'QUANTUM HEALTHCARE & HIS').toUpperCase(), margin, 13);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(226, 232, 240);
    doc.text('OFFICIAL PATIENT MEDICAL INVOICE & CLAIM STATEMENT', margin, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(129, 140, 248);
    doc.text(invoice.invoiceNumber || 'INV-0000', pageWidth - margin, 18, { align: 'right' });

    currentY = 36;

    // Bill To & Invoice Info Card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 32, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 32, 3, 3, 'D');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('PATIENT / BILL TO:', margin + 6, currentY + 7);
    doc.text('PAYMENT DETAILS:', pageWidth / 2 + 10, currentY + 7);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text((invoice.patientName || 'Patient').toUpperCase(), margin + 6, currentY + 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Patient ID: ${invoice.patientId || 'N/A'}`, margin + 6, currentY + 20);
    doc.text(`Date Issued: ${invoice.date || new Date().toISOString().split('T')[0]}`, margin + 6, currentY + 25);

    const payer = invoice.payerType || 'Self-Pay';
    doc.text(`Payer Mode: ${payer}`, pageWidth / 2 + 10, currentY + 14);
    if (invoice.insuranceProvider) {
        doc.text(`Insurance: ${invoice.insuranceProvider}`, pageWidth / 2 + 10, currentY + 20);
        doc.text(`Policy/SHA #: ${invoice.policyNumber || 'N/A'}`, pageWidth / 2 + 10, currentY + 25);
    } else {
        doc.text(`Status: ${invoice.status || 'Pending'}`, pageWidth / 2 + 10, currentY + 20);
    }

    currentY += 40;

    // Line Items Table
    const tableData = (invoice.items || []).map((item: any, idx: number) => [
        idx + 1,
        item.itemName || 'Medical Service',
        item.category || 'General',
        item.quantity || 1,
        `KES ${(item.unitPrice || 0).toLocaleString()}`,
        `KES ${((item.quantity || 1) * (item.unitPrice || 0)).toLocaleString()}`
    ]);

    (doc as any).autoTable({
        startY: currentY,
        head: [['#', 'Service / Medication Description', 'Category', 'Qty', 'Unit Price', 'Total (KES)']],
        body: tableData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 70, fontStyle: 'bold' },
            2: { cellWidth: 30 },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Summary Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(pageWidth - margin - 85, currentY, 85, 34, 3, 3, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Subtotal Amount:', pageWidth - margin - 80, currentY + 7);
    doc.text(`KES ${(invoice.totalAmount || 0).toLocaleString()}`, pageWidth - margin - 5, currentY + 7, { align: 'right' });

    if (invoice.copayAmount > 0) {
        doc.text('Patient Co-Pay Share:', pageWidth - margin - 80, currentY + 13);
        doc.text(`KES ${(invoice.copayAmount).toLocaleString()}`, pageWidth - margin - 5, currentY + 13, { align: 'right' });
    }

    if (invoice.insuranceCoverAmount > 0) {
        doc.text('Insurance Cover Claim:', pageWidth - margin - 80, currentY + 19);
        doc.text(`KES ${(invoice.insuranceCoverAmount).toLocaleString()}`, pageWidth - margin - 5, currentY + 19, { align: 'right' });
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Amount Paid:', pageWidth - margin - 80, currentY + 26);
    doc.setTextColor(16, 185, 129);
    doc.text(`KES ${(invoice.amountPaid || 0).toLocaleString()}`, pageWidth - margin - 5, currentY + 26, { align: 'right' });

    doc.setTextColor(225, 29, 72);
    doc.text(`Balance Due: KES ${(invoice.balance || 0).toLocaleString()}`, pageWidth - margin - 80, currentY + 31);

    currentY += 45;

    // Signature Block
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Authorized Finance Stamp & Signature:', margin, currentY);

    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margin, currentY + 12, margin + 65, currentY + 12);
    doc.setLineDashPattern([], 0);

    doc.text('Thank you for choosing Quantum Healthcare.', pageWidth - margin, currentY + 12, { align: 'right' });

    return doc.output('datauristring');
};

/**
 * Generates an External Partner Laboratory Requisition & Specimen Transfer Slip (PDF Data URI)
 */
export const generateExternalLabRequisitionPdf = async (
    labRequest: {
        id: string;
        testType: string;
        priority?: string;
        clinicalNotes?: string;
        specimenType?: string;
        barcodeNumber?: string;
        collectionTime?: string;
        requestedBy?: string;
        partnerLabName?: string;
        partnerLabPhone?: string;
        partnerLabEmail?: string;
    },
    patient: {
        fullName: string;
        admissionNumber?: string;
        gender?: string;
        dob?: string;
        contact?: string;
        insuranceProvider?: string;
    },
    institution: any
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    // Header Branding
    doc.setFillColor(30, 41, 59); // Dark slate header
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(institution?.name || 'QUANTUM HEALTHCARE & DIAGNOSTICS', margin, 15);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('EXTERNAL DIAGNOSTIC LABORATORY REQUISITION & SPECIMEN TRANSFER SLIP', margin, 21);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(251, 191, 36); // Amber badge
    doc.text('PARTNER REFERRAL', pageWidth - margin, 18, { align: 'right' });

    currentY = 38;

    // Document Meta Row
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 22, 3, 3, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('REQUISITION NO:', margin + 6, currentY + 7);
    doc.text('DATE & TIME:', margin + 70, currentY + 7);
    doc.text('DIAGNOSTIC PRIORITY:', margin + 130, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(labRequest.id ? `REQ-${labRequest.id.substring(0, 10).toUpperCase()}` : 'REQ-LAB-REF', margin + 6, currentY + 14);
    doc.text(labRequest.collectionTime || new Date().toLocaleString(), margin + 70, currentY + 14);

    const isUrgent = (labRequest.priority || '').toLowerCase().includes('urgent') || (labRequest.priority || '').toLowerCase().includes('stat');
    if (isUrgent) {
        doc.setTextColor(225, 29, 72);
        doc.setFont('helvetica', 'bold');
        doc.text('🔴 STAT / URGENT', margin + 130, currentY + 14);
    } else {
        doc.setTextColor(16, 185, 129);
        doc.setFont('helvetica', 'bold');
        doc.text('🟢 ROUTINE DISPATCH', margin + 130, currentY + 14);
    }

    currentY += 30;

    // Two-Column Grid: Patient Info vs Partnered Lab Info
    const colWidth = (pageWidth - (margin * 2) - 10) / 2;

    // Box 1: Patient Information
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, colWidth, 42, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('PATIENT DEMOGRAPHICS', margin + 6, currentY + 8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Full Name: ${patient.fullName || 'N/A'}`, margin + 6, currentY + 16);
    doc.text(`Patient OP/IP File #: ${patient.admissionNumber || 'N/A'}`, margin + 6, currentY + 22);
    doc.text(`Gender / DOB: ${patient.gender || '—'} (${patient.dob || 'N/A'})`, margin + 6, currentY + 28);
    doc.text(`Phone / Contact: ${patient.contact || 'N/A'}`, margin + 6, currentY + 34);

    // Box 2: Target Partnered Diagnostic Facility
    doc.setFillColor(238, 242, 255); // Indigo tint
    doc.roundedRect(margin + colWidth + 10, currentY, colWidth, 42, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(67, 56, 202);
    doc.text('REFERRAL DIAGNOSTIC FACILITY', margin + colWidth + 16, currentY + 8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Partner Lab: ${labRequest.partnerLabName || 'Partnered Reference Lab'}`, margin + colWidth + 16, currentY + 16);
    doc.text(`Lab Phone: ${labRequest.partnerLabPhone || '+254 700 000 000'}`, margin + colWidth + 16, currentY + 22);
    doc.text(`Dispatch Email: ${labRequest.partnerLabEmail || 'dispatch@partnerlab.co.ke'}`, margin + colWidth + 16, currentY + 28);
    doc.text(`Payer Mode: ${patient.insuranceProvider || 'Self-Pay (Direct Referral)'}`, margin + colWidth + 16, currentY + 34);

    currentY += 50;

    // Specimen Collection & Barcode Details
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 22, 3, 3);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('SPECIMEN COLLECTION & HANDLING LOG', margin + 6, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Specimen Type: ${labRequest.specimenType || 'Whole Blood / Serum'}`, margin + 6, currentY + 15);
    doc.text(`Barcode / Specimen ID: ${labRequest.barcodeNumber || `SPEC-${Date.now().toString().slice(-6)}`}`, margin + 85, currentY + 15);
    doc.text(`Transport Temp: 2°C – 8°C (Cold Chain)`, margin + 145, currentY + 15);

    currentY += 30;

    // Requested Test Table
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('REQUESTED DIAGNOSTIC TESTS & CLINICAL INDICATIONS', margin, currentY);

    currentY += 4;

    const testTableData = [
        [
            '1',
            labRequest.testType || 'Full Diagnostics Panel',
            labRequest.priority || 'Routine',
            labRequest.clinicalNotes || 'Observation & Differential Diagnosis'
        ]
    ];

    (doc as any).autoTable({
        startY: currentY,
        head: [['#', 'Diagnostic Test Name / Panel', 'Priority', 'Clinical Indications & Notes']],
        body: testTableData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 65, fontStyle: 'bold' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 77 }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Signatures & Receipt Acknowledgment
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    // Left Signature: Requesting Physician
    doc.text('REQUESTING PHYSICIAN / CLINICIAN', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${labRequest.requestedBy || 'Dr. Attending Physician'}`, margin, currentY + 6);
    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margin, currentY + 20, margin + 70, currentY + 20);
    doc.setLineDashPattern([], 0);
    doc.text('Doctor Signature & Stamp', margin, currentY + 25);

    // Right Signature: Receiving Partner Lab Courier
    doc.text('RECEIVING PARTNER LAB ACKNOWLEDGMENT', margin + colWidth + 10, currentY);
    doc.text('Courier / Tech Name: _______________________', margin + colWidth + 10, currentY + 6);
    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margin + colWidth + 10, currentY + 20, margin + colWidth + 80, currentY + 20);
    doc.setLineDashPattern([], 0);
    doc.text('Partner Lab Received Stamp & Time', margin + colWidth + 10, currentY + 25);

    // Footer note
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Official Referral Requisition Form · Quantum Healthcare HIS Network', pageWidth - margin, currentY + 35, { align: 'right' });

    return doc.output('datauristring');
};

/**
 * Generates an Official External Doctor Prescription & Chemist Purchase Note (PDF Data URI)
 */
export const generateExternalPrescriptionPdf = async (
    prescription: {
        id?: string;
        date?: string;
        doctorName?: string;
        doctorLicense?: string;
        notes?: string;
        items: Array<{
            drugName: string;
            formulation?: string;
            dosage?: string;
            frequency?: string;
            duration?: string;
            quantity?: number | string;
            isExternalPurchase?: boolean;
            notes?: string;
        }>;
    },
    patient: {
        fullName: string;
        admissionNumber?: string;
        gender?: string;
        dob?: string;
        contact?: string;
        allergies?: string;
    },
    institution: any
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");
    const doc = new lib.jsPDF();

    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    // Header Branding
    doc.setFillColor(15, 23, 42); // Dark slate header
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(institution?.name || 'QUANTUM HEALTHCARE MEDICAL CENTRE', margin, 15);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL EXTERNAL PRESCRIPTION & CHEMIST PURCHASE ADVICE NOTE', margin, 21);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(234, 179, 8); // Amber badge
    doc.text('🛒 EXTERNAL CHEMIST PURSUIT', pageWidth - margin, 18, { align: 'right' });

    currentY = 38;

    // Document Meta Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 22, 3, 3, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('PRESCRIPTION REF:', margin + 6, currentY + 7);
    doc.text('ISSUE DATE:', margin + 70, currentY + 7);
    doc.text('BILLING STATUS:', margin + 130, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(prescription.id ? `RX-EXT-${prescription.id.substring(0, 8).toUpperCase()}` : `RX-EXT-${Date.now().toString().slice(-6)}`, margin + 6, currentY + 14);
    doc.text(prescription.date || new Date().toLocaleDateString(), margin + 70, currentY + 14);

    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ UNBILLED (SELF-PROCURE)', margin + 130, currentY + 14);

    currentY += 30;

    // Two-Column Grid: Patient vs Physician Details
    const colWidth = (pageWidth - (margin * 2) - 10) / 2;

    // Box 1: Patient Information
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, colWidth, 40, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('PATIENT PARTICULARS', margin + 6, currentY + 8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Patient Name: ${patient.fullName || 'N/A'}`, margin + 6, currentY + 16);
    doc.text(`OP/IP File Number: ${patient.admissionNumber || 'PAT-0001'}`, margin + 6, currentY + 22);
    doc.text(`Gender / DOB: ${patient.gender || '—'} (${patient.dob || 'N/A'})`, margin + 6, currentY + 28);

    if (patient.allergies) {
        doc.setTextColor(225, 29, 72);
        doc.setFont('helvetica', 'bold');
        doc.text(`⚠ Known Allergies: ${patient.allergies}`, margin + 6, currentY + 34);
    } else {
        doc.text(`Phone Contact: ${patient.contact || 'N/A'}`, margin + 6, currentY + 34);
    }

    // Box 2: Prescribing Practitioner Details
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(margin + colWidth + 10, currentY, colWidth, 40, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(67, 56, 202);
    doc.text('PRESCRIBING PHYSICIAN', margin + colWidth + 16, currentY + 8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Doctor Name: ${prescription.doctorName || 'Dr. Attending Physician'}`, margin + colWidth + 16, currentY + 16);
    doc.text(`Medical License: ${prescription.doctorLicense || 'MPDB-10042'}`, margin + colWidth + 16, currentY + 22);
    doc.text(`Facility: ${institution?.name || 'Quantum Medical Centre'}`, margin + colWidth + 16, currentY + 28);
    doc.text(`Fulfillment: External Chemist Self-Purchase`, margin + colWidth + 16, currentY + 34);

    currentY += 48;

    // Prescription Table
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('PRESCRIBED MEDICATIONS & DISPENSING INSTRUCTIONS', margin, currentY);

    currentY += 4;

    const tableRows = prescription.items.map((item, idx) => [
        idx + 1,
        `${item.drugName || 'Medication'} ${item.formulation ? `(${item.formulation})` : ''}`,
        item.dosage || '500mg',
        `${item.frequency || 'TID'} x ${item.duration || '7 days'}`,
        item.quantity || 1,
        item.isExternalPurchase ? '🛒 Buy Outside' : '🏥 Hospital Dispensed'
    ]);

    (doc as any).autoTable({
        startY: currentY,
        head: [['#', 'Medication Name & Formulation', 'Dosage Strategy', 'Frequency & Duration', 'Qty', 'Fulfillment']],
        body: tableRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 3.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 65, fontStyle: 'bold' },
            2: { cellWidth: 30 },
            3: { cellWidth: 35 },
            4: { cellWidth: 15, halign: 'center' },
            5: { cellWidth: 27, fontStyle: 'bold' }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // Clinical Notes & Special Instructions
    if (prescription.notes) {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 18, 3, 3, 'F');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('DOCTOR CLINICAL ADDENDUM & INSTRUCTIONS:', margin + 6, currentY + 6);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(30, 41, 59);
        doc.text(`"${prescription.notes}"`, margin + 6, currentY + 12);

        currentY += 24;
    }

    // Doctor Signature & License Stamp Block
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    doc.text('PRESCRIBING DOCTOR SIGNATURE & OFFICIAL STAMP', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dr. ${prescription.doctorName || 'Attending Physician'} (Reg No: ${prescription.doctorLicense || 'MPDB-10042'})`, margin, currentY + 6);
    
    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margin, currentY + 20, margin + 75, currentY + 20);
    doc.setLineDashPattern([], 0);
    doc.text('Official Doctor Stamp & Signature', margin, currentY + 25);

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Valid for presentation at any licensed retail chemist or external pharmacy. Unbilled by hospital.', pageWidth - margin, currentY + 25, { align: 'right' });

    return doc.output('datauristring');
};

/**
 * Generates an 80mm EPOS Thermal Spool PDF Data URI for External Doctor Prescriptions
 */
export const generateExternalPrescriptionEposThermalPdf = async (
    prescription: {
        id?: string;
        date?: string;
        doctorName?: string;
        doctorLicense?: string;
        notes?: string;
        items: Array<{
            drugName: string;
            formulation?: string;
            dosage?: string;
            frequency?: string;
            duration?: string;
            quantity?: number | string;
            isExternalPurchase?: boolean;
            notes?: string;
        }>;
    },
    patient: {
        fullName: string;
        admissionNumber?: string;
        gender?: string;
        dob?: string;
        contact?: string;
    },
    institution: any
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error("jsPDF library not available.");

    const itemsCount = (prescription.items || []).length || 1;
    const estimatedHeight = Math.max(160, 120 + (itemsCount * 22));

    const doc = new lib.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, estimatedHeight]
    });

    const margin = 4;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 6;

    const centerText = (text: string, y: number, fontSize = 8, isBold = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    const drawDashedDivider = (y: number) => {
        doc.setDrawColor(150, 150, 150);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(margin, y, pageWidth - margin, y);
        doc.setLineDashPattern([], 0);
    };

    // Header
    doc.setTextColor(0, 0, 0);
    centerText(institution?.name?.toUpperCase() || 'QUANTUM HEALTHCARE', yPos, 9, true);
    yPos += 5;
    centerText('EXTERNAL PRESCRIPTION SLIP', yPos, 8, true);
    yPos += 4;
    centerText('(UNBILLED - CHEMIST SELF-PROCURE)', yPos, 7, false);
    yPos += 5;

    drawDashedDivider(yPos);
    yPos += 4;

    // Prescription & Patient Metadata
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(`RX REF: ${prescription.id ? `RX-EXT-${prescription.id.substring(0, 8).toUpperCase()}` : `RX-EXT-${Date.now().toString().slice(-6)}`}`, margin, yPos);
    yPos += 4;
    doc.text(`DATE: ${prescription.date || new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 4;
    doc.text(`PATIENT: ${patient.fullName?.toUpperCase() || 'PATIENT'}`, margin, yPos);
    yPos += 4;
    doc.text(`PATIENT FILE #: ${patient.admissionNumber || 'PAT-0001'}`, margin, yPos);
    yPos += 4;
    doc.text(`DOCTOR: Dr. ${prescription.doctorName || 'Attending Physician'}`, margin, yPos);
    yPos += 4;
    doc.text(`LICENSE #: ${prescription.doctorLicense || 'MPDB-10042'}`, margin, yPos);
    yPos += 5;

    drawDashedDivider(yPos);
    yPos += 4;

    centerText('PRESCRIBED MEDICATIONS & DOSAGE', yPos, 7, true);
    yPos += 5;

    prescription.items.forEach((item, idx) => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${item.drugName.toUpperCase()}`, margin, yPos);
        yPos += 4;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`   Dosage: ${item.dosage || '500mg'} | ${item.frequency || '1x Daily'}`, margin, yPos);
        yPos += 4;
        doc.text(`   Duration: ${item.duration || '5 Days'} | Qty: ${item.quantity || 1}`, margin, yPos);
        yPos += 4;
        
        doc.setFont('helvetica', 'bold');
        doc.text(`   Status: [BUY OUTSIDE - KES 0 UNBILLED]`, margin, yPos);
        yPos += 5;
    });

    drawDashedDivider(yPos);
    yPos += 4;

    if (prescription.notes) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(`CLINICAL INSTRUCTIONS:`, margin, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'italic');
        doc.text(`"${prescription.notes}"`, margin, yPos);
        yPos += 6;
        drawDashedDivider(yPos);
        yPos += 4;
    }

    // Doctor Signature Line
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(`PHYSICIAN SIGNATURE & STAMP:`, margin, yPos);
    yPos += 12;

    doc.setDrawColor(0, 0, 0);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 4;

    centerText(`Dr. ${prescription.doctorName || 'Attending Physician'}`, yPos, 7, false);
    yPos += 4;
    centerText('Valid at any external retail pharmacy', yPos, 6, false);

    return doc.output('datauristring');
};

export const generateHisPeriodRevenuePdf = async (data: any): Promise<string> => {
    const jsPdfObj = getJsPdf();
    if (!jsPdfObj) throw new Error("jsPDF library not initialized");
    const { jsPDF } = jsPdfObj;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 36, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("QUANTUM HEALTHCARE MEDICAL CENTRE", 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`FINANCIAL REVENUE PERFORMANCE REPORT • PERIOD: ${data.periodLabel?.toUpperCase() || 'CUSTOM'}`, 14, 24);

    doc.setTextColor(15, 23, 42);
    let yPos = 46;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`REPORT GENERATED: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, yPos);
    yPos += 8;

    // Metrics Box
    doc.setFillColor(248, 250, 252);
    doc.rect(14, yPos, pageWidth - 28, 24, 'F');
    doc.setFontSize(9);
    doc.text(`Total Invoiced Revenue: KES ${Number(data.totalRevenue || 0).toLocaleString()}`, 18, yPos + 7);
    doc.text(`Total Collected (M-Pesa/Cash): KES ${Number(data.totalCollected || 0).toLocaleString()}`, 18, yPos + 14);
    doc.text(`Outstanding Insurance Claims: KES ${Number(data.totalPendingInsurance || 0).toLocaleString()}`, 18, yPos + 21);
    yPos += 30;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("DEPARTMENT REVENUE BREAKDOWN", 14, yPos);
    yPos += 6;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setFontSize(9);
    doc.text("Department / Service Category", 18, yPos + 5.5);
    doc.text("Amount (KES)", pageWidth - 18, yPos + 5.5, { align: 'right' });
    yPos += 12;

    doc.setFont('helvetica', 'normal');
    (data.categoryBreakdown || []).forEach((cat: any) => {
        doc.text(cat.category || 'Service', 18, yPos);
        doc.text(`KES ${Number(cat.amount || 0).toLocaleString()}`, pageWidth - 18, yPos, { align: 'right' });
        yPos += 7;
    });

    return doc.output('datauristring');
};

export const generateHisInsuranceStatementPdf = async (data: any): Promise<string> => {
    const jsPdfObj = getJsPdf();
    if (!jsPdfObj) throw new Error("jsPDF library not initialized");
    const { jsPDF } = jsPdfObj;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 36, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("QUANTUM HEALTHCARE MEDICAL CENTRE", 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`INSURANCE PROVIDER STATEMENT & OUTSTANDING BALANCES`, 14, 24);

    doc.setTextColor(15, 23, 42);
    let yPos = 46;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`STATEMENT FOR PROVIDER: ${data.providerName?.toUpperCase() || 'ALL INSURANCE PROVIDERS'}`, 14, yPos);
    yPos += 8;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setFontSize(9);
    doc.text("Insurance Provider", 18, yPos + 5.5);
    doc.text("Invoices", 95, yPos + 5.5);
    doc.text("Total Cover Billed", 130, yPos + 5.5);
    doc.text("Outstanding Balance", pageWidth - 18, yPos + 5.5, { align: 'right' });
    yPos += 12;

    doc.setFont('helvetica', 'normal');
    (data.providers || []).forEach((p: any) => {
        doc.text(p.name || 'Provider', 18, yPos);
        doc.text(String(p.count || 0), 95, yPos);
        doc.text(`KES ${Number(p.billed || 0).toLocaleString()}`, 130, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(`KES ${Number(p.outstanding || 0).toLocaleString()}`, pageWidth - 18, yPos, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        yPos += 7;
    });

    return doc.output('datauristring');
};

export const generateFbcLabReportPdf = async (
    data: {
        reportId?: string;
        date?: string;
        patientName: string;
        patientId?: string;
        gender?: string;
        dob?: string;
        doctorName?: string;
        barcodeNumber?: string;
        results?: any;
        pathologistNotes?: string;
    },
    institution?: any
): Promise<string> => {
    const jsPdfObj = getJsPdf();
    if (!jsPdfObj) throw new Error("jsPDF library not initialized");
    const { jsPDF } = jsPdfObj;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(institution?.name?.toUpperCase() || "QUANTUM HEALTHCARE MEDICAL CENTRE", 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text("DEPARTMENT OF HAEMATOLOGY & DIAGNOSTIC LABORATORY", 14, 24);
    doc.text(`FULL BLOOD COUNT (FBC) DIAGNOSTIC REPORT • REF: ${data.barcodeNumber || 'SPEC-849102'}`, 14, 32);

    doc.setTextColor(15, 23, 42);
    let yPos = 48;

    doc.setFillColor(248, 250, 252);
    doc.rect(14, yPos, pageWidth - 28, 24, 'F');
    doc.setLineWidth(0.3);
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, yPos, pageWidth - 28, 24, 'S');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`PATIENT NAME: ${data.patientName?.toUpperCase() || 'PATIENT'}`, 18, yPos + 7);
    doc.text(`DATE / TIME: ${data.date || new Date().toLocaleString()}`, 110, yPos + 7);

    doc.setFont('helvetica', 'normal');
    doc.text(`Gender / DOB: ${data.gender || 'Female'} (${data.dob || '1992-05-14'})`, 18, yPos + 14);
    doc.text(`Ordering Doctor: Dr. ${data.doctorName || 'Attending Physician'}`, 110, yPos + 14);
    doc.text(`Specimen: Whole Blood (EDTA Purple Top)`, 18, yPos + 20);
    doc.text(`Lab Barcode: ${data.barcodeNumber || 'SPEC-849102'}`, 110, yPos + 20);

    yPos += 30;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("Parameter", 18, yPos + 5.5);
    doc.text("Result", 80, yPos + 5.5);
    doc.text("SI Units", 115, yPos + 5.5);
    doc.text("Reference Range", 145, yPos + 5.5);
    doc.text("Flag", pageWidth - 18, yPos + 5.5, { align: 'right' });
    yPos += 12;

    const fbcRows = [
        { param: 'Haemoglobin (Hb)', val: '13.5', unit: 'g/dL', ref: '12.0 - 15.5', flag: 'NORMAL' },
        { param: 'Hematocrit (HCT / PCV)', val: '41.2', unit: '%', ref: '36.0 - 48.0', flag: 'NORMAL' },
        { param: 'Red Blood Cells (RBC)', val: '4.65', unit: 'x10¹²/L', ref: '4.10 - 5.10', flag: 'NORMAL' },
        { param: 'Mean Corpuscular Vol (MCV)', val: '88.4', unit: 'fL', ref: '80.0 - 100.0', flag: 'NORMAL' },
        { param: 'Mean Corpuscular Hb (MCH)', val: '29.1', unit: 'pg', ref: '27.0 - 33.0', flag: 'NORMAL' },
        { param: 'MCH Concentration (MCHC)', val: '33.2', unit: 'g/dL', ref: '32.0 - 36.0', flag: 'NORMAL' },
        { param: 'RBC Distribution Width (RDW)', val: '12.8', unit: '%', ref: '11.5 - 14.5', flag: 'NORMAL' },
        { param: 'White Blood Cell Count (WBC)', val: '7.40', unit: 'x10⁹/L', ref: '4.00 - 11.00', flag: 'NORMAL' },
        { param: 'Platelet Count (PLT)', val: '285', unit: 'x10⁹/L', ref: '150 - 450', flag: 'NORMAL' },
        { param: 'Mean Platelet Volume (MPV)', val: '9.2', unit: 'fL', ref: '7.5 - 11.5', flag: 'NORMAL' },
    ];

    doc.setTextColor(15, 23, 42);
    fbcRows.forEach((row, i) => {
        if (i % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, yPos - 4.5, pageWidth - 28, 6.5, 'F');
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(row.param, 18, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(row.val, 80, yPos);
        doc.text(row.unit, 115, yPos);
        doc.text(row.ref, 145, yPos);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text(row.flag, pageWidth - 18, yPos, { align: 'right' });
        doc.setTextColor(15, 23, 42);
        yPos += 6.5;
    });

    yPos += 4;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("5-PART WHITE CELL DIFFERENTIAL (WBC)", 14, yPos);
    yPos += 6;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, yPos, pageWidth - 28, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("Cell Differential Type", 18, yPos + 4.5);
    doc.text("Relative (%)", 90, yPos + 4.5);
    doc.text("Absolute Count (x10⁹/L)", 140, yPos + 4.5);
    yPos += 11;

    const diffRows = [
        { cell: 'Neutrophils (NEUT)', pct: '62.0 %', abs: '4.58 x10⁹/L' },
        { cell: 'Lymphocytes (LYMPH)', pct: '28.5 %', abs: '2.10 x10⁹/L' },
        { cell: 'Monocytes (MONO)', pct: '6.2 %', abs: '0.45 x10⁹/L' },
        { cell: 'Eosinophils (EOS)', pct: '2.5 %', abs: '0.18 x10⁹/L' },
        { cell: 'Basophils (BASO)', pct: '0.8 %', abs: '0.06 x10⁹/L' },
    ];

    doc.setFont('helvetica', 'normal');
    diffRows.forEach((d) => {
        doc.text(d.cell, 18, yPos);
        doc.text(d.pct, 90, yPos);
        doc.text(d.abs, 140, yPos);
        yPos += 6;
    });

    yPos += 4;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, yPos, pageWidth - 28, 16, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, yPos, pageWidth - 28, 16, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text("PERIPHERAL BLOOD FILM (PBF) & HAEMATOLOGIST IMPRESSION:", 18, yPos + 5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(15, 23, 42);
    doc.text(data.pathologistNotes || '"Red cells are normocytic normochromic. WBC count and differential within physiological limits. Platelets adequate with normal morphology. Zero atypical blasts."', 18, yPos + 11);
    yPos += 22;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("MEDICAL LABORATORY TECHNOLOGIST:", 14, yPos);
    doc.text("CONSULTANT HAEMATOPATHOLOGIST:", 110, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text("James Kimani, KMLTTB #8841", 14, yPos);
    doc.text("Dr. Beatrice Korir, MBChB, MMed Path", 110, yPos);

    return doc.output('datauristring');
};

export const generateSpecimenBarcodePdf = async (
    data: {
        barcodeNumber: string;
        patientName: string;
        patientId?: string;
        testType?: string;
        specimenType?: string;
        priority?: string;
        doctorName?: string;
        collectionTime?: string;
    },
    institution?: any
): Promise<string> => {
    const jsPdfObj = getJsPdf();
    if (!jsPdfObj) throw new Error("jsPDF library not initialized");
    const { jsPDF } = jsPdfObj;
    const doc = new jsPDF({ unit: 'mm', format: [50, 25] });

    doc.setLineWidth(0.3);
    doc.setDrawColor(15, 23, 42);
    doc.rect(1, 1, 48, 23, 'S');

    doc.setFillColor(15, 23, 42);
    doc.rect(1, 1, 48, 4.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text(institution?.name?.toUpperCase() || "QUANTUM MEDICAL LAB", 2.5, 4);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(`PATIENT: ${data.patientName?.toUpperCase() || 'PATIENT'}`, 2.5, 8);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`MRN: ${data.patientId || 'MRN-84920'} • ${data.priority?.toUpperCase() || 'ROUTINE'}`, 2.5, 11);

    doc.setFont('helvetica', 'bold');
    doc.text(`TUBE: ${data.specimenType?.toUpperCase() || 'EDTA PURPLE TOP'}`, 2.5, 14);
    doc.text(`TEST: ${data.testType?.toUpperCase() || 'FULL BLOOD COUNT'}`, 2.5, 17);

    doc.setFillColor(15, 23, 42);
    const barcodeX = 2.5;
    const barcodeY = 18.5;
    const codeStr = data.barcodeNumber || 'SPEC-849102';
    for (let i = 0; i < 35; i++) {
        const lineWidth = (i % 3 === 0 || i % 7 === 0) ? 0.6 : 0.25;
        doc.rect(barcodeX + (i * 0.9), barcodeY, lineWidth, 3.5, 'F');
    }

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text(codeStr, 2.5, 23);
    doc.text(data.collectionTime || new Date().toLocaleDateString(), 30, 23);

    return doc.output('datauristring');
};

export const generateMontessoriAssessmentReportPdfDataUri = async (
    data: MontessoriAssessmentRecord,
    institution?: Institution
): Promise<string> => {
    const jsPdfObj = getJsPdf();
    if (!jsPdfObj) throw new Error("jsPDF library not initialized");
    const { jsPDF } = jsPdfObj;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth(); // 210
    const pageHeight = doc.internal.pageSize.getHeight(); // 297
    const margin = 12;
    const contentWidth = pageWidth - (margin * 2); // 186

    const schoolName = (institution?.name || 'BUSY BUMBLES NURSERY SCHOOL').toUpperCase();
    
    // Resolve institutional branding (Letterhead banner, logo, footer image, official stamp)
    const letterConfig = institution?.letterheadConfig;
    const letterheadUrl = letterConfig?.headerImageUrl 
        || (institution as any)?.letterheadUrl 
        || (institution as any)?.letterhead_url 
        || null;
    const footerUrl = letterConfig?.footerImageUrl 
        || (institution as any)?.footerImageUrl 
        || (institution as any)?.footer_image_url 
        || null;
    const stampUrl = letterConfig?.stampImageUrl 
        || (institution as any)?.stampImageUrl 
        || (institution as any)?.stamp_image_url 
        || null;

    const [logoImg, headerImg, footerImg, stampImg] = await Promise.all([
        loadImage(institution?.logoUrl || (institution as any)?.logo_url || null),
        loadImage(letterheadUrl),
        loadImage(footerUrl),
        loadImage(stampUrl)
    ]);

    // Color definitions
    const primaryGreen: [number, number, number] = [20, 83, 45]; // Emerald/Forest green
    const darkNavy: [number, number, number] = [15, 23, 42]; // Slate 900
    const mintBg: [number, number, number] = [240, 253, 244]; // Emerald 50
    const cardBorder: [number, number, number] = [203, 213, 225]; // Slate 300
    const slateMuted: [number, number, number] = [100, 116, 139]; // Slate 500

    const ratingColors: Record<string, { bg: [number, number, number]; fg: [number, number, number]; text: string }> = {
        M: { bg: [209, 250, 229], fg: [6, 95, 70], text: 'M - Mastered' },
        P: { bg: [219, 234, 254], fg: [30, 64, 175], text: 'P - Practicing' },
        L: { bg: [254, 243, 199], fg: [146, 64, 14], text: 'L - Learning' },
        F: { bg: [238, 242, 255], fg: [67, 56, 202], text: 'F - First Noticed' },
        NI: { bg: [241, 245, 249], fg: [71, 85, 105], text: 'NI - Not Intro' },
    };

    const drawHeader = (isFirstPage: boolean, pageNum: number, totalPages: number = 4): number => {
        let nextY = 16;
        if (isFirstPage) {
            if (headerImg) {
                // Official Uploaded Graphical Letterhead Banner
                const imgWidth = contentWidth;
                const imgHeight = (headerImg.height * imgWidth) / headerImg.width;
                const maxHeight = 34;
                const finalHeight = Math.min(imgHeight, maxHeight);
                doc.addImage(headerImg, 'PNG', margin, 5, imgWidth, finalHeight);

                const bannerBottom = 5 + finalHeight + 2;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(...darkNavy);
                doc.text("BRITISH & MONTESSORI EARLY YEARS FOUNDATION STAGE (EYFS)", pageWidth / 2, bannerBottom + 3, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(...slateMuted);
                doc.text("SUMMARY ASSESSMENT REPORT & DEVELOPMENTAL MILESTONE CHECKLIST", pageWidth / 2, bannerBottom + 6.8, { align: 'center' });

                doc.setDrawColor(...cardBorder);
                doc.setLineWidth(0.4);
                doc.line(margin, bannerBottom + 9, pageWidth - margin, bannerBottom + 9);
                nextY = bannerBottom + 12;
            } else {
                // Formal Institutional Letterhead with Logo & Full Details
                doc.setFillColor(...primaryGreen);
                doc.rect(0, 0, pageWidth, 5, 'F');

                let textStartX = margin;
                if (logoImg) {
                    try {
                        doc.addImage(logoImg, 'PNG', margin, 8, 20, 20);
                        textStartX = margin + 24;
                    } catch (e) {
                        textStartX = margin;
                    }
                }

                doc.setTextColor(...primaryGreen);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(15);
                doc.text(schoolName, textStartX, 14);

                const contactDetails = [
                    institution?.address,
                    institution?.phoneNumber ? `Tel: ${institution.phoneNumber}` : null,
                    institution?.email ? `Email: ${institution.email}` : null
                ].filter(Boolean).join(' • ');

                if (contactDetails) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(...slateMuted);
                    doc.text(contactDetails, textStartX, 19);
                }

                const subHeaderY = contactDetails ? 24 : 20;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.setTextColor(...darkNavy);
                doc.text("BRITISH AND MONTESSORI CURRICULUM", textStartX, subHeaderY);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(...slateMuted);
                doc.text("SUMMARY ASSESSMENT REPORT CHECKLIST • EARLY YEARS FOUNDATION (EYFS)", textStartX, subHeaderY + 4.5);

                // Divider line
                const lineY = subHeaderY + 8;
                doc.setDrawColor(...cardBorder);
                doc.setLineWidth(0.4);
                doc.line(margin, lineY, pageWidth - margin, lineY);
                nextY = lineY + 3;
            }
        } else {
            // Running Compact Header for pages 2, 3, 4
            doc.setFillColor(...primaryGreen);
            doc.rect(0, 0, pageWidth, 3.5, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(...primaryGreen);
            doc.text(schoolName, margin, 9);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...slateMuted);
            doc.text("British & Montessori Curriculum Assessment • " + (data.studentName || 'Student Report'), pageWidth - margin, 9, { align: 'right' });

            doc.setDrawColor(...cardBorder);
            doc.setLineWidth(0.3);
            doc.line(margin, 12, pageWidth - margin, 12);
            nextY = 15;
        }

        // Institutional Page Footer
        let footerLineY = pageHeight - 11;
        if (footerImg) {
            const footerWidth = contentWidth;
            const footerMaxHeight = 11;
            const footerHeight = Math.min((footerImg.height * footerWidth) / footerImg.width, footerMaxHeight);
            const footerY = pageHeight - footerHeight - 7;
            try {
                doc.addImage(footerImg, 'PNG', margin, footerY, footerWidth, footerHeight);
                footerLineY = footerY - 2;
            } catch (e) {
                footerLineY = pageHeight - 11;
            }
        }

        doc.setDrawColor(...cardBorder);
        doc.setLineWidth(0.3);
        doc.line(margin, footerLineY, pageWidth - margin, footerLineY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(...slateMuted);
        const footerLabel = letterConfig?.footerText || `Official British & Montessori Early Years Progress Checklist • ${institution?.name || 'School'}`;
        doc.text(footerLabel, margin, pageHeight - 6.5);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });

        return nextY;
    };

    const drawStudentInfoAndLegend = (startY: number): number => {
        let y = startY;

        // Student Info Card
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(...cardBorder);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...primaryGreen);

        const col1 = margin + 4;
        const col2 = margin + 70;
        const col3 = margin + 130;

        // Row 1
        doc.text("PUPIL'S NAME:", col1, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkNavy);
        doc.text(data.studentName || '—', col1 + 24, y + 6);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryGreen);
        doc.text("CLASS / LEVEL:", col2, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkNavy);
        doc.text(data.className || 'Early Years', col2 + 25, y + 6);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryGreen);
        doc.text("REPORT DATE:", col3, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkNavy);
        doc.text(data.reportDate || new Date().toISOString().split('T')[0], col3 + 24, y + 6);

        // Row 2
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryGreen);
        doc.text("TERM / SESSION:", col1, y + 13);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkNavy);
        doc.text(data.term || 'Term 1', col1 + 26, y + 13);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryGreen);
        doc.text("ACADEMIC YEAR:", col2, y + 13);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkNavy);
        doc.text(data.academicYear || String(new Date().getFullYear()), col2 + 27, y + 13);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryGreen);
        doc.text("HOMEROOM TUTORS:", col1, y + 20);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkNavy);
        doc.text(data.homeroomTutors || 'Class Teachers', col1 + 32, y + 20);

        y += 28;

        // Rating Key Legend Box
        doc.setFillColor(...mintBg);
        doc.setDrawColor(167, 243, 208); // Emerald 200
        doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...primaryGreen);
        doc.text("RATING KEY:", margin + 4, y + 5);

        const keys = [
            { code: 'M', label: 'Mastered' },
            { code: 'P', label: 'Practicing' },
            { code: 'L', label: 'Learning' },
            { code: 'F', label: 'First Noticed' },
            { code: 'NI', label: 'Not Introduced' },
        ];

        let keyX = margin + 26;
        keys.forEach(k => {
            const rStyle = ratingColors[k.code];
            doc.setFillColor(...rStyle.bg);
            doc.roundedRect(keyX, y + 1.5, 6.5, 5, 1, 1, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(...rStyle.fg);
            doc.text(k.code, keyX + 1.6, y + 5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(...darkNavy);
            doc.text(`= ${k.label}`, keyX + 8, y + 5);

            keyX += 31;
        });

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...slateMuted);
        doc.text("M: Consistent & independent • P: Minimal support • L: Regular guidance • F: Initial observation • NI: Future term focus", margin + 4, y + 11.5);

        return y + 18;
    };

    const drawDomainTable = (
        domainTitle: string,
        domainNumber: number,
        milestones: Array<{ id: string; description: string; rating?: string }>,
        startY: number
    ): number => {
        let y = startY;

        // Domain Section Header
        doc.setFillColor(...primaryGreen);
        doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(`${domainNumber}. ${domainTitle.toUpperCase()}`, margin + 4, y + 5);

        // Table Header
        y += 7.5;
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentWidth, 5.5, 'F');
        doc.setDrawColor(...cardBorder);
        doc.setLineWidth(0.2);
        doc.rect(margin, y, contentWidth, 5.5, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...darkNavy);
        doc.text("DEVELOPMENTAL MILESTONE / COMPETENCY", margin + 4, y + 3.8);
        doc.text("PROGRESS / RATING", margin + contentWidth - 36, y + 3.8);

        y += 5.5;

        // Table Rows
        milestones.forEach((m, idx) => {
            const rowHeight = 7.5;
            const isEven = idx % 2 === 0;

            if (isEven) {
                doc.setFillColor(255, 255, 255);
            } else {
                doc.setFillColor(248, 250, 252);
            }
            doc.rect(margin, y, contentWidth, rowHeight, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.rect(margin, y, contentWidth, rowHeight, 'S');

            // Milestone text
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.2);
            doc.setTextColor(...darkNavy);
            const desc = `${idx + 1}. ${m.description}`;
            doc.text(desc, margin + 4, y + 5);

            // Rating Pill
            const rating = (m.rating || 'P').toUpperCase();
            const rInfo = ratingColors[rating] || ratingColors['P'];

            const pillWidth = 32;
            const pillHeight = 5;
            const pillX = margin + contentWidth - pillWidth - 3;
            const pillY = y + 1.2;

            doc.setFillColor(...rInfo.bg);
            doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 1.2, 1.2, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.8);
            doc.setTextColor(...rInfo.fg);
            doc.text(rInfo.text, pillX + (pillWidth / 2), pillY + 3.6, { align: 'center' });

            y += rowHeight;
        });

        return y + 5;
    };

    // ================= PAGE 1 =================
    let curY = drawHeader(true, 1, 4);
    curY = drawStudentInfoAndLegend(curY);

    // Domain 1: Cognitive Development
    const cogMilestones = data.domains?.cognitive?.milestones || [];
    curY = drawDomainTable("Cognitive Development", 1, cogMilestones, curY);

    // Domain 2: Emotional Development
    const emoMilestones = data.domains?.emotional?.milestones || [];
    drawDomainTable("Emotional Development", 2, emoMilestones, curY);

    // ================= PAGE 2 =================
    doc.addPage();
    curY = drawHeader(false, 2, 4);

    // Domain 3: Social Development
    const socMilestones = data.domains?.social?.milestones || [];
    curY = drawDomainTable("Social Development", 3, socMilestones, curY);

    // Domain 4: Physical Development
    const phyMilestones = data.domains?.physical?.milestones || [];
    drawDomainTable("Physical Development", 4, phyMilestones, curY);

    // ================= PAGE 3 =================
    doc.addPage();
    curY = drawHeader(false, 3, 4);

    // Domain 5: Language and Literacy Development
    const langMilestones = data.domains?.languageAndLiteracy?.milestones || [];
    curY = drawDomainTable("Language and Literacy Development", 5, langMilestones, curY);

    // Domain 6: Mathematics
    const mathMilestones = data.domains?.mathematics?.milestones || [];
    drawDomainTable("Mathematics", 6, mathMilestones, curY);

    // ================= PAGE 4 =================
    doc.addPage();
    curY = drawHeader(false, 4, 4);

    // Section Title: Activities for the Term
    doc.setFillColor(...primaryGreen);
    doc.roundedRect(margin, curY, contentWidth, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("CO-CURRICULAR ACTIVITIES & EXPERIENTIAL LEARNING", margin + 4, curY + 5);

    curY += 10;

    // Activities Grid (2 columns x 3 rows)
    const acts = [
        { label: 'Expressive Arts and Design', desc: data.activities?.expressiveArtsAndDesign || 'Creative expression through painting, finger crafts, tactile textures, modeling with playdough, and collage making.' },
        { label: 'Celebrations & Cultural Themes', desc: data.activities?.celebrations || 'Active participation in cultural awareness days, holiday concerts, costume days, and community milestone assemblies.' },
        { label: 'Languages (Kiswahili & French)', desc: data.activities?.languages || 'Introductory greetings, songs, rhyme recitation, counting, and simple conversational vocabulary in foreign tongues.' },
        { label: 'Sports & Movement (Ballet / P.E)', desc: data.activities?.sports || 'Gross motor agility, coordination obstacle courses, rhythm dance, ballet movement, and energetic ball games.' },
        { label: 'Sensory & Science Discoveries', desc: data.activities?.experiments || 'Hands-on scientific exploration: sink and float, botanical germination, bubble investigations, and sensory water play.' },
        { label: 'Swimming & Water Confidence', desc: data.activities?.swimming || 'Water safety awareness, assisted floating, bubble blowing, splashing games, and water confidence development.' },
    ];

    const colWidth = (contentWidth - 6) / 2;
    const cardHeight = 26;

    acts.forEach((act, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cardX = margin + (col * (colWidth + 6));
        const cardY = curY + (row * (cardHeight + 4));

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(...cardBorder);
        doc.setLineWidth(0.3);
        doc.roundedRect(cardX, cardY, colWidth, cardHeight, 1.5, 1.5, 'FD');

        doc.setFillColor(...mintBg);
        doc.rect(cardX, cardY, colWidth, 6, 'F');
        doc.setDrawColor(167, 243, 208);
        doc.line(cardX, cardY + 6, cardX + colWidth, cardY + 6);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...primaryGreen);
        doc.text(act.label, cardX + 3, cardY + 4.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(...darkNavy);
        const lines = doc.splitTextToSize(act.desc, colWidth - 6);
        doc.text(lines, cardX + 3, cardY + 10);
    });

    curY += (3 * (cardHeight + 4)) + 4;

    // Summary Narrative Box
    doc.setFillColor(...primaryGreen);
    doc.roundedRect(margin, curY, contentWidth, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("HOMEROOM TEACHER'S SUMMARY NARRATIVE & REMARKS", margin + 4, curY + 5);

    curY += 9;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.3);
    const narrativeHeight = 36;
    doc.roundedRect(margin, curY, contentWidth, narrativeHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...darkNavy);
    const narrativeLines = doc.splitTextToSize(
        data.summaryNarrative || 'Pupil continues to demonstrate cheerful enthusiasm and steady developmental milestone progress across all foundational areas.',
        contentWidth - 8
    );
    doc.text(narrativeLines, margin + 4, curY + 6);

    curY += narrativeHeight + 7;

    // Signatures & Endorsements
    const sigBoxWidth = (contentWidth - 6) / 2;
    const sigHeight = 24;

    // Teacher Sig Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...cardBorder);
    doc.roundedRect(margin, curY, sigBoxWidth, sigHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...primaryGreen);
    doc.text("HOMEROOM TEACHER'S SIGNATURE & DATE", margin + 3, curY + 5);

    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.3);
    doc.line(margin + 4, curY + 16, margin + sigBoxWidth - 4, curY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...slateMuted);
    doc.text(data.homeroomTutors || 'Class Lead Teacher', margin + 4, curY + 20);

    // Head of School / Principal Sig Box
    const headX = margin + sigBoxWidth + 6;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...cardBorder);
    doc.roundedRect(headX, curY, sigBoxWidth, sigHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...primaryGreen);
    doc.text("HEAD OF EARLY YEARS / PRINCIPAL & OFFICIAL STAMP", headX + 3, curY + 5);

    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.3);
    doc.line(headX + 4, curY + 16, headX + sigBoxWidth - 4, curY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...slateMuted);
    doc.text("Head of Early Years • Seal of Excellence", headX + 4, curY + 20);

    // Render Official Institution Stamp if available
    if (stampImg) {
        try {
            const stampW = 22;
            const stampH = (stampImg.height * stampW) / stampImg.width;
            doc.addImage(stampImg, 'PNG', headX + sigBoxWidth - stampW - 3, curY + 2, stampW, Math.min(stampH, 20));
        } catch (e) {}
    }

    curY += sigHeight + 6;

    // Footer Motto & Contact Info
    const schoolMotto = institution?.motto ? `"${institution.motto.toUpperCase()}"` : '"LEARN TO PLAY - PLAY TO LEARN"';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryGreen);
    doc.text(schoolMotto, pageWidth / 2, curY + 4, { align: 'center' });

    const contactStr = [
        institution?.address,
        institution?.phoneNumber ? `Tel: ${institution.phoneNumber}` : null,
        institution?.email ? `Email: ${institution.email}` : null,
        institution?.website ? `Web: ${institution.website}` : null
    ].filter(Boolean).join(' • ');

    if (contactStr) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...slateMuted);
        doc.text(contactStr, pageWidth / 2, curY + 8, { align: 'center' });
    }

    return doc.output('datauristring');
};

export const downloadMontessoriAssessmentReportPdf = async (
    data: MontessoriAssessmentRecord,
    institution?: Institution
): Promise<void> => {
    const dataUri = await generateMontessoriAssessmentReportPdfDataUri(data, institution);
    const link = document.createElement('a');
    link.href = dataUri;
    const sanitizedStudentName = (data.studentName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `Montessori_Assessment_${sanitizedStudentName}_${data.term || 'Term'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

