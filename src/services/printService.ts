import { Capacitor, registerPlugin } from '@capacitor/core';
import { jsPDF } from 'jspdf';

const Print = registerPlugin<any>('Print');

export type PrinterType = 'system' | 'bluetooth' | 'network';

export interface PrinterConfig {
    type: PrinterType;
    bluetoothAddress?: string;
    bluetoothName?: string;
    ipAddress?: string;
    port?: number;
    paperWidth?: 58 | 80;
}

const CONFIG_KEY = 'eduai_printer_config';

export function getPrinterConfig(): PrinterConfig {
    const data = localStorage.getItem(CONFIG_KEY);
    if (data) {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error("Failed to parse printer config:", e);
        }
    }
    return { type: 'system', paperWidth: 80 };
}

export function savePrinterConfig(config: PrinterConfig) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function getBluetoothPrinters(): Promise<{ name: string; address: string }[]> {
    if (!Capacitor.isNativePlatform()) {
        console.warn("getBluetoothPrinters is only available on native mobile platforms.");
        return [];
    }
    try {
        const result = await Print.getBluetoothPrinters();
        return result.devices || [];
    } catch (e) {
        console.error("Failed to get Bluetooth devices:", e);
        throw e;
    }
}

function arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return window.btoa(binary);
}

export function formatReceiptEscPos(
    saleData: any,
    institution: any,
    width: 58 | 80,
    isEducation: boolean
): Uint8Array {
    const cols = width === 58 ? 32 : 48;
    const bytes: number[] = [];

    const addBytes = (arr: number[]) => bytes.push(...arr);
    const addText = (text: string) => {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(text);
        for (let i = 0; i < encoded.length; i++) {
            bytes.push(encoded[i]);
        }
    };

    // ESC/POS Helpers
    const init = () => addBytes([0x1B, 0x40]);
    const alignLeft = () => addBytes([0x1B, 0x61, 0x00]);
    const alignCenter = () => addBytes([0x1B, 0x61, 0x01]);
    const alignRight = () => addBytes([0x1B, 0x61, 0x02]);
    const boldOn = () => addBytes([0x1B, 0x45, 0x01]);
    const boldOff = () => addBytes([0x1B, 0x45, 0x00]);
    const sizeLarge = () => addBytes([0x1D, 0x21, 0x11]);
    const sizeNormal = () => addBytes([0x1D, 0x21, 0x00]);
    const feed = (n = 1) => {
        for (let i = 0; i < n; i++) addBytes([0x0A]);
    };
    const cut = () => addBytes([0x1D, 0x56, 0x42, 0x00]);
    const line = () => {
        addText('-'.repeat(cols));
        feed();
    };

    // 1. Initialize
    init();

    // 2. Header
    alignCenter();
    boldOn();
    sizeLarge();
    addText(institution.name || "Learning Institution");
    feed(2);

    sizeNormal();
    boldOff();
    if (institution.phoneNumber) {
        addText(`Tel: ${institution.phoneNumber}`);
        feed();
    }
    if (institution.email) {
        addText(`Email: ${institution.email}`);
        feed();
    }
    line();

    // 3. Receipt Metadata
    alignLeft();
    boldOn();
    addText(isEducation ? "STOCK ISSUANCE NOTE" : "SALES RECEIPT");
    feed();
    boldOff();

    const dateStr = new Date(saleData.createdAt || new Date()).toLocaleString();
    addText(`Date: ${dateStr}`);
    feed();
    const idVal = saleData.id ? saleData.id.substring(0, 8).toUpperCase() : 'N/A';
    addText(`${isEducation ? 'Issue #' : 'Receipt #'}: ${idVal}`);
    feed();

    if (isEducation && saleData.metadata?.admissionNumber) {
        addText(`ADM No: ${saleData.metadata.admissionNumber}`);
        feed();
    }
    line();

    // 4. Items Table
    // Column widths
    const nameWidth = width === 58 ? 16 : 24;
    const qtyWidth = width === 58 ? 5 : 8;
    const priceWidth = width === 58 ? 11 : 16;

    // Header
    boldOn();
    const itemLabel = "ITEM".padEnd(nameWidth);
    const qtyLabel = "QTY".padEnd(qtyWidth);
    const priceLabel = (isEducation ? "UNIT" : "TOTAL").padStart(priceWidth);
    addText(itemLabel + qtyLabel + priceLabel);
    feed();
    boldOff();
    line();

    const items = saleData.items || [];
    items.forEach((item: any) => {
        let name = item.name || 'Item';
        if (name.length > nameWidth - 1) {
            name = name.substring(0, nameWidth - 1);
        }
        const qty = String(item.quantity || 1);
        const price = isEducation
            ? (item.unit || 'pcs')
            : `KES ${(item.unitPrice * item.quantity).toLocaleString()}`;

        const colName = name.padEnd(nameWidth);
        const colQty = qty.padEnd(qtyWidth);
        const colPrice = price.padStart(priceWidth);

        addText(colName + colQty + colPrice);
        feed();
    });
    line();

    // 5. Totals (sales only)
    if (!isEducation) {
        alignRight();
        boldOn();
        const totalAmount = saleData.totalAmount || saleData.total || 0;
        addText(`TOTAL: KES ${totalAmount.toLocaleString()}`);
        feed();
        boldOff();

        if (saleData.paymentMethod) {
            addText(`Method: ${saleData.paymentMethod.toUpperCase()}`);
            feed();
        }
        line();
    } else {
        // For education stock handoff, note digital signature
        if (saleData.signature) {
            alignCenter();
            addText("[Digitally Signed]");
            feed();
            line();
        }
    }

    // 6. Footer
    alignCenter();
    addText("Powered by EduAi");
    feed();
    addText("Thank you for your business!");
    feed(4); // Extra spacing
    cut();

    return new Uint8Array(bytes);
}

