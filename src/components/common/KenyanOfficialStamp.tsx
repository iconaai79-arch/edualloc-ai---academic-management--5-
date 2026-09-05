import React from 'react';
import type { Institution, OfficialStampConfig } from '../../types';
import { formatStampDate, getResolvedStampConfig, generateKenyanStampSvgString } from '../../utils/stampGenerator';

export interface KenyanOfficialStampProps {
    institution?: Institution | null;
    config?: OfficialStampConfig | null;
    date?: string | Date | null;
    size?: number;
    className?: string;
    departmentOverride?: string;
    showDate?: boolean;
}

export const KenyanOfficialStamp: React.FC<KenyanOfficialStampProps> = ({
    institution,
    config,
    date,
    size = 140,
    className = '',
    departmentOverride,
    showDate = true
}) => {
    const effectiveConfig = config || institution?.letterheadConfig?.stampConfig;
    const resolved = getResolvedStampConfig(effectiveConfig, institution);
    if (departmentOverride) {
        resolved.department = departmentOverride.toUpperCase().trim();
    }
    
    // Check mode
    if (resolved.mode === 'none') {
        return null;
    }

    const dateFormatted = formatStampDate(date, resolved.dateFormat);
    const dateText = resolved.customDatePrefix ? `${resolved.customDatePrefix} ${dateFormatted}` : dateFormatted;

    // If uploaded image mode
    if (resolved.mode === 'uploaded' && (resolved.stampImageUrl || institution?.letterheadConfig?.stampImageUrl)) {
        const imgUrl = resolved.stampImageUrl || institution?.letterheadConfig?.stampImageUrl;
        return (
            <div 
                className={`relative inline-flex items-center justify-center select-none pointer-events-none shrink-0 ${className}`}
                style={{ 
                    width: `${size}px`, 
                    height: `${size}px`,
                    maxWidth: '100%',
                    maxHeight: '100%',
                    transform: `rotate(${resolved.rotationAngle}deg)`,
                    transformOrigin: 'center center'
                }}
            >
                <img 
                    src={imgUrl!} 
                    alt="Official Institution Stamp" 
                    className="w-full h-full object-contain filter drop-shadow-sm opacity-90"
                />
                {showDate && resolved.showDate && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span 
                            className="font-black text-[12px] font-sans tracking-tight px-1 py-0.5 rounded bg-white/50 backdrop-blur-[1px]"
                            style={{ color: resolved.daterColor }}
                        >
                            {dateText}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    const isOval = resolved.shape === 'oval';
    const stampWidth = isOval ? Math.round(size * 1.4) : size;
    const stampHeight = size;

    const svgString = generateKenyanStampSvgString(
        { ...resolved, showDate },
        date,
        institution
    );

    return (
        <div 
            className={`relative inline-flex items-center justify-center select-none pointer-events-none transition-transform shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:block ${className}`}
            style={{ 
                width: `${stampWidth}px`, 
                height: `${stampHeight}px`,
                maxWidth: '100%',
                maxHeight: '100%'
            }}
            dangerouslySetInnerHTML={{ __html: svgString }}
        />
    );
};
