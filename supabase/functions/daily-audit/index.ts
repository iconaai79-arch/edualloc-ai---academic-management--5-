/**
 * Supabase Edge Function: daily-audit
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs automatically via a Supabase cron job (pg_cron) at 00:05 every night.
 * For each active institution it:
 *   1. Fetches invoices, receipts and expenses for the current month
 *   2. Runs the full audit engine
 *   3. Persists the report via save_audit_run() RPC
 *   4. Pushes CRITICAL/HIGH notifications to app_notifications
 *
 * Deploy:  supabase functions deploy daily-audit
 * Cron:    SELECT cron.schedule('daily-audit', '5 0 * * *',
 *              $$SELECT net.http_post(...)$$);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Lightweight reimplementation of the audit engine (Deno-compatible) ───────
// (mirrors src/services/auditEngine.ts — keep in sync when updating)

type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface AuditIssue {
  id: string;
  type: string;
  severity: Severity;
  message: string;
  recordId?: string;
  table?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
  detectedAt: string;
}

function reconcile(invoices: any[], receipts: any[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const receiptsByInv = new Map<string, number>();
  for (const r of receipts) {
    if (r.invoice_id) receiptsByInv.set(r.invoice_id, (receiptsByInv.get(r.invoice_id) ?? 0) + (r.amount_paid ?? 0));
  }
  for (const inv of invoices) {
    const paid   = receiptsByInv.get(inv.id) ?? 0;
    const total  = inv.total_amount ?? 0;
    if (paid > total + 1) {
      issues.push({ id: `overpayment-${inv.id}`, type: 'OVERPAYMENT', severity: 'HIGH',
        message: `Invoice ${inv.invoice_number}: overpaid by KES ${(paid - total).toLocaleString()}`,
        recordId: inv.id, table: 'invoices', amount: paid - total, detectedAt: new Date().toISOString() });
    }
    if (inv.status === 'paid' && (total - paid) > 1) {
      issues.push({ id: `false-paid-${inv.id}`, type: 'STATUS_MISMATCH', severity: 'CRITICAL',
        message: `Invoice ${inv.invoice_number} marked PAID but KES ${(total - paid).toLocaleString()} unaccounted`,
        recordId: inv.id, table: 'invoices', amount: total - paid, detectedAt: new Date().toISOString() });
    }
  }
  return issues;
}

function detectDuplicates(receipts: any[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const seen = new Map<string, any>();
  for (const r of receipts) {
    const key = `${r.student_id ?? ''}|${r.amount_paid}|${(r.payment_date ?? '').split('T')[0]}`;
    if (seen.has(key)) {
      issues.push({ id: `dup-${r.id}`, type: 'DUPLICATE_RECEIPT', severity: 'HIGH',
        message: `Duplicate receipt ${r.receipt_number} — same amount/date/student`,
        recordId: r.id, table: 'receipts', amount: r.amount_paid, detectedAt: new Date().toISOString() });
    } else seen.set(key, r);
  }
  return issues;
}

function buildSummary(issues: AuditIssue[], invoices: any[], receipts: any[]) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const i of issues) counts[i.severity.toLowerCase() as keyof typeof counts]++;
  const totalBilled    = invoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);
  const totalCollected = receipts.reduce((s, r) => s + (r.amount_paid ?? 0), 0);
  const overallRisk: Severity =
    counts.critical > 0 ? 'CRITICAL' : counts.high > 0 ? 'HIGH' :
    counts.medium   > 0 ? 'MEDIUM'   : counts.low  > 0 ? 'LOW' : 'INFO';
  return {
    ...counts, totalIssues: issues.length, overallRisk,
    totalBilled, totalCollected,
    collectionRate: totalBilled > 0 ? +((totalCollected / totalBilled) * 100).toFixed(1) : 0,
    outstandingDebt: totalBilled - totalCollected,
  };
}

// ── Edge Function Handler ─────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Allow manual trigger via POST with optional { institutionId }
  let targetInstitutionId: string | null = null;
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      targetInstitutionId = body?.institutionId ?? null;
    } catch { /* no body */ }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthStart = `${period}-01`;

  // Fetch active institutions
  let instQuery = supabase.from('institutions').select('id, name').eq('status', 'active');
  if (targetInstitutionId) instQuery = instQuery.eq('id', targetInstitutionId);
  const { data: institutions, error: instErr } = await instQuery;
  if (instErr) return new Response(JSON.stringify({ error: instErr.message }), { status: 500 });

  const results: { institutionId: string; risk: string; issues: number }[] = [];

  for (const inst of institutions ?? []) {
    try {
      // Fetch financial data for the current month
      const [{ data: invoices }, { data: receipts }, { data: expenses }] = await Promise.all([
        supabase.from('invoices').select('*').eq('institution_id', inst.id).gte('issue_date', monthStart),
        supabase.from('receipts').select('*').eq('institution_id', inst.id).gte('payment_date', monthStart),
        supabase.from('expenses').select('*').eq('institution_id', inst.id).gte('date', monthStart),
      ]);

      const issues: AuditIssue[] = [
        ...reconcile(invoices ?? [], receipts ?? []),
        ...detectDuplicates(receipts ?? []),
      ];

      const summary = buildSummary(issues, invoices ?? [], receipts ?? []);

      // Persist via RPC
      const { data: reportId, error: rpcErr } = await supabase.rpc('save_audit_run', {
        p_institution_id: inst.id,
        p_period:         period,
        p_triggered_by:   'scheduled',
        p_summary:        summary,
        p_issues:         issues,
      });
      if (rpcErr) { console.error(`[daily-audit] save_audit_run error for ${inst.id}:`, rpcErr); continue; }

      // Push in-app notifications for CRITICAL / HIGH issues
      const urgentIssues = issues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH');
      if (urgentIssues.length > 0) {
        // Fetch finance officer user ids for this institution
        const { data: financeUsers } = await supabase
          .from('users')
          .select('id')
          .eq('institution_id', inst.id)
          .in('role', ['finance_officer', 'admin', 'super_admin']);

        const notifRows = (financeUsers ?? []).flatMap((u: { id: string }) =>
          urgentIssues.slice(0, 5).map(iss => ({
            id: `audit-${iss.id}-${u.id}`,
            user_id: u.id,
            institution_id: inst.id,
            message: `🔴 AUDIT ALERT: ${iss.message}`,
            type: 'audit_alert',
            is_read: false,
            timestamp: new Date().toISOString(),
          }))
        );

        if (notifRows.length > 0) {
          await supabase.from('app_notifications').upsert(notifRows, { onConflict: 'id' });
        }
      }

      results.push({ institutionId: inst.id, risk: summary.overallRisk, issues: issues.length });
      console.log(`[daily-audit] ${inst.name}: ${summary.overallRisk} — ${issues.length} issues, reportId=${reportId}`);

    } catch (err: unknown) {
      console.error(`[daily-audit] Failed for institution ${inst.id}:`, err);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, period, processed: results.length, results }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
