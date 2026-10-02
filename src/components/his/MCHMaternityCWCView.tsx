import React, { useState, useEffect } from 'react';
import { 
    HISPatient, 
    HISANCRecord, 
    HISANCVisit, 
    HISDeliveryRecord, 
    HISCWCRecord, 
    HISImmunizationDose, 
    HISGrowthRecord, 
    HISNBUAdmission 
} from '../../types';
import { apiService } from '../../services/apiService';
import { PlusIcon } from '../icons/PlusIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { HeartIcon, ActivityIcon, CalendarIcon, ClockIcon } from './HealthIcons';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { XIcon } from '../icons/XIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { BellIcon } from '../icons/BellIcon';
import { StethoscopeIcon } from '../icons/StethoscopeIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';

interface MCHMaternityCWCViewProps {
    patients?: HISPatient[];
    institutionId?: string;
    userName?: string;
}

export function MCHMaternityCWCView({ patients = [], institutionId, userName }: MCHMaternityCWCViewProps) {
    const [activeTab, setActiveTab] = useState<'anc' | 'delivery' | 'cwc' | 'nbu'>('anc');

    // Data lists
    const [ancRecords, setAncRecords] = useState<HISANCRecord[]>([]);
    const [deliveryRecords, setDeliveryRecords] = useState<HISDeliveryRecord[]>([]);
    const [cwcRecords, setCwcRecords] = useState<HISCWCRecord[]>([]);
    const [nbuAdmissions, setNbuAdmissions] = useState<HISNBUAdmission[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Modals state
    const [isEnrollAncModalOpen, setIsEnrollAncModalOpen] = useState(false);
    const [isRecordAncVisitModalOpen, setIsRecordAncVisitModalOpen] = useState(false);
    const [selectedAncRecord, setSelectedAncRecord] = useState<HISANCRecord | null>(null);

    const [isRecordDeliveryModalOpen, setIsRecordDeliveryModalOpen] = useState(false);
    const [isRecordImmunizationModalOpen, setIsRecordImmunizationModalOpen] = useState(false);
    const [selectedCwcRecord, setSelectedCwcRecord] = useState<HISCWCRecord | null>(null);

    const [isAdmitNbuModalOpen, setIsAdmitNbuModalOpen] = useState(false);
    const [isRecordNbuWeightModalOpen, setIsRecordNbuWeightModalOpen] = useState(false);
    const [selectedNbuAdmission, setSelectedNbuAdmission] = useState<HISNBUAdmission | null>(null);

    // Filter & search states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMilestone, setSelectedMilestone] = useState<string>('All');

    // Load records from Database
    const loadMchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const [anc, del, cwc, nbu] = await Promise.all([
                apiService.fetchModuleRecords('his_anc_records', institutionId).catch(() => []),
                apiService.fetchModuleRecords('his_delivery_records', institutionId).catch(() => []),
                apiService.fetchModuleRecords('his_cwc_immunizations', institutionId).catch(() => []),
                apiService.fetchModuleRecords('his_nbu_admissions', institutionId).catch(() => [])
            ]);

            // Fallback to rich sample data if DB has no records yet
            if (anc && anc.length > 0) {
                setAncRecords(anc);
            } else {
                setAncRecords([
                    {
                        id: 'anc_101',
                        institutionId: institutionId || 'inst_01',
                        motherId: patients[0]?.id || 'pat_01',
                        motherName: patients[0]?.fullName || 'Jane Wanjiku Njeri',
                        lmp: '2026-01-15',
                        edd: '2026-10-22',
                        gravida: 2,
                        parity: 1,
                        gestationWeeks: 30,
                        bloodGroup: 'O+',
                        rhesus: 'Positive',
                        heightCm: 162,
                        highRiskFactors: ['Previous C-Section (2024)', 'Mild Anemia (Hb 10.4)'],
                        pmtctStatus: 'Negative',
                        syphilisStatus: 'Negative',
                        hepatitisBStatus: 'Negative',
                        ultrasoundSummary: 'Single live intrauterine gestation, cephalic presentation, adequate liquor (AFI 14cm). Placenta posterior high.',
                        status: 'Active',
                        visits: [
                            {
                                visitNumber: 1,
                                date: '2026-03-12',
                                gestationWeeks: 8,
                                fundalHeightCm: 8,
                                presentation: 'Vertex / Cephalic',
                                fetalHeartRateBpm: 148,
                                bloodPressure: '118/76',
                                weightKg: 62,
                                urinalysisProtein: 'Nil',
                                urinalysisGlucose: 'Nil',
                                ifasSupplied: true,
                                iptpDose: 'None',
                                ttVaccineGiven: true,
                                clinician: userName || 'Dr. Attending'
                            },
                            {
                                visitNumber: 2,
                                date: '2026-05-20',
                                gestationWeeks: 18,
                                fundalHeightCm: 18,
                                presentation: 'Vertex / Cephalic',
                                fetalHeartRateBpm: 144,
                                bloodPressure: '120/80',
                                weightKg: 65,
                                urinalysisProtein: 'Nil',
                                urinalysisGlucose: 'Nil',
                                ifasSupplied: true,
                                iptpDose: 'IPTp 1',
                                ttVaccineGiven: true,
                                clinician: userName || 'Dr. Attending'
                            },
                            {
                                visitNumber: 3,
                                date: '2026-07-14',
                                gestationWeeks: 26,
                                fundalHeightCm: 26,
                                presentation: 'Vertex / Cephalic',
                                fetalHeartRateBpm: 140,
                                bloodPressure: '124/82',
                                weightKg: 68,
                                urinalysisProtein: 'Nil',
                                urinalysisGlucose: 'Nil',
                                ifasSupplied: true,
                                iptpDose: 'IPTp 2',
                                ttVaccineGiven: false,
                                nextVisitDate: '2026-08-25',
                                clinician: userName || 'Dr. Attending'
                            }
                        ]
                    },
                    {
                        id: 'anc_102',
                        institutionId: institutionId || 'inst_01',
                        motherId: patients[1]?.id || 'pat_02',
                        motherName: patients[1]?.fullName || 'Mercy Chebet Korir',
                        lmp: '2026-03-01',
                        edd: '2026-12-08',
                        gravida: 1,
                        parity: 0,
                        gestationWeeks: 24,
                        bloodGroup: 'B+',
                        rhesus: 'Positive',
                        heightCm: 158,
                        highRiskFactors: ['Primigravida'],
                        pmtctStatus: 'Negative',
                        syphilisStatus: 'Negative',
                        hepatitisBStatus: 'Negative',
                        ultrasoundSummary: 'Normal fetal anatomy scan at 20 wks.',
                        status: 'Active',
                        visits: [
                            {
                                visitNumber: 1,
                                date: '2026-04-10',
                                gestationWeeks: 6,
                                fundalHeightCm: 6,
                                presentation: 'Vertex / Cephalic',
                                fetalHeartRateBpm: 150,
                                bloodPressure: '110/70',
                                weightKg: 55,
                                urinalysisProtein: 'Nil',
                                urinalysisGlucose: 'Nil',
                                ifasSupplied: true,
                                iptpDose: 'None',
                                ttVaccineGiven: true,
                                clinician: userName || 'Dr. Attending'
                            },
                            {
                                visitNumber: 2,
                                date: '2026-06-25',
                                gestationWeeks: 17,
                                fundalHeightCm: 17,
                                presentation: 'Vertex / Cephalic',
                                fetalHeartRateBpm: 142,
                                bloodPressure: '114/74',
                                weightKg: 58,
                                urinalysisProtein: 'Nil',
                                urinalysisGlucose: 'Nil',
                                ifasSupplied: true,
                                iptpDose: 'IPTp 1',
                                ttVaccineGiven: true,
                                nextVisitDate: '2026-09-05',
                                clinician: userName || 'Dr. Attending'
                            }
                        ]
                    }
                ]);
            }

            if (del && del.length > 0) {
                setDeliveryRecords(del);
            } else {
                setDeliveryRecords([
                    {
                        id: 'del_201',
                        institutionId: institutionId || 'inst_01',
                        motherId: 'pat_03',
                        motherName: 'Faith Mutua Mwende',
                        babyId: 'baby_01',
                        babyName: 'Baby of Faith Mutua',
                        deliveryDate: new Date().toISOString().slice(0, 10),
                        deliveryTime: '06:45 AM',
                        gestationWeeks: 39,
                        deliveryMode: 'Spontaneous Vertex (SVD)',
                        episiotomyTear: 'None',
                        bloodLossMl: 200,
                        oxytocinGiven: true,
                        placentaComplete: true,
                        babyGender: 'Female',
                        birthWeightKg: 3.35,
                        apgar1Min: 9,
                        apgar5Min: 10,
                        resuscitationDone: false,
                        babyStatus: 'Healthy / In-Room with Mother',
                        deliveredBy: 'Nurse Midwife Pamela',
                        notes: 'Smooth labor progression. Mother initiated breastfeeding within 30 minutes of birth.'
                    }
                ]);
            }

            if (cwc && cwc.length > 0) {
                setCwcRecords(cwc);
            } else {
                setCwcRecords([
                    {
                        id: 'cwc_301',
                        institutionId: institutionId || 'inst_01',
                        childId: 'child_101',
                        childName: 'Ethan Kipchumba',
                        motherId: 'pat_01',
                        motherName: 'Jane Wanjiku Njeri',
                        dob: '2026-02-10',
                        gender: 'Male',
                        birthWeightKg: 3.2,
                        immunizations: [
                            { vaccineCode: 'BCG', vaccineName: 'BCG (Tuberculosis)', doseNumber: 1, ageMilestone: 'Birth', dateGiven: '2026-02-10', site: 'Right Forearm', administeredBy: 'Nurse Pamela' },
                            { vaccineCode: 'OPV_0', vaccineName: 'Oral Polio Vaccine 0', doseNumber: 1, ageMilestone: 'Birth', dateGiven: '2026-02-10', site: 'Oral', administeredBy: 'Nurse Pamela' },
                            { vaccineCode: 'PENTA_1', vaccineName: 'Pentavalent 1 (DPT-HepB-Hib)', doseNumber: 1, ageMilestone: '6 Weeks', dateGiven: '2026-03-24', site: 'Left Thigh', administeredBy: 'Nurse Grace' },
                            { vaccineCode: 'PCV_1', vaccineName: 'Pneumococcal (PCV 10) 1', doseNumber: 1, ageMilestone: '6 Weeks', dateGiven: '2026-03-24', site: 'Right Thigh', administeredBy: 'Nurse Grace' },
                            { vaccineCode: 'ROTA_1', vaccineName: 'Rotavirus 1', doseNumber: 1, ageMilestone: '6 Weeks', dateGiven: '2026-03-24', site: 'Oral', administeredBy: 'Nurse Grace' },
                            { vaccineCode: 'PENTA_2', vaccineName: 'Pentavalent 2 (DPT-HepB-Hib)', doseNumber: 2, ageMilestone: '10 Weeks', dateGiven: '2026-04-22', site: 'Left Thigh', administeredBy: 'Nurse Grace' },
                            { vaccineCode: 'PCV_2', vaccineName: 'Pneumococcal (PCV 10) 2', doseNumber: 2, ageMilestone: '10 Weeks', dateGiven: '2026-04-22', site: 'Right Thigh', administeredBy: 'Nurse Grace' },
                            { vaccineCode: 'ROTA_2', vaccineName: 'Rotavirus 2', doseNumber: 2, ageMilestone: '10 Weeks', dateGiven: '2026-04-22', site: 'Oral', administeredBy: 'Nurse Grace' },
                            { vaccineCode: 'PENTA_3', vaccineName: 'Pentavalent 3 (DPT-HepB-Hib)', doseNumber: 3, ageMilestone: '14 Weeks', dateGiven: '2026-05-20', site: 'Left Thigh', administeredBy: 'Nurse Grace' },
                            { vaccineCode: 'PCV_3', vaccineName: 'Pneumococcal (PCV 10) 3', doseNumber: 3, ageMilestone: '14 Weeks', dateGiven: '2026-05-20', site: 'Right Thigh', administeredBy: 'Nurse Grace' },
                            { vaccineCode: 'IPV', vaccineName: 'Inactivated Polio (IPV)', doseNumber: 1, ageMilestone: '14 Weeks', dateGiven: '2026-05-20', site: 'Right Forearm', administeredBy: 'Nurse Grace' }
                        ],
                        growthRecords: [
                            { date: '2026-02-10', ageMonths: 0, weightKg: 3.2, heightCm: 50, muacCm: 11.0, zScoreStatus: 'Normal Growth', feedingType: 'Exclusive Breastfeeding' },
                            { date: '2026-03-24', ageMonths: 1.5, weightKg: 4.6, heightCm: 55, muacCm: 12.2, zScoreStatus: 'Normal Growth', feedingType: 'Exclusive Breastfeeding' },
                            { date: '2026-05-20', ageMonths: 3.5, weightKg: 6.3, heightCm: 61, muacCm: 13.5, zScoreStatus: 'Normal Growth', feedingType: 'Exclusive Breastfeeding' },
                            { date: '2026-08-10', ageMonths: 6.0, weightKg: 7.8, heightCm: 67, muacCm: 14.2, zScoreStatus: 'Normal Growth', feedingType: 'Complementary Weaning', vitAGiven: true }
                        ],
                        nextClinicDate: '2026-11-10'
                    }
                ]);
            }

            if (nbu && nbu.length > 0) {
                setNbuAdmissions(nbu);
            } else {
                setNbuAdmissions([
                    {
                        id: 'nbu_401',
                        institutionId: institutionId || 'inst_01',
                        babyId: 'baby_preterm_01',
                        babyName: 'Baby of Sarah Achieng (Twin 1)',
                        motherId: 'pat_04',
                        motherName: 'Sarah Achieng Otieno',
                        admissionDate: new Date(Date.now() - 4 * 86400000).toISOString(),
                        admissionReason: 'Prematurity (32 Weeks) & Low Birth Weight (1.45kg)',
                        birthWeightKg: 1.45,
                        currentWeightKg: 1.58,
                        gestationWeeks: 32,
                        incubatorBay: 'Incubator Bay Alpha 1',
                        phototherapyActive: true,
                        cpapOxygenActive: false,
                        feedingMode: 'EBM (Expressed Breast Milk)',
                        apgar1Min: 6,
                        apgar5Min: 8,
                        status: 'KMC',
                        dailyWeights: [
                            { date: '2026-08-12', weightKg: 1.45, gainGrams: 0, temp: 36.5, feedMl: 15 },
                            { date: '2026-08-13', weightKg: 1.48, gainGrams: 30, temp: 36.7, feedMl: 20 },
                            { date: '2026-08-14', weightKg: 1.52, gainGrams: 40, temp: 36.8, feedMl: 25 },
                            { date: '2026-08-15', weightKg: 1.58, gainGrams: 60, temp: 36.9, feedMl: 30 }
                        ],
                        notes: 'Undergoing Kangaroo Mother Care (KMC) with mother. Tolerating EBM feeds via NG tube. Bilirubin resolving under phototherapy.'
                    }
                ]);
            }
        } catch (e) {
            console.error('Error fetching MCH data:', e);
        } finally {
            setIsLoading(false);
        }
    }, [institutionId, patients, userName]);

    useEffect(() => {
        loadMchData();
    }, [loadMchData]);

    // Helpers
    const calculateEDDFromLMP = (lmpDateStr: string) => {
        if (!lmpDateStr) return '';
        const lmp = new Date(lmpDateStr);
        if (isNaN(lmp.getTime())) return '';
        // Naegele's Rule: LMP + 1 year - 3 months + 7 days (or + 280 days)
        const edd = new Date(lmp);
        edd.setDate(edd.getDate() + 280);
        return edd.toISOString().slice(0, 10);
    };

    const calculateGestationWeeks = (lmpDateStr: string) => {
        if (!lmpDateStr) return 0;
        const lmp = new Date(lmpDateStr);
        if (isNaN(lmp.getTime())) return 0;
        const diffMs = Date.now() - lmp.getTime();
        return Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)));
    };

    // Filtered lists
    const filteredAnc = ancRecords.filter(r => 
        !searchQuery || 
        r.motherName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredCwc = cwcRecords.filter(r => 
        !searchQuery || 
        r.childName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.motherName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredNbu = nbuAdmissions.filter(r => 
        !searchQuery || 
        r.babyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.motherName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.incubatorBay?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 text-slate-900 dark:text-white">

            {/* ── Top Header & Global Stats Banner ── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-8 rounded-[2.5rem] bg-gradient-to-br from-rose-950 via-slate-900 to-indigo-950 border border-rose-500/20 shadow-2xl shadow-rose-950/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,63,94,0.15),transparent_60%)] pointer-events-none" />
                <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-rose-500/30 ring-2 ring-white/10 shrink-0">
                            👶
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-rose-300 uppercase tracking-[0.3em]">Specialized Clinical Unit</p>
                            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-white italic leading-tight">
                                Maternal, Child Health <span className="text-rose-300">&amp; Newborn Unit</span>
                            </h1>
                        </div>
                    </div>
                    <p className="text-xs text-slate-300 max-w-xl">
                        MOH 405/406 Ante-Natal Care, Partograph labor tracking, KEPI EPI immunization matrix, WHO growth curves &amp; Newborn Unit (NICU / KMC) management.
                    </p>
                </div>

                {/* Live Facility Counts */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center shrink-0 w-full lg:w-auto">
                    <div className="p-3.5 bg-black/40 border border-rose-500/30 rounded-2xl">
                        <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest">🤰 Active ANC</p>
                        <p className="text-2xl font-black text-white">{ancRecords.filter(a => a.status === 'Active').length}</p>
                    </div>
                    <div className="p-3.5 bg-black/40 border border-emerald-500/30 rounded-2xl">
                        <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">🏥 Deliveries</p>
                        <p className="text-2xl font-black text-white">{deliveryRecords.length}</p>
                    </div>
                    <div className="p-3.5 bg-black/40 border border-indigo-500/30 rounded-2xl">
                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">🍼 CWC Registered</p>
                        <p className="text-2xl font-black text-white">{cwcRecords.length}</p>
                    </div>
                    <div className="p-3.5 bg-black/40 border border-amber-500/30 rounded-2xl">
                        <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">👶 NBU In-Care</p>
                        <p className="text-2xl font-black text-white">{nbuAdmissions.filter(n => n.status === 'Admitted' || n.status === 'KMC').length}</p>
                    </div>
                </div>
            </div>

            {/* ── Main Navigation Tabs ── */}
            <div className="flex border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.02] rounded-3xl p-1.5 gap-1.5 overflow-x-auto no-scrollbar shadow-inner">
                {[
                    { id: 'anc', label: '🤰 Ante-Natal Care (ANC)', count: ancRecords.length },
                    { id: 'delivery', label: '🏥 Labor & Delivery Register', count: deliveryRecords.length },
                    { id: 'cwc', label: '🍼 Child Welfare & Immunization (CWC)', count: cwcRecords.length },
                    { id: 'nbu', label: '👶 Newborn Unit (NICU / KMC)', count: nbuAdmissions.length },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-4 px-5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                            activeTab === tab.id
                                ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 text-white shadow-xl shadow-rose-950/40 scale-[1.01]'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <span>{tab.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-slate-400'
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── 🤰 TAB 1: ANTE-NATAL CARE (ANC & MATERNITY) ── */}
            {activeTab === 'anc' && (
                <div className="space-y-6">
                    {/* Controls Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl">
                        <div className="relative flex-1 max-w-md">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="🔍 Search ANC mother by name, ID, or EDD..."
                                className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 focus:border-rose-500 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsEnrollAncModalOpen(true)}
                                className="px-6 py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 transition-all flex items-center gap-2 italic cursor-pointer"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>Enroll Mother into ANC</span>
                            </button>
                        </div>
                    </div>

                    {/* ANC Roster Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredAnc.map((anc) => {
                            const lastVisit = anc.visits[anc.visits.length - 1];
                            const currentGestation = anc.lmp ? calculateGestationWeeks(anc.lmp) : anc.gestationWeeks;
                            const isHighRisk = anc.highRiskFactors && anc.highRiskFactors.length > 0;

                            return (
                                <div 
                                    key={anc.id}
                                    className={`p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 transition-all space-y-5 shadow-xl ${
                                        isHighRisk 
                                            ? 'border-rose-500/40 shadow-rose-950/20' 
                                            : 'border-slate-200 dark:border-white/5'
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
                                                {anc.motherName[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase truncate">{anc.motherName}</h3>
                                                    {isHighRisk && (
                                                        <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-[8px] font-black uppercase tracking-wider animate-pulse">
                                                            ⚠️ High Risk
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-mono">
                                                    Gravida {anc.gravida} • Para {anc.parity} • Blood: <strong className="text-slate-800 dark:text-white">{anc.bloodGroup || 'O+'}</strong>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-xl text-[9px] font-black uppercase tracking-wider block">
                                                {currentGestation} Weeks Gestation
                                            </span>
                                            <p className="text-[9px] font-bold text-emerald-400 mt-1">EDD: {anc.edd || 'Calculated'}</p>
                                        </div>
                                    </div>

                                    {/* High Risk Flags */}
                                    {isHighRisk && (
                                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-1">
                                            <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Obstetric Risk Alert:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {anc.highRiskFactors?.map((f, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-rose-500/20 text-rose-200 rounded text-[9px] font-bold">
                                                        • {f}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Longitudinal Visits Flowsheet Progress */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            <span>MOH 405 ANC Visits: {anc.visits.length} of 8 Completed</span>
                                            <span>Next Visit: {lastVisit?.nextVisitDate || 'Schedule on review'}</span>
                                        </div>
                                        <div className="grid grid-cols-8 gap-1.5">
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map((vNum) => {
                                                const v = anc.visits.find(x => x.visitNumber === vNum);
                                                return (
                                                    <div 
                                                        key={vNum}
                                                        className={`p-2 rounded-xl text-center border transition-all ${
                                                            v 
                                                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                                                                : 'bg-white/5 border-white/5 text-slate-500 opacity-40'
                                                        }`}
                                                    >
                                                        <p className="text-[8px] font-black uppercase">V{vNum}</p>
                                                        <p className="text-[7px] font-bold mt-0.5">{v ? `${v.gestationWeeks}w` : '—'}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Last Recorded Vitals & Prophylaxis */}
                                    {lastVisit && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-black/40 rounded-2xl text-[9px]">
                                            <div>
                                                <span className="text-slate-400 block font-bold">Last BP:</span>
                                                <span className="text-white font-black text-xs">{lastVisit.bloodPressure}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block font-bold">Fundal Ht:</span>
                                                <span className="text-white font-black text-xs">{lastVisit.fundalHeightCm} cm</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block font-bold">Fetal Heart:</span>
                                                <span className="text-emerald-400 font-black text-xs">{lastVisit.fetalHeartRateBpm} bpm</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block font-bold">IFAS &amp; IPTp:</span>
                                                <span className="text-indigo-300 font-black text-xs">
                                                    {lastVisit.ifasSupplied ? '✓ IFAS' : '—'} {lastVisit.iptpDose !== 'None' ? `• ${lastVisit.iptpDose}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-2.5 pt-2">
                                        <button
                                            onClick={() => {
                                                setSelectedAncRecord(anc);
                                                setIsRecordAncVisitModalOpen(true);
                                            }}
                                            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-1.5 italic cursor-pointer"
                                        >
                                            <StethoscopeIcon className="w-3.5 h-3.5" />
                                            <span>Record Visit #{anc.visits.length + 1}</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedAncRecord(anc);
                                                setIsRecordDeliveryModalOpen(true);
                                            }}
                                            className="px-4 py-3 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                        >
                                            🏥 Transfer to Labor
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── 🏥 TAB 2: LABOR & DELIVERY REGISTER ── */}
            {activeTab === 'delivery' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                                🏥 Maternity Ward &amp; Delivery Register
                            </h3>
                            <p className="text-xs text-slate-400">Official MOH 406 Register with APGAR scoring and Mother-Baby linkage</p>
                        </div>
                        <button
                            onClick={() => setIsRecordDeliveryModalOpen(true)}
                            className="px-6 py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 transition-all flex items-center gap-2 italic cursor-pointer"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Record New Delivery</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {deliveryRecords.map((del) => (
                            <div key={del.id} className="p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-xl space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-2xl flex items-center justify-center shadow-lg">
                                            {del.babyGender === 'Female' ? '👧' : '👦'}
                                        </div>
                                        <div>
                                            <h4 className="text-base font-black text-white uppercase">{del.babyName || `Baby of ${del.motherName}`}</h4>
                                            <p className="text-xs text-slate-400">Mother: <strong className="text-indigo-300">{del.motherName}</strong> • Date: {del.deliveryDate} ({del.deliveryTime})</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="px-3.5 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-black uppercase">
                                            {del.deliveryMode}
                                        </span>
                                        <span className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase ${
                                            del.babyStatus.includes('NBU') 
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' 
                                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        }`}>
                                            {del.babyStatus}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                                    <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Birth Weight</span>
                                        <span className="text-lg font-black text-white">{del.birthWeightKg} kg</span>
                                    </div>
                                    <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">APGAR (1 min)</span>
                                        <span className="text-lg font-black text-emerald-400">{del.apgar1Min} / 10</span>
                                    </div>
                                    <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">APGAR (5 min)</span>
                                        <span className="text-lg font-black text-emerald-400">{del.apgar5Min} / 10</span>
                                    </div>
                                    <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Est. Blood Loss</span>
                                        <span className="text-lg font-black text-rose-300">{del.bloodLossMl} ml</span>
                                    </div>
                                    <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">AMTSL Oxytocin</span>
                                        <span className="text-lg font-black text-indigo-300">{del.oxytocinGiven ? '✓ Done' : 'No'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── 🍼 TAB 3: CHILD WELFARE CLINIC & IMMUNIZATION (CWC) ── */}
            {activeTab === 'cwc' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                                🍼 KEPI Child Immunization &amp; Growth Matrix
                            </h3>
                            <p className="text-xs text-slate-400">Vaccination schedule, WHO Z-Score growth curves, and Vitamin A / Deworming</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsRecordImmunizationModalOpen(true)}
                                className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-2 italic cursor-pointer"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>Record Vaccination Dose</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {filteredCwc.map((child) => {
                            const lastGrowth = child.growthRecords[child.growthRecords.length - 1];
                            return (
                                <div key={child.id} className="p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-xl space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-2xl flex items-center justify-center shadow-lg">
                                                🍼
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-white uppercase">{child.childName}</h4>
                                                <p className="text-xs text-slate-400">
                                                    DOB: <strong className="text-white">{child.dob}</strong> • Gender: {child.gender} • Mother: <strong className="text-indigo-300">{child.motherName}</strong>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {lastGrowth && (
                                                <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-right">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Current Weight</p>
                                                    <p className="text-base font-black text-emerald-400">{lastGrowth.weightKg} kg (MUAC: {lastGrowth.muacCm}cm)</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* KEPI Vaccine Schedule Flowsheet */}
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em]">KEPI Immunization Schedule Flowsheet</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                                            {[
                                                { milestone: 'Birth', vaccines: ['BCG', 'OPV 0'] },
                                                { milestone: '6 Wks', vaccines: ['Penta 1', 'PCV 1', 'Rota 1', 'OPV 1'] },
                                                { milestone: '10 Wks', vaccines: ['Penta 2', 'PCV 2', 'Rota 2', 'OPV 2'] },
                                                { milestone: '14 Wks', vaccines: ['Penta 3', 'PCV 3', 'IPV', 'OPV 3'] },
                                                { milestone: '6 Mos', vaccines: ['Vit A 100k'] },
                                                { milestone: '9 Mos', vaccines: ['MR 1', 'Yellow Fever'] },
                                                { milestone: '12 Mos', vaccines: ['Vit A 200k', 'Deworm'] },
                                                { milestone: '18 Mos', vaccines: ['MR 2'] },
                                            ].map((m, idx) => {
                                                const hasGiven = child.immunizations.some(v => v.ageMilestone?.toLowerCase().includes(m.milestone.toLowerCase().split(' ')[0]));
                                                return (
                                                    <div 
                                                        key={idx}
                                                        className={`p-3 rounded-2xl border text-center space-y-1 transition-all ${
                                                            hasGiven 
                                                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                                                                : 'bg-white/5 border-white/10 text-slate-400 opacity-60'
                                                        }`}
                                                    >
                                                        <p className="text-[9px] font-black uppercase">{m.milestone}</p>
                                                        <div className="text-[8px] font-mono leading-tight opacity-90">
                                                            {m.vaccines.join(' • ')}
                                                        </div>
                                                        <p className="text-[8px] font-black mt-1">
                                                            {hasGiven ? '✓ Completed' : 'Pending'}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── 👶 TAB 4: NEWBORN UNIT (NBU / NICU / KMC) ── */}
            {activeTab === 'nbu' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                                👶 Newborn Unit (NICU / Incubators / Kangaroo Care)
                            </h3>
                            <p className="text-xs text-slate-400">Critical neonate care, Phototherapy, CPAP, and daily KMC weight trajectory</p>
                        </div>
                        <button
                            onClick={() => setIsAdmitNbuModalOpen(true)}
                            className="px-6 py-3.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2 italic cursor-pointer"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Admit Neonate to NBU</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredNbu.map((nbu) => (
                            <div key={nbu.id} className="p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-amber-500/30 shadow-2xl shadow-amber-950/20 space-y-5">
                                <div className="flex justify-between items-start gap-4 pb-4 border-b border-white/10">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-black text-2xl flex items-center justify-center">
                                            👶
                                        </div>
                                        <div>
                                            <h4 className="text-base font-black text-white uppercase">{nbu.babyName}</h4>
                                            <p className="text-xs text-slate-400">Mother: <strong className="text-indigo-300">{nbu.motherName}</strong></p>
                                            <p className="text-[10px] font-mono text-amber-300 mt-0.5">🏥 {nbu.incubatorBay || 'Kangaroo Care Bay'}</p>
                                        </div>
                                    </div>

                                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                                        {nbu.status}
                                    </span>
                                </div>

                                <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Admission Reason &amp; Clinical Indication:</p>
                                    <p className="text-xs text-white font-bold">{nbu.admissionReason}</p>
                                </div>

                                {/* Daily KMC Weight Gain Trajectory */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-slate-400">Birth Wt: {nbu.birthWeightKg}kg &rarr; Current Wt: <strong className="text-emerald-400">{nbu.currentWeightKg}kg</strong></span>
                                        <span className="text-indigo-300">Feeding: {nbu.feedingMode}</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {nbu.dailyWeights.map((w, i) => (
                                            <div key={i} className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-center">
                                                <p className="text-[8px] font-bold text-slate-400">{w.date.slice(5)}</p>
                                                <p className="text-xs font-black text-white mt-0.5">{w.weightKg} kg</p>
                                                {w.gainGrams ? (
                                                    <p className="text-[8px] font-bold text-emerald-400">+{w.gainGrams}g</p>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => {
                                            setSelectedNbuAdmission(nbu);
                                            setIsRecordNbuWeightModalOpen(true);
                                        }}
                                        className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-rose-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-1.5 cursor-pointer italic"
                                    >
                                        <ActivityIcon className="w-3.5 h-3.5" />
                                        <span>Log Daily Weight &amp; Feed</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── MODAL: ENROLL MOTHER IN ANC ── */}
            {isEnrollAncModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] flex flex-col my-auto">
                        <div className="p-6 bg-gradient-to-r from-rose-600 to-pink-600 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase italic">Enroll Pregnant Mother into ANC</h3>
                                <p className="text-[9px] text-rose-100 uppercase tracking-widest font-black">MOH 405 Ante-Natal Profile &amp; EDD Calculator</p>
                            </div>
                            <button onClick={() => setIsEnrollAncModalOpen(false)} className="p-2 text-white bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const motherId = (form.elements.namedItem('motherId') as HTMLSelectElement).value;
                            const motherName = (form.elements.namedItem('motherName') as HTMLInputElement).value;
                            const lmp = (form.elements.namedItem('lmp') as HTMLInputElement).value;
                            const edd = calculateEDDFromLMP(lmp);
                            const gravida = parseInt((form.elements.namedItem('gravida') as HTMLInputElement).value || '1', 10);
                            const parity = parseInt((form.elements.namedItem('parity') as HTMLInputElement).value || '0', 10);
                            const bloodGroup = (form.elements.namedItem('bloodGroup') as HTMLSelectElement).value;
                            const riskFactors = (form.elements.namedItem('riskFactors') as HTMLInputElement).value;

                            const newRec: HISANCRecord = {
                                id: `anc_${Date.now()}`,
                                institutionId: institutionId || 'inst_01',
                                motherId,
                                motherName,
                                lmp,
                                edd,
                                gravida,
                                parity,
                                gestationWeeks: calculateGestationWeeks(lmp),
                                bloodGroup,
                                pmtctStatus: 'Negative',
                                syphilisStatus: 'Negative',
                                highRiskFactors: riskFactors ? riskFactors.split(',').map(s => s.trim()) : [],
                                status: 'Active',
                                visits: [
                                    {
                                        visitNumber: 1,
                                        date: new Date().toISOString().slice(0, 10),
                                        gestationWeeks: calculateGestationWeeks(lmp),
                                        bloodPressure: '120/80',
                                        presentation: 'Vertex / Cephalic',
                                        ifasSupplied: true,
                                        iptpDose: 'None',
                                        ttVaccineGiven: true,
                                        clinician: userName || 'Attending Clinician'
                                    }
                                ]
                            };

                            await apiService.saveModuleRecord('his_anc_records', newRec).catch(() => null);
                            setAncRecords(prev => [newRec, ...prev]);
                            alert(`✓ Enrolled ${motherName} into ANC Clinic with EDD ${edd}!`);
                            setIsEnrollAncModalOpen(false);
                        }} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Select Patient Master *</label>
                                <select name="motherId" required className="w-full bg-black/40 border border-white/10 focus:border-rose-500 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                    <option value="">— Select Mother —</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.fullName} ({p.gender} • {p.contact})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Mother Full Name *</label>
                                <input type="text" name="motherName" placeholder="Jane Wanjiku" required className="w-full bg-black/40 border border-white/10 focus:border-rose-500 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">LMP (Last Menstrual Period) *</label>
                                    <input type="date" name="lmp" required className="w-full bg-black/40 border border-white/10 focus:border-rose-500 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Blood Group</label>
                                    <select name="bloodGroup" className="w-full bg-black/40 border border-white/10 focus:border-rose-500 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        <option>O+</option>
                                        <option>A+</option>
                                        <option>B+</option>
                                        <option>AB+</option>
                                        <option>O-</option>
                                        <option>A-</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Gravida (Pregnancies)</label>
                                    <input type="number" name="gravida" defaultValue={1} min={1} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Parity (Live Births)</label>
                                    <input type="number" name="parity" defaultValue={0} min={0} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">High Risk Factors (Comma-separated)</label>
                                <input type="text" name="riskFactors" placeholder="e.g. Previous C-Section, Chronic Hypertension, Gestational Diabetes" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                            </div>
                            <button type="submit" className="w-full py-4 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-rose-950/50 hover:scale-[1.02] transition-all cursor-pointer">
                                Enroll Mother &amp; Generate ANC Record
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL 1: RECORD ANC VISIT (MOH 405) ── */}
            {isRecordAncVisitModalOpen && selectedAncRecord && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] flex flex-col my-auto">
                        <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase italic">
                                    Record ANC Visit #{(selectedAncRecord.visits?.length || 0) + 1} (MOH 405)
                                </h3>
                                <p className="text-[9px] text-emerald-100 uppercase tracking-widest font-black">
                                    Mother: {selectedAncRecord.motherName} • Gestation: ~{calculateGestationWeeks(selectedAncRecord.lmp || '')} Wks • EDD: {selectedAncRecord.edd}
                                </p>
                            </div>
                            <button onClick={() => setIsRecordAncVisitModalOpen(false)} className="p-2 text-white bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const visitNum = (selectedAncRecord.visits?.length || 0) + 1;
                            const date = (form.elements.namedItem('visitDate') as HTMLInputElement).value || new Date().toISOString().slice(0, 10);
                            const gestationWeeks = parseFloat((form.elements.namedItem('gestationWeeks') as HTMLInputElement).value || '20');
                            const fundalHeightCm = parseFloat((form.elements.namedItem('fundalHeightCm') as HTMLInputElement).value || '20');
                            const presentation = (form.elements.namedItem('presentation') as HTMLSelectElement).value;
                            const fetalHeartRateBpm = parseInt((form.elements.namedItem('fetalHeartRate') as HTMLInputElement).value || '140', 10);
                            const bloodPressure = (form.elements.namedItem('bloodPressure') as HTMLInputElement).value || '120/80';
                            const weightKg = parseFloat((form.elements.namedItem('weightKg') as HTMLInputElement).value || '65');
                            const urinalysisProtein = (form.elements.namedItem('urinalysisProtein') as HTMLSelectElement).value;
                            const urinalysisGlucose = (form.elements.namedItem('urinalysisGlucose') as HTMLSelectElement).value;
                            const ifasSupplied = (form.elements.namedItem('ifasSupplied') as HTMLInputElement).checked;
                            const iptpDose = (form.elements.namedItem('iptpDose') as HTMLSelectElement).value as any;
                            const ttVaccineGiven = (form.elements.namedItem('ttVaccineGiven') as HTMLInputElement).checked;
                            const nextVisitDate = (form.elements.namedItem('nextVisitDate') as HTMLInputElement).value;
                            const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;

                            const newVisit: HISANCVisit = {
                                visitNumber: visitNum,
                                date,
                                gestationWeeks,
                                fundalHeightCm,
                                presentation: presentation as any,
                                fetalHeartRateBpm,
                                bloodPressure,
                                weightKg,
                                urinalysisProtein: urinalysisProtein as any,
                                urinalysisGlucose: urinalysisGlucose as any,
                                ifasSupplied,
                                iptpDose,
                                ttVaccineGiven,
                                nextVisitDate: nextVisitDate || undefined,
                                clinician: userName || 'Attending Clinician'
                            };

                            const updatedVisits = [...(selectedAncRecord.visits || []), newVisit];
                            const updatedRecord: HISANCRecord = {
                                ...selectedAncRecord,
                                gestationWeeks,
                                visits: updatedVisits,
                            };

                            await apiService.saveModuleRecord('his_anc_records', updatedRecord).catch(() => null);
                            setAncRecords(prev => prev.map(r => r.id === selectedAncRecord.id ? updatedRecord : r));
                            setIsRecordAncVisitModalOpen(false);
                            alert(`✓ Successfully recorded ANC Visit #${visitNum} for ${selectedAncRecord.motherName}!`);
                        }} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Visit Date *</label>
                                    <input type="date" name="visitDate" defaultValue={new Date().toISOString().slice(0, 10)} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Gestation (Weeks) *</label>
                                    <input type="number" name="gestationWeeks" defaultValue={calculateGestationWeeks(selectedAncRecord.lmp || '') || 24} min={4} max={42} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Fundal Height (cm)</label>
                                    <input type="number" name="fundalHeightCm" defaultValue={calculateGestationWeeks(selectedAncRecord.lmp || '') || 24} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-emerald-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Fetal Heart (BPM) *</label>
                                    <input type="number" name="fetalHeartRate" defaultValue={142} min={80} max={200} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-emerald-400 outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Blood Pressure (BP) *</label>
                                    <input type="text" name="bloodPressure" defaultValue="120/80" placeholder="120/80" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-emerald-500 font-mono" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Mother Weight (kg)</label>
                                    <input type="number" name="weightKg" step="0.1" defaultValue={65} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-emerald-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Presentation / Lie</label>
                                    <select name="presentation" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        <option value="Vertex / Cephalic">Vertex / Cephalic</option>
                                        <option value="Breech">Breech</option>
                                        <option value="Transverse">Transverse Lie</option>
                                        <option value="Oblique / Unstable">Oblique / Unstable</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Urinalysis (Protein)</label>
                                    <select name="urinalysisProtein" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        <option value="Nil">Nil</option>
                                        <option value="Trace">Trace</option>
                                        <option value="+1">+1</option>
                                        <option value="+2">+2 (Pre-eclampsia Alert)</option>
                                        <option value="+3">+3 (Severe)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Urinalysis (Glucose)</label>
                                    <select name="urinalysisGlucose" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        <option value="Nil">Nil</option>
                                        <option value="Trace">Trace</option>
                                        <option value="+1">+1</option>
                                        <option value="+2">+2</option>
                                    </select>
                                </div>
                            </div>

                            {/* Medications & Prophylaxis */}
                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 block">Prophylaxis &amp; Supplements</span>
                                <div className="grid grid-cols-3 gap-3">
                                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                                        <input type="checkbox" name="ifasSupplied" defaultChecked className="w-4 h-4 rounded text-emerald-600" />
                                        <span>IFAS Iron &amp; Folic</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                                        <input type="checkbox" name="ttVaccineGiven" defaultChecked className="w-4 h-4 rounded text-emerald-600" />
                                        <span>Tetanus (TT/TD)</span>
                                    </label>
                                    <div>
                                        <select name="iptpDose" className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs font-bold text-pink-300 outline-none">
                                            <option value="None">IPTp: None</option>
                                            <option value="IPTp 1">IPTp Dose 1</option>
                                            <option value="IPTp 2">IPTp Dose 2</option>
                                            <option value="IPTp 3">IPTp Dose 3</option>
                                            <option value="IPTp 4">IPTp Dose 4</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Next Scheduled ANC Visit</label>
                                <input type="date" name="nextVisitDate" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-emerald-500" />
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Clinical Findings &amp; Prescription Notes</label>
                                <textarea name="notes" rows={2} placeholder="Fetal movements active, normotensive, counselled on birth preparedness and danger signs." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-emerald-500" />
                            </div>

                            <button type="submit" className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-950/50 hover:scale-[1.02] transition-all cursor-pointer">
                                ✓ Save ANC Visit #{(selectedAncRecord.visits?.length || 0) + 1} Record
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL 2: RECORD LABOR & DELIVERY (MOH 406) ── */}
            {isRecordDeliveryModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] flex flex-col my-auto">
                        <div className="p-6 bg-gradient-to-r from-rose-600 to-pink-600 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase italic">Record Labor &amp; Delivery (MOH 406)</h3>
                                <p className="text-[9px] text-rose-100 uppercase tracking-widest font-black">Official Delivery Summary, APGAR Score &amp; Baby Linkage</p>
                            </div>
                            <button onClick={() => setIsRecordDeliveryModalOpen(false)} className="p-2 text-white bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const motherName = (form.elements.namedItem('motherName') as HTMLInputElement).value;
                            const babyGender = (form.elements.namedItem('babyGender') as HTMLSelectElement).value as any;
                            const babyName = (form.elements.namedItem('babyName') as HTMLInputElement).value || `Baby of ${motherName}`;
                            const deliveryDate = (form.elements.namedItem('deliveryDate') as HTMLInputElement).value || new Date().toISOString().slice(0, 10);
                            const deliveryTime = (form.elements.namedItem('deliveryTime') as HTMLInputElement).value || '10:00 AM';
                            const gestationWeeks = parseFloat((form.elements.namedItem('gestationWeeks') as HTMLInputElement).value || '39');
                            const deliveryMode = (form.elements.namedItem('deliveryMode') as HTMLSelectElement).value;
                            const episiotomyTear = (form.elements.namedItem('episiotomyTear') as HTMLSelectElement).value;
                            const bloodLossMl = parseInt((form.elements.namedItem('bloodLossMl') as HTMLInputElement).value || '200', 10);
                            const birthWeightKg = parseFloat((form.elements.namedItem('birthWeightKg') as HTMLInputElement).value || '3.2');
                            const apgar1Min = parseInt((form.elements.namedItem('apgar1Min') as HTMLInputElement).value || '9', 10);
                            const apgar5Min = parseInt((form.elements.namedItem('apgar5Min') as HTMLInputElement).value || '10', 10);
                            const babyStatus = (form.elements.namedItem('babyStatus') as HTMLSelectElement).value;
                            const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;

                            const newDel: HISDeliveryRecord = {
                                id: `del_${Date.now()}`,
                                institutionId: institutionId || 'inst_01',
                                motherId: selectedAncRecord?.motherId || `pat_m_${Date.now()}`,
                                motherName,
                                babyId: `baby_${Date.now()}`,
                                babyName,
                                deliveryDate,
                                deliveryTime,
                                gestationWeeks,
                                deliveryMode: deliveryMode as any,
                                episiotomyTear: episiotomyTear as any,
                                bloodLossMl,
                                oxytocinGiven: true,
                                placentaComplete: true,
                                babyGender,
                                birthWeightKg,
                                apgar1Min,
                                apgar5Min,
                                resuscitationDone: false,
                                babyStatus: babyStatus as any,
                                deliveredBy: userName || 'Attending Midwife / Obstetrician',
                                notes
                            };

                            await apiService.saveModuleRecord('his_delivery_records', newDel).catch(() => null);
                            setDeliveryRecords(prev => [newDel, ...prev]);
                            setIsRecordDeliveryModalOpen(false);
                            alert(`✓ Delivery recorded for ${motherName} (Baby ${babyGender}, ${birthWeightKg}kg, APGAR ${apgar1Min}/${apgar5Min})!`);
                        }} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Mother Full Name *</label>
                                    <input type="text" name="motherName" defaultValue={selectedAncRecord?.motherName || ''} required placeholder="Jane Wanjiku" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-rose-500" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Baby Given Name</label>
                                    <input type="text" name="babyName" placeholder="Baby of Jane Wanjiku" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-rose-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Delivery Date *</label>
                                    <input type="date" name="deliveryDate" defaultValue={new Date().toISOString().slice(0, 10)} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Delivery Time</label>
                                    <input type="time" name="deliveryTime" defaultValue="08:30" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Baby Gender *</label>
                                    <select name="babyGender" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        <option value="Female">👧 Female</option>
                                        <option value="Male">👦 Male</option>
                                        <option value="Ambiguous">Ambiguous / Undetermined</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Delivery Mode *</label>
                                    <select name="deliveryMode" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        <option value="Spontaneous Vertex (SVD)">Spontaneous Vertex (SVD)</option>
                                        <option value="Assisted Breech Delivery">Assisted Breech Delivery</option>
                                        <option value="Vacuum Extraction">Vacuum Extraction</option>
                                        <option value="Emergency Caesarean Section">Emergency C-Section</option>
                                        <option value="Elective Caesarean Section">Elective C-Section</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Episiotomy / Tear</label>
                                    <select name="episiotomyTear" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        <option value="None">None (Perineum Intact)</option>
                                        <option value="Episiotomy (Repaired)">Episiotomy (Repaired)</option>
                                        <option value="1st Degree Tear">1st Degree Tear</option>
                                        <option value="2nd Degree Tear">2nd Degree Tear</option>
                                        <option value="3rd Degree Tear">3rd Degree Tear</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Blood Loss (mL)</label>
                                    <input type="number" name="bloodLossMl" defaultValue={200} step={50} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Birth Weight (kg) *</label>
                                    <input type="number" name="birthWeightKg" defaultValue={3.25} step="0.01" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-emerald-400 outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">APGAR (1 min) *</label>
                                    <input type="number" name="apgar1Min" defaultValue={9} min={0} max={10} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">APGAR (5 min) *</label>
                                    <input type="number" name="apgar5Min" defaultValue={10} min={0} max={10} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Baby Status &amp; Disposition *</label>
                                <select name="babyStatus" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                    <option value="Healthy / In-Room with Mother">Healthy / In-Room with Mother (Early Breastfeeding)</option>
                                    <option value="Admitted to Newborn Unit (NBU)">Admitted to Newborn Unit (NBU / Phototherapy)</option>
                                    <option value="Transferred to KMC Unit">Transferred to Kangaroo Mother Care (KMC)</option>
                                    <option value="Referred to Tertiary NICU">Referred to Tertiary NICU</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Delivery Notes &amp; Observations</label>
                                <textarea name="notes" rows={2} placeholder="Oxytocin given within 1 min of birth. Placenta delivered complete by CCT. Mother and baby stable." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                            </div>

                            <button type="submit" className="w-full py-4 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-rose-950/50 hover:scale-[1.02] transition-all cursor-pointer">
                                ✓ Save Delivery Summary Record
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL 3: RECORD CWC IMMUNIZATION & GROWTH CHECK ── */}
            {isRecordImmunizationModalOpen && selectedCwcRecord && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] flex flex-col my-auto">
                        <div className="p-6 bg-gradient-to-r from-purple-600 to-pink-600 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase italic">Record CWC Vaccine &amp; Growth Visit</h3>
                                <p className="text-[9px] text-purple-100 uppercase tracking-widest font-black">
                                    Child: {selectedCwcRecord.childName} • DOB: {selectedCwcRecord.dob} • Mother: {selectedCwcRecord.motherName}
                                </p>
                            </div>
                            <button onClick={() => setIsRecordImmunizationModalOpen(false)} className="p-2 text-white bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const dateGiven = (form.elements.namedItem('dateGiven') as HTMLInputElement).value || new Date().toISOString().slice(0, 10);
                            const milestone = (form.elements.namedItem('ageMilestone') as HTMLSelectElement).value;
                            const weightKg = parseFloat((form.elements.namedItem('weightKg') as HTMLInputElement).value || '0');
                            const heightCm = parseFloat((form.elements.namedItem('heightCm') as HTMLInputElement).value || '0');
                            const muacCm = parseFloat((form.elements.namedItem('muacCm') as HTMLInputElement).value || '0');
                            const vaccineCode = (form.elements.namedItem('vaccineCode') as HTMLSelectElement).value;
                            const site = (form.elements.namedItem('site') as HTMLSelectElement).value;

                            const vaccineMap: Record<string, string> = {
                                'BCG': 'BCG (Tuberculosis)',
                                'OPV_0': 'Oral Polio Vaccine 0 (Birth)',
                                'OPV_1': 'Oral Polio Vaccine 1 (6 Wks)',
                                'PENTA_1': 'Pentavalent 1 (DTP-HepB-Hib)',
                                'PCV_1': 'Pneumococcal Conjugate 1',
                                'ROTA_1': 'Rotavirus 1',
                                'OPV_2': 'Oral Polio Vaccine 2 (10 Wks)',
                                'PENTA_2': 'Pentavalent 2',
                                'PCV_2': 'Pneumococcal Conjugate 2',
                                'ROTA_2': 'Rotavirus 2',
                                'OPV_3': 'Oral Polio Vaccine 3 (14 Wks)',
                                'PENTA_3': 'Pentavalent 3',
                                'IPV': 'Inactivated Polio Vaccine (IPV)',
                                'PCV_3': 'Pneumococcal Conjugate 3',
                                'VIT_A_6M': 'Vitamin A 100,000 IU (6 Mos)',
                                'MR_1': 'Measles-Rubella 1 (9 Mos)',
                                'YF': 'Yellow Fever Vaccine (9 Mos)',
                                'MR_2': 'Measles-Rubella 2 (18 Mos)',
                                'DEWORM': 'Deworming (Albendazole)'
                            };

                            const newDose: HISImmunizationDose = {
                                vaccineCode,
                                vaccineName: vaccineMap[vaccineCode] || vaccineCode,
                                doseNumber: 1,
                                ageMilestone: milestone,
                                dateGiven,
                                site: site as any,
                                administeredBy: userName || 'Nurse on Duty'
                            };

                            const newGrowth: HISGrowthRecord = {
                                date: dateGiven,
                                ageMonths: 6,
                                weightKg,
                                heightCm,
                                muacCm,
                                nutritionalStatus: muacCm >= 12.5 ? 'Normal (Green)' : 'Moderate Malnutrition (Yellow)'
                            };

                            const updatedRec: HISCWCRecord = {
                                ...selectedCwcRecord,
                                immunizations: [...selectedCwcRecord.immunizations, newDose],
                                growthRecords: weightKg > 0 ? [...(selectedCwcRecord.growthRecords || []), newGrowth] : (selectedCwcRecord.growthRecords || [])
                            };

                            await apiService.saveModuleRecord('his_cwc_immunizations', updatedRec).catch(() => null);
                            setCwcRecords(prev => prev.map(r => r.id === selectedCwcRecord.id ? updatedRec : r));
                            setIsRecordImmunizationModalOpen(false);
                            alert(`✓ Administered ${newDose.vaccineName} to ${selectedCwcRecord.childName}!`);
                        }} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Date Administered *</label>
                                    <input type="date" name="dateGiven" defaultValue={new Date().toISOString().slice(0, 10)} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Age Milestone *</label>
                                    <select name="ageMilestone" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        <option value="Birth">Birth</option>
                                        <option value="6 Weeks">6 Weeks</option>
                                        <option value="10 Weeks">10 Weeks</option>
                                        <option value="14 Weeks">14 Weeks</option>
                                        <option value="6 Months">6 Months</option>
                                        <option value="9 Months">9 Months</option>
                                        <option value="18 Months">18 Months</option>
                                        <option value="24 Months">24 Months</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Select Target KEPI Vaccine *</label>
                                <select name="vaccineCode" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-purple-300 outline-none">
                                    <option value="BCG">BCG (Tuberculosis)</option>
                                    <option value="OPV_0">Oral Polio Vaccine 0 (At Birth)</option>
                                    <option value="OPV_1">Oral Polio Vaccine 1 (6 Weeks)</option>
                                    <option value="PENTA_1">Pentavalent 1 (DTP-HepB-Hib - 6 Wks)</option>
                                    <option value="PCV_1">Pneumococcal (PCV 10) 1 (6 Wks)</option>
                                    <option value="ROTA_1">Rotavirus 1 (6 Wks)</option>
                                    <option value="OPV_2">Oral Polio Vaccine 2 (10 Weeks)</option>
                                    <option value="PENTA_2">Pentavalent 2 (10 Wks)</option>
                                    <option value="PCV_2">Pneumococcal 2 (10 Wks)</option>
                                    <option value="ROTA_2">Rotavirus 2 (10 Wks)</option>
                                    <option value="OPV_3">Oral Polio Vaccine 3 (14 Weeks)</option>
                                    <option value="PENTA_3">Pentavalent 3 (14 Wks)</option>
                                    <option value="IPV">Inactivated Polio (IPV - 14 Wks)</option>
                                    <option value="PCV_3">Pneumococcal 3 (14 Wks)</option>
                                    <option value="VIT_A_6M">Vitamin A 100,000 IU (6 Months)</option>
                                    <option value="MR_1">Measles-Rubella 1 (9 Months)</option>
                                    <option value="YF">Yellow Fever (9 Months)</option>
                                    <option value="MR_2">Measles-Rubella 2 (18 Months)</option>
                                    <option value="DEWORM">Deworming Albendazole (12+ Mos)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Administration Site</label>
                                    <select name="site" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        <option value="Oral">Oral (Drops)</option>
                                        <option value="Right Upper Arm">Right Upper Arm (Deltoid)</option>
                                        <option value="Left Upper Arm">Left Upper Arm (Deltoid)</option>
                                        <option value="Left Anterolateral Thigh">Left Anterolateral Thigh</option>
                                        <option value="Right Anterolateral Thigh">Right Anterolateral Thigh</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Child Weight (kg)</label>
                                    <input type="number" name="weightKg" step="0.05" defaultValue={6.5} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Length / Height (cm)</label>
                                    <input type="number" name="heightCm" step="0.5" defaultValue={65} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">MUAC (cm)</label>
                                    <input type="number" name="muacCm" step="0.1" defaultValue={13.5} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-purple-950/50 hover:scale-[1.02] transition-all cursor-pointer">
                                ✓ Log Immunization Dose &amp; Growth Check
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL 4: ADMIT NEWBORN TO NBU ── */}
            {isAdmitNbuModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] flex flex-col my-auto">
                        <div className="p-6 bg-gradient-to-r from-amber-600 to-rose-600 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase italic">Admit Baby to Newborn Unit (NBU)</h3>
                                <p className="text-[9px] text-amber-100 uppercase tracking-widest font-black">Preterm Incubator, Phototherapy &amp; KMC Bay Allocation</p>
                            </div>
                            <button onClick={() => setIsAdmitNbuModalOpen(false)} className="p-2 text-white bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const babyName = (form.elements.namedItem('babyName') as HTMLInputElement).value;
                            const motherName = (form.elements.namedItem('motherName') as HTMLInputElement).value;
                            const gestationWeeks = parseFloat((form.elements.namedItem('gestationWeeks') as HTMLInputElement).value || '32');
                            const birthWeightKg = parseFloat((form.elements.namedItem('birthWeightKg') as HTMLInputElement).value || '1.8');
                            const currentWeightKg = birthWeightKg;
                            const reason = (form.elements.namedItem('reason') as HTMLInputElement).value;
                            const incubatorCribNumber = (form.elements.namedItem('cribNumber') as HTMLSelectElement).value;
                            const feedingMode = (form.elements.namedItem('feedingMode') as HTMLSelectElement).value;
                            const phototherapy = (form.elements.namedItem('phototherapy') as HTMLSelectElement).value === 'Yes';

                            const newAdm: HISNBUAdmission = {
                                id: `nbu_${Date.now()}`,
                                institutionId: institutionId || 'inst_01',
                                babyId: `baby_${Date.now()}`,
                                babyName,
                                motherName,
                                admissionDate: new Date().toISOString().slice(0, 10),
                                gestationWeeks,
                                birthWeightKg,
                                currentWeightKg,
                                reasonForAdmission: reason,
                                incubatorCribNumber,
                                phototherapyActive: phototherapy,
                                kmcCandidate: gestationWeeks < 37,
                                feedingMode: feedingMode as any,
                                status: 'Active Inpatient' as any,
                                dailyWeights: [
                                    {
                                        date: new Date().toISOString().slice(0, 10),
                                        weightKg: birthWeightKg,
                                        feedMl: 15,
                                        feedingVolumeMl: 15,
                                        notes: 'Admission baseline weight recorded'
                                    }
                                ]
                            };

                            await apiService.saveModuleRecord('his_nbu_admissions', newAdm).catch(() => null);
                            setNbuAdmissions(prev => [newAdm, ...prev]);
                            setIsAdmitNbuModalOpen(false);
                            alert(`✓ Admitted ${babyName} to ${incubatorCribNumber}!`);
                        }} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Baby Name *</label>
                                    <input type="text" name="babyName" placeholder="Baby of Jane" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-amber-500" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Mother Full Name *</label>
                                    <input type="text" name="motherName" placeholder="Jane Wanjiku" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-amber-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Gestation (Weeks) *</label>
                                    <input type="number" name="gestationWeeks" defaultValue={32} min={24} max={42} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-amber-500" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Birth Weight (kg) *</label>
                                    <input type="number" name="birthWeightKg" defaultValue={1.85} step="0.01" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-emerald-400 outline-none focus:border-amber-500" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Reason for Admission *</label>
                                <input type="text" name="reason" placeholder="e.g. Prematurity (32 wks) & Very Low Birth Weight, Neonatal Jaundice" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-amber-500" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">NBU Bay / Incubator</label>
                                    <select name="cribNumber" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        <option value="Incubator Bay 01">Incubator Bay 01</option>
                                        <option value="Incubator Bay 02">Incubator Bay 02</option>
                                        <option value="Phototherapy Unit 01">Phototherapy Unit 01</option>
                                        <option value="KMC Kangaroo Bay 01">KMC Kangaroo Bay 01</option>
                                        <option value="Radiant Warmer 01">Radiant Warmer 01</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Feeding Regimen</label>
                                    <select name="feedingMode" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        <option value="Express Breast Milk via NGT">Express Breast Milk (EBM) via NGT</option>
                                        <option value="Cup Feeding (EBM)">Cup Feeding (EBM)</option>
                                        <option value="Direct Breastfeeding (EBF)">Direct Breastfeeding (EBF)</option>
                                        <option value="IV TPN / Fluids">IV Fluids / TPN</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Phototherapy Active?</label>
                                <select name="phototherapy" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                    <option value="No">No — Radiant / Incubator Care Only</option>
                                    <option value="Yes">Yes — Blue Light Phototherapy Indicated</option>
                                </select>
                            </div>

                            <button type="submit" className="w-full py-4 bg-gradient-to-r from-amber-600 to-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-950/50 hover:scale-[1.02] transition-all cursor-pointer">
                                ✓ Admit Newborn to NBU
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL 5: LOG DAILY NBU WEIGHT & FEED ── */}
            {isRecordNbuWeightModalOpen && selectedNbuAdmission && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] flex flex-col my-auto">
                        <div className="p-6 bg-gradient-to-r from-amber-600 to-rose-600 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase italic">Log NBU Weight &amp; Feeds</h3>
                                <p className="text-[9px] text-amber-100 uppercase tracking-widest font-black">
                                    {selectedNbuAdmission.babyName} • Bay: {selectedNbuAdmission.incubatorCribNumber || (selectedNbuAdmission as any).incubatorBay}
                                </p>
                            </div>
                            <button onClick={() => setIsRecordNbuWeightModalOpen(false)} className="p-2 text-white bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const date = (form.elements.namedItem('logDate') as HTMLInputElement).value || new Date().toISOString().slice(0, 10);
                            const weightKg = parseFloat((form.elements.namedItem('weightKg') as HTMLInputElement).value);
                            const feedingVolumeMl = parseInt((form.elements.namedItem('feedingVolumeMl') as HTMLInputElement).value || '25', 10);
                            const notes = (form.elements.namedItem('notes') as HTMLInputElement).value;

                            const prevWeight = selectedNbuAdmission.currentWeightKg || selectedNbuAdmission.birthWeightKg;
                            const gainGrams = Math.round((weightKg - prevWeight) * 1000);

                            const updatedWeights = [
                                ...(selectedNbuAdmission.dailyWeights || []),
                                {
                                    date,
                                    weightKg,
                                    gainGrams: gainGrams !== 0 ? gainGrams : undefined,
                                    feedingVolumeMl,
                                    notes
                                }
                            ];

                            const updatedAdm: HISNBUAdmission = {
                                ...selectedNbuAdmission,
                                currentWeightKg: weightKg,
                                dailyWeights: updatedWeights
                            };

                            await apiService.saveModuleRecord('his_nbu_admissions', updatedAdm).catch(() => null);
                            setNbuAdmissions(prev => prev.map(r => r.id === selectedNbuAdmission.id ? updatedAdm : r));
                            setIsRecordNbuWeightModalOpen(false);
                            alert(`✓ Logged weight for ${selectedNbuAdmission.babyName}: ${weightKg}kg (${gainGrams >= 0 ? `+${gainGrams}` : gainGrams}g gain)!`);
                        }} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Date *</label>
                                    <input type="date" name="logDate" defaultValue={new Date().toISOString().slice(0, 10)} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Current Weight (kg) *</label>
                                    <input type="number" name="weightKg" step="0.005" defaultValue={selectedNbuAdmission.currentWeightKg || 1.85} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-emerald-400 outline-none font-mono" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Feed Volume (mL / 2hr)</label>
                                <input type="number" name="feedingVolumeMl" defaultValue={25} step={5} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Nursing &amp; Feeding Progress Notes</label>
                                <input type="text" name="notes" placeholder="Tolerating NGT feeds well, active rooting reflex, no abdominal distension." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none" />
                            </div>

                            <button type="submit" className="w-full py-4 bg-gradient-to-r from-amber-600 to-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-950/50 hover:scale-[1.02] transition-all cursor-pointer">
                                ✓ Save Daily Weight &amp; Feeding Log
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
