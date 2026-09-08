import type { Institution, OfficialStampConfig } from '../types';

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Format a Date object or date string according to specified date format
 */
export const formatStampDate = (
    dateInput?: string | Date | null,
    format: 'DD/MM/YYYY' | 'DD-MM-YYYY' | 'DD MMM YYYY' = 'DD MMM YYYY'
): string => {
    let d: Date;
    if (!dateInput) {
        d = new Date();
    } else if (typeof dateInput === 'string') {
        d = new Date(dateInput);
        if (isNaN(d.getTime())) d = new Date();
    } else {
        d = isNaN(dateInput.getTime()) ? new Date() : dateInput;
    }

    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const mmm = MONTH_NAMES[d.getMonth()] || 'JAN';
    const yyyy = d.getFullYear();

    if (format === 'DD/MM/YYYY') {
        return `${dd}/${mm}/${yyyy}`;
    }
    if (format === 'DD-MM-YYYY') {
        return `${dd}-${mm}-${yyyy}`;
    }
    // Default: 'DD MMM YYYY' (e.g. 21 MAY 2020)
    return `${dd} ${mmm} ${yyyy}`;
};

/**
 * Resolved Default Values for Kenyan Institutional Rubber Stamp
 */
export const getResolvedStampConfig = (
    config?: OfficialStampConfig | null,
    institution?: Institution | null
): Required<OfficialStampConfig> => {
    const rawName = (config?.institutionName || institution?.name || 'ACADEMIC INSTITUTION')
        .replace(/★/g, '')
        .toUpperCase()
        .trim();
    const rawAddress = (
        config?.addressLine || 
        (institution as any)?.postalAddress || 
        (institution as any)?.postal_address || 
        institution?.address || 
        'P.O. BOX 1341 - 00100, NAIROBI'
    ).replace(/★/g, '').toUpperCase().trim();
    const rawPhone = (config?.contactPhone || institution?.phoneNumber || (institution?.email ? `TEL: ${institution.email}` : 'TEL: 0700000000')).toUpperCase().trim();
    const formattedPhone = rawPhone.startsWith('TEL') || rawPhone.startsWith('PHONE') || rawPhone.startsWith('EMAIL') ? rawPhone : `TEL: ${rawPhone}`;

    const showStars = config?.showStars ?? true;

    return {
        mode: config?.mode || 'system_generated',
        stampImageUrl: config?.stampImageUrl || null,
        inkColor: config?.inkColor || '#0047AB', // Classic Kenyan Stamp Blue
        daterColor: config?.daterColor || '#DC2626', // Bold Red Dater
        shape: config?.shape || 'circle',
        institutionName: rawName,
        addressLine: rawAddress,
        contactPhone: formattedPhone,
        department: (config?.department || 'FINANCE & BURSAR').toUpperCase().trim(),
        customDatePrefix: config?.customDatePrefix !== undefined ? config.customDatePrefix : '',
        dateFormat: config?.dateFormat || 'DD MMM YYYY',
        showSignatureLine: config?.showSignatureLine ?? true,
        signatureLabel: config?.signatureLabel || 'Sign:...................',
        showStars,
        showDate: config?.showDate ?? true,
        rotationAngle: config?.rotationAngle !== undefined ? config.rotationAngle : -3
    };
};

/**
 * Generate Circle Stamp SVG
 */
