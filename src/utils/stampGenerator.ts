import type { Institution, OfficialStampConfig } from '../types';

/**
 * Format a Date object or date string into standard Kenyan stamp dater format (DD/MM/YYYY)
 */
export const formatStampDate = (dateInput?: string | Date | null): string => {
    if (!dateInput) {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    try {
        const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (isNaN(d.getTime())) {
            const now = new Date();
            return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        }
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    } catch {
        const now = new Date();
        return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    }
};

/**
 * Resolved Default Values for Kenyan Institutional Rubber Stamp
 */
export const getResolvedStampConfig = (
    config?: OfficialStampConfig | null,
    institution?: Institution | null
): Required<OfficialStampConfig> => {
    const rawName = (config?.institutionName || institution?.name || 'ACADEMIC INSTITUTION').toUpperCase().trim();
    const rawAddress = (config?.addressLine || institution?.address || 'P.O BOX 40100, NAIROBI').toUpperCase().trim();
    const rawPhone = (config?.contactPhone || institution?.phoneNumber || (institution?.email ? `TEL: ${institution.email}` : 'TEL: 0700000000')).toUpperCase().trim();
    const formattedPhone = rawPhone.startsWith('TEL') || rawPhone.startsWith('PHONE') || rawPhone.startsWith('EMAIL') ? rawPhone : `TEL: ${rawPhone}`;

    return {
        mode: config?.mode || 'system_generated',
        stampImageUrl: config?.stampImageUrl || null,
        inkColor: config?.inkColor || '#0047AB', // Classic Kenyan Royal Blue Stamp Ink
        daterColor: config?.daterColor || '#DC2626', // Classic Red Dater Stamp Ink
        shape: config?.shape || 'circle',
        institutionName: rawName,
        addressLine: rawAddress.startsWith('★') ? rawAddress : `★ ${rawAddress} ★`,
        contactPhone: formattedPhone,
        department: (config?.department || 'FINANCE & BURSAR').toUpperCase().trim(),
        customDatePrefix: config?.customDatePrefix || 'Date',
        showDate: config?.showDate ?? true,
        rotationAngle: config?.rotationAngle !== undefined ? config.rotationAngle : -3
    };
};

/**
 * Generates pure SVG string of the circular Kenyan rubber stamp matching the physical stamp specification
 */
export const generateKenyanStampSvgString = (
    config?: OfficialStampConfig | null,
    dateInput?: string | Date | null,
    institution?: Institution | null
): string => {
    const resolved = getResolvedStampConfig(config, institution);
    const dateFormatted = formatStampDate(dateInput);
    const dateText = `${resolved.customDatePrefix} ${dateFormatted}`;

    const uniqueId = `stamp_${Math.random().toString(36).substr(2, 9)}`;
    const topPathId = `top_arc_${uniqueId}`;
    const bottomPathId = `bottom_arc_${uniqueId}`;

    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" width="280" height="280" style="transform: rotate(${resolved.rotationAngle}deg); overflow: visible; font-family: 'Arial', 'Helvetica', sans-serif;">
        <defs>
            <!-- Top Arched Path for Institution Name (Clockwise) -->
            <path id="${topPathId}" d="M 38 140 A 102 102 0 0 1 242 140" fill="none" />
            <!-- Bottom Arched Path for Address & County (Clockwise from bottom left to bottom right) -->
            <path id="${bottomPathId}" d="M 242 140 A 102 102 0 0 1 38 140" fill="none" />
            
            <!-- Subtle Rubber Ink Distress Filter -->
            <filter id="distress_${uniqueId}">
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
            </filter>
        </defs>

        <g filter="url(#distress_${uniqueId})" stroke="${resolved.inkColor}" fill="${resolved.inkColor}">
            <!-- Outer Solid Ring -->
            <circle cx="140" cy="140" r="132" fill="none" stroke="${resolved.inkColor}" stroke-width="4.5" />
            
            <!-- Secondary Concentric Fine Ring -->
            <circle cx="140" cy="140" r="124" fill="none" stroke="${resolved.inkColor}" stroke-width="1.6" />

            <!-- Inner Compartment Ring -->
            <circle cx="140" cy="140" r="82" fill="none" stroke="${resolved.inkColor}" stroke-width="1.4" stroke-dasharray="3,1" opacity="0.85" />

            <!-- Top Curved Institution Name -->
            <text font-size="13.5" font-weight="900" letter-spacing="1.8" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                <textPath href="#${topPathId}" startOffset="50%" text-anchor="middle">
                    ${resolved.institutionName}
                </textPath>
            </text>

            <!-- Bottom Curved Address / Town -->
            <text font-size="11.5" font-weight="800" letter-spacing="1.5" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                <textPath href="#${bottomPathId}" startOffset="50%" text-anchor="middle">
                    ${resolved.addressLine}
                </textPath>
            </text>

            <!-- Inner Top Contact / Tel Line -->
            <text x="140" y="98" font-size="10" font-weight="800" letter-spacing="0.8" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                ${resolved.contactPhone}
            </text>

            <!-- Center Dynamic Transaction Dater (Red Ink / Underlined) -->
            ${resolved.showDate ? `
                <g fill="${resolved.daterColor}" stroke="none">
                    <text x="140" y="142" font-size="17" font-weight="900" letter-spacing="0.5" text-anchor="middle" text-decoration="underline" style="font-family: 'Courier New', 'Arial', monospace;">
                        ${dateText}
                    </text>
                    <line x1="68" y1="147" x2="212" y2="147" stroke="${resolved.daterColor}" stroke-width="1.4" />
                </g>
            ` : ''}

            <!-- Inner Bottom Department / Role Line -->
            <text x="140" y="186" font-size="10.5" font-weight="900" letter-spacing="1.2" text-anchor="middle" fill="${resolved.inkColor}" stroke="none">
                * ${resolved.department} *
            </text>
        </g>
    </svg>
    `;
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

    const svgStr = generateKenyanStampSvgString(config, dateInput, institution);
    return new Promise((resolve) => {
        const img = new Image();
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 560; // 2x scale for crisp PDF printing
            canvas.height = 560;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, 560, 560);
                const pngData = canvas.toDataURL('image/png');
                URL.revokeObjectURL(url);
                resolve(pngData);
            } else {
                URL.revokeObjectURL(url);
                resolve(url);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(`data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`);
        };

        img.src = url;
    });
};