export const printService = {
    async printPdf(base64Pdf: string, docName: string = "Receipt"): Promise<void> {
        if (Capacitor.isNativePlatform()) {
            try {
                await Print.printPdf({ base64: base64Pdf, name: docName });
            } catch (e) {
                console.error("Native PDF print failed, attempting fallback:", e);
                throw e;
            }
        } else {
            // Web fallback: open print dialog
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>${docName}</title>
                        <style>
                            body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
                            iframe { border: none; width: 100%; height: 100%; }
                        </style>
                    </head>
                    <body>
                        <iframe id="pdfFrame" src="${base64Pdf}"></iframe>
                        <script>
                            const iframe = document.getElementById('pdfFrame');
                            iframe.onload = () => {
                                setTimeout(() => {
                                    try {
                                        iframe.contentWindow.focus();
                                        iframe.contentWindow.print();
                                    } catch (e) {
                                        console.error("Iframe print failed, falling back to window print:", e);
                                        window.print();
                                    }
                                }, 500);
                            };
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            } else {
                throw new Error("Failed to open print window. Please allow popups.");
            }
        }
    },

    async printReceipt(params: {
        pdfBase64: string;
        saleData: any;
        institution: any;
        isEducation: boolean;
    }): Promise<void> {
        const config = getPrinterConfig();

        if (config.type === 'system' || !Capacitor.isNativePlatform()) {
            // Default to PDF/System Print
            await this.printPdf(params.pdfBase64, params.isEducation ? "Issuance Note" : "POS Receipt");
            return;
        }

        // Format to ESC/POS binary data
        const escPosBytes = formatReceiptEscPos(
            params.saleData,
            params.institution,
            config.paperWidth || 80,
            params.isEducation
        );
        const base64Bytes = arrayBufferToBase64(escPosBytes);

        if (config.type === 'bluetooth') {
            if (!config.bluetoothAddress) {
                throw new Error("No Bluetooth printer configured. Please select one in POS settings.");
            }
            await Print.printRawBluetooth({
                address: config.bluetoothAddress,
                base64Bytes: base64Bytes
            });
        } else if (config.type === 'network') {
            if (!config.ipAddress) {
                throw new Error("No network printer IP address configured. Please set one in POS settings.");
            }
            await Print.printRawNetwork({
                ipAddress: config.ipAddress,
                port: config.port || 9100,
                base64Bytes: base64Bytes
            });
        }
    },

    async printVisitorPass(params: {
        visitorData: any;
        institution: any;
    }): Promise<void> {
        const config = getPrinterConfig();

        if (config.type === 'system') {
            if (Capacitor.isNativePlatform()) {
                try {
                    const base64Pdf = generateVisitorPassPdfBase64(params.visitorData, params.institution);
                    await this.printPdf(base64Pdf, "Visitor Pass");
                } catch (err) {
                    console.error("Failed to generate/print native visitor pass PDF:", err);
                    throw err;
                }
            } else {
                // Web/System Print Fallback (HTML pass card)
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(`
                        <html>
                        <head>
                            <title>Gate Pass</title>
                            <style>
                                body { font-family: monospace; padding: 20px; max-width: 280px; margin: auto; line-height: 1.4; color: #000; }
                                .center { text-align: center; }
                                .bold { font-weight: bold; }
                                .divider { border-top: 1px dashed black; margin: 12px 0; }
                                .title { font-size: 16px; margin: 5px 0; letter-spacing: 1px; }
                            </style>
                        </head>
                        <body>
                            <div class="center bold title">${params.institution.name || 'Learning Institution'}</div>
                            <div class="center bold" style="font-size: 12px;">SECURITY VISIT PASS</div>
                            <div class="divider"></div>
                            <div><span class="bold">VISITOR:</span> ${params.visitorData.name || params.visitorData.fullName}</div>
                            <div><span class="bold">PHONE:</span> ${params.visitorData.phoneNumber || params.visitorData.phone || 'N/A'}</div>
                            ${params.visitorData.idNumber ? `<div><span class="bold">ID NO:</span> ${params.visitorData.idNumber}</div>` : ''}
                            ${params.visitorData.vehiclePlate ? `<div><span class="bold">VEHICLE:</span> ${params.visitorData.vehiclePlate}</div>` : ''}
                            <div><span class="bold">VISITING:</span> ${params.visitorData.hostName || 'General Administration'}</div>
                            <div><span class="bold">PURPOSE:</span> ${params.visitorData.purpose || 'Official'}</div>
                            <div><span class="bold">TIME IN:</span> ${params.visitorData.timeIn ? new Date(params.visitorData.timeIn).toLocaleString() : new Date().toLocaleString()}</div>
                            <div class="divider"></div>
                            <div class="center" style="font-size: 9px; font-weight: bold;">PLEASE RETAIN THIS CARD</div>
                            <div class="center" style="font-size: 9px; font-weight: bold;">SURRENDER AT EXIT GATE</div>
                            <script>
                                window.onload = () => {
                                    setTimeout(() => {
                                        try {
                                            window.focus();
                                            window.print();
                                            window.close();
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }, 500);
                                };
                            </script>
                        </body>
                        </html>
                    `);
                    printWindow.document.close();
                }
            }
            return;
        }

        // Format to ESC/POS binary data
        const escPosBytes = formatVisitorPassEscPos(
            params.visitorData,
            params.institution,
            config.paperWidth || 80
        );
        const base64Bytes = arrayBufferToBase64(escPosBytes);

        if (config.type === 'bluetooth') {
            if (!config.bluetoothAddress) {
                throw new Error("No Bluetooth printer configured.");
            }
            await Print.printRawBluetooth({
                address: config.bluetoothAddress,
                base64Bytes: base64Bytes
            });
        } else if (config.type === 'network') {
            if (!config.ipAddress) {
                throw new Error("No network printer IP address configured.");
            }
            await Print.printRawNetwork({
                ipAddress: config.ipAddress,
                port: config.port || 9100,
                base64Bytes: base64Bytes
            });
        }
    },

    async printEventPass(params: {
        pin: any;
        parent: any;
        event: any;
        institution: any;
    }): Promise<void> {
        const config = getPrinterConfig();

        if (config.type === 'system') {
            if (Capacitor.isNativePlatform()) {
                try {
                    const base64Pdf = generateEventPassPdfBase64(params.pin, params.parent, params.event, params.institution);
                    await this.printPdf(base64Pdf, "Event Pass");
                } catch (err) {
                    console.error("Failed to generate/print native event pass PDF:", err);
                    throw err;
                }
            } else {
                const timestamp = new Date().toLocaleString();
                const guests = (() => {
                    try {
                        const parsed = JSON.parse(params.pin.guests || '[]');
                        return Array.isArray(parsed) ? parsed.filter((g: any) => typeof g === 'string' && g.trim()) : [];
                    } catch (e) {
                        return params.pin.guests && typeof params.pin.guests === 'string' && params.pin.guests.trim() ? [params.pin.guests.trim()] : [];
                    }
                })();

                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(`
                        <html>
                        <head>
                            <title>Event Pass</title>
                            <style>
                                body { font-family: monospace; padding: 20px; max-width: 280px; margin: auto; line-height: 1.4; color: #000; }
                                .center { text-align: center; }
                                .bold { font-weight: bold; }
                                .divider { border-top: 1px dashed black; margin: 12px 0; }
                                .title { font-size: 16px; margin: 5px 0; letter-spacing: 1px; }
                            </style>
                        </head>
                        <body>
                            <div class="center bold title">${params.institution.name || 'Learning Institution'}</div>
                            <div class="center bold" style="font-size: 12px;">EVENT CHECK-IN PASS</div>
                            <div class="divider"></div>
                            <div><span class="bold">EVENT:</span> ${params.event?.title || 'School Event'}</div>
                            <div><span class="bold">HOLDER:</span> ${params.parent?.name || 'Invited Guest'}</div>
                            <div><span class="bold">PHONE:</span> ${params.parent?.phoneNumber || params.parent?.phone_number || 'N/A'}</div>
                            ${params.pin.vehicleRegistration || params.pin.vehicle_registration ? `<div><span class="bold">VEHICLE:</span> ${params.pin.vehicleRegistration || params.pin.vehicle_registration}</div>` : ''}
                            <div><span class="bold">TIME:</span> ${timestamp}</div>
                            <div><span class="bold">PIN CODE:</span> ${params.pin.pin}</div>
                            <div class="divider"></div>
                            <div class="bold">Accompanying Guests (${guests.length}):</div>
                            ${guests.length > 0 
                                ? guests.map((g: string, idx: number) => `<div>${idx + 1}. ${g}</div>`).join('')
                                : '<div>No accompanying guests</div>'
                            }
                            <div class="divider"></div>
                            <div class="center" style="font-size: 9px; font-weight: bold;">ENTRY APPROVED</div>
                            <div class="center" style="font-size: 9px; font-weight: bold;">POWERED BY EDUAI</div>
                            <script>
                                window.onload = () => {
                                    setTimeout(() => {
                                        try {
                                            window.focus();
                                            window.print();
                                            window.close();
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }, 500);
                                };
                            </script>
                        </body>
                        </html>
                    `);
                    printWindow.document.close();
                }
            }
            return;
        }

        // Format to ESC/POS binary data
        const escPosBytes = formatEventPassEscPos(
            params.pin,
            params.parent,
            params.event,
            params.institution,
            config.paperWidth || 80
        );
        const base64Bytes = arrayBufferToBase64(escPosBytes);

        if (config.type === 'bluetooth') {
            if (!config.bluetoothAddress) {
                throw new Error("No Bluetooth printer configured.");
            }
            await Print.printRawBluetooth({
                address: config.bluetoothAddress,
                base64Bytes: base64Bytes
            });
        } else if (config.type === 'network') {
            if (!config.ipAddress) {
                throw new Error("No network printer IP address configured.");
            }
            await Print.printRawNetwork({
                ipAddress: config.ipAddress,
                port: config.port || 9100,
                base64Bytes: base64Bytes
            });
        }
    }
};

