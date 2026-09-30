import React, { useState, useEffect } from 'react';
import type { Institution, SubscriptionConfig, County, InstitutionModuleState } from '../types';
import { apiService } from '../services/apiService';

interface EditInstitutionModalProps {
  institution: Institution;
  onClose: () => void;
  onSave: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
  defaultPrices: SubscriptionConfig;
  counties: County[];
  initialTab?: 'identity' | 'financials' | 'modules';
  onRefreshData?: () => Promise<void> | void;
  resellers?: Institution[];
}

const PLATFORM_MODULES = [
  { id: 'academics', name: 'Academics & Exam Grading', category: 'Core Education', desc: 'Report cards, grading systems & marksheets' },
  { id: 'finance', name: 'Finance, Fees & Ledger', category: 'Financial', desc: 'Fee billing, M-Pesa receipts & accounting' },
  { id: 'hr_payroll', name: 'HR & Tax Payroll', category: 'HR & Admin', desc: 'Staff directory, PAYE/NHIF/NSSF payroll' },
  { id: 'library', name: 'Library Management', category: 'Core Education', desc: 'Book issuing, cataloging & fines' },
  { id: 'school_store', name: 'Inventory & Store', category: 'Operations', desc: 'Stationery, uniforms & supplier stock' },
  { id: 'timetable', name: 'Smart Timetable', category: 'Core Education', desc: 'Auto class & exam timetable generator' },
  { id: 'his', name: 'EduPulse Wellness (HIS)', category: 'Health', desc: 'School clinic triage, visits & health logs' },
  { id: 'transport', name: 'Transport & Fleet', category: 'Operations', desc: 'Bus routes, student transit & fuel logs' },
  { id: 'boarding', name: 'Hostel & Boarding', category: 'Operations', desc: 'Bed allocations & leave-out passes' },
  { id: 'enrollment_manager', name: 'Student Enrollment', category: 'Core Education', desc: 'Admissions & biometric student registry' },
  { id: 'events', name: 'Event & Marathon', category: 'Community', desc: 'Ticketing, race splits & event management' },
  { id: 'ng_cdf', name: 'NG-CDF Bursaries', category: 'Financial', desc: 'Constituency student grants & bursary kit' },
  { id: 'fiscal_guard', name: 'FiscalGuard AI Auditor', category: 'Financial', desc: 'Audit log monitoring & fraud detection' },
  { id: 'driving_school', name: 'Driving School Portal', category: 'Specialized', desc: 'NTSA curriculum & instructor logs' },
  { id: 'beauty_college', name: 'Beauty & Salon Studio', category: 'Specialized', desc: 'Salon appointments & client practicals' },
  { id: 'law_firm', name: 'Legal & Law Firm', category: 'Specialized', desc: 'Client case matters & trust ledgers' },
  { id: 'cooperative', name: 'Cooperative & Agrovet', category: 'Specialized', desc: 'Farmer milk sales, agrovet & payouts' },
  { id: 'property', name: 'Property Management', category: 'Specialized', desc: 'Tenant leases & rent billing' },
  { id: 'restaurant_pos', name: 'Restaurant POS', category: 'Specialized', desc: 'Table ordering & kitchen display' },
  { id: 'church', name: 'Church & Ministry', category: 'Specialized', desc: 'Tithes, cell groups & attendance' },
  { id: 'car_showroom', name: 'Car Showroom & Sales', category: 'Specialized', desc: 'Car inventory & test drive bookings' },
  { id: 'fuel_station', name: 'Fuel Station IoT', category: 'Specialized', desc: 'Pump readings & tank dip logs' },
  { id: 'milling', name: 'Maize Milling & Feeds OS', category: 'Specialized', desc: 'Dual weighbridge, roller milling yield, packing & feeds' }
];