const generateCircleStampSvg = (
    resolved: Required<OfficialStampConfig>,
    dateText: string,
    uniqueId: string
): string => {
    const topPathId = `top_circle_${uniqueId}`;
    const bottomPathId = `bottom_circle_${uniqueId}`;

    const cleanName = (resolved.institutionName || '').replace(/★/g, '').trim();
    const cleanAddress = (resolved.addressLine || '').replace(/★/g, '').trim();

    // Adaptive font size & letter spacing based on string lengths
    const nameLen = cleanName.length;
    const nameFontSize = nameLen > 38 ? 10 : (nameLen > 30 ? 11.5 : (nameLen > 22 ? 12.5 : 13));
    const nameLetterSpacing = nameLen > 38 ? 0.6 : (nameLen > 30 ? 0.9 : 1.4);

    const addressLen = cleanAddress.length;
    const addressFontSize = addressLen > 40 ? 8.5 : (addressLen > 32 ? 9.5 : (addressLen > 24 ? 10.5 : 11.5));
    const addressLetterSpacing = addressLen > 40 ? 0.5 : (addressLen > 32 ? 0.8 : 1.2);

    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" width="280" height="280" style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; display: block; font-family: 'Arial Black', 'Arial', sans-serif;">
        <defs>
            <!-- Top Arched Path (Clockwise Arc: Left to Right across top) -->
            <path id="${topPathId}" d="M 38 140 A 102 102 0 0 1 242 140" fill="none" />
            <!-- Bottom Arched Path (Counter-Clockwise Arc: Left to Right across bottom so text is upright) -->
            <path id="${bottomPathId}" d="M 28 140 A 112 112 0 0 0 252 140" fill="none" />
            
            <!-- Subtle Distress Stamp Filter -->
            <filter id="distress_${uniqueId}">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
            </filter>
        </defs>

        <g transform="rotate(${resolved.rotationAngle || 0} 140 140)" filter="url(#distress_${uniqueId})" stroke="${resolved.inkColor}" fill="${resolved.inkColor}">
            <!-- Outer Double Concentric Border Rings -->
            <circle cx="140" cy="140" r="133" fill="none" stroke="${resolved.inkColor}" stroke-width="4" />
            <circle cx="140" cy="140" r="125" fill="none" stroke="${resolved.inkColor}" stroke-width="1.8" />

            <!-- Inner Solid Divider Ring (closer to institution name & address) -->
            <circle cx="140" cy="140" r="97" fill="none" stroke="${resolved.inkColor}" stroke-width="1.8" />

            <!-- Middle Flanking Stars (Exactly 2 Stars at Middle dividing Top and Bottom arcs) -->
            ${resolved.showStars ? `
                <text x="29" y="140" font-size="14" font-weight="900" text-anchor="middle" dominant-baseline="central" fill="${resolved.inkColor}" stroke="none">★</text>
                <text x="251" y="140" font-size="14" font-weight="900" text-anchor="middle" dominant-baseline="central" fill="${resolved.inkColor}" stroke="none">★</text>
            ` : ''}

            <!-- Top Curved Institution Name -->
            <text font-size="${nameFontSize}" font-weight="900" letter-spacing="${nameLetterSpacing}" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                <textPath href="#${topPathId}" startOffset="50%" text-anchor="middle">
                    ${cleanName}
                </textPath>
            </text>

            <!-- Bottom Curved Address / Postal Details (Upright, readable left-to-right) -->
            <text font-size="${addressFontSize}" font-weight="800" letter-spacing="${addressLetterSpacing}" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                <textPath href="#${bottomPathId}" startOffset="50%" text-anchor="middle">
                    ${cleanAddress}
                </textPath>
            </text>

            <!-- Inner Contact / Tel Line -->
            ${resolved.contactPhone && !resolved.contactPhone.includes('000000') ? `
                <text x="140" y="88" font-size="8.5" font-weight="800" letter-spacing="0.5" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                    ${resolved.contactPhone}
                </text>
            ` : ''}

            <!-- Department Tag (Prominently placed inside the stamp) -->
            ${resolved.department ? `
                <text x="140" y="${resolved.contactPhone && !resolved.contactPhone.includes('000000') ? '112' : '108'}" font-size="11.5" font-weight="900" letter-spacing="1.2" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                    ★ ${resolved.department} ★
                </text>
            ` : ''}

            <!-- Center Dynamic Transaction Dater (Red Stamp Ink) -->
            ${resolved.showDate ? `
                <g fill="${resolved.daterColor}" stroke="none">
                    <text x="140" y="${resolved.department ? '142' : (resolved.showSignatureLine ? '138' : '142')}" font-size="18" font-weight="900" letter-spacing="0.8" text-anchor="middle" style="font-family: 'Arial Black', 'Arial', sans-serif;">
                        ${dateText}
                    </text>
                </g>
            ` : ''}

            <!-- Signature Line or Verification Tag -->
            ${resolved.showSignatureLine ? `
                <text x="140" y="168" font-size="10.5" font-weight="800" letter-spacing="0.4" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                    ${resolved.signatureLabel}
                </text>
            ` : (resolved.department ? `
                <text x="140" y="168" font-size="9" font-weight="900" letter-spacing="1" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                    OFFICIAL STAMP
                </text>
            ` : `
                <text x="140" y="172" font-size="10" font-weight="900" letter-spacing="1.2" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                    * OFFICIAL STAMP *
                </text>
            `)}
        </g>
    </svg>
    `;
};

/**
 * Generate Oval Stamp SVG
 */
const generateOvalStampSvg = (
    resolved: Required<OfficialStampConfig>,
    dateText: string,
    uniqueId: string
): string => {
    const topPathId = `top_oval_${uniqueId}`;
    const bottomPathId = `bottom_oval_${uniqueId}`;

    const cleanName = (resolved.institutionName || '').replace(/★/g, '').trim();
    const cleanAddress = (resolved.addressLine || '').replace(/★/g, '').trim();

    const nameLen = cleanName.length;
    const nameFontSize = nameLen > 38 ? 9.5 : (nameLen > 30 ? 11 : 12.5);
    const nameLetterSpacing = nameLen > 38 ? 0.6 : (nameLen > 30 ? 0.9 : 1.2);

    const addressLen = cleanAddress.length;
    const addressFontSize = addressLen > 40 ? 8 : (addressLen > 32 ? 9 : 10.5);
    const addressLetterSpacing = addressLen > 40 ? 0.5 : (addressLen > 32 ? 0.7 : 1.0);

    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="320" height="220" style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; display: block; font-family: 'Arial Black', 'Arial', sans-serif;">
        <defs>
            <!-- Top Arched Path on Ellipse (Clockwise) -->
            <path id="${topPathId}" d="M 42 110 A 118 68 0 0 1 278 110" fill="none" />
            <!-- Bottom Arched Path on Ellipse (Counter-Clockwise so text is upright) -->
            <path id="${bottomPathId}" d="M 32 110 A 128 78 0 0 0 288 110" fill="none" />
            
            <!-- Subtle Distress Filter -->
            <filter id="distress_${uniqueId}">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
            </filter>
        </defs>

        <g transform="rotate(${resolved.rotationAngle || 0} 160 110)" filter="url(#distress_${uniqueId})" stroke="${resolved.inkColor}" fill="${resolved.inkColor}">
            <!-- Outer Double Concentric Ellipse Borders -->
            <ellipse cx="160" cy="110" rx="152" ry="102" fill="none" stroke="${resolved.inkColor}" stroke-width="4.2" />
            <ellipse cx="160" cy="110" rx="143" ry="93" fill="none" stroke="${resolved.inkColor}" stroke-width="1.6" />

            <!-- Inner Compartment Ellipse (closer to outer border) -->
            <ellipse cx="160" cy="110" rx="110" ry="64" fill="none" stroke="${resolved.inkColor}" stroke-width="1.6" />

            <!-- Middle Flanking Stars (Exactly 2 Stars at Middle dividing Top and Bottom arcs) -->
            ${resolved.showStars ? `
                <text x="34" y="110" font-size="14" font-weight="900" text-anchor="middle" dominant-baseline="central" fill="${resolved.inkColor}" stroke="none">★</text>
                <text x="286" y="110" font-size="14" font-weight="900" text-anchor="middle" dominant-baseline="central" fill="${resolved.inkColor}" stroke="none">★</text>
            ` : ''}

            <!-- Top Curved Institution Name -->
            <text font-size="${nameFontSize}" font-weight="900" letter-spacing="${nameLetterSpacing}" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                <textPath href="#${topPathId}" startOffset="50%" text-anchor="middle">
                    ${cleanName}
                </textPath>
            </text>

            <!-- Bottom Curved Address / Postal Details (Upright) -->
            <text font-size="${addressFontSize}" font-weight="800" letter-spacing="${addressLetterSpacing}" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                <textPath href="#${bottomPathId}" startOffset="50%" text-anchor="middle">
                    ${cleanAddress}
                </textPath>
            </text>

            <!-- Inner Contact / Tel Line -->
            ${resolved.contactPhone && !resolved.contactPhone.includes('000000') ? `
                <text x="160" y="74" font-size="8" font-weight="800" letter-spacing="0.5" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                    ${resolved.contactPhone}
                </text>
            ` : ''}

            <!-- Department Tag (Prominently placed inside the stamp) -->
            ${resolved.department ? `
                <text x="160" y="${resolved.contactPhone && !resolved.contactPhone.includes('000000') ? '94' : '90'}" font-size="10.5" font-weight="900" letter-spacing="1.0" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                    ★ ${resolved.department} ★
                </text>
            ` : ''}

            <!-- Center Dynamic Transaction Dater (Red Stamp Ink) -->
            ${resolved.showDate ? `
                <g fill="${resolved.daterColor}" stroke="none">
                    <text x="160" y="${resolved.department ? '118' : (resolved.showSignatureLine ? '108' : '112')}" font-size="17" font-weight="900" letter-spacing="0.8" text-anchor="middle" style="font-family: 'Arial Black', 'Arial', sans-serif;">
                        ${dateText}
                    </text>
                </g>
            ` : ''}

            <!-- Signature Line or Verification Tag -->
            ${resolved.showSignatureLine ? `
                <text x="160" y="140" font-size="9.5" font-weight="800" letter-spacing="0.4" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                    ${resolved.signatureLabel}
                </text>
            ` : (resolved.department ? `
                <text x="160" y="140" font-size="8.5" font-weight="900" letter-spacing="0.8" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                    OFFICIAL STAMP
                </text>
            ` : `
                <text x="160" y="138" font-size="9.5" font-weight="900" letter-spacing="1.0" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                    * OFFICIAL STAMP *
                </text>
            `)}
        </g>
    </svg>
    `;
};