export function formatVisitorPassEscPos(
    visitorData: any,
    institution: any,
    width: 58 | 80
): Uint8Array {
    const cols = width === 58 ? 32 : 48;
    const bytes: number[] = [];

    const addBytes = (arr: number[]) => bytes.push(...arr);
    const addText = (text: string) => {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(text);
        for (let i = 0; i < encoded.length; i++) {
            bytes.push(encoded[i]);
        }
    };

    // ESC/POS Helpers
    const init = () => addBytes([0x1B, 0x40]);
    const alignLeft = () => addBytes([0x1B, 0x61, 0x00]);
    const alignCenter = () => addBytes([0x1B, 0x61, 0x01]);
    const boldOn = () => addBytes([0x1B, 0x45, 0x01]);
    const boldOff = () => addBytes([0x1B, 0x45, 0x00]);
    const sizeLarge = () => addBytes([0x1D, 0x21, 0x11]);
    const sizeNormal = () => addBytes([0x1D, 0x21, 0x00]);
    const feed = (n = 1) => {
        for (let i = 0; i < n; i++) addBytes([0x0A]);
    };
    const cut = () => addBytes([0x1D, 0x56, 0x42, 0x00]);
    const line = () => {
        addText('-'.repeat(cols));
        feed();
    };

    // 1. Initialize
    init();

    // 2. Header
    alignCenter();
    boldOn();
    sizeLarge();
    addText(institution.name || "Learning Institution");
    feed(2);

    sizeNormal();
    boldOff();
    addText("SECURITY VISIT PASS");
    feed();
    line();

    // 3. Visitor Info
    alignLeft();
    boldOn();
    addText(`VISITOR: ${visitorData.name || visitorData.fullName}`);
    feed();
    boldOff();

    addText(`Phone: ${visitorData.phoneNumber || visitorData.phone}`);
    feed();

    if (visitorData.idNumber) {
        addText(`ID Number: ${visitorData.idNumber}`);
        feed();
    }

    if (visitorData.vehiclePlate) {
        addText(`Vehicle: ${visitorData.vehiclePlate}`);
        feed();
    }

    addText(`Visiting: ${visitorData.hostName || 'General Office'}`);
    feed();

    addText(`Purpose: ${visitorData.purpose || 'Official'}`);
    feed();

    const timeInStr = visitorData.timeIn ? new Date(visitorData.timeIn).toLocaleString() : new Date().toLocaleString();
    addText(`Time In: ${timeInStr}`);
    feed();
    line();

    // 4. Footer
    alignCenter();
    boldOn();
    addText("PLEASE KEEP THIS PASS SECURE");
    feed();
    addText("SURRENDER AT EXIT GATE");
    feed(4);
    cut();

    return new Uint8Array(bytes);
}

