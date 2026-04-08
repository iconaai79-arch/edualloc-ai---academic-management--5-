
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
      yearly: '',
    },
    isOtpEnabled: false,
    customSmsPrice: '',
    category: '',
    businessSubType: '',
    ncbaConfig: {
      clientId: '',
      clientSecret: '',
      callbackUsername: '',
      callbackSecret: '',
      callbackUrl: '',
      baseUrl: '',
      accountNumber: '',
      shortCode: '',
      environment: 'sandbox' as 'sandbox' | 'production',
      stkPushBaseUrl: '',
      requestUrl: '',
      pushStkUrl: '',
      queryStkUrl: '',
      isMock: false,
      headers: [] as { name: string; value: string }[],
      params: [] as { name: string; value: string }[]
    }
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
          yearly: (institution.customSubscriptionPrice?.yearly ?? (institution as any).custom_subscription_price?.yearly)?.toString() || '',
        },
        isOtpEnabled: institution.isOtpEnabled ?? false,
        customSmsPrice: institution.customSmsPrice?.toString() || '',
        category: institution.category || institution.businessSubType || '',
        businessSubType: institution.businessSubType || '',
        ncbaConfig: {
          clientId: institution.ncbaConfig?.clientId || '',
          clientSecret: institution.ncbaConfig?.clientSecret || '',
          callbackUsername: institution.ncbaConfig?.callbackUsername || '',
          callbackSecret: institution.ncbaConfig?.callbackSecret || '',
          callbackUrl: institution.ncbaConfig?.callbackUrl || '',
          baseUrl: institution.ncbaConfig?.baseUrl || '',
          accountNumber: institution.ncbaConfig?.accountNumber || '',
          shortCode: institution.ncbaConfig?.shortCode || '',
          environment: institution.ncbaConfig?.environment || 'sandbox',
          stkPushBaseUrl: institution.ncbaConfig?.stkPushBaseUrl || '',
          requestUrl: institution.ncbaConfig?.requestUrl || '',
          pushStkUrl: institution.ncbaConfig?.pushStkUrl || '',
          queryStkUrl: institution.ncbaConfig?.queryStkUrl || '',
          isMock: institution.ncbaConfig?.isMock || false,
          headers: institution.ncbaConfig?.headers || [],
          params: institution.ncbaConfig?.params || []
        }
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
    const saveData: Partial<Omit<Institution, 'id'>> = {
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      institutionType: formData.institutionType as Institution['institutionType'],
      countyId: formData.countyId || undefined,
      customSubscriptionPrice: {
        monthly: formData.customSubscriptionPrice.monthly ? parseFloat(formData.customSubscriptionPrice.monthly) : undefined,
        yearly: formData.customSubscriptionPrice.yearly ? parseFloat(formData.customSubscriptionPrice.yearly) : undefined,
      },
      isOtpEnabled: formData.isOtpEnabled,
      customSmsPrice: formData.customSmsPrice ? parseFloat(formData.customSmsPrice) : undefined,
      category: formData.category || undefined,
      businessSubType: formData.category || formData.businessSubType || undefined,
      ncbaConfig: formData.ncbaConfig
    };
    onSave(institution.id, saveData);
  };


  const [isTestingNcba, setIsTestingNcba] = useState(false);
  const [ncbaTestResult, setNcbaTestResult] = useState<any>(null);

  const handleTestNcbaAuth = async () => {
    setIsTestingNcba(true);
    setNcbaTestResult(null);
    try {
      const { apiService } = await import('../services/apiService');
      const res = await apiService.post('/api/integrations', {
        action: 'testNcbaAuth',
        config: formData.ncbaConfig
      });
      setNcbaTestResult(res);
    } catch (err: any) {
      setNcbaTestResult({ success: false, error: err.message || 'Connection failed' });
    } finally {
      setIsTestingNcba(false);
    }
  };

  const handleTestNcbaStk = async () => {
    const phoneNumber = prompt('Enter phone number for NCBA STK Push test:', formData.phoneNumber);
    if (!phoneNumber) return;

    try {
      const { apiService } = await import('../services/apiService');
      const res = await apiService.initiatePayment('ncba', 1, phoneNumber, undefined, formData.ncbaConfig);
      if (res.success) alert("NCBA STK Push request sent to phone.");
      else {
        const detail = res.error || (res.details ? JSON.stringify(res.details) : '');
        alert(`NCBA Initiation Failure: ${res.message || 'Unknown error.'}${detail ? '\n\nDetail: ' + detail : ''}`);
      }
    } catch (e: any) {
      alert(`NCBA Handshake Error: ${e.message || 'Connection failed'}`);
    }
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
                    </select>
                  </div>
                  {formData.institutionType === 'Education' && (
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
                        <option value="Property Management">Property Management (Rent/Leases)</option>
                        <option value="Retail Agency">Retail Agency (Commission Based)</option>
                        <option value="Car Wash">Car Wash / Service Center</option>
                        <option value="Hardware">Hardware Store</option>
                        <option value="Pharmacy">Pharmacy / Chemist</option>
                        <option value="General">General Retail / Business</option>
                      </select>
                    </div>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 text-teal-600 rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    </div>
                    <h4 className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">NCBA Integration Node</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Internal DB ID</p>
                        <p className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 truncate">{institution.id}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Secret Registry Code</p>
                        <p className="text-[10px] font-mono font-bold text-indigo-600 truncate">{institution.institutionCode || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 tracking-wider mb-1">STK Push Base URL</label>
                        <input
                          type="text"
                          value={formData.ncbaConfig.stkPushBaseUrl}
                          onChange={e => setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, stkPushBaseUrl: e.target.value } })}
                          className="form-input text-[10px] h-10 font-mono"
                          placeholder="https://c2bapis.ncbagroup.com"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 tracking-wider mb-1">Request URL (GET)</label>
                        <input
                          type="text"
                          value={formData.ncbaConfig.requestUrl}
                          onChange={e => setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, requestUrl: e.target.value } })}
                          className="form-input text-[10px] h-10 font-mono"
                          placeholder="/v1/stk/request"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 tracking-wider mb-1">Push STK URL (POST)</label>
                        <input
                          type="text"
                          value={formData.ncbaConfig.pushStkUrl}
                          onChange={e => setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, pushStkUrl: e.target.value } })}
                          className="form-input text-[10px] h-10 font-mono"
                          placeholder="/v1/stk/push"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 tracking-wider mb-1">STK Push Query URL (POST)</label>
                        <input
                          type="text"
                          value={formData.ncbaConfig.queryStkUrl || ''}
                          onChange={e => setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, queryStkUrl: e.target.value } })}
                          className="form-input text-[10px] h-10 font-mono"
                          placeholder="/v1/stk/query"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1 px-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Username</label>
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.preventDefault();
                              const gen = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
                              setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, clientId: gen } });
                            }}
                            className="text-[8px] font-black uppercase text-indigo-500 hover:underline"
                          >
                            Generate
                          </button>
                        </div>
                        <input
                          type="text"
                          value={formData.ncbaConfig.clientId}
                          onChange={e => setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, clientId: e.target.value } })}
                          className="form-input text-[10px] h-10"
                          placeholder="Username"
                        />
                      </div>
                       <div>
                        <div className="flex justify-between items-center mb-1 px-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Secret Key</label>
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.preventDefault();
                              const gen = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
                              setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, clientSecret: gen } });
                            }}
                            className="text-[8px] font-black uppercase text-indigo-500 hover:underline"
                          >
                            Generate
                          </button>
                        </div>
                        <input
                          type="password"
                          value={formData.ncbaConfig.clientSecret}
                          onChange={e => setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, clientSecret: e.target.value } })}
                          className="form-input text-[10px] h-10"
                          placeholder="••••••••••••••••"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1 px-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Notification User</label>
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.preventDefault();
                              const gen = Array.from(crypto.getRandomValues(new Uint8Array(5))).map(b => b.toString(16).padStart(2, '0')).join('');
                              setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, callbackUsername: gen } });
                            }}
                            className="text-[8px] font-black uppercase text-indigo-500 hover:underline"
                          >
                            Generate
                          </button>
                        </div>
                        <input
                          type="text"
                          value={formData.ncbaConfig.callbackUsername || ''}
                          onChange={e => setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, callbackUsername: e.target.value } })}
                          className="form-input text-[10px] h-10"
                          placeholder="NCBA_NOTIFY_USER"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1 px-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Notification Secret</label>
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.preventDefault();
                              const gen = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
                              setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, callbackSecret: gen } });
                            }}
                            className="text-[8px] font-black uppercase text-indigo-500 hover:underline"
                          >
                            Generate
                          </button>
                        </div>
                        <input
                          type="password"
                          value={formData.ncbaConfig.callbackSecret || ''}
                          onChange={e => setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, callbackSecret: e.target.value } })}
                          className="form-input text-[10px] h-10"
                          placeholder="••••••••••••••••"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 tracking-wider mb-1">Short Code</label>
                        <input
                          type="text"
                          value={formData.ncbaConfig.shortCode}
                          onChange={e => setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, shortCode: e.target.value } })}
                          className="form-input text-[10px] h-10 font-mono"
                          placeholder="e.g. 123456"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 tracking-wider mb-1">Callback URL</label>
                        <input
                          type="url"
                          value={formData.ncbaConfig.callbackUrl || ''}
                          onChange={e => setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, callbackUrl: e.target.value } })}
                          className="form-input text-[10px] h-10 font-mono text-indigo-600"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 tracking-wider mb-1">API Environment</label>
                        <select
                          value={formData.ncbaConfig.environment}
                          onChange={e => setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, environment: e.target.value as any } })}
                          className="form-select text-[10px] h-10 font-black uppercase tracking-widest"
                        >
                          <option value="sandbox">Sandbox</option>
                          <option value="production">Production</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                          <input
                            type="checkbox"
                            id="ncba-mock-mode"
                            checked={formData.ncbaConfig.isMock}
                            onChange={e => setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, isMock: e.target.checked } })}
                            className="h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <label htmlFor="ncba-mock-mode" className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-200 tracking-widest block">Enable Bank Mock Mode</label>
                            <p className="text-[9px] text-amber-700/70 dark:text-amber-400/60 font-bold uppercase tracking-tight">Simulates successful payments without hitting live bank APIs. Use for testing when bank gateway is unreachable.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 tracking-wider">Custom HTTP Headers</label>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            ncbaConfig: {
                              ...formData.ncbaConfig,
                              headers: [...(formData.ncbaConfig.headers || []), { name: '', value: '' }]
                            }
                          })}
                          className="text-[9px] font-black uppercase text-indigo-600 hover:underline"
                        >
                          + Add Header
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(formData.ncbaConfig.headers || []).map((header, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={header.name}
                              placeholder="Name"
                              onChange={e => {
                                const newHeaders = [...formData.ncbaConfig.headers];
                                newHeaders[idx].name = e.target.value;
                                setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, headers: newHeaders } });
                              }}
                              className="form-input text-[10px] h-8 bg-slate-50 dark:bg-slate-950 font-mono"
                            />
                            <input
                              type="text"
                              value={header.value}
                              placeholder="Value"
                              onChange={e => {
                                const newHeaders = [...formData.ncbaConfig.headers];
                                newHeaders[idx].value = e.target.value;
                                setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, headers: newHeaders } });
                              }}
                              className="form-input text-[10px] h-8 bg-slate-50 dark:bg-slate-950 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newHeaders = formData.ncbaConfig.headers.filter((_, i) => i !== idx);
                                setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, headers: newHeaders } });
                              }}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 tracking-wider">Custom Parameters</label>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            ncbaConfig: {
                              ...formData.ncbaConfig,
                              params: [...(formData.ncbaConfig.params || []), { name: '', value: '' }]
                            }
                          })}
                          className="text-[9px] font-black uppercase text-indigo-600 hover:underline"
                        >
                          + Add Parameter
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(formData.ncbaConfig.params || []).map((param, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={param.name}
                              placeholder="Key"
                              onChange={e => {
                                const newParams = [...formData.ncbaConfig.params];
                                newParams[idx].name = e.target.value;
                                setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, params: newParams } });
                              }}
                              className="form-input text-[10px] h-8 bg-slate-50 dark:bg-slate-950 font-mono"
                            />
                            <input
                              type="text"
                              value={param.value}
                              placeholder="Value"
                              onChange={e => {
                                const newParams = [...formData.ncbaConfig.params];
                                newParams[idx].value = e.target.value;
                                setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, params: newParams } });
                              }}
                              className="form-input text-[10px] h-8 bg-slate-50 dark:bg-slate-950 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newParams = formData.ncbaConfig.params.filter((_, i) => i !== idx);
                                setFormData({ ...formData, ncbaConfig: { ...formData.ncbaConfig, params: newParams } });
                              }}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-4">
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={handleTestNcbaAuth}
                          disabled={isTestingNcba}
                          className="flex items-center gap-2 text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-5 py-2.5 rounded-xl transition-all border border-indigo-100 disabled:opacity-50"
                        >
                          {isTestingNcba ? (
                            <div className="w-3 h-3 border border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          )}
                          {isTestingNcba ? 'Verifying Gateway...' : 'Verify Auth (Get Token)'}
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleTestNcbaStk}
                          className="flex items-center gap-2 text-[9px] font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          Test STK Push
                        </button>
                      </div>

                      {ncbaTestResult && (
                        <div className={`p-4 rounded-2xl border animate-fade-in-up ${ncbaTestResult.success ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${ncbaTestResult.success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                              {ncbaTestResult.success ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className={`text-[10px] font-black uppercase tracking-tight ${ncbaTestResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {ncbaTestResult.success ? 'Gateway Verified' : 'Authentication Failed'}
                               </p>
                               <p className="text-[10px] text-slate-500 font-medium leading-tight mt-1 line-clamp-2">
                                  {ncbaTestResult.hint || ncbaTestResult.message || ncbaTestResult.error || (ncbaTestResult.success ? 'Token retrieved successfully.' : 'Check credentials.')}
                               </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>


                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-6 flex justify-end items-center gap-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="btn-secondary h-12 px-8">Discard</button>
            <button type="submit" className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100 dark:shadow-none">Save Registry Link</button>
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
