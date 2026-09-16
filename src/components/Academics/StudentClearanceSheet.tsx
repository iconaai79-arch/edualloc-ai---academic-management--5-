import React from 'react';
import type { StudentClearanceRecord } from '../../types/clearance';
import type { Institution } from '../../types';

interface StudentClearanceSheetProps {
    record: StudentClearanceRecord;
    institution?: Institution | null;
}

export const StudentClearanceSheet: React.FC<StudentClearanceSheetProps> = ({ record, institution }) => {
    const instName = institution?.name || 'MIDA COMPREHENSIVE SCHOOL';
    const boxNumber = (institution as any)?.boxNumber || institution?.address || 'P.O. BOX 39 - 80802';
    const town = (institution as any)?.town || (institution as any)?.city || 'GEDE';

    return (
        <div className="clearance-sheet-container bg-white text-black p-8 sm:p-12 max-w-[210mm] mx-auto min-h-[297mm] font-serif shadow-xl print:shadow-none print:p-6 print:m-0 print:w-full print:max-w-none text-[12px] leading-tight">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 12mm 15mm;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .clearance-sheet-container {
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                }
            ` }} />

            {/* School Header */}
            <div className="text-center font-bold uppercase tracking-wider space-y-0.5 mb-5">
                <h1 className="text-base sm:text-lg font-black tracking-wide">{instName}</h1>
                <p className="text-xs font-semibold">{boxNumber.toUpperCase()}</p>
                <p className="text-xs font-semibold">{town.toUpperCase()}</p>
                <h2 className="text-sm font-black underline tracking-wide mt-2">
                    JUNIOR SCHOOL CLEARANCE FORM
                </h2>
            </div>

            {/* Student Metadata Header */}
            <div className="grid grid-cols-12 gap-2 font-bold text-xs uppercase mb-3 items-end">
                <div className="col-span-5 flex items-baseline">
                    <span className="shrink-0 mr-1.5">NAME</span>
                    <span className="border-b border-dotted border-black flex-1 font-normal uppercase pl-1 truncate">
                        {record.studentName || '...................................................'}
                    </span>
                </div>
                <div className="col-span-3 flex items-baseline">
                    <span className="shrink-0 mr-1.5">ASS. NO.</span>
                    <span className="border-b border-dotted border-black flex-1 font-normal pl-1 truncate">
                        {record.assessmentNo || record.admissionNumber || '............................'}
                    </span>
                </div>
                <div className="col-span-2 flex items-baseline">
                    <span className="shrink-0 mr-1.5">GRADE</span>
                    <span className="border-b border-dotted border-black flex-1 font-normal pl-1 text-center">
                        {record.grade || '........'}
                    </span>
                </div>
                <div className="col-span-2 flex items-baseline">
                    <span className="shrink-0 mr-1.5">YEAR</span>
                    <span className="border-b border-dotted border-black flex-1 font-normal pl-1 text-center">
                        {record.year || new Date().getFullYear().toString()}
                    </span>
                </div>
            </div>

            {/* Official Notice */}
            <p className="text-[11px] text-justify leading-relaxed mb-3 text-slate-800">
                This form must be completed in duplicate by any student wishing to leave the school or at the end of junior school assessment in grade 9. All the sections must be filled in fully and submitted to the deputy principal.
            </p>

            {/* 16-Row Clearance Table */}
            <table className="w-full border-collapse border border-black text-[11px] mb-4">
                <thead>
                    <tr className="border-b border-black font-bold">
                        <th className="border-r border-black p-1 text-center w-12 font-bold">S.no</th>
                        <th className="border-r border-black p-1 text-left w-48 font-bold">Subject/area</th>
                        <th className="border-r border-black p-1 text-left font-bold">Teacher’s name</th>
                        <th className="border-r border-black p-1 text-left font-bold">Item lost/damaged</th>
                        <th className="p-1 text-center w-28 font-bold">signature</th>
                    </tr>
                </thead>
                <tbody>
                    {record.clearanceItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-black h-6">
                            <td className="border-r border-black p-1 text-center font-bold">{item.sNo}</td>
                            <td className="border-r border-black p-1 font-medium">{item.subjectArea}</td>
                            <td className="border-r border-black p-1 truncate max-w-[140px]">{item.teacherName || ''}</td>
                            <td className="border-r border-black p-1 text-red-700 font-medium truncate max-w-[160px]">
                                {item.itemLostOrDamaged || ''}
                            </td>
                            <td className="p-1 text-center font-mono text-[9px] truncate">
                                {item.signature || (item.status === 'cleared' ? '✓ Cleared' : '')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* PTA Section */}
            <div className="mb-4 text-xs font-bold space-y-1">
                <span className="underline block uppercase font-black">PTA</span>
                <div className="flex justify-between items-baseline pt-0.5">
                    <div className="flex items-baseline flex-1 mr-4">
                        <span className="shrink-0 mr-1">Total amount owed to the school (kshs)</span>
                        <span className="border-b border-dotted border-black flex-1 font-semibold pl-2">
                            {record.ptaSection?.totalAmountOwed !== undefined 
                                ? `${record.ptaSection.totalAmountOwed.toLocaleString()}/=` 
                                : '.............................................................'}
                        </span>
                    </div>
                    <div className="flex items-baseline w-56">
                        <span className="shrink-0 mr-1">Sign:</span>
                        <span className="border-b border-dotted border-black flex-1 pl-1 font-normal font-mono text-[10px] truncate">
                            {record.ptaSection?.bursarSignature || '...........................................'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Principal's or D/principal's comments */}
            <div className="border-t border-black pt-2 space-y-2 text-xs">
                <span className="font-black underline block uppercase">
                    Principal’s or D/principal’s comments
                </span>

                <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-center shrink-0">
                        <span>Release of documents</span>
                        <span className="ml-3 inline-flex items-center">
                            &#123;{record.principalApproval?.releaseOfDocuments === 'yes' ? <strong className="px-1 text-emerald-800">yes</strong> : 'yes'}&#125;
                        </span>
                        <span className="ml-2 inline-flex items-center">
                            &#123;{record.principalApproval?.releaseOfDocuments === 'no' ? <strong className="px-1 text-red-800">no</strong> : 'no'}&#125;
                        </span>
                        <span className="mx-1">.</span>
                    </div>

                    <div className="flex items-baseline flex-1">
                        <span className="shrink-0 mr-1">comment:</span>
                        <span className="border-b border-dotted border-black flex-1 pl-1 font-normal italic truncate">
                            {record.principalApproval?.comments || '...........................................................................................................'}
                        </span>
                    </div>
                </div>

                <div className="flex justify-between items-end pt-8">
                    <div className="text-center w-64">
                        {record.principalApproval?.officialStampUrl ? (
                            <img 
                                src={record.principalApproval.officialStampUrl} 
                                alt="Official Stamp" 
                                className="w-24 h-24 mx-auto object-contain opacity-90 mb-1" 
                            />
                        ) : (
                            <div className="w-48 border-b border-black mb-1 mx-auto" />
                        )}
                        <span className="text-[10px] font-bold block uppercase tracking-tight">
                            Principal’s or D/principal’s official stamp&#93;
                        </span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-baseline w-60">
                            <span className="shrink-0 mr-1 text-xs">Sign:</span>
                            <span className="border-b border-dotted border-black flex-1 pl-1 font-mono text-[10px] truncate">
                                {record.principalApproval?.signature || '...................................................'}
                            </span>
                        </div>
                        <div className="flex items-baseline w-60">
                            <span className="shrink-0 mr-1 text-xs">Date:</span>
                            <span className="border-b border-dotted border-black flex-1 pl-1 text-[11px] truncate">
                                {record.principalApproval?.date || '...................................................'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