export function formatEventPassEscPos(
    pin: any,
    parent: any,
    event: any,
    institution: any,
    width: 58 | 80
): Uint8Array {
    const cols = width === 58 ? 32 : 48;
    const bytes: number[] = [];

    const addBytes = (arr: number[]) => bytes.push(...arr);
    const addText = (text: string) => {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(text);
        for (let i = 0; i < encoded.length; i++) {
            bytes.push(encoded[i]);
        }
    };

    // ESC/POS Helpers
    const init = () => addBytes([0x1B, 0x40]);
    const alignLeft = () => addBytes([0x1B, 0x61, 0x00]);
    const alignCenter = () => addBytes([0x1B, 0x61, 0x01]);
    const boldOn = () => addBytes([0x1B, 0x45, 0x01]);
    const boldOff = () => addBytes([0x1B, 0x45, 0x00]);
    const sizeLarge = () => addBytes([0x1D, 0x21, 0x11]);
    const sizeNormal = () => addBytes([0x1D, 0x21, 0x00]);
    const feed = (n = 1) => {
        for (let i = 0; i < n; i++) addBytes([0x0A]);
    };
    const cut = () => addBytes([0x1D, 0x56, 0x42, 0x00]);
    const line = () => {
        addText('-'.repeat(cols));
        feed();
    };

    // 1. Initialize
    init();

    // 2. Header
    alignCenter();
    boldOn();
    sizeLarge();
    addText(institution.name || "Learning Institution");
    feed(2);

    sizeNormal();
    boldOff();
    addText("EVENT CHECK-IN PASS");
    feed();
    line();

    // 3. Pass Info
    alignLeft();
    boldOn();
    addText(`EVENT: ${event?.title || 'School Event'}`);
    feed();
    boldOff();

    addText(`Holder: ${parent?.name || 'Invited Guest'}`);
    feed();

    addText(`Phone: ${parent?.phoneNumber || parent?.phone_number || 'N/A'}`);
    feed();

    const vehicle = pin?.vehicleRegistration || pin?.vehicle_registration;
    if (vehicle) {
        addText(`Vehicle: ${vehicle}`);
        feed();
    }

    const timestamp = new Date().toLocaleString();
    addText(`Time: ${timestamp}`);
    feed();

    boldOn();
    addText(`PIN CODE: ${pin?.pin || 'N/A'}`);
    feed();
    boldOff();
    line();

    // Guests
    const guests = (() => {
        try {
            const parsed = JSON.parse(pin?.guests || '[]');
            return Array.isArray(parsed) ? parsed.filter((g: any) => typeof g === 'string' && g.trim()) : [];
        } catch (e) {
            return pin?.guests && typeof pin.guests === 'string' && pin.guests.trim() ? [pin.guests.trim()] : [];
        }
    })();

    addText(`Accompanying Guests (${guests.length}):`);
    feed();
    guests.forEach((g: string, idx: number) => {
        addText(`${idx + 1}. ${g}`);
        feed();
    });
    line();

    // 4. Footer
    alignCenter();
    boldOn();
    addText("ENTRY APPROVED");
    feed();
    boldOff();
    addText("Please retain this pass card");
    feed(4);
    cut();

    return new Uint8Array(bytes);
}

