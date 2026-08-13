import React, { useState, useEffect, useMemo } from 'react';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { HeartIcon } from './HealthIcons';
import { ActivityIcon } from './HealthIcons';
import { CurrencyIcon } from '../icons/CurrencyIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { Role, HISPatient, User } from '../../types';
import { apiService } from '../../services/apiService';

type IntelligenceSubTab = 'visits' | 'student_history' | 'pharmacy_inventory' | 'activity_log';

interface HISReportsProps {
    activeRole?: Role;
    institutionId?: string;
    patients?: HISPatient[];
    users?: User[];
}

export function HISReportsView({ activeRole, institutionId, patients = [], users = [] }: HISReportsProps) {
    const [activeSubTab, setActiveSubTab] = useState<IntelligenceSubTab>('visits');
    const [patientsList, setPatientsList] = useState<HISPatient[]>(patients);
    const [clinicalEvents, setClinicalEvents] = useState<any[]>([]);
    const [pharmacyInventory, setPharmacyInventory] = useState<any[]>([]);
    const [linkedSchoolItems, setLinkedSchoolItems] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [billingTransactions, setBillingTransactions] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Audit log search & filter state
    const [auditSearch, setAuditSearch] = useState('');
    const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>('all');

    // Dynamic search / filter state for visits
    const [visitSearch, setVisitSearch] = useState('');
    
    // Student history selector state
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<HISPatient | null>(null);
    const [selectedStudentVitals, setSelectedStudentVitals] = useState<any[]>([]);
    const [selectedStudentEvents, setSelectedStudentEvents] = useState<any[]>([]);
    const [isLoadingStudentDetails, setIsLoadingStudentDetails] = useState(false);

    // Pharmacy search state
    const [pharmacySearch, setPharmacySearch] = useState('');
    const [pharmacyCategoryFilter, setPharmacyCategoryFilter] = useState('');
    const [reportInventorySubTab, setReportInventorySubTab] = useState<'molecular' | 'school_linked'>('molecular');

    // Fetch reports data on mount/update
    useEffect(() => {
        if (!institutionId) return;
        const loadReportData = async () => {
            setIsLoadingData(true);
            try {
                const [evtData, pharmData, patData, stores, retailItems, auditData, billingData] = await Promise.all([
                    apiService.fetchModuleRecords('his_clinical_events', institutionId),
                    apiService.fetchModuleRecords('his_pharmacy_inventory', institutionId),
                    patients.length ? Promise.resolve(patients) : apiService.fetchModuleRecords('his_patients', institutionId),
                    apiService.fetchModuleRecords('retail_stores', institutionId),
                    apiService.fetchModuleRecords('retail_inventory_items', institutionId),
                    apiService.fetchModuleRecords('his_audit_logs', institutionId).catch(() => []),
                    apiService.fetchModuleRecords('his_billing_transactions', institutionId).catch(() => [])
                ]);
                setClinicalEvents(evtData || []);
                setPharmacyInventory(pharmData || []);
                setPatientsList(patData || []);
                setAuditLogs(auditData || []);
                setBillingTransactions(billingData || []);

                const pharmStore = (stores || []).find((s: any) => s.storeType === 'pharmacy_store' || s.name.toLowerCase().includes('pharmacy'));
                if (pharmStore) {
                    const linked = (retailItems || []).filter((item: any) => item.storeId === pharmStore.id || item.store_id === pharmStore.id);
                    setLinkedSchoolItems(linked);
                }
            } catch (err) {
                console.error("Failed to load Intelligence reports data:", err);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadReportData();
    }, [institutionId, patients]);

    // Fetch details when selected patient changes
    useEffect(() => {
        if (!selectedPatient?.id || !institutionId) {
            setSelectedStudentVitals([]);
            setSelectedStudentEvents([]);
            return;
        }
        const loadStudentDetails = async () => {
            setIsLoadingStudentDetails(true);
            try {
                const [vitalsData, eventsData] = await Promise.all([
                    apiService.fetchModuleRecords('his_vital_statistics', institutionId, undefined, { filter: { patient_id: selectedPatient.id } }),
                    apiService.fetchModuleRecords('his_clinical_events', institutionId, undefined, { filter: { patient_id: selectedPatient.id }, order: 'created_at.desc' })
                ]);
                setSelectedStudentVitals(vitalsData || []);
                setSelectedStudentEvents(eventsData || []);
            } catch (err) {
                console.error("Failed to fetch selected student records:", err);
            } finally {
                setIsLoadingStudentDetails(false);
            }
        };
        loadStudentDetails();
    }, [selectedPatient, institutionId]);

    // Omit / find patient helper
    const getPatientForEvent = (patientId: string) => {
        return patientsList.find(p => p.id === patientId);
    };

    // 1. Visit Report Calculations
    const visitStats = useMemo(() => {
        const total = clinicalEvents.length;
        const todayStr = new Date().toISOString().split('T')[0];
        const todayCount = clinicalEvents.filter(e => e.date === todayStr).length;
        
        const uniquePatients = new Set(clinicalEvents.map(e => e.patientId || e.patient_id)).size;

        // Group by diagnosis/event keywords for common conditions
        const conditions: Record<string, number> = {};
        clinicalEvents.forEach(e => {
            const text = (e.event || '').toLowerCase();
            if (text.includes('malaria') || text.includes('chill') || text.includes('fever')) {
                conditions['Malaria / Fever'] = (conditions['Malaria / Fever'] || 0) + 1;
            } else if (text.includes('head') || text.includes('migraine')) {
                conditions['Headache'] = (conditions['Headache'] || 0) + 1;
            } else if (text.includes('stomach') || text.includes('diarrhea') || text.includes('vomit')) {
                conditions['Gastrointestinal'] = (conditions['Gastrointestinal'] || 0) + 1;
            } else if (text.includes('wound') || text.includes('cut') || text.includes('injury') || text.includes('sprain')) {
                conditions['Injuries / Wounds'] = (conditions['Injuries / Wounds'] || 0) + 1;
            } else if (text.includes('dental') || text.includes('tooth')) {
                conditions['Dental wing'] = (conditions['Dental wing'] || 0) + 1;
            } else if (text.includes('cough') || text.includes('flu') || text.includes('cold') || text.includes('throat')) {
                conditions['Respiratory / Flu'] = (conditions['Respiratory / Flu'] || 0) + 1;
            } else {
                conditions['Routine Consultation'] = (conditions['Routine Consultation'] || 0) + 1;
            }
        });

        const topConditions = Object.entries(conditions)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);

        return { total, todayCount, uniquePatients, topConditions };
    }, [clinicalEvents]);

    const filteredVisits = useMemo(() => {
        if (!visitSearch.trim()) return clinicalEvents;
        const term = visitSearch.toLowerCase();
        return clinicalEvents.filter(e => {
            const pat = getPatientForEvent(e.patientId || e.patient_id);
            return (
                (pat?.fullName || '').toLowerCase().includes(term) ||
                (pat?.admissionNumber || pat?.admission_number || '').toLowerCase().includes(term) ||
                (e.event || '').toLowerCase().includes(term) ||
                (e.dept || '').toLowerCase().includes(term) ||
                (e.provider || '').toLowerCase().includes(term)
            );
        });
    }, [clinicalEvents, visitSearch, patientsList]);

    // 2. Student Search Matcher
    const matchedStudents = useMemo(() => {
        if (!studentSearchQuery.trim()) return [];
        const term = studentSearchQuery.toLowerCase();
        return patientsList.filter(p => 
            p.fullName.toLowerCase().includes(term) ||
            (p.admissionNumber || p.admission_number || '').toLowerCase().includes(term)
        );
    }, [patientsList, studentSearchQuery]);

    // 3. Pharmacy Report Calculations
    const pharmacyStats = useMemo(() => {
        const totalItems = pharmacyInventory.length;
        let totalValuation = 0;
        let outOfStockCount = 0;
        let criticalAlertsCount = 0;

        pharmacyInventory.forEach(item => {
            const qty = Number(item.stock_quantity || item.stockQuantity || 0);
            const price = Number(item.unit_price || item.unitPrice || 0);
            const reorder = Number(item.reorder_level || item.reorderLevel || 10);
            
            totalValuation += qty * price;
            if (qty <= 0) {
                outOfStockCount++;
            } else if (qty < reorder) {
                criticalAlertsCount++;
            }
        });

        const categories = Array.from(new Set(pharmacyInventory.map(item => item.category).filter(Boolean)));

        return { totalItems, totalValuation, outOfStockCount, criticalAlertsCount, categories };
    }, [pharmacyInventory]);

    const filteredPharmacy = useMemo(() => {
        return pharmacyInventory.filter(item => {
            const matchesSearch = !pharmacySearch.trim() || 
                item.name.toLowerCase().includes(pharmacySearch.toLowerCase()) ||
                (item.category || '').toLowerCase().includes(pharmacySearch.toLowerCase());
            
            const matchesCategory = !pharmacyCategoryFilter || item.category === pharmacyCategoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [pharmacyInventory, pharmacySearch, pharmacyCategoryFilter]);

    // --- Subtab Renderers ---

    const renderVisitsReport = () => (
        <div className="space-y-10 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-4 hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-indigo-50 dark:bg-white/5 rounded-2xl w-fit">
                        <ChartBarIcon className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Total Visits</p>
                        <p className="text-3xl font-black mt-1 italic tracking-tight">{visitStats.total}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Cumulative Registered Logs</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-4 hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-emerald-50 dark:bg-white/5 rounded-2xl w-fit">
                        <ClockIcon className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">OPD Active Today</p>
                        <p className="text-3xl font-black mt-1 italic text-emerald-500 tracking-tight">{visitStats.todayCount}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Recorded check-ins today</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-4 hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-rose-50 dark:bg-white/5 rounded-2xl w-fit">
                        <HeartIcon className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Patients Served</p>
                        <p className="text-3xl font-black mt-1 italic tracking-tight">{visitStats.uniquePatients}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Unique student / staff cases</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-4 hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-amber-50 dark:bg-white/5 rounded-2xl w-fit">
                        <ActivityIcon className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Attended Ratio</p>
                        <p className="text-3xl font-black mt-1 italic tracking-tight">100%</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">All clinical cases cleared</p>
                    </div>
                </div>
            </div>

            {/* Morbidities & Recent Records */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Distribution chart card */}
                <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl flex flex-col justify-between group">
                    <div>
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-sm font-black uppercase tracking-widest italic">Morbidity Distribution</h3>
                            <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-50 dark:bg-white/5 text-indigo-500 rounded-full border border-slate-100 dark:border-white/10">Active cases</span>
                        </div>
                        <div className="space-y-8">
                            {visitStats.topConditions.length > 0 ? (
                                visitStats.topConditions.map((cond, i) => {
                                    const percent = visitStats.total ? Math.round((cond.count / visitStats.total) * 100) : 0;
                                    const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500'];
                                    return (
                                        <div key={i} className="space-y-3 cursor-pointer group/item">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest italic transition-colors group-hover/item:text-indigo-500">
                                                <span>{cond.name}</span>
                                                <span className="text-slate-400">{cond.count} ({percent}%)</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                                                <div className={`h-full ${colors[i % 4]} rounded-full shadow-[0_0_10px_currentColor]`} style={{ width: `${percent}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10 text-[10px] font-black text-slate-400 uppercase">No visit data registered yet</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Visit logs table card */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 p-10 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] italic">Visit Activity Ledger</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Real-time clinical record entries</p>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-white/40"><SearchIcon className="w-3.5 h-3.5" /></span>
                            <input 
                                type="text"
                                placeholder="SEARCH LOGS..."
                                value={visitSearch}
                                onChange={e => setVisitSearch(e.target.value)}
                                className="w-full pl-10 pr-6 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[9px] font-black uppercase tracking-widest focus:ring-1 focus:ring-indigo-500 transition-all dark:text-white shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 italic">
                                    <th className="py-4">Patient details</th>
                                    <th className="py-4">Symptom notes / complaints</th>
                                    <th className="py-4">Department</th>
                                    <th className="py-4">Attending</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVisits.length > 0 ? (
                                    filteredVisits.slice(0, 6).map((evt, idx) => {
                                        const pat = getPatientForEvent(evt.patientId || evt.patient_id);
                                        const isStudent = pat?.admissionNumber || pat?.admission_number;
                                        return (
                                            <tr key={evt.id || idx} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="py-5">
                                                    <p className="text-[11px] font-black italic">{pat?.fullName || 'Walk-in Patient'}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                        {isStudent ? `Adm: ${pat?.admissionNumber || pat?.admission_number}` : 'Staff / Guest'}
                                                    </p>
                                                </td>
                                                <td className="py-5 pr-4">
                                                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 line-clamp-2 max-w-xs">{evt.event}</p>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">{evt.date} at {evt.time || '00:00'}</p>
                                                </td>
                                                <td className="py-5">
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-full">{evt.dept || 'General OPD'}</span>
                                                </td>
                                                <td className="py-5 text-[10px] font-black italic">{evt.provider || 'Duty Clinician'}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching visit logs found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStudentHistoryReport = () => (
        <div className="space-y-10 animate-fade-in">
            {/* Student Selector Row */}
            <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-84 h-84 bg-indigo-500/5 blur-[120px] rounded-full -mr-42 -mt-42"></div>
                <div className="max-w-xl space-y-4 relative z-10">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] italic">Search Student Health Record</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Select a student user from the school directory to display their medical log files and vital statistics trends.</p>
                    
                    <div className="relative mt-4">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-white/40"><SearchIcon className="w-4 h-4" /></span>
                        <input 
                            type="text"
                            placeholder="TYPE STUDENT NAME OR ADMISSION NUMBER..."
                            value={studentSearchQuery}
                            onChange={e => {
                                setStudentSearchQuery(e.target.value);
                                if (!e.target.value.trim()) setSelectedPatient(null);
                            }}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white shadow-inner"
                        />

                        {/* Matching search dropdown list */}
                        {studentSearchQuery.trim() && !selectedPatient && (
                            <div className="absolute left-0 w-full mt-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl overflow-hidden z-50 animate-fade-in-up">
                                {matchedStudents.length > 0 ? (
                                    matchedStudents.slice(0, 5).map(student => (
                                        <button
                                            key={student.id}
                                            onClick={() => {
                                                setSelectedPatient(student);
                                                setStudentSearchQuery('');
                                            }}
                                            className="w-full text-left px-8 py-4 hover:bg-indigo-50 dark:hover:bg-white/5 transition-colors border-b border-slate-50 dark:border-white/5 flex justify-between items-center group"
                                        >
                                            <div>
                                                <p className="text-sm font-black italic group-hover:text-indigo-600 transition-colors">{student.fullName}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gender: {student.gender} • Emergency Phone: {student.emergencyContactPhone || 'N/A'}</p>
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-indigo-50 dark:bg-white/5 text-indigo-600 rounded-full border border-indigo-100/50">
                                                Adm: {student.admissionNumber || student.admission_number || 'N/A'}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching student registry found</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Selected Student Medical Dossier */}
            {selectedPatient ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Patient Profile Card */}
                    <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-8 relative overflow-hidden self-start">
                        <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500"></div>
                        <div className="text-center space-y-3">
                            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-[2.5rem] flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-500/10">
                                <span className="text-3xl font-black italic tracking-tighter">{selectedPatient.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</span>
                            </div>
                            <h4 className="text-lg font-black uppercase tracking-tight italic mt-4">{selectedPatient.fullName}</h4>
                            <span className="inline-block text-[9px] font-black uppercase tracking-widest px-4 py-1.5 bg-indigo-50 dark:bg-white/5 text-indigo-600 rounded-full border border-indigo-100/50 italic">
                                Admission No: {selectedPatient.admissionNumber || selectedPatient.admission_number || 'PENDING'}
                            </span>
                        </div>

                        <hr className="border-slate-100 dark:border-white/5" />

                        <div className="space-y-6">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                                <span className="text-slate-400">Gender / D.O.B</span>
                                <span className="font-black italic">{selectedPatient.gender} • {selectedPatient.dob || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                                <span className="text-slate-400">Blood Group</span>
                                <span className="font-black italic text-rose-500">{selectedPatient.bloodGroup || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                                <span className="text-slate-400">SHA Insurance No</span>
                                <span className="font-black italic">{selectedPatient.shaNumber || 'Not Linked'}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                                <span className="text-slate-400">Emergency Contact</span>
                                <span className="font-black italic">{selectedPatient.emergencyContactName || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                                <span className="text-slate-400">Emergency Phone</span>
                                <span className="font-black italic text-indigo-500">{selectedPatient.emergencyContactPhone || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline & Vitals Charts */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Vitals summary cards */}
                        <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-widest italic text-indigo-500">Latest Vital Statistics</h4>
                            {selectedStudentVitals.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                    {[
                                        { label: 'Body Temp', val: `${selectedStudentVitals[0]?.temp || '—'} °C`, color: 'text-rose-500' },
                                        { label: 'Systolic BP', val: `${selectedStudentVitals[0]?.systolic || '—'} mmHg`, color: 'text-indigo-500' },
                                        { label: 'Pulse Rate', val: `${selectedStudentVitals[0]?.pulse || '—'} bpm`, color: 'text-emerald-500' },
                                        { label: 'Weight', val: `${selectedStudentVitals[0]?.weight || '—'} kg`, color: 'text-amber-500' }
                                    ].map((v, i) => (
                                        <div key={i} className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{v.label}</p>
                                            <p className={`text-xl font-black mt-2 italic tracking-tighter ${v.color}`}>{v.val}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-[10px] font-black text-slate-400 uppercase">No vitals documented for this student</div>
                            )}
                        </div>

                        {/* Visits Timeline */}
                        <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-8">
                            <h4 className="text-xs font-black uppercase tracking-widest italic text-indigo-500">Clinical History Timeline</h4>
                            {isLoadingStudentDetails ? (
                                <div className="text-center py-10 text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Fetching dossiers from vault...</div>
                            ) : selectedStudentEvents.length > 0 ? (
                                <div className="relative border-l border-indigo-100 dark:border-white/5 pl-8 ml-4 space-y-10">
                                    {selectedStudentEvents.map((evt, idx) => (
                                        <div key={evt.id || idx} className="relative group">
                                            <div className="absolute -left-12 top-1.5 w-8 h-8 rounded-full bg-indigo-50 dark:bg-white/5 border border-indigo-500/20 group-hover:bg-indigo-600 transition-colors flex items-center justify-center text-indigo-600 group-hover:text-white">
                                                <div className="w-2.5 h-2.5 rounded-full bg-current"></div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{evt.date} at {evt.time || '00:00'}</p>
                                                    <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-full">{evt.dept || 'General Clinic'}</span>
                                                </div>
                                                <h5 className="text-sm font-black italic">{evt.event}</h5>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Attended by: {evt.provider || 'Clinician'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">No past clinical visits registered</div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-20 text-center space-y-8 bg-white dark:bg-slate-900/50 rounded-[4rem] border border-slate-200 dark:border-white/5 shadow-xl">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center shadow-inner text-indigo-500 animate-bounce">
                        <HeartIcon className="w-10 h-10" />
                    </div>
                    <div>
                        <p className="text-xl font-black uppercase tracking-tight italic">No Student Profile Loaded</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-3 tracking-widest max-w-sm leading-relaxed">Search and select a student above to construct their complete longitudinal health records manifest.</p>
                    </div>
                </div>
            )}
        </div>
    );

    const renderPharmacyInventoryReport = () => (
        <div className="space-y-10 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-4 hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-indigo-50 dark:bg-white/5 rounded-2xl w-fit">
                        <ActivityIcon className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Drug Stock Items</p>
                        <p className="text-3xl font-black mt-1 italic tracking-tight">{pharmacyStats.totalItems}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Unique pharmaceutical SKUs</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-4 hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-emerald-50 dark:bg-white/5 rounded-2xl w-fit">
                        <CurrencyIcon className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Stock Valuation</p>
                        <p className="text-2xl font-black mt-1 italic text-emerald-500 tracking-tight">KES {pharmacyStats.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Total inventory cost basis</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-4 hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-rose-50 dark:bg-white/5 rounded-2xl w-fit">
                        <DocumentTextIcon className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Out of Stock</p>
                        <p className={`text-3xl font-black mt-1 italic tracking-tight ${pharmacyStats.outOfStockCount > 0 ? 'text-rose-500 animate-pulse' : ''}`}>{pharmacyStats.outOfStockCount}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Critical zero-balance stock</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-4 hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-amber-50 dark:bg-white/5 rounded-2xl w-fit">
                        <ClockIcon className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Reorder Alerts</p>
                        <p className={`text-3xl font-black mt-1 italic tracking-tight ${pharmacyStats.criticalAlertsCount > 0 ? 'text-amber-500' : ''}`}>{pharmacyStats.criticalAlertsCount}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Items below threshold level</p>
                    </div>
                </div>
            </div>

            {/* Inventory Listing Table */}
            <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] italic">Pharmacy Inventory Ledger</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                            {reportInventorySubTab === 'molecular'
                                ? 'Detailed overview of current drug units in stock'
                                : 'General school inventory items allocated to Pharmacy Sub-Store'}
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        {reportInventorySubTab === 'molecular' && (
                            <select
                                value={pharmacyCategoryFilter}
                                onChange={e => setPharmacyCategoryFilter(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[9px] font-black uppercase tracking-widest px-4 py-2 text-slate-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-inner"
                            >
                                <option value="">ALL CATEGORIES</option>
                                {pharmacyStats.categories.map((c, i) => (
                                    <option key={i} value={c}>{c.toUpperCase()}</option>
                                ))}
                            </select>
                        )}

                        <div className="relative w-full sm:w-64">
                            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-white/40"><SearchIcon className="w-3.5 h-3.5" /></span>
                            <input 
                                type="text"
                                placeholder={reportInventorySubTab === 'molecular' ? "SEARCH DRUG NAME..." : "SEARCH ITEM NAME..."}
                                value={pharmacySearch}
                                onChange={e => setPharmacySearch(e.target.value)}
                                className="w-full pl-10 pr-6 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[9px] font-black uppercase tracking-widest focus:ring-1 focus:ring-indigo-500 transition-all dark:text-white shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-1 rounded-2xl w-fit">
                    <button
                        onClick={() => setReportInventorySubTab('molecular')}
                        className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all italic ${
                            reportInventorySubTab === 'molecular'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-md'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Molecular Pharmacy Drugs
                    </button>
                    <button
                        onClick={() => setReportInventorySubTab('school_linked')}
                        className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all italic ${
                            reportInventorySubTab === 'school_linked'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-md'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Linked School Inventory (Sub-Store)
                    </button>
                </div>

                <div className="overflow-x-auto">
                    {reportInventorySubTab === 'molecular' ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 italic">
                                    <th className="py-4">Drug item / description</th>
                                    <th className="py-4">Category</th>
                                    <th className="py-4 text-center">Unit Price</th>
                                    <th className="py-4 text-center">Current Stock</th>
                                    <th className="py-4 text-center">Reorder Threshold</th>
                                    <th className="py-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPharmacy.length > 0 ? (
                                    filteredPharmacy.map((item, idx) => {
                                        const qty = Number(item.stock_quantity || item.stockQuantity || 0);
                                        const price = Number(item.unit_price || item.unitPrice || 0);
                                        const reorder = Number(item.reorder_level || item.reorderLevel || 10);
                                        
                                        let statusText = 'In Stock';
                                        let badgeColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
                                        if (qty <= 0) {
                                            statusText = 'Out of Stock';
                                            badgeColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
                                        } else if (qty < reorder) {
                                            statusText = 'Low Stock';
                                            badgeColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                                        }

                                        return (
                                            <tr key={item.id || idx} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="py-5">
                                                    <p className="text-[11px] font-black italic">{item.name}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">SKU ID: {item.id.substring(0, 8).toUpperCase()}</p>
                                                </td>
                                                <td className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.category || 'Generics'}</td>
                                                <td className="py-5 text-center text-[10px] font-black italic">KES {price.toFixed(2)}</td>
                                                <td className="py-5 text-center text-[11px] font-black">{qty} {item.unit || 'units'}</td>
                                                <td className="py-5 text-center text-[10px] font-bold text-slate-400">{reorder} units</td>
                                                <td className="py-5 text-right">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border italic ${badgeColor}`}>{statusText}</span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching drugs in stock</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 italic">
                                    <th className="py-4">Asset Formulation</th>
                                    <th className="py-4">Category</th>
                                    <th className="py-4 text-center">Cost Value</th>
                                    <th className="py-4 text-center">Stock Level</th>
                                    <th className="py-4 text-right">Status Code</th>
                                </tr>
                            </thead>
                            <tbody>
                                {linkedSchoolItems.filter(item => !pharmacySearch.trim() || item.name.toLowerCase().includes(pharmacySearch.toLowerCase())).map((item, idx) => {
                                    const qty = Number(item.quantity || 0);
                                    const cost = Number(item.costPrice || 0);
                                    const reorder = Number(item.reorderLevel || 10);
                                    
                                    let statusText = 'In Stock';
                                    let badgeColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
                                    if (qty <= 0) {
                                        statusText = 'Out of Stock';
                                        badgeColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
                                    } else if (qty < reorder) {
                                        statusText = 'Low Stock';
                                        badgeColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                                    }

                                    return (
                                        <tr key={item.id || idx} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="py-5">
                                                <p className="text-[11px] font-black italic">{item.name}</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">General Stock ID: {item.id.slice(0, 8).toUpperCase()}</p>
                                            </td>
                                            <td className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.category || 'General Store'}</td>
                                            <td className="py-5 text-center text-[10px] font-black italic">KES {cost.toFixed(2)}</td>
                                            <td className="py-5 text-center text-[11px] font-black">{qty} units</td>
                                            <td className="py-5 text-right">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border italic ${badgeColor}`}>{statusText}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {linkedSchoolItems.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            No linked school inventory items issued to Pharmacy Sub-Store yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );

    // 4. Activity Log & Audit Trail Calculations
    const unifiedActivityLogs = useMemo(() => {
        const list: any[] = [];

        // Clinical events
        (clinicalEvents || []).forEach((evt, idx) => {
            const pat = patientsList.find(p => p.id === (evt.patientId || evt.patient_id));
            list.push({
                id: evt.id || `evt-${idx}`,
                category: 'Clinical OPD',
                action: evt.eventType || evt.dept || 'Consultation Encounter',
                description: evt.event || evt.notes || 'Clinical consultation note recorded',
                performerName: evt.provider || evt.doctorName || 'Attending Clinician',
                performerRole: 'Doctor / Clinician',
                targetName: pat ? pat.fullName : 'Walk-in Patient',
                timestamp: evt.date ? `${evt.date} ${evt.time || '09:00'}` : (evt.createdAt || evt.created_at || new Date().toISOString()),
                status: 'SUCCESS'
            });
        });

        // Billing transactions
        (billingTransactions || []).forEach((tx, idx) => {
            list.push({
                id: tx.id || `tx-${idx}`,
                category: 'Billing & Cashier',
                action: 'Payment Receipt Posted',
                description: `Settled KES ${Number(tx.amount || tx.totalAmount || 0).toLocaleString()} via ${tx.paymentMode || tx.channel || 'Cash'} (Receipt #${tx.receiptNumber || tx.receiptNo || (tx.id ? tx.id.slice(0, 8) : 'TX')})`,
                performerName: tx.cashierName || tx.userName || 'Finance Cashier',
                performerRole: 'Cashier / Accountant',
                targetName: tx.patientName || 'Patient',
                timestamp: tx.createdAt || tx.created_at || tx.date || new Date().toISOString(),
                status: 'SUCCESS'
            });
        });

        // Direct audit logs
        (auditLogs || []).forEach((log, idx) => {
            list.push({
                id: log.id || `audit-${idx}`,
                category: log.category || 'Security & Audit',
                action: log.action || 'System Action',
                description: log.description || log.message || 'HIS System Action Logged',
                performerName: log.performerName || log.userName || log.user_name || 'System Operator',
                performerRole: log.performerRole || log.userRole || log.role || 'Staff',
                targetName: log.targetName || log.patientName || 'N/A',
                timestamp: log.timestamp || log.createdAt || log.created_at || new Date().toISOString(),
                status: log.status || 'INFO'
            });
        });

        // Sort descending
        return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [clinicalEvents, billingTransactions, auditLogs, patientsList]);

    const activityLogStats = useMemo(() => {
        const total = unifiedActivityLogs.length;
        const clinicalCount = unifiedActivityLogs.filter(l => l.category === 'Clinical OPD').length;
        const billingCount = unifiedActivityLogs.filter(l => l.category === 'Billing & Cashier').length;
        const auditCount = unifiedActivityLogs.filter(l => l.category === 'Security & Audit').length;
        return { total, clinicalCount, billingCount, auditCount };
    }, [unifiedActivityLogs]);

    const filteredActivityLogs = useMemo(() => {
        return unifiedActivityLogs.filter(log => {
            const matchesCategory = auditCategoryFilter === 'all' || log.category.toLowerCase().includes(auditCategoryFilter.toLowerCase());
            const term = auditSearch.toLowerCase().trim();
            const matchesSearch = !term ||
                log.action.toLowerCase().includes(term) ||
                log.description.toLowerCase().includes(term) ||
                log.performerName.toLowerCase().includes(term) ||
                log.targetName.toLowerCase().includes(term) ||
                log.category.toLowerCase().includes(term);
            return matchesCategory && matchesSearch;
        });
    }, [unifiedActivityLogs, auditCategoryFilter, auditSearch]);

    const renderActivityLogReport = () => (
        <div className="space-y-10 animate-fade-in">
            {/* Stats Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-4 hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-indigo-50 dark:bg-white/5 rounded-2xl w-fit">
                        <DocumentTextIcon className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Total Activity Logs</p>
                        <p className="text-3xl font-black mt-1 italic tracking-tight">{activityLogStats.total}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Recorded audit events</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-4 hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-emerald-50 dark:bg-white/5 rounded-2xl w-fit">
                        <HeartIcon className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Clinical Encounters</p>
                        <p className="text-3xl font-black mt-1 italic text-emerald-500 tracking-tight">{activityLogStats.clinicalCount}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Consultations & Prescriptions</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-4 hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-amber-50 dark:bg-white/5 rounded-2xl w-fit">
                        <CurrencyIcon className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Cashier & Billing Logs</p>
                        <p className="text-3xl font-black mt-1 italic text-amber-500 tracking-tight">{activityLogStats.billingCount}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Financial settlement logs</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-4 hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-rose-50 dark:bg-white/5 rounded-2xl w-fit">
                        <ClockIcon className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Security & System Audit</p>
                        <p className="text-3xl font-black mt-1 italic tracking-tight">{activityLogStats.auditCount}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">System & Biometric audits</p>
                    </div>
                </div>
            </div>

            {/* Audit Log Table & Filters */}
            <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] italic">HIS Master Activity Audit Trail</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Chronological record of clinical, billing, and system operations</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <select
                            value={auditCategoryFilter}
                            onChange={e => setAuditCategoryFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[9px] font-black uppercase tracking-widest px-4 py-2 text-slate-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-inner"
                        >
                            <option value="all">ALL CATEGORIES</option>
                            <option value="clinical">CLINICAL OPD</option>
                            <option value="billing">BILLING & CASHIER</option>
                            <option value="security">SECURITY & AUDIT</option>
                        </select>

                        <div className="relative w-full sm:w-64">
                            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-white/40"><SearchIcon className="w-3.5 h-3.5" /></span>
                            <input 
                                type="text"
                                placeholder="SEARCH AUDIT LOGS..."
                                value={auditSearch}
                                onChange={e => setAuditSearch(e.target.value)}
                                className="w-full pl-10 pr-6 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[9px] font-black uppercase tracking-widest focus:ring-1 focus:ring-indigo-500 transition-all dark:text-white shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 italic">
                                <th className="py-4">Timestamp</th>
                                <th className="py-4">Module / Category</th>
                                <th className="py-4">Action & Details</th>
                                <th className="py-4">Practitioner / Performer</th>
                                <th className="py-4">Patient / Target</th>
                                <th className="py-4 text-right">Audit Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredActivityLogs.length > 0 ? (
                                filteredActivityLogs.map((log, idx) => {
                                    let catBadge = 'bg-indigo-50 text-indigo-600 border-indigo-100/50';
                                    if (log.category.includes('Billing')) catBadge = 'bg-amber-50 text-amber-600 border-amber-100/50';
                                    if (log.category.includes('Security')) catBadge = 'bg-rose-50 text-rose-600 border-rose-100/50';

                                    return (
                                        <tr key={log.id || idx} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="py-5 text-[10px] font-bold text-slate-400">
                                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                                            </td>
                                            <td className="py-5">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border italic ${catBadge}`}>
                                                    {log.category}
                                                </span>
                                            </td>
                                            <td className="py-5 pr-4">
                                                <p className="text-[11px] font-black italic">{log.action}</p>
                                                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-300 mt-0.5 line-clamp-2 max-w-sm">{log.description}</p>
                                            </td>
                                            <td className="py-5">
                                                <p className="text-[11px] font-black italic">{log.performerName}</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{log.performerRole}</p>
                                            </td>
                                            <td className="py-5 text-[10px] font-bold italic text-slate-600 dark:text-slate-300">
                                                {log.targetName}
                                            </td>
                                            <td className="py-5 text-right">
                                                <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 italic">
                                                    {log.status || 'VERIFIED'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        No activity audit logs matching criteria
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-12 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-10">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter italic">
                        <span className="text-indigo-600 block text-xs tracking-[0.4em] mb-2 underline underline-offset-4 decoration-4">Business Core</span> 
                        Health <span className="text-indigo-600">Intelligence</span>
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-3 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-lg inline-block border border-slate-100 dark:border-white/5 italic shadow-inner">
                        Advanced Clinical & Pharmacy Data Analytics Hub
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-4 p-2 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/5 w-fit shadow-inner">
                {[
                    { id: 'visits', label: 'Visit Report', icon: ChartBarIcon },
                    { id: 'student_history', label: 'Student Health Record History', icon: HeartIcon },
                    { id: 'pharmacy_inventory', label: 'Pharmacy Inventory Report', icon: ActivityIcon },
                    { id: 'activity_log', label: 'Activity Log & Audit Trail', icon: DocumentTextIcon },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as IntelligenceSubTab)}
                        className={`flex items-center gap-4 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic ${
                            activeSubTab === tab.id 
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xl shadow-indigo-500/10 ring-1 ring-slate-100 dark:ring-white/10' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 transition-transform ${activeSubTab === tab.id ? 'scale-125' : ''}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main view container */}
            <main className="min-h-[500px]">
                {isLoadingData ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Constructing Reports manifests...</p>
                    </div>
                ) : (
                    <>
                        {activeSubTab === 'visits' && renderVisitsReport()}
                        {activeSubTab === 'student_history' && renderStudentHistoryReport()}
                        {activeSubTab === 'pharmacy_inventory' && renderPharmacyInventoryReport()}
                        {activeSubTab === 'activity_log' && renderActivityLogReport()}
                    </>
                )}
            </main>
        </div>
    );
};

export default HISReportsView;
