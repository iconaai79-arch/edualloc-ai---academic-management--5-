import React from 'react';

export interface GuillocheSecurityPatternProps {
    className?: string;
    opacity?: number;
    color?: string; // e.g. '#15803d' or '#166534'
}

/**
 * Procedural SVG Banknote Guilloche Security Pattern
 * Creates the authentic security watermark background and geometric rosette curves
 * characteristic of official Kenyan Ministry of Education examination and leaving certificates.
 */
export const GuillocheSecurityPattern: React.FC<GuillocheSecurityPatternProps> = ({
    className = '',
    opacity = 0.16,
    color = '#15803d'
}) => {
    // Generate intricate rosette circles
    const rosettes = [
        { cx: 120, cy: 360, r: 110, steps: 24 },
        { cx: 480, cy: 220, r: 140, steps: 32 },
        { cx: 300, cy: 580, r: 130, steps: 28 },
        { cx: 500, cy: 800, r: 120, steps: 26 },
        { cx: 100, cy: 920, r: 100, steps: 20 }
    ];

    // Generate undulating wavy ribbon curves (sine wave iterations)
    const waveCount = 14;
    const waves = Array.from({ length: waveCount }, (_, i) => {
        const yOffset = 70 * i;
        const amp = 35 + (i % 3) * 15;
        return `M 0 ${120 + yOffset} C 150 ${120 + yOffset + amp}, 250 ${120 + yOffset - amp}, 400 ${120 + yOffset + amp} S 650 ${120 + yOffset - amp}, 800 ${120 + yOffset + amp}`;
    });

    const crossWaves = Array.from({ length: 12 }, (_, i) => {
        const yOffset = 80 * i;
        const amp = 40 + (i % 2) * 20;
        return `M 0 ${80 + yOffset} C 200 ${80 + yOffset - amp}, 400 ${80 + yOffset + amp}, 600 ${80 + yOffset - amp} S 750 ${80 + yOffset + amp}, 800 ${80 + yOffset - amp}`;
    });

    return (
        <div 
            className={`absolute inset-0 pointer-events-none select-none overflow-hidden ${className}`}
            style={{ opacity }}
            aria-hidden="true"
        >
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 800 1130"
                preserveAspectRatio="none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Security Border Guilloche Lattice */}
                <rect
                    x="12"
                    y="12"
                    width="776"
                    height="1106"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    fill="none"
                />
                <rect
                    x="18"
                    y="18"
                    width="764"
                    height="1094"
                    stroke={color}
                    strokeWidth="1"
                    strokeDasharray="1 3"
                    fill="none"
                />

                {/* Primary Undulating Guilloche Waves */}
                <g stroke={color} strokeWidth="0.85">
                    {waves.map((d, index) => (
                        <path key={`wave-${index}`} d={d} />
                    ))}
                </g>

                {/* Counter-Intersecting Ribbon Waves */}
                <g stroke={color} strokeWidth="0.65" strokeDasharray="3 1">
                    {crossWaves.map((d, index) => (
                        <path key={`cwave-${index}`} d={d} />
                    ))}
                </g>

                {/* Fine Spacing Multi-Line Ribbons */}
                <g stroke={color} strokeWidth="0.45">
                    {Array.from({ length: 18 }).map((_, i) => (
                        <path
                            key={`ribbon-${i}`}
                            d={`M -50 ${i * 65} Q 200 ${i * 65 + 120} 450 ${i * 65 - 80} T 850 ${i * 65 + 60}`}
                        />
                    ))}
                </g>

                {/* Geometric Security Rosettes / Watermarks */}
                {rosettes.map((ros, rIndex) => (
                    <g key={`rosette-${rIndex}`} stroke={color} strokeWidth="0.65">
                        {Array.from({ length: ros.steps }).map((_, step) => {
                            const angle = (step * 360) / ros.steps;
                            return (
                                <ellipse
                                    key={`petal-${step}`}
                                    cx={ros.cx}
                                    cy={ros.cy}
                                    rx={ros.r}
                                    ry={ros.r * 0.38}
                                    transform={`rotate(${angle} ${ros.cx} ${ros.cy})`}
                                />
                            );
                        })}
                        <circle cx={ros.cx} cy={ros.cy} r={ros.r * 0.2} strokeWidth="1" />
                        <circle cx={ros.cx} cy={ros.cy} r={ros.r * 0.55} strokeWidth="0.5" strokeDasharray="2 2" />
                    </g>
                ))}

                {/* Center Micro-text Watermark Lines */}
                <g opacity="0.35" fill={color} fontSize="7" fontFamily="monospace" letterSpacing="4">
                    <text x="50" y="550" transform="rotate(-30 50 550)">MINISTRY OF EDUCATION • REPUBLIC OF KENYA • OFFICIAL TRANSITION RECORD •</text>
                    <text x="50" y="650" transform="rotate(-30 50 650)">HARAMBEE • CORE COMPETENCIES • COMMUNITY SERVICE LEARNING • CBC KENYA •</text>
                </g>
            </svg>
        </div>
    );
};
