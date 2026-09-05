import React from 'react';

export interface KenyaCoatOfArmsProps {
    width?: number | string;
    height?: number | string;
    className?: string;
}

/**
 * High-fidelity Vector SVG of the Official Coat of Arms of the Republic of Kenya.
 * Features:
 * - Two rampant golden/ochre lions supporting the traditional Maasai shield & crossed spears
 * - The Kenyan tricolor shield (black, red, green with white fimbriation)
 * - The national cockerel holding an axe on the central red field
 * - Mount Kenya agricultural foundation with coffee, tea & maize
 * - The national motto banner "HARAMBEE"
 */
export const KenyaCoatOfArms: React.FC<KenyaCoatOfArmsProps> = ({
    width = 110,
    height = 110,
    className = ''
}) => {
    return (
        <div 
            className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
            style={{ width, height }}
        >
            <svg
                viewBox="0 0 500 500"
                width="100%"
                height="100%"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-sm"
            >
                <defs>
                    <radialGradient id="shieldGold" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="60%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#ca8a04" />
                    </radialGradient>
                    <linearGradient id="spearMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e2e8f0" />
                        <stop offset="50%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#475569" />
                    </linearGradient>
                    <linearGradient id="lionBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#d97706" />
                        <stop offset="50%" stopColor="#b45309" />
                        <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>
                    <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7f1d1d" />
                        <stop offset="50%" stopColor="#991b1b" />
                        <stop offset="100%" stopColor="#7f1d1d" />
                    </linearGradient>
                    <filter id="coaSlightShadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
                    </filter>
                </defs>

                {/* --- CROSSED SPEARS --- */}
                <g stroke="#334155" strokeWidth="4" strokeLinecap="round" filter="url(#coaSlightShadow)">
                    {/* Spear 1: Top-Left to Bottom-Right */}
                    <line x1="100" y1="50" x2="400" y2="420" stroke="url(#spearMetal)" strokeWidth="6" />
                    {/* Spearhead 1 */}
                    <polygon points="100,50 85,75 100,70 115,75" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
                    <line x1="100" y1="50" x2="100" y2="70" stroke="#0f172a" strokeWidth="1.5" />

                    {/* Spear 2: Top-Right to Bottom-Left */}
                    <line x1="400" y1="50" x2="100" y2="420" stroke="url(#spearMetal)" strokeWidth="6" />
                    {/* Spearhead 2 */}
                    <polygon points="400,50 385,75 400,70 415,75" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
                    <line x1="400" y1="50" x2="400" y2="70" stroke="#0f172a" strokeWidth="1.5" />
                </g>

                {/* --- LEFT LION --- */}
                <g id="leftLion" filter="url(#coaSlightShadow)">
                    {/* Tail */}
                    <path
                        d="M 120 280 Q 70 300 65 240 Q 60 180 95 160 Q 80 170 80 200 Q 80 250 135 270"
                        fill="none"
                        stroke="#b45309"
                        strokeWidth="7"
                        strokeLinecap="round"
                    />
                    {/* Tail Tuft */}
                    <path d="M 95 160 Q 105 140 100 155 Q 115 150 102 165 Z" fill="#78350f" />
                    
                    {/* Hind Leg Back */}
                    <path d="M 140 300 Q 110 320 105 380 L 85 380 Q 95 360 120 310 Z" fill="#92400e" stroke="#78350f" strokeWidth="2" />
                    {/* Hind Leg Front */}
                    <path d="M 170 290 Q 130 330 130 395 L 105 395 Q 115 350 155 285 Z" fill="url(#lionBodyGrad)" stroke="#78350f" strokeWidth="2" />
                    
                    {/* Body & Torso */}
                    <path
                        d="M 145 285 Q 120 240 140 180 Q 160 130 205 140 Q 190 200 180 280 Z"
                        fill="url(#lionBodyGrad)"
                        stroke="#78350f"
                        strokeWidth="2"
                    />
                    
                    {/* Foreleg Left holding spear */}
                    <path d="M 175 170 Q 140 140 110 110 L 125 100 Q 155 130 185 160 Z" fill="url(#lionBodyGrad)" stroke="#78350f" strokeWidth="2" />
                    {/* Claws Left */}
                    <path d="M 110 110 Q 102 105 106 95 Q 118 100 125 100" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
                    
                    {/* Foreleg Right supporting shield */}
                    <path d="M 175 195 Q 185 220 205 230 L 205 242 Q 175 230 165 200 Z" fill="url(#lionBodyGrad)" stroke="#78350f" strokeWidth="2" />

                    {/* Mane */}
                    <path
                        d="M 170 120 Q 135 120 145 155 Q 130 160 140 185 Q 125 195 145 215 Q 165 225 185 210 Q 200 170 180 125 Z"
                        fill="#78350f"
                        stroke="#451a03"
                        strokeWidth="2"
                    />

                    {/* Head & Face */}
                    <ellipse cx="178" cy="132" rx="18" ry="15" fill="#d97706" stroke="#78350f" strokeWidth="2" />
                    {/* Snout */}
                    <path d="M 185 130 Q 195 132 192 140 Q 184 144 180 140 Z" fill="#b45309" stroke="#78350f" strokeWidth="1.5" />
                    {/* Red Tongue Rampant */}
                    <path d="M 192 138 Q 202 142 195 147 Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
                    {/* Eye & Ear */}
                    <circle cx="176" cy="128" r="2.5" fill="#0f172a" />
                    <circle cx="166" cy="122" r="5" fill="#92400e" stroke="#451a03" strokeWidth="1.5" />
                </g>

                {/* --- RIGHT LION (Mirror) --- */}
                <g id="rightLion" filter="url(#coaSlightShadow)">
                    {/* Tail */}
                    <path
                        d="M 380 280 Q 430 300 435 240 Q 440 180 405 160 Q 420 170 420 200 Q 420 250 365 270"
                        fill="none"
                        stroke="#b45309"
                        strokeWidth="7"
                        strokeLinecap="round"
                    />
                    {/* Tail Tuft */}
                    <path d="M 405 160 Q 395 140 400 155 Q 385 150 398 165 Z" fill="#78350f" />
                    
                    {/* Hind Leg Back */}
                    <path d="M 360 300 Q 390 320 395 380 L 415 380 Q 405 360 380 310 Z" fill="#92400e" stroke="#78350f" strokeWidth="2" />
                    {/* Hind Leg Front */}
                    <path d="M 330 290 Q 370 330 370 395 L 395 395 Q 385 350 345 285 Z" fill="url(#lionBodyGrad)" stroke="#78350f" strokeWidth="2" />
                    
                    {/* Body & Torso */}
                    <path
                        d="M 355 285 Q 380 240 360 180 Q 340 130 295 140 Q 310 200 320 280 Z"
                        fill="url(#lionBodyGrad)"
                        stroke="#78350f"
                        strokeWidth="2"
                    />
                    
                    {/* Foreleg Right holding spear */}
                    <path d="M 325 170 Q 360 140 390 110 L 375 100 Q 345 130 315 160 Z" fill="url(#lionBodyGrad)" stroke="#78350f" strokeWidth="2" />
                    {/* Claws Right */}
                    <path d="M 390 110 Q 398 105 394 95 Q 382 100 375 100" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
                    
                    {/* Foreleg Left supporting shield */}
                    <path d="M 325 195 Q 315 220 295 230 L 295 242 Q 325 230 335 200 Z" fill="url(#lionBodyGrad)" stroke="#78350f" strokeWidth="2" />

                    {/* Mane */}
                    <path
                        d="M 330 120 Q 365 120 355 155 Q 370 160 360 185 Q 375 195 355 215 Q 335 225 315 210 Q 300 170 320 125 Z"
                        fill="#78350f"
                        stroke="#451a03"
                        strokeWidth="2"
                    />

                    {/* Head & Face */}
                    <ellipse cx="322" cy="132" rx="18" ry="15" fill="#d97706" stroke="#78350f" strokeWidth="2" />
                    {/* Snout */}
                    <path d="M 315 130 Q 305 132 308 140 Q 316 144 320 140 Z" fill="#b45309" stroke="#78350f" strokeWidth="1.5" />
                    {/* Red Tongue Rampant */}
                    <path d="M 308 138 Q 298 142 305 147 Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
                    {/* Eye & Ear */}
                    <circle cx="324" cy="128" r="2.5" fill="#0f172a" />
                    <circle cx="334" cy="122" r="5" fill="#92400e" stroke="#451a03" strokeWidth="1.5" />
                </g>

                {/* --- CENTRAL MAASAI SHIELD --- */}
                <g id="shield" filter="url(#coaSlightShadow)">
                    {/* Shield Clip Path */}
                    <clipPath id="shieldShape">
                        <path d="M 250 85 C 190 125 190 280 250 350 C 310 280 310 125 250 85 Z" />
                    </clipPath>

                    {/* Shield Base Outline */}
                    <path
                        d="M 250 85 C 190 125 190 280 250 350 C 310 280 310 125 250 85 Z"
                        fill="#ffffff"
                        stroke="#0f172a"
                        strokeWidth="5"
                    />

                    {/* Shield Interior Bands (Kenya National Colors) */}
                    <g clipPath="url(#shieldShape)">
                        {/* Top Band: Black */}
                        <rect x="180" y="80" width="140" height="75" fill="#111827" />
                        
                        {/* Top White Fimbriation */}
                        <rect x="180" y="155" width="140" height="8" fill="#ffffff" />
                        
                        {/* Central Band: Red */}
                        <rect x="180" y="163" width="140" height="108" fill="#b91c1c" />
                        
                        {/* Bottom White Fimbriation */}
                        <rect x="180" y="271" width="140" height="8" fill="#ffffff" />
                        
                        {/* Bottom Band: Green */}
                        <rect x="180" y="279" width="140" height="80" fill="#15803d" />

                        {/* Maasai Shield Spine Line & Traditional Patterns */}
                        <line x1="250" y1="85" x2="250" y2="350" stroke="#f8fafc" strokeWidth="3" strokeDasharray="6,4" />
                        
                        {/* Traditional Oval Flanks */}
                        <path d="M 200 163 Q 220 215 200 271" fill="none" stroke="#f8fafc" strokeWidth="3" />
                        <path d="M 300 163 Q 280 215 300 271" fill="none" stroke="#f8fafc" strokeWidth="3" />

                        {/* --- THE COCKEREL HOLDING AN AXE (On Central Red Band) --- */}
                        <g id="cockerel" transform="translate(232, 185) scale(0.72)">
                            {/* Cockerel Body */}
                            <path
                                d="M 25 35 Q 20 20 32 12 Q 38 7 42 12 Q 45 18 42 26 Q 52 28 50 42 Q 48 55 35 55 Q 24 55 25 35 Z"
                                fill="#ffffff"
                                stroke="#0f172a"
                                strokeWidth="2"
                            />
                            {/* Comb & Wattle */}
                            <path d="M 38 6 Q 42 2 45 6 Q 48 3 50 8 Z" fill="#ef4444" />
                            <path d="M 45 20 Q 48 24 45 27 Z" fill="#ef4444" />
                            {/* Beak */}
                            <polygon points="46,14 54,16 46,19" fill="#f59e0b" />
                            {/* Eye */}
                            <circle cx="42" cy="13" r="1.5" fill="#0f172a" />
                            {/* Tail Feathers */}
                            <path d="M 25 35 Q 10 20 5 10 Q 15 25 22 30" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 23 38 Q 8 28 2 20 Q 12 33 20 35" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 24 43 Q 12 40 5 35 Q 15 42 22 42" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                            {/* Legs */}
                            <line x1="32" y1="55" x2="30" y2="68" stroke="#f59e0b" strokeWidth="2.5" />
                            <line x1="38" y1="55" x2="42" y2="68" stroke="#f59e0b" strokeWidth="2.5" />
                            {/* The Axe held in right foot */}
                            <line x1="42" y1="58" x2="62" y2="40" stroke="#78350f" strokeWidth="3" />
                            {/* Axe Head */}
                            <path d="M 58 36 Q 68 32 66 46 Q 60 44 58 36 Z" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
                        </g>
                    </g>
                </g>

                {/* --- MOUNT KENYA BASE WITH AGRICULTURAL CROPS --- */}
                <g id="mountainBase" filter="url(#coaSlightShadow)">
                    {/* Silhouette of Mount Kenya */}
                    <polygon points="120,400 250,335 380,400 370,415 130,415" fill="#1e3a1e" stroke="#14532d" strokeWidth="2" />
                    {/* Snow Peak */}
                    <polygon points="230,345 250,335 270,345 260,352 250,348 240,352" fill="#ffffff" />

                    {/* Agricultural Coffee, Tea, Maize & Pyrethrum Branches */}
                    {/* Left Crop Foliage */}
                    <path
                        d="M 115 395 Q 140 375 165 390 Q 150 405 125 408 Z"
                        fill="#15803d"
                        stroke="#14532d"
                        strokeWidth="1.5"
                    />
                    <circle cx="140" cy="385" r="3.5" fill="#dc2626" />
                    <circle cx="148" cy="388" r="3.5" fill="#dc2626" />
                    <circle cx="144" cy="394" r="3.5" fill="#dc2626" />

                    {/* Right Crop Foliage */}
                    <path
                        d="M 385 395 Q 360 375 335 390 Q 350 405 375 408 Z"
                        fill="#15803d"
                        stroke="#14532d"
                        strokeWidth="1.5"
                    />
                    <circle cx="360" cy="385" r="3.5" fill="#eab308" />
                    <circle cx="352" cy="388" r="3.5" fill="#eab308" />
                    <circle cx="356" cy="394" r="3.5" fill="#eab308" />
                </g>

                {/* --- HARAMBEE MOTTO BANNER --- */}
                <g id="harambeeBanner" filter="url(#coaSlightShadow)">
                    {/* Banner Ribbon Shadow / Fold */}
                    <path d="M 120 410 L 150 435 L 145 405 Z" fill="#450a0a" />
                    <path d="M 380 410 L 350 435 L 355 405 Z" fill="#450a0a" />
                    
                    {/* Banner Main Ribbon */}
                    <path
                        d="M 130 405 C 200 420 300 420 370 405 C 380 425 365 440 355 445 C 290 455 210 455 145 445 C 135 440 120 425 130 405 Z"
                        fill="url(#bannerGrad)"
                        stroke="#450a0a"
                        strokeWidth="2"
                    />
                    {/* Banner Inner Gold Border Accent */}
                    <path
                        d="M 138 412 C 200 424 300 424 362 412"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M 148 438 C 210 448 290 448 352 438"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="1.5"
                    />

                    {/* "HARAMBEE" Text */}
                    <text
                        x="250"
                        y="433"
                        textAnchor="middle"
                        fontFamily="Arial, sans-serif"
                        fontWeight="900"
                        fontSize="21"
                        letterSpacing="5"
                        fill="#ffffff"
                        stroke="#0f172a"
                        strokeWidth="0.8"
                    >
                        HARAMBEE
                    </text>
                </g>
            </svg>
        </div>
    );
};