/**
 * Generates pure SVG string of the Kenyan rubber stamp (Circle or Oval)
 */
export const generateKenyanStampSvgString = (
    config?: OfficialStampConfig | null,
    dateInput?: string | Date | null,
    institution?: Institution | null
): string => {
    const resolved = getResolvedStampConfig(config, institution);
    const dateFormatted = formatStampDate(dateInput, resolved.dateFormat);
    const dateText = resolved.customDatePrefix ? `${resolved.customDatePrefix} ${dateFormatted}` : dateFormatted;
    const uniqueId = `stamp_${Math.random().toString(36).substr(2, 9)}`;

    if (resolved.shape === 'oval') {
        return generateOvalStampSvg(resolved, dateText, uniqueId);
    }
    return generateCircleStampSvg(resolved, dateText, uniqueId);
};

/**
 * Encodes SVG string to valid base64 data URI
 */
const toBase64SvgUri = (svg: string): string => {
    try {
        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    } catch {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
};

/**
 * Converts SVG stamp into high-resolution PNG DataURI for embedding in jsPDF or downloading
 */
export const generateStampDataUri = async (
    config?: OfficialStampConfig | null,
    dateInput?: string | Date | null,
    institution?: Institution | null
): Promise<string> => {
    // If institution has chosen an uploaded image stamp, return that directly
    if (config?.mode === 'uploaded' && config.stampImageUrl) {
        return config.stampImageUrl;
    }

    const resolved = getResolvedStampConfig(config, institution);
    if (resolved.mode === 'none') {
        return '';
    }

    const svgStr = generateKenyanStampSvgString(config, dateInput, institution);
    const isOval = resolved.shape === 'oval';

    const width = isOval ? 640 : 560;
    const height = isOval ? 440 : 560;
    const base64Uri = toBase64SvgUri(svgStr);

    return new Promise((resolve) => {
        let objectUrl: string | null = null;
        let timer: any = null;
        let settled = false;

        const cleanup = () => {
            if (timer) clearTimeout(timer);
            if (objectUrl) {
                try {
                    URL.revokeObjectURL(objectUrl);
                } catch (_) {}
            }
        };

        const tryRasterize = (imgSource: HTMLImageElement): string | null => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(imgSource, 0, 0, width, height);
                    const pngData = canvas.toDataURL('image/png');
                    if (pngData && pngData.startsWith('data:image/png')) {
                        return pngData;
                    }
                }
            } catch (err) {
                console.warn('[stampGenerator] Canvas rasterization failed:', err);
            }
            return null;
        };

        // Safety timeout in case image loading stalls
        timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                cleanup();
                resolve(base64Uri);
            }
        }, 3000);

        const img = new Image();

        img.onload = () => {
            if (!settled) {
                settled = true;
                const png = tryRasterize(img);
                cleanup();
                resolve(png || base64Uri);
            }
        };

        img.onerror = () => {
            // If base64 URI load fails in browser Image, fallback to Blob URL
            if (!settled) {
                try {
                    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                    objectUrl = URL.createObjectURL(svgBlob);
                    const blobImg = new Image();
                    blobImg.onload = () => {
                        if (!settled) {
                            settled = true;
                            const png = tryRasterize(blobImg);
                            cleanup();
                            resolve(png || base64Uri);
                        }
                    };
                    blobImg.onerror = () => {
                        if (!settled) {
                            settled = true;
                            cleanup();
                            resolve(base64Uri);
                        }
                    };
                    blobImg.src = objectUrl;
                } catch (_) {
                    if (!settled) {
                        settled = true;
                        cleanup();
                        resolve(base64Uri);
                    }
                }
            }
        };

        img.src = base64Uri;
    });
};
