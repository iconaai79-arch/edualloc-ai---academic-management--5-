import React, { useId } from 'react';
import type { Institution, OfficialStampConfig } from '../../types';
import { formatStampDate, getResolvedStampConfig } from '../../utils/stampGenerator';

export interface KenyanOfficialStampProps {
    institution?: Institution | null;
    config?: OfficialStampConfig | null;
    date?: string | Date | null;
    size?: number | string;
    className?: string;
    departmentOverride?: string;
    showDate?: boolean;
}

export const KenyanOfficialStamp: React.FC<KenyanOfficialStampProps> = ({
    institution,
    config,
    date,
    size = 150,
    className = '',
    departmentOverride,
    showDate = true
}) => {
    const uniqueId = useId().replace(/:/g, '_');
    const effectiveConfig = config || institution?.letterheadConfig?.stampConfig;
    const resolved = getResolvedStampConfig(effectiveConfig, institution);
    if (departmentOverride) {
        resolved.department = departmentOverride.toUpperCase().trim();
    }
    
    // Check mode
    if (resolved.mode === 'none') {
        return null;
    }

    const dateFormatted = formatStampDate(date);
    const dateText = `${resolved.customDatePrefix} ${dateFormatted}`;
    const topPathId = `top_arc_${uniqueId}`;
    const bottomPathId = `bottom_arc_${uniqueId}`;
    const filterId = `distress_${uniqueId}`;

    // If uploaded image mode
    if (resolved.mode === 'uploaded' && (resolved.stampImageUrl || institution?.letterheadConfig?.stampImageUrl)) {
        const imgUrl = resolved.stampImageUrl || institution?.letterheadConfig?.stampImageUrl;
        return (
            <div 
                className={`relative inline-flex items-center justify-center select-none pointer-events-none ${className}`}
                style={{ 
                    width: typeof size === 'number' ? `${size}px` : size, 
                    height: typeof size === 'number' ? `${size}px` : size,
                    transform: `rotate(${resolved.rotationAngle}deg)`
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
                            className="font-black text-[11px] font-mono tracking-tight underline px-1 py-0.5 rounded bg-white/40 backdrop-blur-[1px]"
                            style={{ color: resolved.daterColor }}
                        >
                            {dateText}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    // System-Generated Dynamic Kenyan Official Rubber Stamp
    return (
        <div 
            className={`relative inline-flex items-center justify-center select-none pointer-events-none transition-transform ${className}`}
            style={{ 
                width: typeof size === 'number' ? `${size}px` : size, 
                height: typeof size === 'number' ? `${size}px` : size,
                transform: `rotate(${resolved.rotationAngle}deg)`
            }}
        >
            <svg 
                viewBox="0 0 280 280" 
                className="w-full h-full overflow-visible"
                style={{ fontFamily: "'Arial', 'Helvetica', sans-serif" }}
            >
                <defs>
                    {/* Top Arched Path (Clockwise) */}
                    <path id={topPathId} d="M 38 140 A 102 102 0 0 1 242 140" fill="none" />
                    {/* Bottom Arched Path (Clockwise bottom left to right) */}
                    <path id={bottomPathId} d="M 242 140 A 102 102 0 0 1 38 140" fill="none" />
                    
                    {/* Authentic Ink Texture Filter */}
                    <filter id={filterId}>
                        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>

                <g filter={`url(#${filterId})`}>
                    {/* Outer Solid Ring */}
                    <circle 
                        cx="140" 
                        cy="140" 
                        r="132" 
                        fill="none" 
                        stroke={resolved.inkColor} 
                        strokeWidth="4.5" 
                    />
                    
                    {/* Secondary Concentric Fine Ring */}
                    <circle 
                        cx="140" 
                        cy="140" 
                        r="124" 
                        fill="none" 
                        stroke={resolved.inkColor} 
                        strokeWidth="1.6" 
                    />

                    {/* Inner Compartment Ring */}
                    <circle 
                        cx="140" 
                        cy="140" 
                        r="82" 
                        fill="none" 
                        stroke={resolved.inkColor} 
                        strokeWidth="1.4" 
                        strokeDasharray="3,1" 
                        opacity="0.85" 
                    />

                    {/* Top Curved Institution Name */}
                    <text 
                        fontSize="13.5" 
                        fontWeight="900" 
                        letterSpacing="1.8" 
                        fill={resolved.inkColor}
                    >
                        <textPath href={`#${topPathId}`} startOffset="50%" textAnchor="middle">
                            {resolved.institutionName}
                        </textPath>
                    </text>

                    {/* Bottom Curved Address & County */}
                    <text 
                        fontSize="11.5" 
                        fontWeight="800" 
                        letterSpacing="1.5" 
                        fill={resolved.inkColor}
                    >
                        <textPath href={`#${bottomPathId}`} startOffset="50%" textAnchor="middle">
                            {resolved.addressLine}
                        </textPath>
                    </text>

                    {/* Inner Top Contact / Tel Line */}
                    <text 
                        x="140" 
                        y="98" 
                        fontSize="10" 
                        fontWeight="800" 
                        letterSpacing="0.8" 
                        textAnchor="middle" 
                        fill={resolved.inkColor}
                    >
                        {resolved.contactPhone}
                    </text>

                    {/* Center Dynamic Transaction Dater (Red Ink / Underlined) */}
                    {showDate && resolved.showDate && (
                        <g fill={resolved.daterColor}>
                            <text 
                                x="140" 
                                y="142" 
                                fontSize="17" 
                                fontWeight="900" 
                                letterSpacing="0.5" 
                                textAnchor="middle" 
                                style={{ fontFamily: "'Courier New', 'Arial', monospace" }}
                            >
                                {dateText}
                            </text>
                            <line 
                                x1="68" 
                                y1="147" 
                                x2="212" 
                                y2="147" 
                                stroke={resolved.daterColor} 
                                strokeWidth="1.4" 
                            />
                        </g>
                    )}

                    {/* Inner Bottom Department / Role Line */}
                    <text 
                        x="140" 
                        y="186" 
                        fontSize="10.5" 
                        fontWeight="900" 
                        letterSpacing="1.2" 
                        textAnchor="middle" 
                        fill={resolved.inkColor}
                    >
                        * {resolved.department} *
                    </text>
                </g>
            </svg>
        </div>
    );
};
