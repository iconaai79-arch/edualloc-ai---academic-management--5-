import React from 'react';

export interface KenyaCoatOfArmsProps {
    width?: number | string;
    height?: number | string;
    className?: string;
    alt?: string;
}

/**
 * Authentic High-Resolution Coat of Arms of the Republic of Kenya.
 * Renders the official national emblem with rampant lions, Maasai shield,
 * cockerel holding axe, crossed spears, Mount Kenya agricultural foundation,
 * and "HARAMBEE" banner.
 */
export const KenyaCoatOfArms: React.FC<KenyaCoatOfArmsProps> = ({
    width = 118,
    height = 105,
    className = '',
    alt = 'Republic of Kenya Coat of Arms'
}) => {
    return (
        <div 
            className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
            style={{ width, height }}
        >
            <img
                src="/kenya_coat_of_arms.png"
                alt={alt}
                className="w-full h-full object-contain filter contrast-[1.02] drop-shadow-xs"
                loading="eager"
                decoding="sync"
            />
        </div>
    );
};
