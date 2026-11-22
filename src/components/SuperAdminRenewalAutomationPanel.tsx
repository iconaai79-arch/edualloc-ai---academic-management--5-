import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CompanyDetails, Institution, SmsConfig, User } from '../types';
import { apiService } from '../services/apiService';

export type RenewalStage = '7d_invoice' | '3d_reminder' | '0d_final';

export interface RenewalDispatchLog {
  id: string;
  institutionId: string;
  institutionName: string;
  expiryDate: string; // YYYY-MM-DD
  stage: RenewalStage;
  invoiceNumber: string;
  amount: number;
  phone?: string;
  email?: string;
  channels: string[];
  sentAt: string;
  sentBy: string;
}

interface SuperAdminRenewalAutomationPanelProps {
  institutions: Institution[];
  users: User[];
  companyDetails?: CompanyDetails;
  smsConfig?: SmsConfig;
  currentUser?: User | null;
  onSendSms?: (recipient: string | string[], message: string, config?: SmsConfig, units?: number, institutionId?: string) => Promise<any>;
  onLogAction?: (msg: string) => void;
}

const STORAGE_LOG_KEY = 'eduai_renewal_dispatch_logs_v1';
const STORAGE_CFG_KEY = 'eduai_renewal_auto_config_v1';

const getDefaultRenewalAmount = (inst: Institution): number => {
  const custom = Number((inst as any).subscriptionAmount || (inst as any).renewalAmount || (inst as any).planPrice || 0);
  if (custom > 0) return custom;
  const t = `${inst.institutionType || ''} ${inst.businessSubType || ''} ${inst.category || ''}`.toLowerCase();
  if (t.includes('pharmacy') || t.includes('chemist')) return 5000;
  if (t.includes('hospital') || t.includes('clinic') || t.includes('his')) return 15000;
  if (t.includes('university') || t.includes('college') || t.includes('tvet')) return 25000;
  if (t.includes('secondary') || t.includes('primary') || t.includes('education') || t.includes('school')) return 10000;
  return 5000;
};

const toDateOnly = (iso?: string): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

const getDaysRemaining = (iso?: string): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const expMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((expMidnight - todayMidnight) / 86400000);
};