function generateVisitorPassPdfBase64(visitorData: any, institution: any): string {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 140]
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 10;
    const margin = 5;

    const centerText = (text: string, y: number) => {
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    centerText(institution.name || 'Learning Institution', yPos);
    yPos += 6;

    doc.setFontSize(10);
    centerText("SECURITY VISIT PASS", yPos);
    yPos += 5;

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Visitor: ${visitorData.name || visitorData.fullName}`, margin, yPos); yPos += 5;
    doc.text(`Phone: ${visitorData.phoneNumber || visitorData.phone || 'N/A'}`, margin, yPos); yPos += 5;
    if (visitorData.idNumber) {
        doc.text(`ID No: ${visitorData.idNumber}`, margin, yPos); yPos += 5;
    }
    if (visitorData.vehiclePlate) {
        doc.text(`Vehicle: ${visitorData.vehiclePlate}`, margin, yPos); yPos += 5;
    }
    doc.text(`Visiting: ${visitorData.hostName || 'General Office'}`, margin, yPos); yPos += 5;
    doc.text(`Purpose: ${visitorData.purpose || 'Official'}`, margin, yPos); yPos += 5;
    
    const timeIn = visitorData.timeIn ? new Date(visitorData.timeIn).toLocaleString() : new Date().toLocaleString();
    doc.text(`Time In: ${timeIn}`, margin, yPos); yPos += 6;

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 6;

    doc.setFont('helvetica', 'bold');
    centerText("PLEASE KEEP THIS PASS SECURE", yPos);
    yPos += 4;
    centerText("SURRENDER AT EXIT GATE", yPos);

    return doc.output('datauristring');
}

function generateEventPassPdfBase64(pin: any, parent: any, event: any, institution: any): string {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 150]
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 10;
    const margin = 5;

    const centerText = (text: string, y: number) => {
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    centerText(institution.name || 'Learning Institution', yPos);
    yPos += 6;

    doc.setFontSize(10);
    centerText("EVENT CHECK-IN PASS", yPos);
    yPos += 5;

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    doc.text(`Event: ${event?.title || 'School Event'}`, margin, yPos); yPos += 5;
    doc.text(`Holder: ${parent?.name || 'Invited Guest'}`, margin, yPos); yPos += 5;
    doc.text(`Phone: ${parent?.phoneNumber || parent?.phone_number || 'N/A'}`, margin, yPos); yPos += 5;
    const vehicle = pin?.vehicleRegistration || pin?.vehicle_registration;
    if (vehicle) {
        doc.text(`Vehicle: ${vehicle}`, margin, yPos); yPos += 5;
    }
    const timestamp = new Date().toLocaleString();
    doc.text(`Time: ${timestamp}`, margin, yPos); yPos += 5;
    doc.text(`PIN Code: ${pin?.pin || 'N/A'}`, margin, yPos); yPos += 6;

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 6;

    const guests = (() => {
        try {
            const parsed = JSON.parse(pin?.guests || '[]');
            return Array.isArray(parsed) ? parsed.filter((g: any) => typeof g === 'string' && g.trim()) : [];
        } catch (e) {
            return pin?.guests && typeof pin.guests === 'string' && pin.guests.trim() ? [pin.guests.trim()] : [];
        }
    })();

    doc.setFont('helvetica', 'bold');
    doc.text(`Guests (${guests.length}):`, margin, yPos); yPos += 5;
    doc.setFont('helvetica', 'normal');
    guests.forEach((g: string, idx: number) => {
        doc.text(`${idx + 1}. ${g}`, margin, yPos);
        yPos += 4;
    });
    yPos += 2;

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
    yPos += 6;

    doc.setFont('helvetica', 'bold');
    centerText("ENTRY APPROVED", yPos);
    
    return doc.output('datauristring');
}