export const EditInstitutionModal: React.FC<EditInstitutionModalProps> = ({ institution, onClose, onSave, defaultPrices, counties, initialTab = 'identity', onRefreshData, resellers }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    institutionType: 'University',
    countyId: '',
    customSubscriptionPrice: {
      monthly: '',
      quarterly: '',
      yearly: '',
    },
    isOtpEnabled: false,
    customSmsPrice: '',
    category: '',
    businessSubType: '',
    billingModel: 'fixed',
    ratePerStudent: '0',
    resellerId: '',
    status: 'active' as 'active' | 'trial' | 'suspended' | 'expired',
    subscriptionEndsAt: '',
    isSuspendedForBilling: false,
  });

  const [activeTab, setActiveTab] = useState<'identity' | 'financials' | 'modules'>(initialTab);
  const [moduleStates, setModuleStates] = useState<InstitutionModuleState[]>(institution.moduleStates || []);
  const [isExtendingModule, setIsExtendingModule] = useState(false);
  const [customDaysMap, setCustomDaysMap] = useState<Record<string, number>>({});
  const [moduleStatusMap, setModuleStatusMap] = useState<Record<string, 'active' | 'trial'>>({});

  const [availableResellers, setAvailableResellers] = useState<Institution[]>(resellers || []);

  useEffect(() => {
    if (!resellers || resellers.length === 0) {
      apiService.fetchInstitutions().then(insts => {
        if (insts) {
          setAvailableResellers(insts.filter(i => i.institutionType === 'Reseller'));
        }
      }).catch(err => console.warn("Failed to load resellers:", err));
    } else {
      setAvailableResellers(resellers.filter(i => i.institutionType === 'Reseller'));
    }
  }, [resellers]);

  useEffect(() => {
    if (institution) {
      const rawSubEnd = institution.subscriptionEndsAt || (institution as any).subscription_ends_at;
      let formattedSubEnd = '';
      if (rawSubEnd) {
        try {
          formattedSubEnd = new Date(rawSubEnd).toISOString().split('T')[0];
        } catch (_) {}
      }

      setFormData({
        name: institution.name,
        email: institution.email,
        phoneNumber: institution.phoneNumber,
        institutionType: institution.institutionType,
        countyId: institution.countyId || '',
        customSubscriptionPrice: {
          monthly: (institution.customSubscriptionPrice?.monthly ?? (institution as any).custom_subscription_price?.monthly)?.toString() || '',
          quarterly: (institution.customSubscriptionPrice?.quarterly ?? (institution as any).custom_subscription_price?.quarterly)?.toString() || '',
          yearly: (institution.customSubscriptionPrice?.yearly ?? (institution as any).custom_subscription_price?.yearly)?.toString() || '',
        },
        isOtpEnabled: institution.isOtpEnabled ?? false,
        customSmsPrice: (institution.customSmsPrice ?? (institution as any).custom_sms_price)?.toString() || '',
        category: institution.category || institution.businessSubType || '',
        businessSubType: institution.businessSubType || '',
        billingModel: institution.billingModel || (institution as any).billing_model || 'fixed',
        ratePerStudent: (institution.ratePerStudent ?? (institution as any).rate_per_student ?? 0).toString(),
        resellerId: institution.resellerId || (institution as any).reseller_id || '',
        status: (institution.status as any) || 'active',
        subscriptionEndsAt: formattedSubEnd,
        isSuspendedForBilling: institution.isSuspendedForBilling ?? (institution as any).is_suspended_for_billing ?? false,
      });
      fetchLatestModuleStates();
    }
  }, [institution]);

  const fetchLatestModuleStates = async () => {
    try {
      const records = await apiService.fetchModuleRecords<InstitutionModuleState>('institution_module_states', institution.id);
      if (records) setModuleStates(records);
    } catch (e) {
      console.error("Failed to load module states:", e);
    }
  };

  const handleExtendModuleSubscription = async (moduleId: string, days: number, targetStatus: 'active' | 'trial' = 'active') => {
    try {
      setIsExtendingModule(true);
      await apiService.extendModuleSubscription(institution.id, moduleId, days, targetStatus);
      await fetchLatestModuleStates();
      if (onRefreshData) await onRefreshData();
      alert(`Subscription extended successfully by ${days} days for ${moduleId === 'all' ? 'ALL modules' : moduleId}!`);
    } catch (e: any) {
      alert("Failed to extend module subscription: " + (e.message || e));
    } finally {
      setIsExtendingModule(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      customSubscriptionPrice: {
        ...prev.customSubscriptionPrice,
        [name]: value,
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isReseller = formData.institutionType === 'Reseller';
    const saveData: Partial<Omit<Institution, 'id'>> = {
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      institutionType: formData.institutionType as Institution['institutionType'],
      countyId: formData.countyId || undefined,
      status: isReseller ? 'active' : (formData.status as any),
      trialEndsAt: isReseller ? undefined : institution.trialEndsAt,
      subscriptionEndsAt: isReseller 
        ? undefined 
        : (formData.subscriptionEndsAt ? new Date(`${formData.subscriptionEndsAt}T23:59:59.999Z`).toISOString() : undefined),
      isSuspendedForBilling: isReseller ? false : formData.isSuspendedForBilling,
      is_suspended_for_billing: isReseller ? false : formData.isSuspendedForBilling,
      customSubscriptionPrice: isReseller ? undefined : {
        monthly: formData.customSubscriptionPrice.monthly ? parseFloat(formData.customSubscriptionPrice.monthly) : undefined,
        quarterly: formData.customSubscriptionPrice.quarterly ? parseFloat(formData.customSubscriptionPrice.quarterly) : undefined,
        yearly: formData.customSubscriptionPrice.yearly ? parseFloat(formData.customSubscriptionPrice.yearly) : undefined,
      },
      isOtpEnabled: formData.isOtpEnabled,
      is_otp_enabled: formData.isOtpEnabled,
      customSmsPrice: formData.customSmsPrice ? parseFloat(formData.customSmsPrice) : null,
      category: formData.category || undefined,
      businessSubType: formData.category || formData.businessSubType || undefined,
      billingModel: isReseller ? 'fixed' : (formData.billingModel as any),
      billing_model: isReseller ? 'fixed' : (formData.billingModel as any),
      ratePerStudent: isReseller ? 0 : (parseFloat(formData.ratePerStudent) || 0),
      rate_per_student: isReseller ? 0 : (parseFloat(formData.ratePerStudent) || 0),
      resellerId: isReseller ? undefined : (formData.resellerId || null as any),
      reseller_id: isReseller ? undefined : (formData.resellerId || null as any),
    };
    onSave(institution.id, saveData);
  };

  if (!institution) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 pb-4 flex justify-between items-center bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              Institution Registry & Licensing
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Tenant: {institution.name} ({institution.institutionCode || institution.id})</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="px-8 border-b border-slate-100 dark:border-slate-800 flex gap-8 bg-slate-50/50 dark:bg-slate-900/50">
          {(['identity', 'financials', 'modules'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-4 pt-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'identity' ? 'Identity Context' : tab === 'financials' ? 'Financial Strategy' : 'Module Subscriptions & Extensions'}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.4)]" />}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
            {activeTab === 'identity' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Official Institution Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" placeholder="e.g. Green Valley Academy" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Registry Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" placeholder="admin@academy.com" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Contact Hotline</label>
                    <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="form-input" placeholder="+254..." required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Operational Cluster</label>
                    <select 
                      name="institutionType" 
                      value={formData.institutionType} 
                      onChange={(e) => {
                        const type = e.target.value as any;
                        let cat = '';
                        if (type === 'Education') cat = 'Primary';
                        if (type === 'Business') cat = 'Agrovet';
                        if (type === 'Hospitality') cat = 'Hotel';
                        if (type === 'Law Firm') cat = 'Law Firm';
                        if (type === 'Driving School') cat = 'Driving School';
                        if (type === 'Beauty College') cat = 'Beauty College';
                        if (type === 'Logistics') cat = 'Logistics';
                        if (type === 'Constituency') cat = 'Constituency';
                        if (type === 'Maize Miller' || type === 'Milling') cat = 'Commercial Maize Miller';
                        setFormData({ ...formData, institutionType: type, category: cat });
                      }} 
                      className="form-select font-black text-indigo-600 border-indigo-100"
                    >
                      <option value="Education">Education Sector</option>
                      <option value="HIS">Health Sector (HIS)</option>
                      <option value="Business">Business Ecosystem</option>
                      <option value="Maize Miller">Maize Milling & Grain Processing</option>
                      <option value="Cooperative">Agriculture / Cooperative</option>
                      <option value="SACCO">Financial / SACCO</option>
                      <option value="Church">Religious / Church</option>
                      <option value="Broadcaster">Media / Broadcaster</option>
                      <option value="Reseller">Reseller Agency</option>
                      <option value="Pharmacy">Pharmacy / Chemist</option>
                      <option value="Community">Community & Politics</option>
                      <option value="Political Campaign">Political / Election Campaign</option>
                      <option value="Hospitality">Tourism & Hospitality</option>
                      <option value="Law Firm">Legal / Law Firm</option>
                      <option value="Logistics">Transport & Logistics</option>
                      <option value="Driving School">Driving School</option>
                      <option value="Beauty College">Beauty College</option>
                      <option value="IELTS Academy">IELTS & Language Training Academy</option>
                      <option value="Restaurant">Restaurant & Cafe POS</option>
                      <option value="Constituency">Constituency (NG-CDF)</option>
                    </select>
                  </div>

                  {formData.institutionType !== 'Reseller' && (
                    <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                      <label className="block text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest mb-1.5 ml-1 flex items-center justify-between">
                        <span>Assigned Reseller Agency</span>
                        <span className="text-[9px] text-slate-400 font-normal">Links tenant to reseller commission & referral system</span>
                      </label>
                      <select
                        name="resellerId"
                        value={formData.resellerId}
                        onChange={e => setFormData({ ...formData, resellerId: e.target.value })}
                        className="form-select font-bold text-slate-900 dark:text-white"
                      >
                        <option value="">-- Direct Institution (No Reseller Assigned) --</option>
                        {availableResellers.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.institutionCode || r.id})
                          </option>
                        ))}
                      </select>
                      {formData.resellerId && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-1.5 ml-1">
                          ✓ Connected to Reseller: {availableResellers.find(r => r.id === formData.resellerId)?.name || formData.resellerId}
                        </p>
                      )}
                    </div>
                  )}
                  {(formData.institutionType === 'Education') && (
                    <div className="animate-fade-in-up">
                      <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1">Educational Level / Category</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="form-select border-2 border-indigo-200 font-bold"
                        required
                      >
                        <option value="Kindergarten">Kindergarten / Playgroup</option>
                        <option value="ECD">ECD Center</option>
                        <option value="Primary">Primary School</option>
                        <option value="Secondary">Secondary School</option>
                        <option value="International">International School</option>
                        <option value="College">College</option>
                        <option value="TVET">TVET / Vocational</option>
                        <option value="Institute">Institute</option>
                        <option value="Polytechnic">Polytechnic</option>
                        <option value="University">University</option>
                      </select>
                    </div>
                  )}
                  {(formData.institutionType === 'Maize Miller' || formData.institutionType === 'Milling') && (
                    <div className="animate-fade-in-up">
                      <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1">Milling & Processing Scale</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="form-select border-2 border-indigo-200 font-bold"
                        required
                      >
                        <option value="Commercial Maize Miller">Commercial Maize Miller (Roller Mill / Sifted Grade 1 & 2)</option>
                        <option value="Posho & Roller Mill">Posho & Roller Mill (Medium & Custom Milling)</option>
                        <option value="Grain Aggregator & Feeds Manufacturer">Grain Aggregator & Feeds Manufacturer (Intake + Feeds)</option>
                        <option value="Agro-Processing Cooperative">Agro-Processing Cooperative (Farmer Grain Intake)</option>
                      </select>
                    </div>
                  )}
                  {formData.institutionType === 'Business' && (
                    <div className="animate-fade-in-up">
                      <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1">Business Niche / Category</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="form-select border-2 border-indigo-200 font-bold"
                        required
                      >
                        <option value="">-- Select Category --</option>
                        <option value="Maize Miller">Maize Miller & Grain Processing</option>
                        <option value="Agrovet">Agrovet (Agricultural Supplies)</option>
                        <option value="Fuel Station">Fuel & Energy Station (Multi-Pump/IoT)</option>
                        <option value="Property Management">Property Management (Rent/Leases)</option>
                        <option value="Industrial Logistics">Industrial Logistics & Heavy Fleet</option>
                        <option value="Civil Manufacturing">Civil Manufacturing Yard (Infrastructure)</option>
                        <option value="Retail Agency">Retail Agency (Commission Based)</option>
                        <option value="Car Wash">Car Wash / Service Center</option>
                        <option value="Automotive Marketplace">Car Sales / Automotive Marketplace</option>
                        <option value="Hardware">Hardware Store</option>
                        <option value="Pharmacy">Pharmacy / Chemist</option>
                        <option value="General">General Retail / Business</option>
                      </select>
                    </div>
                  )}
                  {formData.institutionType === 'Church' && (
                    <div className="animate-fade-in-up">
                      <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1">Church Tradition (Denomination)</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="form-select border-2 border-indigo-200 font-bold"
                        required
                      >
                        <option value="">-- Select Tradition --</option>
                        <option value="Catholic">Catholic (Sacramental/SCC)</option>
                        <option value="Protestant">Protestant (Evangelical/Cell Groups)</option>
                        <option value="Orthodox">Orthodox (Holy Mysteries/Fasting Calendar)</option>
                      </select>
                    </div>
                  )}
                  {formData.institutionType === 'Community' && (
                    <div className="animate-fade-in-up">
                      <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1">Community / Political Focus</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="form-select border-2 border-indigo-200 font-bold"
                        required
                      >
                        <option value="">-- Select Focus --</option>
                        <option value="Chama/Savings Group">Self Help / Savings Group (Chama)</option>
                        <option value="Estate/Neighborhood">Estate / Neighborhood Management</option>
                        <option value="NGO/Foundation">NGO / Social Foundation</option>
                        <option value="Political Campaign">Political Campaign Management</option>
                        <option value="General">General Community</option>
                      </select>
                    </div>
                  )}
                  {formData.institutionType === 'Hospitality' && (
                    <div className="animate-fade-in-up">
                      <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1">Hospitality & Tourism Focus</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="form-select border-2 border-indigo-200 font-bold"
                        required
                      >
                        <option value="">-- Select Focus --</option>
                        <option value="Hotel">Hotel / Resort</option>
                        <option value="Travel Agency">Travel / Tour Agency</option>
                        <option value="Restaurant">Fine Dining / Restaurant</option>
                        <option value="Safari">Safari / Game Lodge</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">County Location</label>
                    <select name="countyId" value={formData.countyId} onChange={handleChange} className="form-select">
                      <option value="">-- Select County --</option>
                      {counties.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <input
                        type="checkbox"
                        id="modal-enable-2fa"
                        name="isOtpEnabled"
                        checked={formData.isOtpEnabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, isOtpEnabled: e.target.checked }))}
                        className="h-6 w-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <label htmlFor="modal-enable-2fa" className="text-sm font-bold text-slate-700 dark:text-slate-300">Enforce Two-Factor Authentication (2FA)</label>
                        <p className="text-xs text-slate-400 uppercase tracking-tight">Requirement for all users in this institution to verify identity via SMS/Email OTP.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'financials' && (
              <div className="space-y-6 animate-fade-in-up">
                {/* ── Account Status & Expiry Date Controls ── */}
                <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/50 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-200 dark:shadow-none">
                        📅
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black uppercase text-indigo-950 dark:text-indigo-200 tracking-wider">Account Status &amp; Subscription Expiry</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Manage access validity and manual expiry date</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                      formData.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                      formData.status === 'suspended' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                      formData.status === 'trial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                      'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {formData.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">Account Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="form-select font-bold text-xs"
                      >
                        <option value="active">Active (Full Access Granted)</option>
                        <option value="trial">Trial Period</option>
                        <option value="suspended">Suspended (Locked Out)</option>
                        <option value="expired">Expired (Pending Payment)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5 ml-1">
                        <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Expiry Date (Calendar Picker)
                        </label>
                        {formData.subscriptionEndsAt && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, subscriptionEndsAt: '' }))}
                            className="text-[9px] font-bold text-rose-500 hover:underline uppercase"
                          >
                            Set Lifetime (No Expiry)
                          </button>
                        )}
                      </div>
                      <input
                        type="date"
                        name="subscriptionEndsAt"
                        value={formData.subscriptionEndsAt}
                        onChange={handleChange}
                        className="form-input font-bold text-sm text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900"
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1">Quick Set:</span>
                    {[
                      { label: '+30 Days', days: 30 },
                      { label: '+90 Days (Quarter)', days: 90 },
                      { label: '+6 Months', days: 180 },
                      { label: '+1 Year', days: 365 },
                      { label: '+2 Years', days: 730 },
                    ].map(preset => (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => {
                          const base = formData.subscriptionEndsAt ? new Date(formData.subscriptionEndsAt) : new Date();
                          const baseTime = Math.max(base.getTime(), Date.now());
                          const target = new Date(baseTime + preset.days * 24 * 60 * 60 * 1000);
                          setFormData(prev => ({ 
                            ...prev, 
                            subscriptionEndsAt: target.toISOString().split('T')[0], 
                            status: 'active', 
                            isSuspendedForBilling: false 
                          }));
                        }}
                        className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 hover:bg-indigo-600 hover:text-white transition-all text-indigo-700 dark:text-indigo-300 shadow-sm"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Overdue billing suspension toggle */}
                  <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Overdue Billing Suspension Lock</span>
                      <p className="text-[9px] text-slate-400">Turn OFF to clear overdue invoice locks (e.g. driving school postpaid billing lock).</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isSuspendedForBilling}
                        onChange={e => setFormData(prev => ({ ...prev, isSuspendedForBilling: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                    </label>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h4 className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Custom Subscription Overrides</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">Monthly Rate (KES)</label>
                      <input
                        type="number"
                        name="monthly"
                        value={formData.customSubscriptionPrice.monthly}
                        onChange={handlePriceChange}
                        className="form-input font-bold text-emerald-600 dark:text-emerald-400"
                        placeholder={`Default: ${defaultPrices.defaultMonthlyPrice}`}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">Quarterly Rate (KES)</label>
                      <input
                        type="number"
                        name="quarterly"
                        value={formData.customSubscriptionPrice.quarterly}
                        onChange={handlePriceChange}
                        className="form-input font-bold text-emerald-600 dark:text-emerald-400"
                        placeholder={`Default: ${defaultPrices.defaultMonthlyPrice * 4}`}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">Yearly Rate (KES)</label>
                      <input
                        type="number"
                        name="yearly"
                        value={formData.customSubscriptionPrice.yearly}
                        onChange={handlePriceChange}
                        className="form-input font-bold text-emerald-600 dark:text-emerald-400"
                        placeholder={`Default: ${defaultPrices.defaultYearlyPrice}`}
                        min="0"
                      />
                    </div>
                  </div>
                  <p className="mt-4 text-[10px] text-slate-400 italic">Leave these fields empty to maintain standard system pricing for this institution.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    </div>
                    <h4 className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">SMS Pricing Override</h4>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">Unit Price (KES)</label>
                    <input
                      type="number"
                      name="customSmsPrice"
                      step="0.01"
                      value={formData.customSmsPrice}
                      onChange={handleChange}
                      className="form-input font-bold text-indigo-600 dark:text-indigo-400"
                      placeholder="e.g. 0.80"
                      min="0"
                    />
                  </div>
                  <p className="mt-4 text-[10px] text-slate-400 italic">Set a custom cost per SMS unit for this institution. Leave empty to use system default.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <h4 className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Driving School Subscription Billing</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">Billing Model</label>
                      <select
                        name="billingModel"
                        value={formData.billingModel}
                        onChange={handleChange}
                        className="form-select font-bold text-slate-800 dark:text-slate-100"
                      >
                        <option value="fixed">Standard Fixed Plan</option>
                        <option value="prepaid_student">Prepaid (Per Student Enrollment)</option>
                        <option value="postpaid_student">Postpaid (Accumulate & Bill Monthly)</option>
                      </select>
                    </div>
                    {formData.billingModel !== 'fixed' && (
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">Rate per Student (KES)</label>
                        <input
                          type="number"
                          name="ratePerStudent"
                          value={formData.ratePerStudent}
                          onChange={handleChange}
                          className="form-input font-bold text-amber-600 dark:text-amber-400"
                          placeholder="e.g. 200"
                          min="0"
                        />
                      </div>
                    )}
                  </div>
                  <p className="mt-4 text-[10px] text-slate-400 italic">Select the billing strategy for this tenant. Student-based models apply only to Driving Schools.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 text-teal-600 rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    </div>
                    <h4 className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">System Identifiers</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Internal DB ID</p>
                        <p className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 truncate">{institution.id}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Registry Code</p>
                        <p className="text-[10px] font-mono font-bold text-indigo-600 truncate">{institution.institutionCode || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'modules' && (
              <div className="space-y-6 animate-fade-in-up">
                {/* Global Bulk Extension Bar */}
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-[2rem] shadow-xl border border-indigo-700/50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-800/60 px-3 py-1 rounded-full border border-indigo-600/50">Super Admin Global Control</span>
                      <h4 className="text-lg font-black uppercase tracking-tight mt-1 text-white">⚡ Extend All Platform Modules</h4>
                      <p className="text-xs text-indigo-200 mt-0.5">Bulk extend active subscription end dates across every module for this institution.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isExtendingModule}
                        onClick={() => handleExtendModuleSubscription('all', 30, 'active')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
                      >
                        +30 Days (All)
                      </button>
                      <button
                        type="button"
                        disabled={isExtendingModule}
                        onClick={() => handleExtendModuleSubscription('all', 90, 'active')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
                      >
                        +90 Days (All)
                      </button>
                      <button
                        type="button"
                        disabled={isExtendingModule}
                        onClick={() => handleExtendModuleSubscription('all', 365, 'active')}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
                      >
                        +1 Year (All)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Per Module List */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Individual Module Subscriptions ({PLATFORM_MODULES.length} Modules)</h4>
                    <span className="text-[10px] text-slate-400">Select custom days or quick presets to grant module access</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {PLATFORM_MODULES.map((mod) => {
                      const state = moduleStates.find(m => m.moduleId === mod.id);
                      const isTrial = state?.status === 'trial';
                      const isActive = state?.status === 'active';
                      const isExpired = state?.status === 'expired' || (state?.status === 'trial' && state.trialEndsAt && new Date(state.trialEndsAt) < new Date());
                      const endDate = state?.subscriptionEndsAt || state?.trialEndsAt;
                      const customDays = customDaysMap[mod.id] || 30;
                      const targetStatus = moduleStatusMap[mod.id] || 'active';

                      return (
                        <div key={mod.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                          <div className="space-y-1 max-w-md">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900 dark:text-white">{mod.name}</span>
                              <span className="text-[9px] font-mono uppercase bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded font-bold">{mod.category}</span>
                              {isActive && <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md">✓ Active Pro</span>}
                              {isTrial && !isExpired && <span className="text-[9px] font-black uppercase bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 px-2 py-0.5 rounded-md">Trial</span>}
                              {isExpired && <span className="text-[9px] font-black uppercase bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded-md">Expired</span>}
                              {(!state || state.status === 'inactive') && <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">Inactive</span>}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{mod.desc}</p>
                            {endDate && (
                              <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                                Current Expiry: {new Date(endDate).toLocaleDateString()} ({new Date(endDate) > new Date() ? `${Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left` : 'Expired'})
                              </p>
                            )}
                          </div>

                          <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-700">
                            {/* License Mode */}
                            <select
                              value={targetStatus}
                              onChange={(e) => setModuleStatusMap(prev => ({ ...prev, [mod.id]: e.target.value as any }))}
                              className="text-[11px] font-bold py-1.5 px-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                            >
                              <option value="active">Pro Active License</option>
                              <option value="trial">Trial Period</option>
                            </select>

                            {/* Preset Buttons */}
                            <div className="flex gap-1">
                              {[14, 30, 90, 365].map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  disabled={isExtendingModule}
                                  onClick={() => handleExtendModuleSubscription(mod.id, d, targetStatus)}
                                  className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border border-indigo-200 dark:border-indigo-800 disabled:opacity-50"
                                >
                                  +{d === 365 ? '1Yr' : `${d}d`}
                                </button>
                              ))}
                            </div>

                            {/* Custom Days Input */}
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                value={customDays}
                                onChange={(e) => setCustomDaysMap(prev => ({ ...prev, [mod.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                                className="w-14 py-1 px-1.5 text-center text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                                placeholder="30"
                              />
                              <button
                                type="button"
                                disabled={isExtendingModule}
                                onClick={() => handleExtendModuleSubscription(mod.id, customDays, targetStatus)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-xs disabled:opacity-50"
                              >
                                Grant
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-6 flex justify-end items-center gap-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="btn-secondary h-12 px-8">Discard</button>
            <button type="submit" className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100 dark:shadow-none">Save Changes</button>
          </div>
        </form>
      </div>
      <style>{`
        .form-input, .form-select { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; }
        .dark .form-input, .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
        .btn-primary { background-color: #4f46e5; color: #fff; font-weight: 700; padding: 0.5rem 1.5rem; border-radius: 1rem; border: none; cursor: pointer; transition: all 0.2s; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
        .btn-secondary { background-color: #fff; color: #475569; font-weight: 700; padding: 0.5rem 1rem; border-radius: 1rem; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
        .dark .btn-secondary { background-color: #1e293b; color: #cbd5e1; border-color: #334155; }
        .animate-fade-in-up { animation: fadeInUp 0.3s ease-out; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

