import React from 'react';
import type { Institution } from '../../types';
import type { LeavingCertificateTemplateType, LeavingCertificateFormData } from '../../types/leavingCertificate';
import { LEAVING_CERTIFICATE_TEMPLATES } from '../../utils/leavingCertificateTemplates';
import { KenyaCoatOfArms } from '../common/KenyaCoatOfArms';
import { GuillocheSecurityPattern } from '../common/GuillocheSecurityPattern';
import { KenyanOfficialStamp } from '../common/KenyanOfficialStamp';

export interface LeavingCertificateSheetProps {
    templateType: LeavingCertificateTemplateType;
    data: LeavingCertificateFormData;
    institution?: Institution | null;
    scale?: number;
    showStamp?: boolean;
    className?: string;
    id?: string;
}

/**
 * Printable Official Kenyan School Leaving Certificate Sheet (A4 Standard)
 * Supports JSS (CBC Transition), Primary School, and Secondary School templates.
 */
export const LeavingCertificateSheet: React.FC<LeavingCertificateSheetProps> = ({
    templateType,
    data,
    institution,
    scale = 1,
    showStamp = true,
    className = '',
    id = 'leaving-certificate-sheet'
}) => {
    const template = LEAVING_CERTIFICATE_TEMPLATES[templateType] || LEAVING_CERTIFICATE_TEMPLATES.jss;
    const effectiveSchoolName = (data.schoolName || institution?.name || 'ACADEMIC INSTITUTION').toUpperCase().trim();

    return (
        <div
            id={id}
            className={`relative bg-[#fbfdfa] text-slate-900 border border-slate-300 shadow-xl overflow-hidden print:border-none print:shadow-none print:m-0 print:p-0 mx-auto select-none ${className}`}
            style={{
                width: `${Math.round(794 * scale)}px`,
                minHeight: `${Math.round(1123 * scale)}px`,
                fontSize: `${14 * scale}px`,
                lineHeight: 1.5,
                fontFamily: '"Times New Roman", Times, Georgia, serif',
                boxSizing: 'border-box'
            }}
        >
            {/* Guilloche Security Background */}
            <GuillocheSecurityPattern opacity={0.22} color="#15803d" />

            {/* Certificate Outer Double Security Border */}
            <div className="absolute inset-4 border-[3px] border-emerald-900/60 pointer-events-none p-1">
                <div className="w-full h-full border border-emerald-800/40" />
            </div>

            {/* Inner Content Container */}
            <div className="relative z-10 px-10 pt-8 pb-10 flex flex-col justify-between min-h-[1100px] h-full">
                
                {/* --- HEADER BLOCK --- */}
                <div>
                    {/* Centered Official Coat of Arms */}
                    <div className="flex justify-center mb-3">
                        <KenyaCoatOfArms width={118 * scale} height={105 * scale} />
                    </div>

                    {/* Official Ministry & Examination Headers */}
                    <div className="text-center space-y-1">
                        <h1 
                            className="font-black tracking-wider text-slate-950 uppercase"
                            style={{ 
                                fontSize: `${17 * scale}px`,
                                fontFamily: 'Arial, Helvetica, sans-serif'
                            }}
                        >
                            {template.ministryHeader}
                        </h1>

                        <h2 
                            className="font-black tracking-wide text-slate-900 uppercase"
                            style={{ 
                                fontSize: `${16 * scale}px`,
                                fontFamily: 'Arial, Helvetica, sans-serif'
                            }}
                        >
                            {template.assessmentTitle}
                        </h2>

                        <h3 
                            className="font-black tracking-widest text-slate-900 uppercase pt-1"
                            style={{ 
                                fontSize: `${19 * scale}px`,
                                letterSpacing: '2px'
                            }}
                        >
                            {template.certificateTitle}
                        </h3>
                    </div>

                    {/* Top-Left Framed ID Box (ASS. NO. / INDEX NO.) & Serial */}
                    <div className="flex justify-between items-start mt-4 px-2">
                        {/* Framed ASS. NO. Box */}
                        <div 
                            className="border-[3px] border-slate-900 bg-white/70 px-4 py-1.5 shadow-xs min-w-[170px]"
                            style={{ borderRadius: '2px' }}
                        >
                            <span 
                                className="block font-black text-slate-950 uppercase tracking-widest text-[13px]"
                                style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                            >
                                {template.idBoxLabel}
                            </span>
                            <span className="block font-bold text-slate-900 text-[16px] tracking-widest mt-0.5 min-h-[22px]">
                                {data.assessmentNo || '—'}
                            </span>
                        </div>

                        {/* Certificate Serial Tracking Badge */}
                        <div className="text-right text-[11px] font-sans font-bold text-slate-600 uppercase tracking-wider">
                            <span>SERIAL NO: </span>
                            <span className="font-mono text-slate-950 text-[13px]">{data.certificateNo || 'PENDING'}</span>
                        </div>
                    </div>
                </div>

                {/* --- CERTIFICATION BODY STATEMENT (With Classic Dotted Line Fills) --- */}
                <div className="mt-6 space-y-4 px-2 text-[14.5px] leading-[2.1]">
                    {/* Line 1: THIS IS TO CERTIFY THAT */}
                    <div className="flex items-baseline w-full">
                        <span className="shrink-0 font-bold uppercase tracking-wider text-slate-900 mr-2">
                            THIS IS TO CERTIFY THAT
                        </span>
                        <div className="grow border-b-2 border-dotted border-slate-700 px-3 text-center font-bold text-slate-950 uppercase tracking-widest text-[16px]">
                            {data.studentName || '—'}
                        </div>
                    </div>

                    {/* Line 2: DATE OF BIRTH ... ENTERED ... SCHOOL AND WAS */}
                    <div className="flex items-baseline w-full flex-wrap gap-y-2">
                        <span className="shrink-0 font-bold uppercase tracking-wide text-slate-900 mr-2">
                            DATE OF BIRTH
                        </span>
                        <div className="w-[180px] border-b-2 border-dotted border-slate-700 px-2 text-center font-bold text-slate-950">
                            {data.dateOfBirth || '—'}
                        </div>
                        <span className="shrink-0 font-bold uppercase tracking-wide text-slate-900 mx-2">
                            ENTERED
                        </span>
                        <div className="grow border-b-2 border-dotted border-slate-700 px-2 text-center font-bold text-slate-950 uppercase tracking-wider">
                            {effectiveSchoolName}
                        </div>
                        <span className="shrink-0 font-bold uppercase tracking-wide text-slate-900 ml-2">
                            SCHOOL AND WAS
                        </span>
                    </div>

                    {/* Line 3: ENROLLED ON ... IN GRADE ... AND LEFT */}
                    <div className="flex items-baseline w-full flex-wrap gap-y-2">
                        <span className="shrink-0 font-bold uppercase tracking-wide text-slate-900 mr-2">
                            ENROLLED ON
                        </span>
                        <div className="w-[190px] border-b-2 border-dotted border-slate-700 px-2 text-center font-bold text-slate-950">
                            {data.enrollmentDate || '—'}
                        </div>
                        <span className="shrink-0 font-bold uppercase tracking-wide text-slate-900 mx-2">
                            IN GRADE
                        </span>
                        <div className="w-[140px] border-b-2 border-dotted border-slate-700 px-2 text-center font-bold text-slate-950 uppercase">
                            {data.entryGrade || template.defaultEntryGrade}
                        </div>
                        <span className="shrink-0 font-bold uppercase tracking-wide text-slate-900 ml-auto mr-2">
                            AND LEFT
                        </span>
                    </div>

                    {/* Line 4: ON ... AT GRADE ... HAVING SATISFACTORILY */}
                    <div className="flex items-baseline w-full flex-wrap gap-y-2">
                        <span className="shrink-0 font-bold uppercase tracking-wide text-slate-900 mr-2">
                            ON
                        </span>
                        <div className="w-[180px] border-b-2 border-dotted border-slate-700 px-2 text-center font-bold text-slate-950">
                            {data.leavingDate || '—'}
                        </div>
                        <span className="shrink-0 font-bold uppercase tracking-wide text-slate-900 mx-2">
                            AT GRADE
                        </span>
                        <div className="w-[140px] border-b-2 border-dotted border-slate-700 px-2 text-center font-bold text-slate-950 uppercase">
                            {data.exitGrade || template.defaultExitGrade}
                        </div>
                        <span className="shrink-0 font-bold uppercase tracking-wide text-slate-900 ml-auto">
                            HAVING SATISFACTORILY
                        </span>
                    </div>

                    {/* Line 5: COMPLETED THE APPROVED COURSE FOR */}
                    <div className="flex items-baseline w-full">
                        <span className="shrink-0 font-bold uppercase tracking-wider text-slate-900 mr-2">
                            COMPLETED THE APPROVED COURSE FOR
                        </span>
                        <div className="grow border-b-2 border-dotted border-slate-700 px-2 text-center font-bold text-slate-950 uppercase tracking-wider">
                            {data.approvedCourse || template.defaultCourse}
                        </div>
                    </div>
                </div>

                {/* --- TEMPLATE SPECIFIC EVALUATION SECTIONS --- */}
                <div className="mt-5 space-y-4 px-2">
                    {/* JSS TEMPLATE (Matching User's Reference Photo) */}
                    {templateType === 'jss' && (
                        <>
                            {/* Section 1: CORE COMPETENCIES */}
                            <div className="space-y-1">
                                <h4 className="font-black text-slate-950 uppercase tracking-wider text-[13px] font-sans">
                                    HEAD TEACHER&apos;S REPORT ON CORE COMPETENCIES ACHIEVED
                                </h4>
                                <div className="border-b-2 border-dotted border-slate-700 pb-1 text-[13.5px] font-medium text-slate-900 min-h-[46px] leading-relaxed italic">
                                    {data.coreCompetenciesAchieved || 'Demonstrated commendable mastery of CBC core competencies with strong communication, critical thinking, problem-solving, and digital literacy skills.'}
                                </div>
                            </div>

                            {/* Section 2: SOCIAL / BEHAVIOUR REPORT */}
                            <div className="space-y-1">
                                <h4 className="font-black text-slate-950 uppercase tracking-wider text-[13px] font-sans">
                                    LEARNER&apos;S SOCIAL/BEHAVIOUR REPORT
                                </h4>
                                <div className="border-b-2 border-dotted border-slate-700 pb-1 text-[13.5px] font-medium text-slate-900 min-h-[42px] leading-relaxed italic">
                                    {data.socialBehaviourReport || 'Exemplary discipline, polite, obedient, cooperative with educators, and fosters respectful interpersonal relations with fellow peers.'}
                                </div>
                            </div>

                            {/* Section 3: COMMUNITY SERVICE LEARNING (CSL) */}
                            <div className="space-y-1">
                                <h4 className="font-black text-slate-950 uppercase tracking-wider text-[13px] font-sans">
                                    LEARNER&apos;S PARTICIPATION IN COMMUNITY SERVICE LEARNING (CSL)
                                </h4>
                                <div className="border-b-2 border-dotted border-slate-700 pb-1 text-[13.5px] font-medium text-slate-900 min-h-[42px] leading-relaxed italic">
                                    {data.cslParticipation || 'Actively engaged in school environmental greening, community clean-up projects, and peer educational mentorship initiatives.'}
                                </div>
                            </div>
                        </>
                    )}

                    {/* PRIMARY SCHOOL TEMPLATE */}
                    {templateType === 'primary' && (
                        <>
                            <div className="space-y-1">
                                <h4 className="font-black text-slate-950 uppercase tracking-wider text-[13px] font-sans">
                                    HEAD TEACHER&apos;S REPORT ON ACADEMIC ABILITY & INDUSTRY
                                </h4>
                                <div className="border-b-2 border-dotted border-slate-700 pb-1 text-[13.5px] font-medium text-slate-900 min-h-[38px] leading-relaxed italic">
                                    {data.academicAbility || data.coreCompetenciesAchieved || 'Hardworking, intellectually diligent, attentive in all class lessons, and shows excellent scholastic promise.'}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h4 className="font-black text-slate-950 uppercase tracking-wider text-[13px] font-sans">
                                    PUPIL&apos;S CHARACTER & CONDUCT REPORT
                                </h4>
                                <div className="border-b-2 border-dotted border-slate-700 pb-1 text-[13.5px] font-medium text-slate-900 min-h-[38px] leading-relaxed italic">
                                    {data.characterConduct || data.socialBehaviourReport || 'Very well disciplined, honest, respectful to authorities, and demonstrates sound moral responsibility.'}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h4 className="font-black text-slate-950 uppercase tracking-wider text-[13px] font-sans">
                                    GAMES, ATHLETICS & SPECIAL RESPONSIBILITIES HELD
                                </h4>
                                <div className="border-b-2 border-dotted border-slate-700 pb-1 text-[13.5px] font-medium text-slate-900 min-h-[38px] leading-relaxed italic">
                                    {data.gamesAndSports || data.responsibilitiesHeld || 'Participated actively in track athletics and football. Served diligently as Class Monitor with commendable maturity.'}
                                </div>
                            </div>
                        </>
                    )}

                    {/* SECONDARY SCHOOL TEMPLATE */}
                    {templateType === 'secondary' && (
                        <>
                            <div className="space-y-1">
                                <h4 className="font-black text-slate-950 uppercase tracking-wider text-[13px] font-sans">
                                    PRINCIPAL&apos;S REPORT ON ACADEMIC ABILITY & GENERAL ATTITUDE
                                </h4>
                                <div className="border-b-2 border-dotted border-slate-700 pb-1 text-[13.5px] font-medium text-slate-900 min-h-[36px] leading-relaxed italic">
                                    {data.academicAbility || 'Possesses sharp intellectual aptitude, consistently methodical in studies, and displays exceptional potential for higher education.'}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h4 className="font-black text-slate-950 uppercase tracking-wider text-[13px] font-sans">
                                    STUDENT&apos;S CHARACTER & DISCIPLINARY RECORD
                                </h4>
                                <div className="border-b-2 border-dotted border-slate-700 pb-1 text-[13.5px] font-medium text-slate-900 min-h-[36px] leading-relaxed italic">
                                    {data.characterConduct || data.socialBehaviourReport || 'Exemplary character, highly trustworthy, demonstrated impeccable self-discipline throughout the four-year course.'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <h4 className="font-black text-slate-950 uppercase tracking-wider text-[12px] font-sans">
                                        GAMES, SPORTS & CO-CURRICULAR
                                    </h4>
                                    <div className="border-b-2 border-dotted border-slate-700 pb-1 text-[13px] font-medium text-slate-900 min-h-[34px] leading-relaxed italic">
                                        {data.gamesAndSports || 'Active in School Soccer Team and Inter-house Athletics.'}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h4 className="font-black text-slate-950 uppercase tracking-wider text-[12px] font-sans">
                                        CLUBS, SOCIETIES & RESPONSIBILITIES
                                    </h4>
                                    <div className="border-b-2 border-dotted border-slate-700 pb-1 text-[13px] font-medium text-slate-900 min-h-[34px] leading-relaxed italic">
                                        {data.clubsAndSocieties || data.responsibilitiesHeld || 'Science Club Chairman, Scouts Leader, Senior Prefect.'}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* --- FOOTER: SIGNATURES, DATE & OFFICIAL RUBBER STAMP --- */}
                <div className="mt-8 pt-4 px-2 space-y-4">
                    {/* Line 1: LEARNER'S SIGNATURE */}
                    <div className="flex items-baseline w-full">
                        <span className="shrink-0 font-bold uppercase tracking-wider text-slate-950 text-[13px] font-sans mr-2">
                            LEARNER&apos;S SIGNATURE
                        </span>
                        <div className="grow border-b-2 border-dotted border-slate-700 min-h-[20px]" />
                    </div>

                    {/* Line 2: HEADTEACHER'S NAME ... DATE ... */}
                    <div className="flex items-baseline w-full gap-4">
                        <div className="flex items-baseline grow">
                            <span className="shrink-0 font-bold uppercase tracking-wider text-slate-950 text-[13px] font-sans mr-2">
                                {templateType === 'secondary' ? "PRINCIPAL'S NAME" : "HEADTEACHER'S NAME"}
                            </span>
                            <div className="grow border-b-2 border-dotted border-slate-700 px-2 font-bold text-slate-950 uppercase tracking-wider">
                                {data.headteacherName || '—'}
                            </div>
                        </div>

                        <div className="flex items-baseline w-[220px]">
                            <span className="shrink-0 font-bold uppercase tracking-wider text-slate-950 text-[13px] font-sans mr-2">
                                DATE
                            </span>
                            <div className="grow border-b-2 border-dotted border-slate-700 px-2 font-bold text-slate-950 text-center">
                                {data.issueDate || '—'}
                            </div>
                        </div>
                    </div>

                    {/* Line 3: HEADTEACHER'S SIGNATURE ... STAMP ... */}
                    <div className="flex items-center justify-between pt-2">
                        {/* Signature Line */}
                        <div className="flex items-baseline w-[340px]">
                            <span className="shrink-0 font-bold uppercase tracking-wider text-slate-950 text-[13px] font-sans mr-2">
                                {templateType === 'secondary' ? "PRINCIPAL'S SIGNATURE" : "HEADTEACHER'S SIGNATURE"}
                            </span>
                            <div className="grow border-b-2 border-dotted border-slate-700 min-h-[22px]" />
                        </div>

                        {/* Official Rubber Stamp Section */}
                        <div className="flex items-center gap-3">
                            <span className="font-black uppercase tracking-wider text-slate-950 text-[14px] font-sans">
                                STAMP
                            </span>
                            <div className="w-[140px] h-[100px] flex items-center justify-center relative">
                                {showStamp && data.includeOfficialStamp ? (
                                    <div className="transform -rotate-6 transition-transform">
                                        <KenyanOfficialStamp
                                            institution={institution}
                                            date={data.issueDate}
                                            size={95}
                                            departmentOverride={data.stampDepartment || 'OFFICIAL LEAVING CERTIFICATE'}
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full h-full border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-sans uppercase font-bold tracking-wider">
                                        Official Stamp Area
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Official Warning Tag */}
                    <div className="text-center pt-2">
                        <p className="text-[10px] font-sans font-bold text-slate-600 uppercase tracking-widest">
                            * This Certificate is issued without any erasure or alteration whatsoever *
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};
