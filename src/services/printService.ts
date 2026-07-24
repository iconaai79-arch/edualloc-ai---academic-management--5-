import { Capacitor, registerPlugin } from '@capacitor/core';
import { jsPDF } from 'jspdf';

const Print = registerPlugin<any>('EduaiPrint');

function formatPrintDate(dateStr?: string): string {
    if (!dateStr) return new Date().toLocaleString();
    
    // Attempt standard parsing
    let parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleString();
    }
    
    // Check if it's a simple time string like "07:19 AM" or "14:25"
    // By prepending today's date
    try {
        const today = new Date().toDateString(); // e.g. "Tue Jul 14 2026"
        parsed = new Date(`${today} ${dateStr}`);
        if (!isNaN(parsed.getTime())) {
            return parsed.toLocaleString();
        }
    } catch (e) {
        console.error("Failed to parse time-only string:", e);
    }
    
    // If it is already a formatted date string, return it as-is instead of "Invalid Date"
    return dateStr;
}

const loadImage = (url: string | null | undefined): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        if (!url.startsWith('data:')) {
            img.crossOrigin = "Anonymous";
        }
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = (e) => {
            console.warn("PDF Service: Failed to load asset image. Proceeding without it.", url, e);
            resolve(null);
        };
    });
};

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

async function callNativePlugin(methodName: string, args: any = {}): Promise<any> {
    try {
        if (!Print || typeof Print[methodName] !== 'function') {
            throw new Error(`Method ${methodName} not found on Print plugin`);
        }

        // Race the plugin call against a timeout to prevent the
        // "message channel closed before a response was received" unhandled promise
        // rejection that occurs when the Capacitor bridge doesn't get a native response.
        const PLUGIN_TIMEOUT_MS = 30000;
        const pluginCall = Print[methodName](args);
        const timeoutGuard = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Print plugin '${methodName}' timed out after ${PLUGIN_TIMEOUT_MS / 1000}s`)), PLUGIN_TIMEOUT_MS)
        );

        return await Promise.race([pluginCall, timeoutGuard]);
    } catch (e: any) {
        const errorMsg = e?.message || String(e);

        // Capacitor bridge closes the message channel when the native side doesn't
        // respond — catch this gracefully instead of letting it become an unhandled rejection.
        if (errorMsg.toLowerCase().includes('message channel closed') ||
            errorMsg.toLowerCase().includes('message channel was closed')) {
            throw new Error(
                'The printer plugin did not respond in time. ' +
                'Please ensure the EduAI app is installed as a native APK (not run in a browser) ' +
                'and that the printer plugin is included in the build.'
            );
        }

        if (errorMsg.toLowerCase().includes('not implemented')) {
            throw new Error(
                "The printing plugin is not active on this APK build. \n\n" +
                "To fix this, please:\n" +
                "1. Completely uninstall the app from your Android device.\n" +
                "2. Perform a 'Clean Project' and 'Rebuild Project' in Android Studio to package the new MainActivity.\n" +
                "3. Build and install the new APK on your device."
            );
        }
        throw e;
    }
}

export async function getBluetoothPrinters(): Promise<{ name: string; address: string }[]> {
    if (!Capacitor.isNativePlatform()) {
        console.warn("getBluetoothPrinters is only available on native mobile platforms.");
        return [];
    }
    try {
        const result = await callNativePlugin('getBluetoothPrinters');
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
                await callNativePlugin('printPdf', { base64: base64Pdf, name: docName });
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
            await callNativePlugin('printRawBluetooth', {
                address: config.bluetoothAddress,
                base64Bytes: base64Bytes
            });
        } else if (config.type === 'network') {
            if (!config.ipAddress) {
                throw new Error("No network printer IP address configured. Please set one in POS settings.");
            }
            await callNativePlugin('printRawNetwork', {
                ipAddress: config.ipAddress,
                port: config.port || 9100,
                base64Bytes: base64Bytes
            });
        }
    },

    async printVisitorPass(params: {
        visitorData: any;
        institution: any;
        host?: any;
        hostSignature?: string;
        visitorSignature?: string;
        securityOfficerName?: string;
    }): Promise<void> {
        const config = getPrinterConfig();

        if (config.type === 'system' || !Capacitor.isNativePlatform()) {
            const resolvedVisitorSig = params.visitorSignature || params.visitorData?.visitorSignature || params.visitorData?.visitor_signature || null;
            const resolvedHostSig = params.hostSignature || params.visitorData?.hostSignature || params.visitorData?.host_signature || null;
            const resolvedOfficerName = params.securityOfficerName || params.visitorData?.securityOfficerName || params.visitorData?.security_officer_name || params.visitorData?.verifiedBy || params.visitorData?.verified_by || 'Security Officer';
            const resolvedHostName = params.visitorData?.hostName || params.host?.name || 'N/A';
            const timestamp = params.visitorData?.timeIn ? formatPrintDate(params.visitorData.timeIn) : new Date().toLocaleString();

            if (Capacitor.isNativePlatform()) {
                try {
                    const base64Pdf = await generateVisitorPassPdfBase64(
                        params.visitorData, 
                        params.institution,
                        params.host,
                        resolvedHostSig,
                        resolvedVisitorSig,
                        resolvedOfficerName
                    );
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
                                @media print {
                                    @page {
                                        size: 80mm auto !important;
                                        margin: 0 !important;
                                    }
                                    html, body {
                                        height: auto !important;
                                        overflow: visible !important;
                                        margin: 0 !important;
                                        padding: 0 !important;
                                        background: #fff !important;
                                    }
                                    body > * {
                                        visibility: visible !important;
                                    }
                                }
                                body {
                                    font-family: 'Courier New', Courier, monospace;
                                    padding: 5mm 0;
                                    max-width: 72mm;
                                    margin: 0 auto;
                                    line-height: 1.3;
                                    color: #000;
                                    font-size: 11px;
                                }
                                .text-center { text-align: center; }
                                .bold { font-weight: bold; }
                                .title { font-size: 14px; margin: 4px 0; text-transform: uppercase; }
                                .subtitle { font-size: 11px; margin-bottom: 8px; text-transform: uppercase; }
                                .separator { border-top: 1px dashed #000; margin: 8px 0; }
                                .info-table { width: 100%; margin-bottom: 8px; font-size: 11px; }
                                .info-table td { padding: 2px 0; vertical-align: top; }
                                .info-label { width: 40%; font-weight: bold; }
                                .footer { margin-top: 15px; font-size: 9px; }
                            </style>
                        </head>
                        <body>
                            <div class="text-center">
                                ${(params.institution.logoUrl || params.institution.logo_url || params.institution.logo) ? `
                                    <img src="${params.institution.logoUrl || params.institution.logo_url || params.institution.logo}" style="max-height: 45px; max-width: 130px; object-fit: contain; margin: 0 auto 6px auto; display: block;" alt="Logo" /><br/>
                                ` : ''}
                                <div class="bold title">${params.institution.name || 'Academic Institution'}</div>
                                <div class="subtitle">Gate Entry Pass</div>
                                <div class="separator"></div>
                                <div class="bold" style="font-size: 12px; margin: 5px 0;">WALK-IN VISITOR PASS</div>
                                <div class="separator"></div>
                            </div>

                            <table class="info-table">
                                <tr><td class="info-label">VISITOR:</td><td>${params.visitorData.name || params.visitorData.fullName || 'Unknown Visitor'}</td></tr>
                                <tr><td class="info-label">PHONE:</td><td>${params.visitorData.phoneNumber || params.visitorData.phone || 'N/A'}</td></tr>
                                ${params.visitorData.idNumber ? `<tr><td class="info-label">ID/REF:</td><td>${params.visitorData.idNumber}</td></tr>` : ''}
                                <tr><td class="info-label">PURPOSE:</td><td>${params.visitorData.purpose || 'N/A'}</td></tr>
                                <tr><td class="info-label">HOST:</td><td>${resolvedHostName}</td></tr>
                                ${params.visitorData.vehiclePlate ? `<tr><td class="info-label">VEHICLE:</td><td class="bold">${params.visitorData.vehiclePlate}${params.visitorData.vehicleModel ? ` (${params.visitorData.vehicleModel})` : ''}</td></tr>` : ''}
                                <tr><td class="info-label">TIME:</td><td>${timestamp}</td></tr>
                            </table>

                            <div class="separator"></div>

                            <table style="width:100%; border-collapse:collapse; font-size:11px;">
                                <tr>
                                    <td style="width:50%; vertical-align:top; padding:0 2px;">
                                        <div style="font-size:9px; font-weight:bold; text-transform:uppercase; margin-bottom:3px;">Visitor Signature:</div>
                                        ${resolvedVisitorSig
                                            ? `<img src="${resolvedVisitorSig}" style="width:100%; max-height:45px; object-fit:contain; border-bottom:1px solid #000; display:block;" alt="Visitor Signature" />`
                                            : `<div style="border-bottom:1px solid #000; height:30px; width:100%;"></div>`
                                        }
                                        <div style="font-size:8px; margin-top:2px;">${params.visitorData.name || params.visitorData.fullName || ''}</div>
                                    </td>
                                    <td style="width:50%; vertical-align:top; padding:0 2px;">
                                        <div style="font-size:9px; font-weight:bold; text-transform:uppercase; margin-bottom:3px;">Host Signature:</div>
                                        ${resolvedHostSig
                                            ? `<img src="${resolvedHostSig}" style="width:100%; max-height:45px; object-fit:contain; border-bottom:1px solid #000; display:block;" alt="Host Signature" />`
                                            : `<div style="border-bottom:1px solid #000; height:30px; width:100%;"></div>`
                                        }
                                        <div style="font-size:8px; margin-top:2px;">${resolvedHostName}</div>
                                    </td>
                                </tr>
                            </table>

                            <div class="separator"></div>

                            <div class="text-center footer">
                                ${resolvedOfficerName ? `
                                    <div class="bold" style="font-size: 10px; margin-bottom: 4px; text-transform: uppercase;">SECURITY OFFICER: ${resolvedOfficerName}</div>
                                ` : ''}
                                <div class="bold">VISITOR APPROVED ENTRY</div>
                                <div style="margin-top: 4px;">Please keep this pass visible.</div>
                                <div style="font-size: 8px; margin-top: 4px; color: #555;">Eduai OS Support: 0723348912</div>
                                <div style="font-size: 8px; margin-top: 6px; color: #555;">Powered by Edualloc-AI</div>
                            </div>
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
            config.paperWidth || 80,
            params.host,
            params.hostSignature,
            params.visitorSignature,
            params.securityOfficerName
        );
        const base64Bytes = arrayBufferToBase64(escPosBytes);

        if (config.type === 'bluetooth') {
            if (!config.bluetoothAddress) {
                throw new Error("No Bluetooth printer configured.");
            }
            await callNativePlugin('printRawBluetooth', {
                address: config.bluetoothAddress,
                base64Bytes: base64Bytes
            });
        } else if (config.type === 'network') {
            if (!config.ipAddress) {
                throw new Error("No network printer IP address configured.");
            }
            await callNativePlugin('printRawNetwork', {
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
        securityOfficerName?: string;
    }): Promise<void> {
        const config = getPrinterConfig();
        const resolvedOfficerName = params.securityOfficerName || params.pin?.securityOfficerName || params.pin?.security_officer_name || params.pin?.verifiedBy || params.pin?.verified_by || 'Security Officer';

        if (config.type === 'system' || !Capacitor.isNativePlatform()) {
            if (Capacitor.isNativePlatform()) {
                try {
                    const base64Pdf = await generateEventPassPdfBase64(params.pin, params.parent, params.event, params.institution, resolvedOfficerName);
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
                                @media print {
                                    @page {
                                        size: 80mm auto !important;
                                        margin: 0 !important;
                                    }
                                    html, body {
                                        height: auto !important;
                                        overflow: visible !important;
                                        margin: 0 !important;
                                        padding: 0 !important;
                                        background: #fff !important;
                                    }
                                    body > * {
                                        visibility: visible !important;
                                    }
                                }
                                body {
                                    font-family: 'Courier New', Courier, monospace;
                                    padding: 5mm 0;
                                    max-width: 72mm;
                                    margin: 0 auto;
                                    line-height: 1.3;
                                    color: #000;
                                    font-size: 11px;
                                }
                                .text-center { text-align: center; }
                                .bold { font-weight: bold; }
                                .title { font-size: 14px; margin: 4px 0; text-transform: uppercase; }
                                .subtitle { font-size: 11px; margin-bottom: 8px; text-transform: uppercase; }
                                .separator { border-top: 1px dashed #000; margin: 8px 0; }
                                .info-table { width: 100%; margin-bottom: 8px; font-size: 11px; }
                                .info-table td { padding: 2px 0; vertical-align: top; }
                                .info-label { width: 40%; font-weight: bold; }
                                .footer { margin-top: 15px; font-size: 9px; }
                                .guests-title { margin-top: 8px; text-transform: uppercase; }
                                .guest-item { padding: 2px 0; }
                            </style>
                        </head>
                        <body>
                            <div class="text-center">
                                ${(params.institution.logoUrl || params.institution.logo_url || params.institution.logo) ? `
                                    <img src="${params.institution.logoUrl || params.institution.logo_url || params.institution.logo}" style="max-height: 40px; max-width: 120px; object-fit: contain; margin-bottom: 6px;" alt="Logo" /><br/>
                                ` : ''}
                                <div class="bold title">${params.institution.name || 'Academic Institution'}</div>
                                <div class="subtitle">Gate Entry Pass</div>
                                <div class="separator"></div>
                                <div class="bold" style="font-size: 12px; margin: 5px 0;">EVENT CHECK-IN PASS</div>
                                <div class="separator"></div>
                            </div>

                            <table class="info-table">
                                <tr>
                                    <td class="info-label">EVENT:</td>
                                    <td>${params.event?.title || 'School Event'}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">HOLDER:</td>
                                    <td>${params.parent?.name || 'Invited Guest'}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">PHONE:</td>
                                    <td>${params.parent?.phoneNumber || params.parent?.phone_number || 'N/A'}</td>
                                </tr>
                                ${params.pin.vehicleRegistration || params.pin.vehicle_registration ? `
                                <tr>
                                    <td class="info-label">VEHICLE:</td>
                                    <td class="bold">${params.pin.vehicleRegistration || params.pin.vehicle_registration}</td>
                                </tr>
                                ` : ''}
                                <tr>
                                    <td class="info-label">TIME:</td>
                                    <td>${timestamp}</td>
                                </tr>
                                <tr>
                                    <td class="info-label">PIN CODE:</td>
                                    <td class="bold">${params.pin.pin}</td>
                                </tr>
                            </table>

                            <div class="separator"></div>

                            <div class="bold guests-title">Accompanying Guests (${guests.length}):</div>
                            ${guests.length > 0 
                                ? guests.map((g: string, idx: number) => `<div class="guest-item">${idx + 1}. ${g}</div>`).join('')
                                : '<div class="guest-item">No accompanying guests</div>'
                            }

                            <div class="separator"></div>

                            <div class="text-center footer">
                                ${resolvedOfficerName ? `
                                    <div class="bold" style="font-size: 10px; margin-bottom: 4px; text-transform: uppercase;">SECURITY OFFICER: ${resolvedOfficerName}</div>
                                ` : ''}
                                <div class="bold">ENTRY APPROVED</div>
                                <div style="margin-top: 4px;">Thank you for attending.</div>
                                <div style="font-size: 8px; margin-top: 4px; color: #555;">Eduai OS Support: 0723348912</div>
                                <div style="font-size: 8px; margin-top: 4px; color: #555;">Powered by Edualloc-AI</div>
                            </div>
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
            config.paperWidth || 80,
            resolvedOfficerName
        );
        const base64Bytes = arrayBufferToBase64(escPosBytes);

        if (config.type === 'bluetooth') {
            if (!config.bluetoothAddress) {
                throw new Error("No Bluetooth printer configured.");
            }
            await callNativePlugin('printRawBluetooth', {
                address: config.bluetoothAddress,
                base64Bytes: base64Bytes
            });
        } else if (config.type === 'network') {
            if (!config.ipAddress) {
                throw new Error("No network printer IP address configured.");
            }
            await callNativePlugin('printRawNetwork', {
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
    width: 58 | 80,
    host?: any,
    hostSignature?: string,
    visitorSignature?: string,
    securityOfficerName?: string
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

    const formatRow = (label: string, value: string) => {
        const labelWidth = width === 58 ? 9 : 10;
        const valWidth = cols - labelWidth;
        const paddedLabel = label.padEnd(labelWidth);
        
        if (value.length <= valWidth) {
            addText(paddedLabel + value);
            feed();
        } else {
            addText(paddedLabel + value.substring(0, valWidth));
            feed();
            let remaining = value.substring(valWidth);
            while (remaining.length > 0) {
                addText(" ".repeat(labelWidth) + remaining.substring(0, valWidth));
                feed();
                remaining = remaining.substring(valWidth);
            }
        }
    };

    // 1. Initialize
    init();

    // 2. Header
    alignCenter();
    boldOn();
    sizeLarge();
    addText(institution.name || "Academic Institution");
    feed(2);

    sizeNormal();
    boldOff();
    addText("Gate Entry Pass");
    feed();
    line();
    boldOn();
    addText("WALK-IN VISITOR PASS");
    feed();
    boldOff();
    line();

    // 3. Visitor Info Table Layout
    alignLeft();
    formatRow("VISITOR:", visitorData.name || visitorData.fullName || 'Unknown Visitor');
    formatRow("PHONE:", visitorData.phoneNumber || visitorData.phone || 'N/A');
    
    if (visitorData.idNumber) {
        formatRow("ID/REF:", visitorData.idNumber);
    }
    
    formatRow("PURPOSE:", visitorData.purpose || 'N/A');
    
    const resolvedHostName = visitorData.hostName || host?.name || 'N/A';
    formatRow("HOST:", resolvedHostName);

    const resolvedOfficerName = securityOfficerName || visitorData?.securityOfficerName || visitorData?.security_officer_name || visitorData?.verifiedBy || visitorData?.verified_by || 'Security Officer';

    if (visitorData.vehiclePlate) {
        const vPlate = visitorData.vehiclePlate + (visitorData.vehicleModel ? ` (${visitorData.vehicleModel})` : '');
        formatRow("VEHICLE:", vPlate);
    }

    const timeInStr = formatPrintDate(visitorData.timeIn);
    formatRow("TIME:", timeInStr);
    line();

    // 4. Signatures side-by-side
    boldOn();
    if (width === 58) {
        addText("Visitor Sign:".padEnd(16) + "Host Sign:".padEnd(16));
        feed(3);
        addText("______________  ______________");
        feed();
        const vNameTrunc = (visitorData.name || visitorData.fullName || '').substring(0, 14).padEnd(16);
        const hNameTrunc = (resolvedHostName || '').substring(0, 14).padEnd(16);
        addText(vNameTrunc + hNameTrunc);
        feed();
    } else {
        addText("Visitor Sign:".padEnd(24) + "Host Sign:".padEnd(24));
        feed(3);
        addText("____________________    ____________________");
        feed();
        const vNameTrunc = (visitorData.name || visitorData.fullName || '').substring(0, 20).padEnd(24);
        const hNameTrunc = (resolvedHostName || '').substring(0, 20).padEnd(24);
        addText(vNameTrunc + hNameTrunc);
        feed();
    }
    boldOff();
    line();

    // 5. Footer
    alignCenter();
    if (resolvedOfficerName) {
        boldOn();
        addText(`SECURITY OFFICER: ${resolvedOfficerName.toUpperCase()}`);
        feed();
        boldOff();
    }
    boldOn();
    addText("VISITOR APPROVED ENTRY");
    feed();
    boldOff();
    addText("Please keep this pass visible.");
    feed();
    addText("Eduai OS Support: 0723348912");
    feed();
    addText("Powered by Edualloc-AI");
    feed(4);
    cut();

    return new Uint8Array(bytes);
}

export function formatEventPassEscPos(
    pin: any,
    parent: any,
    event: any,
    institution: any,
    width: 58 | 80,
    securityOfficerName?: string
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

    const formatRow = (label: string, value: string) => {
        const labelWidth = width === 58 ? 9 : 10;
        const valWidth = cols - labelWidth;
        const paddedLabel = label.padEnd(labelWidth);
        
        if (value.length <= valWidth) {
            addText(paddedLabel + value);
            feed();
        } else {
            addText(paddedLabel + value.substring(0, valWidth));
            feed();
            let remaining = value.substring(valWidth);
            while (remaining.length > 0) {
                addText(" ".repeat(labelWidth) + remaining.substring(0, valWidth));
                feed();
                remaining = remaining.substring(valWidth);
            }
        }
    };

    // 1. Initialize
    init();

    // 2. Header
    alignCenter();
    boldOn();
    sizeLarge();
    addText(institution.name || "Academic Institution");
    feed(2);

    sizeNormal();
    boldOff();
    addText("Gate Entry Pass");
    feed();
    line();
    boldOn();
    addText("EVENT CHECK-IN PASS");
    feed();
    boldOff();
    line();

    // 3. Pass Info
    alignLeft();
    formatRow("EVENT:", event?.title || 'School Event');
    formatRow("HOLDER:", parent?.name || 'Invited Guest');
    formatRow("PHONE:", parent?.phoneNumber || parent?.phone_number || 'N/A');
    
    const vehicle = pin?.vehicleRegistration || pin?.vehicle_registration;
    if (vehicle) {
        formatRow("VEHICLE:", vehicle);
    }
    
    const timestamp = new Date().toLocaleString();
    formatRow("TIME:", timestamp);
    formatRow("PIN CODE:", pin?.pin || 'N/A');
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

    boldOn();
    addText(`Accompanying Guests (${guests.length}):`);
    feed();
    boldOff();
    
    if (guests.length > 0) {
        guests.forEach((g: string, idx: number) => {
            addText(`${idx + 1}. ${g}`);
            feed();
        });
    } else {
        addText("No accompanying guests");
        feed();
    }
    line();

    // 4. Footer
    alignCenter();
    if (securityOfficerName) {
        boldOn();
        addText(`SECURITY OFFICER: ${securityOfficerName.toUpperCase()}`);
        feed();
        boldOff();
    }
    boldOn();
    addText("ENTRY APPROVED");
    feed();
    boldOff();
    addText("Thank you for attending.");
    feed();
    addText("Eduai OS Support: 0723348912");
    feed();
    addText("Powered by Edualloc-AI");
    feed(4);
    cut();

    return new Uint8Array(bytes);
}

async function generateVisitorPassPdfBase64(
    visitorData: any,
    institution: any,
    host?: any,
    hostSignature?: string,
    visitorSignature?: string,
    securityOfficerName?: string
): Promise<string> {
    const logoUrl = institution?.logoUrl || institution?.logo_url || institution?.logo || null;
    const [logoImg, visitorSigImg, hostSigImg] = await Promise.all([
        loadImage(logoUrl),
        loadImage(visitorSignature),
        loadImage(hostSignature)
    ]);

    const resolvedOfficerName = securityOfficerName || visitorData?.securityOfficerName || visitorData?.security_officer_name || visitorData?.verifiedBy || visitorData?.verified_by || 'Security Officer';
    const hasId = !!visitorData.idNumber;
    const hasVehicle = !!visitorData.vehiclePlate;
    const hasOfficer = !!resolvedOfficerName;
    const pdfHeight = 110 + (logoImg ? 15 : 0) + (hasId ? 5 : 0) + (hasVehicle ? 5 : 0) + (hasOfficer ? 5 : 0);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, pdfHeight]
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 10;
    const margin = 8;

    const centerText = (text: string, y: number, isBold: boolean = false) => {
        doc.setFont('courier', isBold ? 'bold' : 'normal');
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    const drawKeyValue = (label: string, value: string, y: number) => {
        doc.setFont('courier', 'bold');
        doc.text(label, margin, y);
        doc.setFont('courier', 'normal');
        doc.text(value, margin + 22, y);
    };

    // 1. Draw Logo
    if (logoImg) {
        const logoWidth = 15;
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        doc.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, yPos, logoWidth, logoHeight);
        yPos += logoHeight + 4;
    }

    // 2. Header
    doc.setFontSize(11);
    centerText(institution.name || 'Learning Institution', yPos, true);
    yPos += 5;

    doc.setFontSize(9);
    centerText("GATE ENTRY PASS", yPos, false);
    yPos += 4;

    // Divider
    centerText("-".repeat(36), yPos);
    yPos += 5;

    // Subheading
    doc.setFontSize(9.5);
    centerText("WALK-IN VISITOR PASS", yPos, true);
    yPos += 4;

    // Divider
    centerText("-".repeat(36), yPos);
    yPos += 5;

    // Body Fields
    doc.setFontSize(8.5);
    drawKeyValue("VISITOR:  ", visitorData.name || visitorData.fullName || 'Unknown Visitor', yPos); yPos += 5;
    drawKeyValue("PHONE:    ", visitorData.phoneNumber || visitorData.phone || 'N/A', yPos); yPos += 5;
    
    if (hasId) {
        drawKeyValue("ID/REF:   ", visitorData.idNumber, yPos); yPos += 5;
    }
    drawKeyValue("PURPOSE:  ", visitorData.purpose || 'Official', yPos); yPos += 5;
    const resolvedHostName = visitorData.hostName || (host && host.name) || 'N/A';
    drawKeyValue("HOST:     ", resolvedHostName, yPos); yPos += 5;
    
    if (hasVehicle) {
        drawKeyValue("VEHICLE:  ", visitorData.vehiclePlate + (visitorData.vehicleModel ? ` (${visitorData.vehicleModel})` : ''), yPos); yPos += 5;
    }
    
    const timestamp = new Date().toLocaleString();
    drawKeyValue("TIME:     ", timestamp, yPos); yPos += 6;

    // Divider
    centerText("-".repeat(36), yPos);
    yPos += 5;

    // Signatures Section
    doc.setFontSize(8);
    doc.setFont('courier', 'bold');
    doc.text("VISITOR SIGNATURE:", margin, yPos);
    doc.text("HOST SIGNATURE:", margin + 34, yPos);
    yPos += 2;

    const sigHeight = 10;
    if (visitorSigImg) {
        doc.addImage(visitorSigImg, 'PNG', margin, yPos, 30, sigHeight);
    }
    if (hostSigImg) {
        doc.addImage(hostSigImg, 'PNG', margin + 34, yPos, 30, sigHeight);
    }
    yPos += sigHeight + 1;

    doc.setFont('courier', 'normal');
    doc.text("_".repeat(15), margin, yPos - 1);
    doc.text("_".repeat(15), margin + 34, yPos - 1);
    yPos += 4;

    doc.setFontSize(7.5);
    doc.text(visitorData.name || visitorData.fullName || '', margin, yPos);
    doc.text(resolvedHostName, margin + 34, yPos);
    yPos += 5;

    // Divider
    doc.setFontSize(9);
    centerText("-".repeat(36), yPos);
    yPos += 5;

    // Footer
    doc.setFontSize(8.5);
    if (resolvedOfficerName) {
        centerText(`SECURITY OFFICER: ${resolvedOfficerName.toUpperCase()}`, yPos, true);
        yPos += 4;
    }
    centerText("VISITOR APPROVED ENTRY", yPos, true);
    yPos += 4;
    centerText("Please keep this pass visible.", yPos, false);
    yPos += 4;
    doc.setFontSize(7.5);
    centerText("Eduai OS Support: 0723348912", yPos, false);
    yPos += 4;
    centerText("Powered by Edualloc-AI", yPos, false);

    return doc.output('datauristring');
}

async function generateEventPassPdfBase64(pin: any, parent: any, event: any, institution: any, securityOfficerName?: string): Promise<string> {
    const logoUrl = institution?.logoUrl || institution?.logo_url || institution?.logo || null;
    const logoImg = await loadImage(logoUrl);
    const resolvedOfficerName = securityOfficerName || pin?.securityOfficerName || pin?.security_officer_name || pin?.verifiedBy || pin?.verified_by || 'Security Officer';

    const guests = (() => {
        try {
            const parsed = JSON.parse(pin?.guests || '[]');
            return Array.isArray(parsed) ? parsed.filter((g: any) => typeof g === 'string' && g.trim()) : [];
        } catch (e) {
            return pin?.guests && typeof pin.guests === 'string' && pin.guests.trim() ? [pin.guests.trim()] : [];
        }
    })();

    const vehicle = pin?.vehicleRegistration || pin?.vehicle_registration;
    const pdfHeight = 85 + (guests.length * 4.5) + (vehicle ? 5 : 0) + (logoImg ? 15 : 0);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, pdfHeight]
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 10;
    const margin = 8;

    const centerText = (text: string, y: number, isBold: boolean = false) => {
        doc.setFont('courier', isBold ? 'bold' : 'normal');
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    const drawKeyValue = (label: string, value: string, y: number) => {
        doc.setFont('courier', 'bold');
        doc.text(label, margin, y);
        const labelWidth = doc.getTextWidth(label);
        doc.setFont('courier', 'normal');
        doc.text(value, margin + labelWidth, y);
    };

    // 1. Draw Centered Logo
    if (logoImg) {
        const logoWidth = 15;
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        doc.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, yPos, logoWidth, logoHeight);
        yPos += logoHeight + 4;
    }

    // 2. Header
    doc.setFontSize(11);
    centerText(institution.name || 'Learning Institution', yPos, true);
    yPos += 5;

    doc.setFontSize(9);
    centerText("EVENT CHECK-IN PASS", yPos, true);
    yPos += 4;

    // Divider
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    centerText("-".repeat(32), yPos);
    yPos += 5;

    // Body Fields
    doc.setFontSize(8.5);
    drawKeyValue("EVENT:    ", event?.title || 'School Event', yPos); yPos += 5;
    drawKeyValue("HOLDER:   ", parent?.name || 'Invited Guest', yPos); yPos += 5;
    drawKeyValue("PHONE:    ", parent?.phoneNumber || parent?.phone_number || 'N/A', yPos); yPos += 5;
    
    if (vehicle) {
        drawKeyValue("VEHICLE:  ", vehicle, yPos); yPos += 5;
    }
    
    const timestamp = new Date().toLocaleString();
    drawKeyValue("TIME:     ", timestamp, yPos); yPos += 5;
    drawKeyValue("PIN CODE: ", pin?.pin || 'N/A', yPos); yPos += 6;

    // Divider
    centerText("-".repeat(32), yPos);
    yPos += 5;

    // Guests
    doc.setFontSize(8.5);
    doc.setFont('courier', 'bold');
    doc.text(`Guests (${guests.length}):`, margin, yPos); yPos += 5;
    doc.setFont('courier', 'normal');
    
    guests.forEach((g: string, idx: number) => {
        doc.text(`${idx + 1}. ${g}`, margin, yPos);
        yPos += 4.5;
    });
    yPos += 1.5;

    // Divider
    centerText("-".repeat(32), yPos);
    yPos += 5;

    // Footer
    if (resolvedOfficerName) {
        centerText(`SECURITY OFFICER: ${resolvedOfficerName.toUpperCase()}`, yPos, true);
        yPos += 4.5;
    }
    centerText("ENTRY APPROVED", yPos, true);

    return doc.output('datauristring');
}