export const SuperAdminRenewalAutomationPanel: React.FC<SuperAdminRenewalAutomationPanelProps> = ({
  institutions,
  users,
  companyDetails,
  smsConfig,
  currentUser,
  onSendSms,
  onLogAction,
}) => {
  const [logs, setLogs] = useState<RenewalDispatchLog[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [config, setConfig] = useState<{
    autoDispatchEnabled: boolean;
    invoiceDaysBefore: number;
    reminderDaysBefore: number;
    includeFinalDayNotice: boolean;
    paybillNumber: string;
    lastAutoSweepDate?: string;
  }>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_CFG_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      autoDispatchEnabled: true,
      invoiceDaysBefore: 7,
      reminderDaysBefore: 3,
      includeFinalDayNotice: true,
      paybillNumber: (companyDetails as any)?.mpesaPaybill || '522522',
    };
  });

  const [filterMode, setFilterMode] = useState<'all_expiring' | '7d_due' | '3d_due' | 'expired' | 'sent_log'>('all_expiring');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSweeping, setIsSweeping] = useState(false);
  const [sendingInstId, setSendingInstId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Sync logs from Supabase on mount
  useEffect(() => {
    let mounted = true;
    (apiService.fetchModuleRecords ? apiService.fetchModuleRecords<any>('subscription_renewal_dispatches', 'GLOBAL') : Promise.resolve([]))
      .then((rows: any) => {
        if (mounted && Array.isArray(rows) && rows.length > 0) {
          setLogs(prev => {
            const byId = new Map<string, RenewalDispatchLog>();
            [...rows, ...prev].forEach(r => { if (r?.id) byId.set(r.id, r); });
            const merged = Array.from(byId.values()).sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
            try { localStorage.setItem(STORAGE_LOG_KEY, JSON.stringify(merged)); } catch (_) {}
            return merged;
          });
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const persistConfig = (next: typeof config) => {
    setConfig(next);
    try { localStorage.setItem(STORAGE_CFG_KEY, JSON.stringify(next)); } catch (_) {}
  };

  const persistLogs = (next: RenewalDispatchLog[]) => {
    setLogs(next);
    try { localStorage.setItem(STORAGE_LOG_KEY, JSON.stringify(next)); } catch (_) {}
  };

  const hasSentStage = (instId: string, expiryDate: string, stage: RenewalStage) =>
    logs.some(l => l.institutionId === instId && l.expiryDate === expiryDate && l.stage === stage);

  // Build enriched expiring institution rows
  const enrichedInstitutions = useMemo(() => {
    return (institutions || [])
      .map(inst => {
        const expiryIso = inst.subscriptionEndsAt || inst.trialEndsAt;
        const expiryDate = toDateOnly(expiryIso);
        const daysLeft = getDaysRemaining(expiryIso);
        const adminUser = (users || []).find(
          u => u.institutionId === inst.id && ['admin', 'head_teacher', 'pharmacy_admin', 'his_admin', 'retail_agent'].includes(String(u.role || '').toLowerCase())
        );
        const phone = (inst as any).phone || (inst as any).phoneNumber || adminUser?.phoneNumber || '';
        const email = inst.email || adminUser?.email || '';
        const amount = getDefaultRenewalAmount(inst);
        const sent7d = expiryDate ? hasSentStage(inst.id, expiryDate, '7d_invoice') : false;
        const sent3d = expiryDate ? hasSentStage(inst.id, expiryDate, '3d_reminder') : false;
        const sent0d = expiryDate ? hasSentStage(inst.id, expiryDate, '0d_final') : false;

        let dueStage: RenewalStage | null = null;
        if (daysLeft !== null && expiryDate) {
          if (daysLeft <= config.invoiceDaysBefore && daysLeft > config.reminderDaysBefore && !sent7d) {
            dueStage = '7d_invoice';
          } else if (daysLeft <= config.reminderDaysBefore && daysLeft > 0 && !sent3d) {
            dueStage = '3d_reminder';
          } else if (daysLeft === 0 && config.includeFinalDayNotice && !sent0d) {
            dueStage = '0d_final';
          }
        }

        return {
          inst,
          expiryDate,
          daysLeft,
          phone,
          email,
          amount,
          sent7d,
          sent3d,
          sent0d,
          dueStage,
        };
      })
      .filter(r => r.daysLeft !== null)
      .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
  }, [institutions, users, logs, config]);

  const stats = useMemo(() => {
    const within7 = enrichedInstitutions.filter(r => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= config.invoiceDaysBefore).length;
    const within3 = enrichedInstitutions.filter(r => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= config.reminderDaysBefore).length;
    const expired = enrichedInstitutions.filter(r => r.daysLeft !== null && r.daysLeft < 0).length;
    const dueNow = enrichedInstitutions.filter(r => r.dueStage !== null).length;
    return { within7, within3, expired, dueNow, totalSent: logs.length };
  }, [enrichedInstitutions, logs.length, config]);

  // Generate PDF Renewal Invoice for download
  const handleDownloadRenewalInvoicePdf = (row: typeof enrichedInstitutions[number], invNo?: string) => {
    const invoiceNumber = invNo || `INV-REN-${(row.expiryDate || '').replace(/-/g, '').slice(0, 6)}-${row.inst.id.slice(-4).toUpperCase()}`;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const brandName = (companyDetails?.name || 'EDUAI AUTOMATION NETWORK').toUpperCase();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(brandName, 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('SUBSCRIPTION RENEWAL INVOICE', 14, 24);
    doc.text(`Invoice #: ${invoiceNumber}`, 196, 16, { align: 'right' });
    doc.text(`Issued: ${new Date().toLocaleDateString('en-GB')}`, 196, 23, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 14, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(row.inst.name || 'Institution', 14, 54);
    if (row.phone) doc.text(`Phone: ${row.phone}`, 14, 60);
    if (row.email) doc.text(`Email: ${row.email}`, 14, 66);
    doc.setFont('helvetica', 'bold');
    doc.text(`Current License Expiry: ${row.expiryDate || 'N/A'}`, 196, 54, { align: 'right' });

    autoTable(doc, {
      startY: 76,
      head: [['Description', 'Billing Cycle', 'Expiry Date', 'Amount (KES)']],
      body: [
        [
          `EduAI Cloud License Renewal — ${row.inst.name} (${row.inst.institutionType || 'Institution'})`,
          'Standard Term / Subscription',
          row.expiryDate || '—',
          `KES ${row.amount.toLocaleString()}`,
        ],
      ],
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 110;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL DUE: KES ${row.amount.toLocaleString()}`, 196, finalY + 12, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Options:`, 14, finalY + 24);
    doc.text(`1. Instant M-Pesa STK Push inside your EduAI Portal (https://portal.eduai.co.ke)`, 14, finalY + 30);
    doc.text(`2. M-Pesa Paybill: ${config.paybillNumber}  |  Account: ${invoiceNumber}`, 14, finalY + 36);
    doc.text(`Need help? WhatsApp / Call: 0723 348 912`, 14, finalY + 44);

    doc.save(`${invoiceNumber}_${(row.inst.name || 'Account').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  // Dispatch single renewal invoice or reminder
  const dispatchForRow = async (row: typeof enrichedInstitutions[number], stage: RenewalStage): Promise<RenewalDispatchLog> => {
    const invoiceNumber = `INV-REN-${(row.expiryDate || '').replace(/-/g, '').slice(0, 6)}-${row.inst.id.slice(-4).toUpperCase()}`;
    const expiryLabel = row.expiryDate
      ? new Date(row.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'soon';

    const smsBody =
      stage === '7d_invoice'
        ? `Hello ${row.inst.name}, your EduAI subscription expires in ${row.daysLeft} days (${expiryLabel}). Renewal Invoice #${invoiceNumber} for KES ${row.amount.toLocaleString()} has been issued. Renew via M-Pesa in portal.eduai.co.ke or Paybill ${config.paybillNumber} (Acc: ${invoiceNumber}). Help: 0723348912.`
        : stage === '3d_reminder'
        ? `URGENT REMINDER: ${row.inst.name} EduAI license expires in ${row.daysLeft} days (${expiryLabel}). Please settle Renewal Invoice #${invoiceNumber} (KES ${row.amount.toLocaleString()}) via portal.eduai.co.ke to avoid service interruption. Support: 0723348912.`
        : `FINAL NOTICE: ${row.inst.name} EduAI license expires TODAY (${expiryLabel}). Settle Invoice #${invoiceNumber} (KES ${row.amount.toLocaleString()}) at portal.eduai.co.ke to keep uninterrupted access. Support: 0723348912.`;

    const channels: string[] = ['In-App Invoice'];

    // 1. Save Renewal Invoice record on 7-day invoice stage
    if (stage === '7d_invoice') {
      await apiService
        .saveModuleRecord('subscription_renewal_invoices', {
          id: invoiceNumber,
          institutionId: row.inst.id,
          institutionName: row.inst.name,
          invoiceNumber,
          amount: row.amount,
          expiryDate: row.expiryDate,
          status: 'Unpaid',
          issuedAt: new Date().toISOString(),
          issuedBy: currentUser?.name || 'Auto-Renewal Engine',
        })
        .catch(() => {});
    }

    // 2. Dispatch SMS if phone available
    if (row.phone && onSendSms) {
      try {
        await onSendSms(row.phone, smsBody, smsConfig, 1, row.inst.id);
        channels.push('SMS');
      } catch (_) {}
    }

    // 3. Dispatch Email if email available & apiService.sendEmail exists
    if (row.email && typeof (apiService as any).sendEmail === 'function') {
      try {
        await (apiService as any).sendEmail({
          to: row.email,
          subject:
            stage === '7d_invoice'
              ? `Renewal Invoice #${invoiceNumber} — ${row.inst.name} (Expires ${expiryLabel})`
              : `Renewal Reminder (${row.daysLeft} Days Left) — ${row.inst.name}`,
          text: smsBody,
        });
        channels.push('Email');
      } catch (_) {}
    }

    const logEntry: RenewalDispatchLog = {
      id: `ren_${row.inst.id}_${row.expiryDate}_${stage}`,
      institutionId: row.inst.id,
      institutionName: row.inst.name,
      expiryDate: row.expiryDate || '',
      stage,
      invoiceNumber,
      amount: row.amount,
      phone: row.phone,
      email: row.email,
      channels,
      sentAt: new Date().toISOString(),
      sentBy: currentUser?.name || 'Super Admin',
    };

    await apiService.saveModuleRecord('subscription_renewal_dispatches', { ...logEntry, institutionId: 'GLOBAL', targetInstitutionId: row.inst.id }).catch(() => {});
    onLogAction?.(`[Auto-Renewal] Sent ${stage} (${invoiceNumber}) to ${row.inst.name} via ${channels.join(', ')}`);
    return logEntry;
  };

  const handleSendManual = async (row: typeof enrichedInstitutions[number], stage: RenewalStage) => {
    setSendingInstId(row.inst.id);
    try {
      const entry = await dispatchForRow(row, stage);
      persistLogs([entry, ...logs.filter(l => l.id !== entry.id)]);
      setBanner({
        type: 'success',
        text: `Sent ${stage === '7d_invoice' ? '7-Day Renewal Invoice' : stage === '3d_reminder' ? '3-Day Reminder' : 'Final Notice'} (#${entry.invoiceNumber}) to ${row.inst.name} via ${entry.channels.join(' + ')}.`,
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Failed to dispatch renewal notice.' });
    } finally {
      setSendingInstId(null);
    }
  };

  // Run Automated Sweep for ALL due accounts (7-day invoices + 3-day reminders + final-day)
  const handleRunAutoSweep = async (silent = false) => {
    const dueRows = enrichedInstitutions.filter(r => r.dueStage !== null);
    if (dueRows.length === 0) {
      if (!silent) {
        setBanner({ type: 'info', text: 'All expiring accounts are already up to date — no pending 7-day invoices or 3-day reminders due right now.' });
      }
      return;
    }

    setIsSweeping(true);
    const created: RenewalDispatchLog[] = [];
    try {
      for (const row of dueRows) {
        if (!row.dueStage) continue;
        const entry = await dispatchForRow(row, row.dueStage);
        created.push(entry);
      }
      const nextLogs = [...created, ...logs.filter(l => !created.some(c => c.id === l.id))];
      persistLogs(nextLogs);
      persistConfig({ ...config, lastAutoSweepDate: new Date().toISOString().split('T')[0] });
      setBanner({
        type: 'success',
        text: `Automated Renewal Sweep complete! Dispatched ${created.length} renewal invoice(s) / reminder(s) with zero duplicates.`,
      });
    } finally {
      setIsSweeping(false);
    }
  };

  // Auto-run once per day when Super Admin opens this panel and Auto-Dispatch is ON
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (config.autoDispatchEnabled && config.lastAutoSweepDate !== today && stats.dueNow > 0) {
      handleRunAutoSweep(true);
    }
  }, [config.autoDispatchEnabled, stats.dueNow]);

  const visibleRows = useMemo(() => {
    return enrichedInstitutions.filter(r => {
      const q = searchQuery.trim().toLowerCase();
      if (q && !(r.inst.name || '').toLowerCase().includes(q) && !(r.inst.institutionType || '').toLowerCase().includes(q)) {
        return false;
      }
      if (filterMode === '7d_due') return r.daysLeft !== null && r.daysLeft <= config.invoiceDaysBefore && r.daysLeft > config.reminderDaysBefore;
      if (filterMode === '3d_due') return r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= config.reminderDaysBefore;
      if (filterMode === 'expired') return r.daysLeft !== null && r.daysLeft < 0;
      return r.daysLeft !== null && r.daysLeft <= 14; // All approaching (<=14d) or expired
    });
  }, [enrichedInstitutions, filterMode, searchQuery, config]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Automation Control Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 text-white p-6 border border-indigo-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
            7-Day Invoice + 3-Day Reminder Engine
          </span>
          <h3 className="text-xl font-black tracking-tight mt-2">
            Automated Subscription Renewal &amp; Expiry Follow-Up
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Automatically issues Renewal Invoices <strong>{config.invoiceDaysBefore} days</strong> before expiry and sends urgent SMS/Email reminders <strong>{config.reminderDaysBefore} days</strong> before expiry — with strict per-cycle duplicate protection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-xs font-black uppercase cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoDispatchEnabled}
              onChange={e => persistConfig({ ...config, autoDispatchEnabled: e.target.checked })}
              className="rounded accent-emerald-400"
            />
            <span>Auto-Dispatch Daily</span>
          </label>
          <button
            type="button"
            disabled={isSweeping}
            onClick={() => handleRunAutoSweep(false)}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
          >
            {isSweeping ? '⏳ Running Sweep...' : `⚡ Run Renewal Sweep Now (${stats.dueNow} Due)`}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Due Right Now', val: stats.dueNow, color: 'text-amber-500' },
          { label: `Expiring ≤ ${config.invoiceDaysBefore} Days`, val: stats.within7, color: 'text-indigo-500' },
          { label: `Urgent ≤ ${config.reminderDaysBefore} Days`, val: stats.within3, color: 'text-rose-500' },
          { label: 'Already Expired', val: stats.expired, color: 'text-slate-500' },
          { label: 'Notices Sent (Log)', val: stats.totalSent, color: 'text-emerald-500' },
        ].map(k => (
          <div key={k.label} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{k.label}</div>
            <div className={`text-2xl font-black mt-1 ${k.color}`}>{k.val}</div>
          </div>
        ))}
      </div>

      {banner && (
        <div className={`px-4 py-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 ${
          banner.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-700 dark:text-emerald-200'
            : banner.type === 'error'
            ? 'bg-rose-50 border-rose-300 text-rose-900'
            : 'bg-indigo-50 border-indigo-300 text-indigo-900 dark:bg-indigo-950/50 dark:border-indigo-700 dark:text-indigo-200'
        }`}>
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="font-black opacity-60 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {/* Filter Bar + Paybill Config */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all_expiring', label: 'All Expiring (≤14d)' },
            { id: '7d_due', label: '📄 7-Day Invoice Window' },
            { id: '3d_due', label: '🔔 3-Day Reminder Window' },
            { id: 'expired', label: '⛔ Expired' },
            { id: 'sent_log', label: `📜 Sent Audit Log (${logs.length})` },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterMode(f.id as any)}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                filterMode === f.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search institution..."
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none"
          />
        </div>
      </div>

      {/* Main Table: Expiring Accounts OR Sent Audit Log */}
      {filterMode !== 'sent_log' ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-4">Institution</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Renewal Fee</th>
                <th className="p-4">Auto-Notice Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 font-bold">
                    No institutions in this expiry window right now.
                  </td>
                </tr>
              ) : (
                visibleRows.map(row => (
                  <tr key={row.inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-4">
                      <div className="font-black text-slate-900 dark:text-white uppercase">{row.inst.name}</div>
                      <div className="text-[10px] text-slate-500">{row.inst.institutionType || 'Institution'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">{row.phone || 'No phone'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{row.email || 'No email'}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white">{row.expiryDate}</div>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        (row.daysLeft ?? 0) < 0
                          ? 'bg-rose-100 text-rose-700'
                          : (row.daysLeft ?? 0) <= 3
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {(row.daysLeft ?? 0) < 0 ? `Expired ${Math.abs(row.daysLeft!)}d ago` : row.daysLeft === 0 ? 'Expires TODAY' : `${row.daysLeft} days left`}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      KES {row.amount.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${row.sent7d ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {row.sent7d ? '✓ 7d Invoice' : '7d Pending'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${row.sent3d ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {row.sent3d ? '✓ 3d Reminder' : '3d Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={sendingInstId === row.inst.id}
                          onClick={() => handleSendManual(row, '7d_invoice')}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase cursor-pointer disabled:opacity-50"
                        >
                          📄 Send 7d Invoice
                        </button>
                        <button
                          type="button"
                          disabled={sendingInstId === row.inst.id}
                          onClick={() => handleSendManual(row, '3d_reminder')}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black uppercase cursor-pointer disabled:opacity-50"
                        >
                          🔔 3d Remind
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadRenewalInvoicePdf(row)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase cursor-pointer"
                          title="Download PDF Renewal Invoice"
                        >
                          ⬇ PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-4">Sent At</th>
                <th className="p-4">Institution</th>
                <th className="p-4">Stage</th>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Channels</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No renewal invoices or reminders sent yet.</td></tr>
              ) : (
                logs.map(l => (
                  <tr key={l.id}>
                    <td className="p-4 font-mono text-[11px]">{new Date(l.sentAt).toLocaleString()}</td>
                    <td className="p-4 font-black uppercase">{l.institutionName}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase">
                        {l.stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold">{l.invoiceNumber}</td>
                    <td className="p-4 font-mono font-black text-emerald-600">KES {l.amount.toLocaleString()}</td>
                    <td className="p-4">{l.channels.join(', ')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
