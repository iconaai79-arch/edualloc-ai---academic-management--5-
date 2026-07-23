import React, { useState, useEffect } from 'react';
import type { Institution, SubscriptionConfig, County } from '../types';

interface EditInstitutionModalProps {
  institution: Institution;
  onClose: () => void;
  onSave: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
  defaultPrices: SubscriptionConfig;
  counties: County[];
}

export const EditInstitutionModal: React.FC<EditInstitutionModalProps> = ({ institution, onClose, onSave, defaultPrices, counties }) => {
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
  });

  useEffect(() => {
    if (institution) {
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
      });
    }
  }, [institution]);

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
      status: isReseller ? 'active' : institution.status,
      trialEndsAt: isReseller ? undefined : institution.trialEndsAt,
      subscriptionEndsAt: isReseller ? undefined : institution.subscriptionEndsAt,
      isSuspendedForBilling: isReseller ? false : institution.isSuspendedForBilling,
      customSubscriptionPrice: isReseller ? undefined : {
        monthly: formData.customSubscriptionPrice.monthly ? parseFloat(formData.customSubscriptionPrice.monthly) : undefined,
        quarterly: formData.customSubscriptionPrice.quarterly ? parseFloat(formData.customSubscriptionPrice.quarterly) : undefined,
        yearly: formData.customSubscriptionPrice.yearly ? parseFloat(formData.customSubscriptionPrice.yearly) : undefined,
      },
      isOtpEnabled: formData.isOtpEnabled,
      customSmsPrice: formData.customSmsPrice ? parseFloat(formData.customSmsPrice) : null,
      category: formData.category || undefined,
      businessSubType: formData.category || formData.businessSubType || undefined,
      billingModel: isReseller ? 'fixed' : (formData.billingModel as any),
      ratePerStudent: isReseller ? 0 : (parseFloat(formData.ratePerStudent) || 0),
    };
    onSave(institution.id, saveData);
  };

  const [activeTab, setActiveTab] = useState<'identity' | 'financials'>('identity');

  if (!institution) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 pb-4 flex justify-between items-center bg-white dark:bg-slate-900">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              Institution Registry
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Editing: {institution.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="px-8 border-b border-slate-100 dark:border-slate-800 flex gap-8">
          {(['identity', 'financials'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'identity' ? 'Identity Context' : 'Financial Strategy'}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.4)]" />}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-8 space-y-6 overflow-y-auto">
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
                        setFormData({ ...formData, institutionType: type, category: cat });
                      }} 
                      className="form-select font-black text-indigo-600 border-indigo-100"
                    >
                      <option value="Education">Education Sector</option>
                      <option value="HIS">Health Sector (HIS)</option>
                      <option value="Business">Business Ecosystem</option>
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
                      <option value="Constituency">Constituency (NG-CDF)</option>
                    </select>
                  </div>
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

