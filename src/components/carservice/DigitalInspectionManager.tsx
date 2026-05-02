import React from 'react';
import type { User } from '../../types';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';


interface DigitalInspectionManagerProps {
}

export const DigitalInspectionManager: React.FC<DigitalInspectionManagerProps> = ({
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[700px] items-center justify-center text-center p-8">
            <ClipboardListIcon className="w-12 h-12" />
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">Digital Vehicle Inspections</h2>
            <p className="text-slate-500 font-medium max-w-md">The DVI module allows technicians to perform multi-point inspections with photos and videos. This feature is currently in development and will be available in the next update.</p>
            <div className="mt-8 px-6 py-3 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl">
                Coming Soon
            </div>
        </div>
    );
};

